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
