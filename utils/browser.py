from __future__ import annotations

import os

from selenium.webdriver.chrome.options import Options as ChromeOptions
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.webdriver.chrome.webdriver import WebDriver as ChromeDriver
from selenium.webdriver.remote.webdriver import WebDriver
from webdriver_manager.chrome import ChromeDriverManager


def build_chrome_driver(headless: bool = False) -> WebDriver:
    options = ChromeOptions()
    options.add_experimental_option("detach", True)
    options.add_argument("--disable-extensions")
    options.add_argument("--disable-background-networking")
    options.add_argument("--disable-background-timer-throttling")
    options.add_argument("--disable-renderer-backgrounding")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--ignore-certificate-errors")
    options.add_argument("--ignore-ssl-errors")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-gpu")
    options.add_argument("--window-size=1920,1080")

    if headless:
        options.add_argument("--headless=new")

    chrome_bin = os.getenv("CHROME_BIN", "").strip()
    if chrome_bin:
        options.binary_location = chrome_bin

    chromedriver_path = os.getenv("CHROMEDRIVER_PATH", "").strip()
    if chromedriver_path:
        service = ChromeService(chromedriver_path)
        return ChromeDriver(service=service, options=options)

    try:
        return ChromeDriver(options=options)
    except Exception:
        service = ChromeService(ChromeDriverManager().install())
        return ChromeDriver(service=service, options=options)


def open_file_with_default_viewer(file_path: str) -> None:
    os.startfile(file_path)  # type: ignore[attr-defined]
