import os

from .phase1.auth_flow import run_phase1_auth_flow
from .phase2.navigation import Maps_to_products_tab


def _get_env_int(name: str, default: int) -> int:
    value = os.getenv(name, "").strip()
    if not value:
        return default
    try:
        return int(value)
    except ValueError:
        return default


def main() -> None:
    driver = run_phase1_auth_flow()
    timeout_seconds = _get_env_int("PAGE_TIMEOUT_SECONDS", 20)
    Maps_to_products_tab(driver, timeout_seconds)


if __name__ == "__main__":
    main()
