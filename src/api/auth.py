import re
from datetime import datetime, timedelta

from fastapi import APIRouter, BackgroundTasks, Depends, Request
from sqlalchemy.orm import Session

from src.api import settings
from src.api.errors import ApiError, RateLimitError, ValidationError
from src.api.rate_limit import InMemoryRateLimiter
from src.api.schemas import (
    ForgotPasswordRequest,
    MessageResponse,
    ResendCodeRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserLoginRequest,
    UserRegisterRequest,
    UserResponse,
    VerifyEmailRequest,
)
from src.api.security import (
    create_access_token,
    generate_reset_token,
    generate_verification_code,
    get_current_user_id,
    get_password_hash,
    hash_reset_token,
    hash_verification_code,
    verify_password,
)
from src.api.services.email_service import (
    send_email_verification_code,
    send_password_reset_email,
)
from src.database.connection import SessionLocal
from src.database.models import EmailVerificationCode, PasswordResetToken, Usuario, UserRole

auth_router = APIRouter(prefix="/auth", tags=["auth"])
PASSWORD_MIN_LENGTH = 8
PASSWORD_MAX_LENGTH = 128
password_reset_rate_limiter = InMemoryRateLimiter(settings.PASSWORD_RESET_RATE_LIMIT_PER_MIN)
email_verification_rate_limiter = InMemoryRateLimiter(settings.EMAIL_VERIFICATION_RATE_LIMIT_PER_MIN)

FORGOT_PASSWORD_SUCCESS_MESSAGE = (
    "Se o e-mail estiver cadastrado, você receberá instruções para redefinir sua senha."
)
RESET_PASSWORD_SUCCESS_MESSAGE = "Senha redefinida com sucesso. Você já pode fazer login."
VERIFICATION_CODE_SENT_MESSAGE = (
    "Enviamos um código de confirmação para o seu e-mail. Insira-o para concluir o cadastro."
)


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


def _validate_password_strength(password: str) -> None:
    if not re.search(r"[A-Z]", password):
        raise ValidationError(
            "WEAK_PASSWORD",
            "A senha deve conter ao menos uma letra maiúscula.",
            {"field": "password", "rule": "uppercase"},
        )
    if not re.search(r"[a-z]", password):
        raise ValidationError(
            "WEAK_PASSWORD",
            "A senha deve conter ao menos uma letra minúscula.",
            {"field": "password", "rule": "lowercase"},
        )
    if not re.search(r"\d", password):
        raise ValidationError(
            "WEAK_PASSWORD",
            "A senha deve conter ao menos um número.",
            {"field": "password", "rule": "digit"},
        )
    if not re.search(r"[^A-Za-z0-9]", password):
        raise ValidationError(
            "WEAK_PASSWORD",
            "A senha deve conter ao menos um caractere especial.",
            {"field": "password", "rule": "special"},
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


def _issue_verification_code(db: Session, email: str, password_hash: str, background_tasks: BackgroundTasks = None) -> None:
    now = datetime.utcnow()
    db.query(EmailVerificationCode).filter(
        EmailVerificationCode.email == email,
        EmailVerificationCode.used_at.is_(None),
    ).update({"used_at": now})

    raw_code, code_hash = generate_verification_code()
    expires_at = now + timedelta(minutes=settings.EMAIL_VERIFICATION_CODE_EXPIRATION_MINUTES)
    verification = EmailVerificationCode(
        email=email,
        password_hash=password_hash,
        code_hash=code_hash,
        expires_at=expires_at,
    )
    db.add(verification)
    db.commit()

    if background_tasks:
        background_tasks.add_task(send_email_verification_code, email, raw_code)
    else:
        send_email_verification_code(email, raw_code)


@auth_router.post("/register", response_model=MessageResponse, status_code=202)
def register(payload: UserRegisterRequest, request: Request, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    _validate_password_rules(payload.password)
    _validate_password_strength(payload.password)

    client_ip = _get_client_ip(request)
    if not email_verification_rate_limiter.allow(client_ip):
        raise RateLimitError(
            code="RATE_LIMIT_EXCEEDED",
            message="Limite de requisicoes excedido. Tente novamente em instantes.",
            details={"ip": client_ip},
        )

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

    _issue_verification_code(db, payload.email, hashed, background_tasks)

    return MessageResponse(message=VERIFICATION_CODE_SENT_MESSAGE)


@auth_router.post("/verify-email", response_model=TokenResponse, status_code=201)
def verify_email(payload: VerifyEmailRequest, db: Session = Depends(get_db)):
    now = datetime.utcnow()

    existing_user = db.query(Usuario).filter(Usuario.email == payload.email).first()
    if existing_user:
        raise ApiError("EMAIL_IN_USE", "Este e-mail já está em uso.", status_code=400)

    verification = (
        db.query(EmailVerificationCode)
        .filter(
            EmailVerificationCode.email == payload.email,
            EmailVerificationCode.used_at.is_(None),
        )
        .order_by(EmailVerificationCode.created_at.desc())
        .first()
    )

    if not verification or verification.expires_at <= now:
        raise ApiError(
            "INVALID_VERIFICATION_CODE",
            "Código inválido ou expirado. Solicite um novo código.",
            status_code=400,
        )

    if verification.attempts >= settings.EMAIL_VERIFICATION_MAX_ATTEMPTS:
        verification.used_at = now
        db.commit()
        raise ApiError(
            "VERIFICATION_ATTEMPTS_EXCEEDED",
            "Número máximo de tentativas excedido. Solicite um novo código.",
            status_code=400,
        )

    if verification.code_hash != hash_verification_code(payload.code):
        verification.attempts += 1
        db.commit()
        raise ApiError(
            "INVALID_VERIFICATION_CODE",
            "Código inválido ou expirado. Solicite um novo código.",
            status_code=400,
        )

    initial_role = (
        UserRole.SUPER_ADMIN.value
        if verification.email.lower() in settings.SUPER_ADMIN_EMAILS
        else UserRole.USER.value
    )
    new_user = Usuario(
        email=verification.email,
        password_hash=verification.password_hash,
        role=initial_role,
    )
    db.add(new_user)
    verification.used_at = now
    db.query(EmailVerificationCode).filter(
        EmailVerificationCode.email == verification.email,
        EmailVerificationCode.id != verification.id,
        EmailVerificationCode.used_at.is_(None),
    ).update({"used_at": now})
    db.commit()
    db.refresh(new_user)

    token = create_access_token(new_user.id)
    return TokenResponse(
        access_token=token,
        user=UserResponse(id=new_user.id, email=new_user.email, role=new_user.role),
    )


@auth_router.post("/resend-code", response_model=MessageResponse)
def resend_code(payload: ResendCodeRequest, request: Request, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    client_ip = _get_client_ip(request)
    if not email_verification_rate_limiter.allow(client_ip):
        raise RateLimitError(
            code="RATE_LIMIT_EXCEEDED",
            message="Limite de requisicoes excedido. Tente novamente em instantes.",
            details={"ip": client_ip},
        )

    existing_user = db.query(Usuario).filter(Usuario.email == payload.email).first()
    if existing_user:
        raise ApiError("EMAIL_IN_USE", "Este e-mail já está em uso.", status_code=400)

    pending = (
        db.query(EmailVerificationCode)
        .filter(
            EmailVerificationCode.email == payload.email,
            EmailVerificationCode.used_at.is_(None),
        )
        .order_by(EmailVerificationCode.created_at.desc())
        .first()
    )
    if pending:
        _issue_verification_code(db, pending.email, pending.password_hash, background_tasks)

    return MessageResponse(message=VERIFICATION_CODE_SENT_MESSAGE)


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
        user=UserResponse(id=user.id, email=user.email, role=user.role),
    )


@auth_router.get("/me", response_model=UserResponse)
def get_me(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    user = db.query(Usuario).filter(Usuario.id == user_id).first()
    if not user:
        raise ApiError("USER_NOT_FOUND", "Usuário não encontrado.", status_code=404)
    return UserResponse(id=user.id, email=user.email, role=user.role)


@auth_router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(
    payload: ForgotPasswordRequest,
    request: Request,
    background_tasks: BackgroundTasks,
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
        background_tasks.add_task(send_password_reset_email, user.email, reset_url)

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
