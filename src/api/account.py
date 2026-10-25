from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from src.api.auth import get_db
from src.api.schemas import TokenResponse
from src.api.security import get_current_user_id
from src.api.services import account_service as service

account_router = APIRouter(prefix="/auth", tags=["account"])


class EmailChangeRequest(BaseModel):
    current_password: str = Field(max_length=128)
    new_email: str = Field(max_length=255)


class PasswordChangeRequest(BaseModel):
    current_password: str = Field(max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class ChallengeVerification(BaseModel):
    challenge_id: str = Field(min_length=32, max_length=32)
    code: str = Field(pattern=r"^\d{6}$")


class PasswordConfirmation(BaseModel):
    password: str = Field(max_length=128)


def client_ip(request):
    # Only trust the direct peer. Forwarded headers require trusted proxy configuration.
    return request.client.host if request.client else "unknown"


@account_router.post("/email-change/request", status_code=202)
def request_email(payload: EmailChangeRequest, request: Request, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    return service.request_change(db, user_id, "email", payload, client_ip(request))


@account_router.post("/password-change/request", status_code=202)
def request_password(payload: PasswordChangeRequest, request: Request, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    return service.request_change(db, user_id, "password", payload, client_ip(request))


@account_router.post("/email-change/verify", response_model=TokenResponse)
def verify_email(payload: ChallengeVerification, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    return service.verify_change(db, user_id, "email", payload)


@account_router.post("/password-change/verify", response_model=TokenResponse)
def verify_password(payload: ChallengeVerification, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    return service.verify_change(db, user_id, "password", payload)
