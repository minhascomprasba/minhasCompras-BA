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


def _capture_captcha(driver: WebDriver, timeout_seconds: int, output_path: Path) -> None:
    captcha = _wait_visible(driver, CAPTCHA_IMAGE_ID, timeout_seconds)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    if not captcha.screenshot(str(output_path)):
        raise RuntimeError("Falha ao salvar screenshot do captcha.")


def _did_auth_succeed(driver: WebDriver, timeout_seconds: int, initial_url: str) -> bool:
    try:
        WebDriverWait(driver, timeout_seconds).until(lambda d: d.current_url != initial_url)
        return True
    except TimeoutException:
        pass

    try:
        WebDriverWait(driver, timeout_seconds).until_not(
            EC.presence_of_element_located((By.ID, ACCESS_KEY_INPUT_ID))
        )
        return True
    except TimeoutException:
        return False


def start_auth_session(access_key: str, timeout_seconds: int, headless: bool, captcha_output_path: Path) -> WebDriver:
    _validate_access_key(access_key)

    logger = setup_logger()
    sefaz_url = os.getenv(
        "SEFAZ_URL", "https://nfe.sefaz.ba.gov.br/servicos/nfce/Modulos/Geral/NFCEC_consulta_chave_acesso.aspx"
    ).strip()

    driver = build_chrome_driver(headless=headless)
    try:
        logger.info("Abrindo portal da SEFAZ BA.")
        driver.get(sefaz_url)

        access_key_input = _wait_visible(driver, ACCESS_KEY_INPUT_ID, timeout_seconds)
        access_key_input.clear()
        access_key_input.send_keys(access_key)
        logger.info("Chave de acesso preenchida automaticamente.")

        _capture_captcha(driver, timeout_seconds, captcha_output_path)
        return driver
    except Exception:
        driver.quit()
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
    return _did_auth_succeed(driver, timeout_seconds=5, initial_url=initial_url)


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
