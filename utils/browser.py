from __future__ import annotations

import os

from selenium.common.exceptions import SessionNotCreatedException
from selenium.webdriver.chrome.options import Options as ChromeOptions
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.webdriver.chrome.webdriver import WebDriver as ChromeDriver
from selenium.webdriver.remote.webdriver import WebDriver

from utils.chromedriver import ensure_chromedriver
from utils.logger import setup_logger


def _build_options(headless: bool) -> ChromeOptions:
    options = ChromeOptions()
    # "eager" libera o driver.get no DOMContentLoaded, sem esperar CSS/imagens.
    # A imagem do captcha e aguardada explicitamente em auth_flow.
    options.page_load_strategy = "eager"
    options.add_argument("--disable-extensions")
    options.add_argument("--disable-background-networking")
    options.add_argument("--disable-background-timer-throttling")
    options.add_argument("--disable-renderer-backgrounding")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--ignore-certificate-errors")
    options.add_argument("--ignore-ssl-errors")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-first-run")
    options.add_argument("--no-default-browser-check")
    options.add_argument("--window-size=1920,1080")

    if headless:
        options.add_argument("--headless=new")
        options.add_argument("--no-zygote")
        options.add_argument("--disable-features=dbus")
        options.add_argument("--disable-software-rasterizer")

    chrome_bin = os.getenv("CHROME_BIN", "").strip()
    if chrome_bin:
        options.binary_location = chrome_bin

    return options


def _start(driver_path: str, options: ChromeOptions) -> WebDriver:
    return ChromeDriver(service=ChromeService(driver_path), options=options)


def build_chrome_driver(headless: bool = False) -> WebDriver:
    options = _build_options(headless)

    env_path = os.getenv("CHROMEDRIVER_PATH", "").strip()
    if env_path:
        return _start(env_path, options)

    logger = setup_logger()
    try:
        driver_path = str(ensure_chromedriver())
    except Exception:
        logger.warning("Falha ao baixar chromedriver; usando Selenium Manager.", exc_info=True)
        return ChromeDriver(options=options)

    try:
        return _start(driver_path, options)
    except SessionNotCreatedException as exc:
        # So rebaixa quando o erro e de versao (Chrome atualizou); outras falhas
        # de inicializacao do Chrome nao se resolvem trocando o driver.
        if "only supports Chrome version" not in str(exc):
            raise
        logger.warning("chromedriver incompativel com o Chrome; baixando a versao correta.")

    try:
        driver_path = str(ensure_chromedriver(force=True))
    except Exception:
        logger.warning("Falha ao atualizar chromedriver; usando Selenium Manager.", exc_info=True)
        return ChromeDriver(options=options)
    return _start(driver_path, options)


def open_file_with_default_viewer(file_path: str) -> None:
    os.startfile(file_path)  # type: ignore[attr-defined]
