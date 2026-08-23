import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Any

import jwt
from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pwdlib import PasswordHash

from src.api import settings
from src.api.errors import ApiError

password_hash = PasswordHash.recommended()

# Declarado apenas para que o Swagger exiba o botao "Authorize" e o cadeado nas
# rotas protegidas. A validacao do token continua sendo feita manualmente a
# partir do header Authorization em get_current_user_id.
bearer_scheme = HTTPBearer(
    auto_error=False,
    description="Token JWT obtido em /auth/login ou /auth/verify-email.",
)

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

def get_current_user_id(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> int:
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
