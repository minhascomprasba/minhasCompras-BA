"""Account operations share database locks with import creation and completion."""
from datetime import datetime, timedelta
import hashlib
import hmac
from uuid import uuid4

from sqlalchemy import delete, func, inspect, select, text, update
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.dialects.postgresql import insert as postgres_insert
from sqlalchemy.exc import IntegrityError

from src.api.errors import ApiError, ConflictError, ValidationError
from src.api.security import create_access_token, get_password_hash, verify_password
from src.database.models import AccountChallenge, AccountRateLimit, PasswordResetToken, Usuario


def lock_user(db, user_id):
    # A write lock also serializes SQLite, where SELECT FOR UPDATE is ignored.
    result = db.execute(update(Usuario).where(Usuario.id == user_id).values(id=Usuario.id))
    if not result.rowcount:
        raise ApiError("USER_NOT_FOUND", "Conta não encontrada.", 404)
    user = db.get(Usuario, user_id, populate_existing=True)
    return user


def confirm_password(user, password, field="password"):
    try:
        valid = verify_password(password, user.password_hash)
    except (ValueError, TypeError):
        valid = False
    if not valid:
        raise ValidationError("WRONG_PASSWORD", "Senha atual incorreta.", {"field": field})


def invalidate_credentials(db, user):
    user.credential_version += 1
    now = datetime.utcnow()
    db.query(AccountChallenge).filter_by(usuario_id=user.id, used_at=None).update({"used_at": now})
    db.query(PasswordResetToken).filter_by(usuario_id=user.id, used_at=None).update({"used_at": now})


def token_response(user):
    return {"access_token": create_access_token(user.id, user.credential_version), "token_type": "bearer",
            "user": {"id": user.id, "email": user.email, "role": user.role}}


def check_email(db, email, user_id):
    import re
    email = email.strip().lower()
    if len(email) > 255 or not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email):
        raise ValidationError("INVALID_EMAIL", "Informe um e-mail válido.", {"field": "new_email"})
    if db.scalar(select(Usuario.id).where(func.lower(Usuario.email) == email, Usuario.id != user_id)):
        raise ConflictError("EMAIL_IN_USE", "Este e-mail já está em uso.")
    return email


def consume_rate_limit(db, user_id, ip):
    now = datetime.utcnow()
    window = now.replace(second=0, microsecond=0)
    insert = postgres_insert if db.bind.dialect.name == "postgresql" else sqlite_insert
    for identity in (f"user:{user_id}", f"ip:{ip}"):
        key = hashlib.sha256(identity.encode()).hexdigest()
        db.execute(insert(AccountRateLimit).values(key=key, window=window, count=0).on_conflict_do_nothing(index_elements=["key"]))
        db.execute(update(AccountRateLimit).where(AccountRateLimit.key == key, AccountRateLimit.window < window).values(window=window, count=0))
        result = db.execute(update(AccountRateLimit).where(AccountRateLimit.key == key, AccountRateLimit.count < 3).values(count=AccountRateLimit.count + 1))
        if not result.rowcount:
            db.commit()
            raise ApiError("RATE_LIMIT_EXCEEDED", "Limite de três solicitações por minuto. Tente novamente em instantes.", 429)
    # Count failed password checks and failed deliveries as requests too.
    db.commit()


def pin_hash(challenge_id, code):
    from src.api import settings
    return hmac.new(settings.JWT_SECRET.encode(), f"{challenge_id}:{code}".encode(), hashlib.sha256).hexdigest()


def request_change(db, user_id, operation, payload, ip):
    from src.api.auth import _validate_password_rules, _validate_password_strength
    from src.api.security import generate_verification_code
    from src.api.services.email_service import send_account_change_code
    if operation == "password":
        try:
            _validate_password_rules(payload.new_password)
            _validate_password_strength(payload.new_password)
        except ValidationError as exc:
            exc.details["field"] = "new_password"
            raise
    consume_rate_limit(db, user_id, ip)
    user = lock_user(db, user_id)
    confirm_password(user, payload.current_password, "current_password")
    if operation == "email":
        proposed = check_email(db, payload.new_email, user_id)
        destination = proposed
    else:
        proposed = get_password_hash(payload.new_password)
        destination = user.email
    now = datetime.utcnow()
    db.query(AccountChallenge).filter_by(usuario_id=user_id, operation=operation, used_at=None).update({"used_at": now})
    challenge_id = uuid4().hex
    code, _ = generate_verification_code()
    challenge = AccountChallenge(id=challenge_id, usuario_id=user_id, operation=operation,
        credential_version=user.credential_version, proposed_value=proposed,
        code_hash=pin_hash(challenge_id, code), expires_at=now + timedelta(minutes=15))
    db.add(challenge)
    try:
        # Success is returned only when the SMTP server accepts the message.
        send_account_change_code(destination, code, operation)
        db.commit()
    except Exception as exc:
        db.rollback()
        raise ApiError("EMAIL_DELIVERY_FAILED", "Não foi possível enviar o código. Tente novamente.", 503) from exc
    return {"challenge_id": challenge_id, "expires_at": challenge.expires_at, "message": "Código enviado. Válido por 15 minutos."}


def verify_change(db, user_id, operation, payload):
    user = lock_user(db, user_id)
    now = datetime.utcnow()
    challenge = db.get(AccountChallenge, payload.challenge_id)
    if (not challenge or challenge.usuario_id != user_id or challenge.operation != operation
            or challenge.credential_version != user.credential_version or challenge.used_at
            or challenge.expires_at <= now or challenge.attempts >= 5):
        raise ValidationError("INVALID_CHALLENGE", "Código inválido ou expirado. Solicite um novo código.", {"field": "code"})
    challenge.attempts += 1
    if not hmac.compare_digest(challenge.code_hash, pin_hash(challenge.id, payload.code)):
        if challenge.attempts >= 5:
            challenge.used_at = now
        db.commit()
        raise ValidationError("INVALID_CODE", "Código incorreto. Após cinco tentativas, solicite outro.", {"field": "code"})
    if operation == "email":
        user.email = check_email(db, challenge.proposed_value, user_id)
    else:
        user.password_hash = challenge.proposed_value
    invalidate_credentials(db, user)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise ConflictError("EMAIL_IN_USE", "Este e-mail já está em uso.") from exc
    return token_response(user)
