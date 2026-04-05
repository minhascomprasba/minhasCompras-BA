import os

from .phase1.auth_flow import run_phase1_auth_flow
from .phase2.navigation import Maps_to_products_tab, wait_for_products_content
from .phase3.parser import ProductParser


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
    wait_for_products_content(driver, timeout_seconds)
    html_content = driver.page_source
    products = ProductParser.parse(html_content)
    ProductParser.to_dataframe_and_save(products)


if __name__ == "__main__":
    main()
