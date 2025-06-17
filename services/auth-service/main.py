from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
import sqlite3
import hashlib
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
security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30 * 24 * 60  # 30 days

# Email settings (for access requests)
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@whispernotes.com")

# Database setup
DB_PATH = "auth.db"

def init_db():
    """Initialize the authentication database"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Users table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            name TEXT NOT NULL,
            role TEXT DEFAULT 'user',
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP
        )
    """)
    
    # Access requests table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS access_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL,
            name TEXT NOT NULL,
            reason TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            processed_at TIMESTAMP,
            processed_by TEXT
        )
    """)
    
    # Retrieve admin credentials from environment variables
    admin_email = os.getenv("ADMIN_EMAIL", "admin@whispernotes.com")
    admin_password = os.getenv("ADMIN_PASSWORD", "admin123")
    admin_username = os.getenv("ADMIN_USERNAME", "admin")
    
    cursor.execute("SELECT id FROM users WHERE email = ?", (admin_email,))
    if not cursor.fetchone():
        password_hash = pwd_context.hash(admin_password)
        cursor.execute("""
            INSERT INTO users (email, password_hash, name, role)
            VALUES (?, ?, ?, ?)
        """, (admin_email, password_hash, admin_username, "admin"))
        logger.info(f"Created default admin user: {admin_email}")
    
    conn.commit()
    conn.close()

# Initialize database on startup
init_db()

# Pydantic models
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class AccessRequest(BaseModel):
    email: EmailStr
    name: str
    reason: str

class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    role: str
    is_active: bool
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

# Helper functions
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Generate password hash"""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_user_by_email(email: str):
    """Get user by email from database"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT id, email, password_hash, name, role, is_active, created_at, last_login
        FROM users WHERE email = ? AND is_active = TRUE
    """, (email,))
    
    user = cursor.fetchone()
    conn.close()
    
    if user:
        return {
            "id": user[0],
            "email": user[1],
            "password_hash": user[2],
            "name": user[3],
            "role": user[4],
            "is_active": user[5],
            "created_at": user[6],
            "last_login": user[7]
        }
    return None

def authenticate_user(email: str, password: str):
    """Authenticate user credentials"""
    user = get_user_by_email(email)
    if not user:
        return False
    if not verify_password(password, user["password_hash"]):
        return False
    
    # Update last login
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE users SET last_login = CURRENT_TIMESTAMP
        WHERE email = ?
    """, (email,))
    conn.commit()
    conn.close()
    
    return user

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current user from JWT token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = get_user_by_email(email)
    if user is None:
        raise credentials_exception
    
    return user

def send_email(to_email: str, subject: str, body: str):
    """Send email notification"""
    if not SMTP_USERNAME or not SMTP_PASSWORD:
        logger.warning("SMTP not configured, skipping email send")
        return
    
    try:
        msg = MIMEMultipart()
        msg['From'] = SMTP_USERNAME
        msg['To'] = to_email
        msg['Subject'] = subject
        
        msg.attach(MIMEText(body, 'html'))
        
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        text = msg.as_string()
        server.sendmail(SMTP_USERNAME, to_email, text)
        server.quit()
        
        logger.info(f"Email sent successfully to {to_email}")
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}")

# API Routes
@app.post("/auth/login", response_model=TokenResponse)
async def login(login_data: LoginRequest):
    """Authenticate user and return JWT token"""
    user = authenticate_user(login_data.email, login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["email"], "role": user["role"]},
        expires_delta=access_token_expires
    )
    
    user_response = UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        role=user["role"],
        is_active=user["is_active"],
        created_at=user["created_at"] or ""
    )
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=user_response
    )

@app.post("/auth/request-access")
async def request_access(access_request: AccessRequest):
    """Submit access request for admin approval"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Check if user already exists
    existing_user = get_user_by_email(access_request.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )
    
    # Check if request already exists
    cursor.execute("""
        SELECT id FROM access_requests 
        WHERE email = ? AND status = 'pending'
    """, (access_request.email,))
    
    if cursor.fetchone():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Access request already pending for this email"
        )
    
    # Insert access request
    cursor.execute("""
        INSERT INTO access_requests (email, name, reason)
        VALUES (?, ?, ?)
    """, (access_request.email, access_request.name, access_request.reason))
    
    conn.commit()
    conn.close()
    
    # Send notification email to admin
    if ADMIN_EMAIL:
        subject = "New WhisperNotes Access Request"
        body = f"""
        <html>
        <body>
            <h2>New Access Request</h2>
            <p><strong>Name:</strong> {access_request.name}</p>
            <p><strong>Email:</strong> {access_request.email}</p>
            <p><strong>Reason:</strong></p>
            <p>{access_request.reason}</p>
            <p>Please review and approve/deny this request in the admin panel.</p>
        </body>
        </html>
        """
        send_email(ADMIN_EMAIL, subject, body)
    
    return {"message": "Access request submitted successfully"}

@app.get("/auth/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current user information"""
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        name=current_user["name"],
        role=current_user["role"],
        is_active=current_user["is_active"],
        created_at=current_user["created_at"] or ""
    )

@app.get("/auth/verify")
async def verify_token(current_user: dict = Depends(get_current_user)):
    """Verify JWT token validity"""
    return {"valid": True, "user_id": current_user["id"]}

# Admin routes (require admin role)
def require_admin_role(current_user: dict = Depends(get_current_user)):
    """Dependency to require admin role"""
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

@app.get("/auth/admin/access-requests")
async def get_access_requests(admin_user: dict = Depends(require_admin_role)):
    """Get all pending access requests (admin only)"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT id, email, name, reason, status, created_at
        FROM access_requests
        ORDER BY created_at DESC
    """)
    
    requests = cursor.fetchall()
    conn.close()
    
    return [{
        "id": req[0],
        "email": req[1],
        "name": req[2],
        "reason": req[3],
        "status": req[4],
        "created_at": req[5]
    } for req in requests]

@app.post("/auth/admin/approve-access/{request_id}")
async def approve_access_request(
    request_id: int,
    admin_user: dict = Depends(require_admin_role)
):
    """Approve access request and create user account (admin only)"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Get the access request
    cursor.execute("""
        SELECT email, name FROM access_requests
        WHERE id = ? AND status = 'pending'
    """, (request_id,))
    
    request_data = cursor.fetchone()
    if not request_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Access request not found or already processed"
        )
    
    email, name = request_data
    
    # Generate temporary password
    temp_password = hashlib.md5(f"{email}{datetime.utcnow()}".encode()).hexdigest()[:12]
    password_hash = get_password_hash(temp_password)
    
    # Create user account
    cursor.execute("""
        INSERT INTO users (email, password_hash, name, role)
        VALUES (?, ?, ?, ?)
    """, (email, password_hash, name, "user"))
    
    # Update access request status
    cursor.execute("""
        UPDATE access_requests
        SET status = 'approved', processed_at = CURRENT_TIMESTAMP, processed_by = ?
        WHERE id = ?
    """, (admin_user["email"], request_id))
    
    conn.commit()
    conn.close()
    
    # Send welcome email with credentials
    subject = "WhisperNotes Access Approved"
    body = f"""
    <html>
    <body>
        <h2>Welcome to WhisperNotes!</h2>
        <p>Hi {name},</p>
        <p>Your access request has been approved. You can now log in with the following credentials:</p>
        <p><strong>Email:</strong> {email}</p>
        <p><strong>Temporary Password:</strong> {temp_password}</p>
        <p>Please log in and change your password as soon as possible.</p>
        <p>Visit: <a href="http://localhost:3000">WhisperNotes</a></p>
    </body>
    </html>
    """
    send_email(email, subject, body)
    
    return {"message": f"Access approved for {email}"}

@app.delete("/auth/admin/deny-access/{request_id}")
async def deny_access_request(
    request_id: int,
    admin_user: dict = Depends(require_admin_role)
):
    """Deny access request (admin only)"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
        UPDATE access_requests
        SET status = 'denied', processed_at = CURRENT_TIMESTAMP, processed_by = ?
        WHERE id = ? AND status = 'pending'
    """, (admin_user["email"], request_id))
    
    if cursor.rowcount == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Access request not found or already processed"
        )
    
    conn.commit()
    conn.close()
    
    return {"message": "Access request denied"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "auth-service"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)