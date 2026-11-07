from pydantic import BaseModel, EmailStr

from app.schemas.user import UserSchema


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = 900
    user: UserSchema


class RefreshRequest(BaseModel):
    refresh_token: str


class RefreshResponse(BaseModel):
    access_token: str
    expires_in: int = 900


class LogoutRequest(BaseModel):
    refresh_token: str
