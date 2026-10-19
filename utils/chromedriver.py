"""Garante um chromedriver compativel com o Chrome instalado em drivers/.

Se o binario nao existir (ou ficar incompativel apos o Chrome atualizar), baixa
a versao certa do Chrome for Testing na primeira vez que o driver for usado.

Tambem pode ser rodado direto (usado no build do Docker para nao baixar em runtime):
    python -m utils.chromedriver
"""

from __future__ import annotations

import io
import json
import os
import platform
import re
import subprocess
import sys
import urllib.request
import zipfile
from pathlib import Path
from threading import Lock

from utils.logger import setup_logger

CFT_URL = "https://googlechromelabs.github.io/chrome-for-testing/latest-patch-versions-per-build-with-downloads.json"
DRIVERS_DIR = Path(__file__).resolve().parent.parent / "drivers"
DRIVER_NAME = "chromedriver.exe" if sys.platform == "win32" else "chromedriver"

_download_lock = Lock()


def project_driver_path() -> Path:
    return DRIVERS_DIR / DRIVER_NAME


def _platform_key() -> str:
    if sys.platform == "win32":
        return "win64" if platform.machine().endswith("64") else "win32"
    if sys.platform == "darwin":
        return "mac-arm64" if platform.machine() == "arm64" else "mac-x64"
    return "linux64"


def _detect_chrome_version() -> str:
    if sys.platform == "win32" and not os.getenv("CHROME_BIN", "").strip():
        import winreg

        for root in (winreg.HKEY_CURRENT_USER, winreg.HKEY_LOCAL_MACHINE):
            try:
                with winreg.OpenKey(root, r"Software\Google\Chrome\BLBeacon") as key:
                    return winreg.QueryValueEx(key, "version")[0]
            except OSError:
                continue
        raise RuntimeError("Versao do Chrome nao encontrada no registro do Windows.")

    candidates = [os.getenv("CHROME_BIN", "").strip(), "google-chrome-stable", "google-chrome", "chromium", "chromium-browser"]
    for binary in filter(None, candidates):
        try:
            output = subprocess.run([binary, "--version"], capture_output=True, text=True, check=True, timeout=15).stdout
        except (OSError, subprocess.SubprocessError):
            continue
        match = re.search(r"(\d+\.\d+\.\d+\.\d+)", output)
        if match:
            return match.group(1)
    raise RuntimeError("Chrome nao encontrado. Defina CHROME_BIN.")


def _download(chrome_version: str, target: Path) -> None:
    build = ".".join(chrome_version.split(".")[:3])
    plat = _platform_key()

    with urllib.request.urlopen(CFT_URL, timeout=30) as response:
        builds = json.load(response)["builds"]
    if build not in builds:
        raise RuntimeError(f"Nenhum chromedriver publicado para o build {build}.")

    downloads = builds[build]["downloads"]["chromedriver"]
    url = next(item["url"] for item in downloads if item["platform"] == plat)
    with urllib.request.urlopen(url, timeout=120) as response:
        archive = zipfile.ZipFile(io.BytesIO(response.read()))

    member = next(item for item in archive.namelist() if item.endswith(f"/{DRIVER_NAME}"))
    target.parent.mkdir(parents=True, exist_ok=True)
    # Escreve num temporario e troca: outro processo nunca ve um binario pela metade.
    tmp_path = target.with_name(f"{target.name}.{os.getpid()}.tmp")
    tmp_path.write_bytes(archive.read(member))
    tmp_path.chmod(0o755)
    os.replace(tmp_path, target)


def ensure_chromedriver(force: bool = False) -> Path:
    """Retorna o caminho do driver do projeto, baixando se faltar (ou se force=True)."""
    target = project_driver_path()
    if target.exists() and not force:
        return target

    with _download_lock:
        # Outra thread pode ter baixado enquanto esperavamos o lock.
        if target.exists() and not force:
            return target
        logger = setup_logger()
        chrome_version = _detect_chrome_version()
        logger.info("Baixando chromedriver para Chrome %s em %s.", chrome_version, target)
        _download(chrome_version, target)
        return target


if __name__ == "__main__":
    print(ensure_chromedriver(force="--force" in sys.argv))
