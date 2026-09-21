from __future__ import annotations

import os

from dotenv import load_dotenv

load_dotenv()


def _get_env_int(name: str, default: int) -> int:
    raw = os.getenv(name, "").strip()
    if not raw:
        return default
    try:
        return int(raw)
    except ValueError:
        return default


def _get_env_list(name: str, default: list[str] | None = None) -> list[str]:
    raw = os.getenv(name, "").strip()
    if not raw:
        return list(default or [])
    return [item.strip() for item in raw.split(",") if item.strip()]

JWT_SECRET = os.getenv("JWT_SECRET", "super-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = _get_env_int("JWT_EXPIRATION_HOURS", 24)

API_PREFIX = "/api/v1"
SEFAZ_URL = os.getenv(
    "SEFAZ_URL",
    "https://nfe.sefaz.ba.gov.br/servicos/nfce/Modulos/Geral/NFCEC_consulta_chave_acesso.aspx",
).strip()
PAGE_TIMEOUT_SECONDS = _get_env_int("PAGE_TIMEOUT_SECONDS", 20)
MAX_CAPTCHA_ATTEMPTS = _get_env_int("MAX_CAPTCHA_ATTEMPTS", 5)
CAPTCHA_TTL_SECONDS = _get_env_int("CAPTCHA_TTL_SECONDS", 300)
HEADLESS = os.getenv("HEADLESS", "true").strip().lower() == "true"
IMPORT_RATE_LIMIT_PER_MIN = _get_env_int("IMPORT_RATE_LIMIT_PER_MIN", 10)
CORS_ALLOWED_ORIGINS = _get_env_list("CORS_ALLOWED_ORIGINS", ["http://localhost:5173"])

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173").strip().rstrip("/")
SUPER_ADMIN_EMAILS = [email.lower() for email in _get_env_list("SUPER_ADMIN_EMAILS")]
SMTP_HOST = os.getenv("SMTP_HOST", "").strip()
SMTP_PORT = _get_env_int("SMTP_PORT", 587)
SMTP_USER = os.getenv("SMTP_USER", "").strip()
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "").strip()
SMTP_FROM = os.getenv("SMTP_FROM", "").strip()
SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "true").strip().lower() == "true"
PASSWORD_RESET_TOKEN_EXPIRATION_MINUTES = _get_env_int("PASSWORD_RESET_TOKEN_EXPIRATION_MINUTES", 60)
PASSWORD_RESET_RATE_LIMIT_PER_MIN = _get_env_int("PASSWORD_RESET_RATE_LIMIT_PER_MIN", 3)
EMAIL_VERIFICATION_CODE_EXPIRATION_MINUTES = _get_env_int("EMAIL_VERIFICATION_CODE_EXPIRATION_MINUTES", 15)
EMAIL_VERIFICATION_RATE_LIMIT_PER_MIN = _get_env_int("EMAIL_VERIFICATION_RATE_LIMIT_PER_MIN", 3)
EMAIL_VERIFICATION_MAX_ATTEMPTS = _get_env_int("EMAIL_VERIFICATION_MAX_ATTEMPTS", 5)
