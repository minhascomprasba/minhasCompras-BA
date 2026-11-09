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


@account_router.delete("/me", status_code=202)
def delete_me(payload: PasswordConfirmation, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    return service.schedule_account_deletion(db, user_id, password=payload.password)


@account_router.post("/me/export")
def export_me(payload: PasswordConfirmation, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    from src.api.services.export_service import export_account
    user = service.lock_user(db, user_id)
    service.confirm_password(user, payload.password)
    return export_account(db, user)


class CancelDeletionRequest(BaseModel):
    token: str = Field(min_length=20, max_length=200)


@account_router.post("/account-deletion/cancel")
def cancel_deletion(payload: CancelDeletionRequest, db: Session = Depends(get_db)):
    return service.cancel_account_deletion(db, payload.token)
