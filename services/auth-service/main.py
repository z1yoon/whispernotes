from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from sqlalchemy import create_engine, Column, String, Boolean, text
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.exc import IntegrityError
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
import os
import logging
from typing import Optional
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="WhisperNotes Auth Service", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

# JWT settings
SECRET_KEY = os.getenv("JWT_SECRET", "default-secret-key")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "43200")) # 30 days

# Email settings (for access requests)
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@whispernotes.com")

# Database setup
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Helper functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Admin User Creation on Startup
@app.on_event("startup")
def startup_event():
    with SessionLocal() as db:
        admin_email = os.getenv("ADMIN_EMAIL")
        admin_password = os.getenv("ADMIN_PASSWORD")
        
        if not admin_email or not admin_password:
            logger.warning("Admin credentials not set in environment variables.")
            return

        # Check if admin user exists
        result = db.execute(text("SELECT email FROM users WHERE email = :email"), {"email": admin_email}).scalar()
        if not result:
            hashed_password = get_password_hash(admin_password)
            db.execute(
                text("""
                    INSERT INTO users (email, full_name, password_hash, is_admin, is_active)
                    VALUES (:email, :full_name, :password_hash, :is_admin, :is_active)
                """),
                {
                    "email": admin_email,
                    "full_name": "Admin",
                    "password_hash": hashed_password,
                    "is_admin": True,
                    "is_active": True,
                }
            )
            db.commit()
            logger.info(f"Admin user '{admin_email}' created.")

# Pydantic models
class UserBase(BaseModel):
    email: EmailStr
    full_name: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: str
    is_admin: bool
    is_active: bool

    class Config:
        orm_mode = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# Security dependency
async def get_current_user(token: str = Depends(oauth2_scheme), db = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email)
    except JWTError:
        raise credentials_exception
    
    user_row = db.execute(text("SELECT * FROM users WHERE email = :email"), {"email": token_data.email}).first()

    if user_row is None:
        raise credentials_exception
    
    # Manually create a Pydantic User model from the SQLAlchemy Row object
    user = User(
        id=str(user_row.id),
        email=user_row.email,
        full_name=user_row.full_name,
        is_admin=user_row.is_admin,
        is_active=user_row.is_active,
    )
    return user

async def get_current_admin_user(current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="The user does not have administrative privileges"
        )
    return current_user

# API Routes
@app.post("/api/v1/auth/login", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db=Depends(get_db)):
    user = db.execute(text("SELECT * FROM users WHERE email = :email"), {"email": form_data.username}).first()
    
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email, "is_admin": user.is_admin},
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

class AccessRequest(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    purpose: Optional[str] = ""

@app.post("/api/v1/auth/request-access", status_code=status.HTTP_201_CREATED)
async def request_access(request: AccessRequest, db=Depends(get_db)):
    # Check if user already exists
    existing_user = db.execute(text("SELECT id FROM users WHERE email = :email"), {"email": request.email}).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    hashed_password = get_password_hash(request.password)
    try:
        db.execute(
            text("""
                INSERT INTO access_requests (email, full_name, password_hash, reason)
                VALUES (:email, :full_name, :password_hash, :reason)
            """),
            {
                "email": request.email, 
                "full_name": request.full_name, 
                "password_hash": hashed_password,
                "reason": request.purpose
            }
        )
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Access request for this email already pending.")
    
    return {"message": "Access request submitted successfully. Please wait for admin approval."}

@app.get("/api/v1/auth/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

@app.get("/api/v1/admin/access-requests")
async def list_access_requests(db=Depends(get_db), admin_user: User = Depends(get_current_admin_user)):
    requests = db.execute(text("SELECT id, email, full_name, reason, status, requested_at FROM access_requests ORDER BY requested_at DESC")).fetchall()
    return requests

@app.post("/api/v1/admin/access-requests/{request_id}/approve")
async def approve_request(request_id: str, db=Depends(get_db), admin_user: User = Depends(get_current_admin_user)):
    # Fetch the request
    request = db.execute(text("SELECT * FROM access_requests WHERE id = :id AND status = 'pending'"), {"id": request_id}).first()
    if not request:
        raise HTTPException(status_code=404, detail="Pending request not found.")

    # Create user
    try:
        db.execute(
            text("""
                INSERT INTO users (id, email, full_name, password_hash, is_admin, is_active)
                VALUES (:id, :email, :full_name, :password_hash, false, true)
            """),
            {
                "id": request.id,
                "email": request.email,
                "full_name": request.full_name,
                "password_hash": request.password_hash
            }
        )
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="User with this email already exists.")

    # Update request status
    db.execute(
        text("UPDATE access_requests SET status = 'approved', reviewed_at = NOW(), reviewed_by = :admin_id WHERE id = :id"),
        {"admin_id": admin_user.id, "id": request_id}
    )
    db.commit()
    return {"message": f"Request from {request.email} approved."}

@app.post("/api/v1/admin/access-requests/{request_id}/reject")
async def reject_request(request_id: str, db=Depends(get_db), admin_user: User = Depends(get_current_admin_user)):
    result = db.execute(
        text("""
            UPDATE access_requests 
            SET status = 'rejected', reviewed_at = NOW(), reviewed_by = :admin_id 
            WHERE id = :id AND status = 'pending'
        """),
        {"admin_id": admin_user.id, "id": request_id}
    )
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Pending request not found.")
    
    db.commit()
    return {"message": "Access request rejected."}

@app.get("/health")
async def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)