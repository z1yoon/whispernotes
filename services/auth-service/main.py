from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from sqlalchemy import create_engine, Column, String, Boolean, text
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.exc import IntegrityError
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone
import os
import logging
from typing import Optional
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from contextlib import asynccontextmanager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database setup
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

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

# Helper functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Admin User Creation Function
def create_admin_user():
    with SessionLocal() as db:
        admin_email = os.getenv("ADMIN_EMAIL")
        admin_password = os.getenv("ADMIN_PASSWORD")
        admin_username = os.getenv("ADMIN_USERNAME", "Admin")  # Default to "Admin" if not set
        
        if not admin_email or not admin_password:
            logger.warning("Admin credentials not set in environment variables.")
            return

        # Check if admin user exists
        existing_user = db.execute(text("SELECT id, full_name FROM users WHERE email = :email"), {"email": admin_email}).first()
        
        if not existing_user:
            # Create new admin user
            hashed_password = get_password_hash(admin_password)
            db.execute(
                text("""
                    INSERT INTO users (email, full_name, password_hash, is_admin, is_active)
                    VALUES (:email, :full_name, :password_hash, :is_admin, :is_active)
                """),
                {
                    "email": admin_email,
                    "full_name": admin_username,
                    "password_hash": hashed_password,
                    "is_admin": True,
                    "is_active": True,
                }
            )
            db.commit()
            logger.info(f"Admin user '{admin_email}' created with display name '{admin_username}'.")
        else:
            # Update existing admin user's display name if it's different
            if existing_user.full_name != admin_username:
                db.execute(
                    text("UPDATE users SET full_name = :full_name WHERE email = :email"),
                    {"full_name": admin_username, "email": admin_email}
                )
                db.commit()
                logger.info(f"Admin user '{admin_email}' display name updated from '{existing_user.full_name}' to '{admin_username}'.")
            else:
                logger.info(f"Admin user '{admin_email}' already exists with correct display name '{admin_username}'.")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    create_admin_user()
    yield
    # Shutdown (if needed)

app = FastAPI(title="WhisperNotes Auth Service", version="1.0.0", lifespan=lifespan)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
        from_attributes = True

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
    logger.info(f"Login attempt for email: {form_data.username}")
    
    # First check if user exists in users table
    user = db.execute(text("SELECT * FROM users WHERE email = :email"), {"email": form_data.username}).first()
    
    if user:
        logger.info(f"User found in users table: {form_data.username}")
        # User exists, check password and active status
        if not verify_password(form_data.password, user.password_hash):
            logger.info(f"Invalid password for user: {form_data.username}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        if not user.is_active:
            logger.info(f"User account deactivated: {form_data.username}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="Your account has been deactivated. Please contact an administrator."
            )
    else:
        logger.info(f"User not found in users table, checking access_requests: {form_data.username}")
        # User doesn't exist in users table, check if they have a pending access request
        access_request = db.execute(
            text("SELECT * FROM access_requests WHERE email = :email"), 
            {"email": form_data.username}
        ).first()
        
        if access_request:
            logger.info(f"Access request found for {form_data.username}, status: {access_request.status}")
            # User has an access request, check status and password
            if not verify_password(form_data.password, access_request.password_hash):
                logger.info(f"Invalid password for access request: {form_data.username}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Incorrect email or password",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            
            # Password is correct, but account not approved yet
            if access_request.status == 'pending':
                logger.info(f"Account pending approval: {form_data.username}")
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Your account is pending admin approval. Please wait for confirmation."
                )
            elif access_request.status == 'rejected':
                logger.info(f"Account rejected: {form_data.username}")
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Your access request was rejected. Please contact an administrator."
                )
            else:
                logger.warning(f"Unknown access request status for {form_data.username}: {access_request.status}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Account status error. Please contact support."
                )
        else:
            logger.info(f"No user or access request found for: {form_data.username}")
            # No user and no access request - invalid credentials
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

    # If we get here, user exists and is valid
    logger.info(f"Login successful for: {form_data.username}")
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
    # Check if email is already in use by an active user
    existing_user = db.execute(text("SELECT id FROM users WHERE email = :email"), {"email": request.email}).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="An account with this email already exists. Please log in instead.")
    
    # Check if email already has an access request (any status - pending, approved, or rejected)
    existing_request = db.execute(
        text("SELECT id, status FROM access_requests WHERE email = :email"), 
        {"email": request.email}
    ).first()
    
    if existing_request:
        # Provide specific message based on request status
        if existing_request.status == 'pending':
            raise HTTPException(
                status_code=400, 
                detail="You already have a pending access request. Please wait for admin approval."
            )
        elif existing_request.status == 'approved':
            raise HTTPException(
                status_code=400, 
                detail="Your access request was already approved. Please log in with your credentials."
            )
        elif existing_request.status == 'rejected':
            raise HTTPException(
                status_code=400, 
                detail="Your previous access request was rejected. Please contact an administrator."
            )
        else:
            raise HTTPException(
                status_code=400, 
                detail="An account with this email has already been requested. Please use a different email."
            )
    
    # If we get here, email is not in use - create the access request
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
        logger.info(f"New access request created for: {request.email}")
        return {"message": "Access request submitted successfully. Please wait for admin approval."}
    except IntegrityError as e:
        db.rollback()
        logger.error(f"Error creating access request: {str(e)}")
        raise HTTPException(status_code=400, detail="Error processing your request. This email may already be registered.")
    except Exception as e:
        db.rollback()
        logger.error(f"Unexpected error creating access request: {str(e)}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred. Please try again later.")

@app.get("/api/v1/auth/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

@app.get("/api/v1/admin/access-requests")
async def list_access_requests(db=Depends(get_db), admin_user: User = Depends(get_current_admin_user)):
    requests = db.execute(text("SELECT id, email, full_name, reason, status, requested_at FROM access_requests ORDER BY requested_at DESC")).fetchall()
    # Convert SQLAlchemy Row objects to dictionaries
    return [
        {
            "id": request.id,
            "email": request.email,
            "full_name": request.full_name,
            "reason": request.reason,
            "status": request.status,
            "requested_at": request.requested_at.isoformat() if request.requested_at else None
        }
        for request in requests
    ]

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

@app.get("/api/v1/admin/users")
async def list_all_users(db=Depends(get_db), admin_user: User = Depends(get_current_admin_user)):
    users = db.execute(text("SELECT id, email, full_name, is_admin, is_active FROM users ORDER BY full_name")).fetchall()
    # Convert SQLAlchemy Row objects to dictionaries
    return [
        {
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "is_admin": user.is_admin,
            "is_active": user.is_active
        }
        for user in users
    ]

@app.post("/api/v1/admin/users/{user_id}/toggle-admin")
async def toggle_user_admin_status(user_id: str, db=Depends(get_db), admin_user: User = Depends(get_current_admin_user)):
    # Check if user exists
    user = db.execute(text("SELECT * FROM users WHERE id = :id"), {"id": user_id}).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    
    # Prevent admin from removing their own admin status
    if user.id == admin_user.id:
        raise HTTPException(status_code=400, detail="Cannot modify your own admin status.")
    
    # Toggle admin status
    new_admin_status = not user.is_admin
    db.execute(
        text("UPDATE users SET is_admin = :is_admin WHERE id = :id"),
        {"is_admin": new_admin_status, "id": user_id}
    )
    db.commit()
    
    action = "promoted to" if new_admin_status else "removed from"
    return {"message": f"User {user.full_name} {action} admin."}

@app.delete("/api/v1/admin/users/{user_id}")
async def delete_user(user_id: str, db=Depends(get_db), admin_user: User = Depends(get_current_admin_user)):
    # Check if user exists
    user = db.execute(text("SELECT * FROM users WHERE id = :id"), {"id": user_id}).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    
    # Prevent admin from deleting themselves
    if user.id == admin_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account.")
    
    try:
        # First, handle foreign key constraints by nullifying references
        
        # Set reviewed_by to NULL for any access requests reviewed by this user
        db.execute(
            text("UPDATE access_requests SET reviewed_by = NULL WHERE reviewed_by = :user_id"),
            {"user_id": user_id}
        )
        
        # Now delete the user
        result = db.execute(text("DELETE FROM users WHERE id = :id"), {"id": user_id})
        
        if result.rowcount == 0:
            # This shouldn't happen since we already checked if user exists
            db.rollback()
            raise HTTPException(status_code=404, detail="User not found or already deleted.")
            
        db.commit()
        return {"message": f"User {user.full_name} has been deleted."}
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting user {user_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete user: {str(e)}"
        )

@app.post("/api/v1/admin/approve-request/{request_id}")
async def approve_request_alt(request_id: str, db=Depends(get_db), admin_user: User = Depends(get_current_admin_user)):
    """Alternative endpoint for approving requests - matches frontend expectations"""
    return await approve_request(request_id, db, admin_user)

@app.post("/api/v1/admin/reject-request/{request_id}")
async def reject_request_alt(request_id: str, db=Depends(get_db), admin_user: User = Depends(get_current_admin_user)):
    """Alternative endpoint for rejecting requests - matches frontend expectations"""
    return await reject_request(request_id, db, admin_user)

@app.post("/api/v1/admin/toggle-admin/{user_id}")
async def toggle_admin_alt(user_id: str, db=Depends(get_db), admin_user: User = Depends(get_current_admin_user)):
    """Alternative endpoint for toggling admin status - matches frontend expectations"""
    return await toggle_user_admin_status(user_id, db, admin_user)

@app.delete("/api/v1/admin/delete-user/{user_id}")
async def delete_user_alt(user_id: str, db=Depends(get_db), admin_user: User = Depends(get_current_admin_user)):
    """Alternative endpoint for deleting users - matches frontend expectations"""
    return await delete_user(user_id, db, admin_user)

@app.get("/health")
async def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)