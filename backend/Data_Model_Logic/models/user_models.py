from pydantic import BaseModel, EmailStr, Field, validator
from datetime import datetime
from typing import Optional
import re

class UserCreate(BaseModel):
    """Schema for creating a new user"""
    username: str = Field(..., min_length=2, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8)

    @validator("username")
    def validate_username(cls, v: str):
        if not v.strip():
            raise ValueError("Username cannot be empty or whitespace")
        return v.strip()

    @validator("password")
    def strong_password(cls, v: str):
        if not re.search(r"\d", v) or not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one digit and one uppercase letter")
        return v

class UserUpdate(BaseModel):
    """Schema for updating user data"""
    username: Optional[str] = Field(None, min_length=2, max_length=50)
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(None, min_length=8)

    @validator("password")
    def strong_password(cls, v: str):
        if v and (not re.search(r"\d", v) or not re.search(r"[A-Z]", v)):
            raise ValueError("Password must contain at least one digit and one uppercase letter")
        return v

class UserOut(BaseModel):
    """Schema for user output (no password)"""
    id: str = Field(alias="_id")
    username: str
    email: EmailStr
    created_at: datetime

    @validator("id", pre=True)
    def convert_objectid(cls, v):
        """Convert MongoDB ObjectId to string"""
        return str(v)

class UserLogin(BaseModel):
    """Schema for user login"""
    username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)

