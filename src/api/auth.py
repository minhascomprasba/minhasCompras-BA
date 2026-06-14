from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from src.api import settings
from src.api.errors import ApiError, RateLimitError, ValidationError
from src.api.rate_limit import InMemoryRateLimiter
from src.api.schemas import (
    ForgotPasswordRequest,
    MessageResponse,
    ResetPasswordRequest,
    TokenResponse,
    UserLoginRequest,
    UserRegisterRequest,
    UserResponse,
)
from src.api.security import (
    create_access_token,
    generate_reset_token,
    get_current_user_id,
    get_password_hash,
    hash_reset_token,
    verify_password,
)
from src.api.services.email_service import send_password_reset_email
from src.database.connection import SessionLocal
from src.database.models import PasswordResetToken, Usuario

auth_router = APIRouter(prefix="/auth", tags=["auth"])
PASSWORD_MIN_LENGTH = 8
PASSWORD_MAX_LENGTH = 128
password_reset_rate_limiter = InMemoryRateLimiter(settings.PASSWORD_RESET_RATE_LIMIT_PER_MIN)

FORGOT_PASSWORD_SUCCESS_MESSAGE = (
    "Se o e-mail estiver cadastrado, você receberá instruções para redefinir sua senha."
)
RESET_PASSWORD_SUCCESS_MESSAGE = "Senha redefinida com sucesso. Você já pode fazer login."


def _validate_password_rules(password: str) -> None:
    if len(password) < PASSWORD_MIN_LENGTH:
        raise ValidationError(
            "INVALID_PASSWORD",
            "A senha deve ter no minimo 8 caracteres.",
            {"field": "password", "rule": "min_length", "min_length": PASSWORD_MIN_LENGTH},
        )
    if len(password) > PASSWORD_MAX_LENGTH:
        raise ValidationError(
            "INVALID_PASSWORD",
            "A senha deve ter no maximo 128 caracteres.",
            {"field": "password", "rule": "max_length", "max_length": PASSWORD_MAX_LENGTH},
        )


def _get_client_ip(request: Request) -> str:
    x_forwarded_for = request.headers.get("x-forwarded-for", "").strip()
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    if request.client is None:
        return "unknown"
    return request.client.host


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@auth_router.post("/register", response_model=TokenResponse, status_code=201)
def register(payload: UserRegisterRequest, db: Session = Depends(get_db)):
    _validate_password_rules(payload.password)

    existing_user = db.query(Usuario).filter(Usuario.email == payload.email).first()
    if existing_user:
        raise ApiError("EMAIL_IN_USE", "Este e-mail já está em uso.", status_code=400)

    try:
        hashed = get_password_hash(payload.password)
    except ValueError as exc:
        raise ValidationError(
            "INVALID_PASSWORD",
            "Nao foi possivel processar a senha informada.",
            {"field": "password", "reason": "hash_error"},
        ) from exc
    new_user = Usuario(email=payload.email, password_hash=hashed)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token(new_user.id)
    return TokenResponse(
        access_token=token,
        user=UserResponse(id=new_user.id, email=new_user.email),
    )


@auth_router.post("/login", response_model=TokenResponse)
def login(payload: UserLoginRequest, db: Session = Depends(get_db)):
    _validate_password_rules(payload.password)

    user = db.query(Usuario).filter(Usuario.email == payload.email).first()
    if not user:
        raise ApiError("INVALID_CREDENTIALS", "E-mail ou senha inválidos.", status_code=401)

    try:
        is_valid_password = verify_password(payload.password, user.password_hash)
    except ValueError as exc:
        raise ValidationError(
            "INVALID_PASSWORD",
            "Nao foi possivel validar a senha informada.",
            {"field": "password", "reason": "verify_error"},
        ) from exc

    if not is_valid_password:
        raise ApiError("INVALID_CREDENTIALS", "E-mail ou senha inválidos.", status_code=401)

    token = create_access_token(user.id)
    return TokenResponse(
        access_token=token,
        user=UserResponse(id=user.id, email=user.email),
    )


@auth_router.get("/me", response_model=UserResponse)
def get_me(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    user = db.query(Usuario).filter(Usuario.id == user_id).first()
    if not user:
        raise ApiError("USER_NOT_FOUND", "Usuário não encontrado.", status_code=404)
    return UserResponse(id=user.id, email=user.email)


@auth_router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(
    payload: ForgotPasswordRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    client_ip = _get_client_ip(request)
    if not password_reset_rate_limiter.allow(client_ip):
        raise RateLimitError(
            code="RATE_LIMIT_EXCEEDED",
            message="Limite de requisicoes excedido. Tente novamente em instantes.",
            details={"ip": client_ip},
        )

    user = db.query(Usuario).filter(Usuario.email == payload.email).first()
    if user:
        now = datetime.utcnow()
        db.query(PasswordResetToken).filter(
            PasswordResetToken.usuario_id == user.id,
            PasswordResetToken.used_at.is_(None),
        ).update({"used_at": now})

        raw_token, token_hash = generate_reset_token()
        expires_at = now + timedelta(minutes=settings.PASSWORD_RESET_TOKEN_EXPIRATION_MINUTES)
        reset_token = PasswordResetToken(
            usuario_id=user.id,
            token_hash=token_hash,
            expires_at=expires_at,
        )
        db.add(reset_token)
        db.commit()

        reset_url = f"{settings.FRONTEND_URL}/redefinir-senha?token={raw_token}"
        send_password_reset_email(user.email, reset_url)

    return MessageResponse(message=FORGOT_PASSWORD_SUCCESS_MESSAGE)


@auth_router.post("/reset-password", response_model=MessageResponse)
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    _validate_password_rules(payload.password)

    token_hash = hash_reset_token(payload.token)
    now = datetime.utcnow()
    reset_token = (
        db.query(PasswordResetToken)
        .filter(
            PasswordResetToken.token_hash == token_hash,
            PasswordResetToken.used_at.is_(None),
            PasswordResetToken.expires_at > now,
        )
        .first()
    )
    if not reset_token:
        raise ApiError(
            "INVALID_RESET_TOKEN",
            "Link de redefinição inválido ou expirado.",
            status_code=400,
        )

    user = db.query(Usuario).filter(Usuario.id == reset_token.usuario_id).first()
    if not user:
        raise ApiError("USER_NOT_FOUND", "Usuário não encontrado.", status_code=404)

    try:
        user.password_hash = get_password_hash(payload.password)
    except ValueError as exc:
        raise ValidationError(
            "INVALID_PASSWORD",
            "Nao foi possivel processar a senha informada.",
            {"field": "password", "reason": "hash_error"},
        ) from exc

    reset_token.used_at = now
    db.query(PasswordResetToken).filter(
        PasswordResetToken.usuario_id == user.id,
        PasswordResetToken.id != reset_token.id,
        PasswordResetToken.used_at.is_(None),
    ).update({"used_at": now})
    db.commit()

    return MessageResponse(message=RESET_PASSWORD_SUCCESS_MESSAGE)
