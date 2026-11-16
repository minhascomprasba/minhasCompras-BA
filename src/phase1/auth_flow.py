from __future__ import annotations

import io
import os
import re
from pathlib import Path

from dotenv import load_dotenv
from PIL import Image

from utils.logger import setup_logger

from .sefaz_client import SefazError, SefazSession
from .selectors import ACCESS_KEY_INPUT_ID, CAPTCHA_IMAGE_ID, CAPTCHA_INPUT_ID, SUBMIT_BUTTON_ID

DEFAULT_SEFAZ_URL = "https://nfe.sefaz.ba.gov.br/servicos/nfce/Modulos/Geral/NFCEC_consulta_chave_acesso.aspx"


def _get_env_int(name: str, default: int) -> int:
    value = os.getenv(name, "").strip()
    if not value:
        return default
    try:
        return int(value)
    except ValueError:
        return default


def _validate_access_key(access_key: str) -> None:
    if not re.fullmatch(r"\d{44}", access_key):
        raise ValueError("NFE_ACCESS_KEY invalida: informe exatamente 44 digitos numericos.")


def format_access_key(access_key: str) -> str:
    """Aplica a mesma mascara que o JS da pagina (ativar_mascara_nota) poe no campo."""
    k = access_key
    return (
        f"{k[0:2]}-{k[2:6]}-{k[6:8]}.{k[8:11]}.{k[11:14]}/{k[14:18]}-{k[18:20]}-{k[20:22]}-"
        f"{k[22:25]}-{k[25:28]}.{k[28:31]}.{k[31:34]}-{k[34:37]}.{k[37:40]}.{k[40:43]}-{k[43]}"
    )


def _capture_captcha(session: SefazSession, output_path: Path) -> None:
    img = session.current_page.find_by_id(CAPTCHA_IMAGE_ID)
    if img is None or not img.get("src"):
        raise SefazError("Imagem do captcha nao encontrada na pagina de consulta.")

    # Cada GET gera um novo codigo na sessao ASP.NET; por isso o captcha e
    # sempre baixado depois da pagina e com os mesmos cookies.
    content = session.get_bytes(img["src"])
    try:
        image = Image.open(io.BytesIO(content))
        image.load()
    except Exception as exc:
        raise SefazError("Resposta do captcha nao e uma imagem valida.") from exc

    output_path.parent.mkdir(parents=True, exist_ok=True)
    # O portal entrega JPEG; a API sempre serviu PNG.
    image.save(output_path, format="PNG")


def _safe_close(session: SefazSession) -> None:
    try:
        session.close()
    except Exception:
        pass


def open_consulta_page(timeout_seconds: int) -> SefazSession:
    """Abre a pagina de consulta da SEFAZ, pronta para receber a chave."""
    sefaz_url = os.getenv("SEFAZ_URL", DEFAULT_SEFAZ_URL).strip() or DEFAULT_SEFAZ_URL

    session = SefazSession(timeout_seconds)
    try:
        page = session.get(sefaz_url)
        if not page.has_element(ACCESS_KEY_INPUT_ID):
            raise SefazError("Pagina de consulta da SEFAZ sem o campo da chave de acesso.")
        return session
    except Exception:
        _safe_close(session)
        raise


def start_auth_session(access_key: str, timeout_seconds: int, captcha_output_path: Path) -> SefazSession:
    """Abre a consulta, guarda a chave e baixa o captcha."""
    _validate_access_key(access_key)
    setup_logger().info("Abrindo portal da SEFAZ BA.")

    session = open_consulta_page(timeout_seconds)
    try:
        session.access_key = access_key
        _capture_captcha(session, captcha_output_path)
        return session
    except Exception:
        _safe_close(session)
        raise


def submit_captcha_attempt(session: SefazSession, captcha_code: str, timeout_seconds: int) -> bool:
    if session.access_key is None:
        raise SefazError("Sessao sem chave de acesso.")
    page = session.current_page
    if not page.has_element(SUBMIT_BUTTON_ID):
        raise SefazError("Botao de consulta nao encontrado na pagina atual.")

    initial_url = page.url
    session.click(
        SUBMIT_BUTTON_ID,
        fields={
            ACCESS_KEY_INPUT_ID: format_access_key(session.access_key),
            CAPTCHA_INPUT_ID: captcha_code.strip(),
        },
    )

    result = session.current_page
    if result.url != initial_url:
        return True
    # Voltou para a mesma pagina com o campo da chave: captcha recusado.
    return not result.has_element(ACCESS_KEY_INPUT_ID)


def refresh_captcha_image(session: SefazSession, timeout_seconds: int, captcha_output_path: Path) -> None:
    _capture_captcha(session, captcha_output_path)


def run_phase1_auth_flow() -> SefazSession:
    """Fluxo em CLI para depuracao: salva o captcha e pede o codigo no terminal."""
    load_dotenv()
    logger = setup_logger()

    access_key = os.getenv("NFE_ACCESS_KEY", "").strip()
    timeout_seconds = _get_env_int("PAGE_TIMEOUT_SECONDS", 20)
    max_attempts = _get_env_int("MAX_CAPTCHA_ATTEMPTS", 5)

    captcha_path = Path("data/captchas/current_captcha.png")
    session = start_auth_session(access_key, timeout_seconds, captcha_path)

    try:
        for attempt in range(1, max_attempts + 1):
            if attempt > 1:
                refresh_captcha_image(session, timeout_seconds, captcha_path)
            print(f"Captcha salvo em {captcha_path.resolve()}")

            captcha_code = input(f"Captcha (tentativa {attempt}/{max_attempts}) - digite o codigo: ").strip()
            if submit_captcha_attempt(session, captcha_code, timeout_seconds):
                logger.info("Autenticacao concluida com sucesso.")
                return session

            logger.warning("Tentativa %s falhou. Captcha possivelmente invalido.", attempt)

        raise RuntimeError("Limite de tentativas de captcha atingido.")
    except Exception:
        _safe_close(session)
        logger.exception("Fluxo da Fase 1 finalizado com erro.")
        raise
