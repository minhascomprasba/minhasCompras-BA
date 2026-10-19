from __future__ import annotations

import os
import re
from pathlib import Path

from dotenv import load_dotenv
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.common.by import By
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from utils.browser import build_chrome_driver, open_file_with_default_viewer
from utils.logger import setup_logger

from .selectors import ACCESS_KEY_INPUT_ID, CAPTCHA_IMAGE_ID, CAPTCHA_INPUT_ID, SUBMIT_BUTTON_ID


def _get_env_int(name: str, default: int) -> int:
    value = os.getenv(name, "").strip()
    if not value:
        return default
    try:
        return int(value)
    except ValueError:
        return default


def _wait_visible(driver: WebDriver, element_id: str, timeout_seconds: int):
    return WebDriverWait(driver, timeout_seconds).until(
        EC.visibility_of_element_located((By.ID, element_id))
    )


def _validate_access_key(access_key: str) -> None:
    if not re.fullmatch(r"\d{44}", access_key):
        raise ValueError("NFE_ACCESS_KEY invalida: informe exatamente 44 digitos numericos.")


def _wait_captcha_loaded(driver: WebDriver, timeout_seconds: int) -> None:
    # A <img> tem width/height fixos, entao fica "visivel" antes do PNG chegar.
    WebDriverWait(driver, timeout_seconds).until(
        lambda d: d.execute_script(
            "const img = document.getElementById(arguments[0]);"
            "return !!img && img.complete && img.naturalWidth > 0;",
            CAPTCHA_IMAGE_ID,
        )
    )


def _capture_captcha(driver: WebDriver, timeout_seconds: int, output_path: Path) -> None:
    captcha = _wait_visible(driver, CAPTCHA_IMAGE_ID, timeout_seconds)
    _wait_captcha_loaded(driver, timeout_seconds)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    if not captcha.screenshot(str(output_path)):
        raise RuntimeError("Falha ao salvar screenshot do captcha.")


def _did_auth_succeed(driver: WebDriver, timeout_seconds: int, initial_url: str, submit_button) -> bool:
    # O formulario faz postback completo: espera a pagina antiga ser descartada.
    # Se nada acontecer (ex.: validacao client-side bloqueou), conta como falha.
    try:
        WebDriverWait(driver, timeout_seconds).until(EC.staleness_of(submit_button))
    except TimeoutException:
        return False

    def _outcome(d: WebDriver) -> str | bool:
        if d.current_url != initial_url:
            return "ok"
        if d.execute_script("return document.readyState") == "loading":
            return False
        # Voltou para a mesma pagina com o campo da chave: captcha recusado.
        return "fail" if d.find_elements(By.ID, ACCESS_KEY_INPUT_ID) else "ok"

    try:
        return WebDriverWait(driver, timeout_seconds).until(_outcome) == "ok"
    except TimeoutException:
        return False


def _safe_quit(driver: WebDriver) -> None:
    try:
        driver.quit()
    except Exception:
        pass


def open_consulta_page(timeout_seconds: int, headless: bool) -> WebDriver:
    """Abre o Chrome ja na pagina de consulta da SEFAZ, pronto para receber a chave."""
    sefaz_url = os.getenv(
        "SEFAZ_URL", "https://nfe.sefaz.ba.gov.br/servicos/nfce/Modulos/Geral/NFCEC_consulta_chave_acesso.aspx"
    ).strip()

    driver = build_chrome_driver(headless=headless)
    try:
        driver.get(sefaz_url)
        _wait_visible(driver, ACCESS_KEY_INPUT_ID, timeout_seconds)
        return driver
    except Exception:
        _safe_quit(driver)
        raise


def _prepare_captcha(driver: WebDriver, access_key: str, timeout_seconds: int, captcha_output_path: Path) -> None:
    access_key_input = _wait_visible(driver, ACCESS_KEY_INPUT_ID, timeout_seconds)
    access_key_input.clear()
    access_key_input.send_keys(access_key)
    _capture_captcha(driver, timeout_seconds, captcha_output_path)


def start_auth_session(
    access_key: str,
    timeout_seconds: int,
    headless: bool,
    captcha_output_path: Path,
    driver: WebDriver | None = None,
) -> WebDriver:
    """Preenche a chave e captura o captcha.

    Aceita um driver pre-aquecido (pagina ja aberta); se ele falhar, abre um novo.
    """
    try:
        _validate_access_key(access_key)
    except ValueError:
        if driver is not None:
            _safe_quit(driver)
        raise
    logger = setup_logger()

    if driver is not None:
        try:
            _prepare_captcha(driver, access_key, timeout_seconds, captcha_output_path)
            logger.info("Captcha capturado com driver pre-aquecido.")
            return driver
        except Exception:
            logger.warning("Driver pre-aquecido falhou; abrindo um novo.", exc_info=True)
            _safe_quit(driver)

    logger.info("Abrindo portal da SEFAZ BA.")
    driver = open_consulta_page(timeout_seconds, headless)
    try:
        _prepare_captcha(driver, access_key, timeout_seconds, captcha_output_path)
        return driver
    except Exception:
        _safe_quit(driver)
        raise


def submit_captcha_attempt(driver: WebDriver, captcha_code: str, timeout_seconds: int) -> bool:
    captcha_input = _wait_visible(driver, CAPTCHA_INPUT_ID, timeout_seconds)
    captcha_input.clear()
    captcha_input.send_keys(captcha_code.strip())

    submit_button = WebDriverWait(driver, timeout_seconds).until(
        EC.element_to_be_clickable((By.ID, SUBMIT_BUTTON_ID))
    )
    initial_url = driver.current_url
    submit_button.click()
    return _did_auth_succeed(driver, timeout_seconds, initial_url, submit_button)


def refresh_captcha_image(driver: WebDriver, timeout_seconds: int, captcha_output_path: Path) -> None:
    _capture_captcha(driver, timeout_seconds, captcha_output_path)


def run_phase1_auth_flow() -> WebDriver:
    load_dotenv()
    logger = setup_logger()

    access_key = os.getenv("NFE_ACCESS_KEY", "").strip()
    timeout_seconds = _get_env_int("PAGE_TIMEOUT_SECONDS", 20)
    max_attempts = _get_env_int("MAX_CAPTCHA_ATTEMPTS", 5)
    headless = os.getenv("HEADLESS", "false").strip().lower() == "true"

    captcha_path = Path("data/captchas/current_captcha.png")
    driver = start_auth_session(
        access_key=access_key,
        timeout_seconds=timeout_seconds,
        headless=headless,
        captcha_output_path=captcha_path,
    )

    try:
        for attempt in range(1, max_attempts + 1):
            if attempt > 1:
                refresh_captcha_image(driver, timeout_seconds, captcha_path)
            open_file_with_default_viewer(str(captcha_path.resolve()))

            captcha_code = input(
                f"Captcha (tentativa {attempt}/{max_attempts}) - digite o codigo: "
            ).strip()

            did_succeed = submit_captcha_attempt(driver, captcha_code, timeout_seconds)
            logger.info("Captcha enviado (tentativa %s).", attempt)

            if did_succeed:
                logger.info("Autenticacao concluida com sucesso. Navegador sera mantido aberto.")
                return driver

            logger.warning("Tentativa %s falhou. Captcha possivelmente invalido.", attempt)

        raise RuntimeError("Limite de tentativas de captcha atingido.")
    except Exception:
        logger.exception("Fluxo da Fase 1 finalizado com erro.")
        raise
