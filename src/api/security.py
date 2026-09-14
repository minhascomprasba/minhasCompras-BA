import hashlib
import secrets
from collections.abc import Callable
from datetime import datetime, timedelta
from typing import Any

import jwt
from fastapi import Depends, Request
from pwdlib import PasswordHash

from src.api import settings
from src.api.errors import ApiError
from src.database.connection import SessionLocal
from src.database.models import ADMIN_ROLES, Usuario, UserRole

password_hash = PasswordHash.recommended()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return password_hash.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return password_hash.hash(password)

def generate_reset_token() -> tuple[str, str]:
    raw_token = secrets.token_urlsafe(32)
    return raw_token, hash_reset_token(raw_token)

def hash_reset_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode()).hexdigest()

def generate_verification_code() -> tuple[str, str]:
    raw_code = f"{secrets.randbelow(1_000_000):06d}"
    return raw_code, hash_verification_code(raw_code)

def hash_verification_code(raw_code: str) -> str:
    return hashlib.sha256(raw_code.encode()).hexdigest()

def create_access_token(subject: str | Any) -> str:
    expire = datetime.utcnow() + timedelta(hours=settings.JWT_EXPIRATION_HOURS)
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

def get_current_user_id(request: Request) -> int:
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise ApiError(code="UNAUTHORIZED", message="Não autorizado.", status_code=401)
    
    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        user_id_str = payload.get("sub")
        if user_id_str is None:
            raise ApiError(code="UNAUTHORIZED", message="Token inválido.", status_code=401)
        return int(user_id_str)
    except jwt.ExpiredSignatureError:
        raise ApiError(code="UNAUTHORIZED", message="Token expirado.", status_code=401)
    except (jwt.PyJWTError, ValueError):
        raise ApiError(code="UNAUTHORIZED", message="Não autorizado.", status_code=401)


def get_current_user(user_id: int = Depends(get_current_user_id)) -> Usuario:
    """Carrega o usuario autenticado do banco.

    A permissao vem sempre do banco, e nao do token, para que a alteracao de
    papel feita no painel tenha efeito imediato sem exigir novo login.
    """
    session = SessionLocal()
    try:
        usuario = session.get(Usuario, user_id)
        if usuario is None:
            raise ApiError(code="USER_NOT_FOUND", message="Usuário não encontrado.", status_code=404)
        session.expunge(usuario)
        return usuario
    finally:
        session.close()


def require_roles(*allowed_roles: str) -> Callable[[Usuario], Usuario]:
    def dependency(usuario: Usuario = Depends(get_current_user)) -> Usuario:
        if usuario.role not in allowed_roles:
            raise ApiError(
                code="FORBIDDEN",
                message="Você não tem permissão para acessar este recurso.",
                status_code=403,
                details={"required_roles": ", ".join(allowed_roles)},
            )
        return usuario

    return dependency


require_admin = require_roles(*ADMIN_ROLES)
require_super_admin = require_roles(UserRole.SUPER_ADMIN.value)
