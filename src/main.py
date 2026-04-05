import os

from dotenv import load_dotenv

from .database.connection import engine
from .database.models import Base
from .phase1.auth_flow import run_phase1_auth_flow
from .phase2.navigation import Maps_to_products_tab, wait_for_products_content
from .phase3.parser import ProductParser
from .phase4.db_loader import bulk_insert_produtos


def _get_env_int(name: str, default: int) -> int:
    value = os.getenv(name, "").strip()
    if not value:
        return default
    try:
        return int(value)
    except ValueError:
        return default


def _get_required_env_str(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise ValueError(f"Variavel obrigatoria ausente: {name}")
    return value


def main() -> None:
    load_dotenv()
    Base.metadata.create_all(bind=engine)

    driver = run_phase1_auth_flow()
    timeout_seconds = _get_env_int("PAGE_TIMEOUT_SECONDS", 20)
    Maps_to_products_tab(driver, timeout_seconds)
    wait_for_products_content(driver, timeout_seconds)
    html_content = driver.page_source
    products = ProductParser.parse(html_content)
    ProductParser.to_dataframe_and_save(products)
    codigo_nota_fiscal = _get_required_env_str("NFE_ACCESS_KEY")
    bulk_insert_produtos(products, codigo_nota_fiscal)


if __name__ == "__main__":
    main()
