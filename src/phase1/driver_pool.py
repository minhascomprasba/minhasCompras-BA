"""Pool de Chrome pre-aquecido, ja parado na pagina de consulta da SEFAZ.

Tira a abertura do navegador (o passo mais lento) do caminho do usuario:
o start_import so preenche a chave e tira o screenshot do captcha.
"""

from __future__ import annotations

import time
from collections import deque
from threading import Event, Lock, Thread
from typing import Callable

from selenium.webdriver.remote.webdriver import WebDriver

from utils.logger import setup_logger


class WarmDriverPool:
    def __init__(self, size: int, max_age_seconds: int, factory: Callable[[], WebDriver]) -> None:
        self._size = max(size, 0)
        # A sessao ASP.NET (e o captcha dela) expira; descarta drivers antigos.
        self._max_age_seconds = max(max_age_seconds, 30)
        self._factory = factory
        self._ready: deque[tuple[float, WebDriver]] = deque()
        self._lock = Lock()
        self._wakeup = Event()
        self._stopped = Event()
        self._thread: Thread | None = None
        self._logger = setup_logger()

    def start(self) -> None:
        if self._size == 0 or self._thread is not None:
            return
        self._thread = Thread(target=self._run, name="warm-driver-pool", daemon=True)
        self._thread.start()

    def acquire(self) -> WebDriver | None:
        """Entrega um driver pronto ou None (o chamador abre um novo)."""
        if self._size == 0:
            return None
        try:
            while True:
                with self._lock:
                    if not self._ready:
                        return None
                    created_at, driver = self._ready.popleft()
                if self._is_usable(created_at, driver):
                    return driver
                _safe_quit(driver)
        finally:
            self._wakeup.set()

    def shutdown(self) -> None:
        self._stopped.set()
        self._wakeup.set()
        if self._thread is not None:
            self._thread.join(timeout=10)
        with self._lock:
            drivers = [driver for _, driver in self._ready]
            self._ready.clear()
        for driver in drivers:
            _safe_quit(driver)

    def _is_usable(self, created_at: float, driver: WebDriver) -> bool:
        if time.monotonic() - created_at > self._max_age_seconds:
            return False
        try:
            driver.current_url  # Chrome ainda vivo?
            return True
        except Exception:
            return False

    def _drop_expired(self) -> None:
        now = time.monotonic()
        with self._lock:
            fresh = [(t, d) for t, d in self._ready if now - t <= self._max_age_seconds]
            expired = [d for t, d in self._ready if now - t > self._max_age_seconds]
            self._ready = deque(fresh)
        for driver in expired:
            _safe_quit(driver)

    def _run(self) -> None:
        failures = 0
        while not self._stopped.is_set():
            self._drop_expired()

            with self._lock:
                missing = self._size - len(self._ready)

            if missing > 0:
                try:
                    driver = self._factory()
                    failures = 0
                except Exception:
                    failures += 1
                    self._logger.warning("Falha ao pre-aquecer driver (tentativa %s).", failures, exc_info=True)
                    # Backoff para nao martelar a SEFAZ/Chrome quando algo esta fora.
                    self._stopped.wait(min(5 * failures, 60))
                    continue

                if self._stopped.is_set():
                    _safe_quit(driver)
                    break
                with self._lock:
                    self._ready.append((time.monotonic(), driver))
                continue

            self._wakeup.wait(timeout=min(self._max_age_seconds / 2, 60))
            self._wakeup.clear()


def _safe_quit(driver: WebDriver) -> None:
    try:
        driver.quit()
    except Exception:
        pass
