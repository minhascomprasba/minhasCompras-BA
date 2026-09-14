from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Any

from selenium.common.exceptions import TimeoutException
from selenium.webdriver.common.by import By
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from src.phase3.parser import EmpresaParser, ProductParser
from utils.logger import setup_logger

from .selectors import (
    EMITENTE_TAB_BUTTON,
    IDENTIFICACAO_TAB_BUTTON_IDS,
    PAGAMENTO_TAB_BUTTON_IDS,
    PRODUTOS_TAB_BUTTON_ID,
    VISUALIZAR_ABAS_BUTTON_ID,
)

PHASE1_PAGE_PATH = "NFCEC_consulta_chave_acesso.aspx"
PHASE2_TABS_PAGE_PATH = "NFCEC_consulta_abas.aspx"
PRODUCT_TABLE_SELECTOR = ".table_produtos"
PRODUCT_DESCRIPTION_SELECTOR = ".fixo-prod-serv-descricao span"


def _is_element_present(driver: WebDriver, element_id: str) -> bool:
    return len(driver.find_elements(By.ID, element_id)) > 0


def _raise_tabs_button_diagnostics(driver: WebDriver) -> None:
    current_url = driver.current_url

    if _is_element_present(driver, "txt_chave_acesso") or _is_element_present(driver, "txt_cod_antirobo"):
        raise RuntimeError(
            "Botao de visualizacao em abas nao encontrado. A pagina aparenta ter retornado para a tela de autenticacao. "
            "Verifique se houve erro residual de captcha/autenticacao. "
            f"URL atual: {current_url}"
        )

    if PHASE1_PAGE_PATH in current_url:
        raise RuntimeError(
            "Botao de visualizacao em abas nao encontrado na pagina da Fase 1. "
            "Possivel queda parcial da pagina ou autenticacao incompleta. "
            f"URL atual: {current_url}"
        )

    raise RuntimeError(
        "Botao de visualizacao em abas nao encontrado dentro do timeout. "
        "Verifique instabilidade do portal ou mudanca de DOM. "
        f"URL atual: {current_url}"
    )


def _try_click_tab(driver: WebDriver, tab_id: str, timeout: int) -> bool:
    if not _is_element_present(driver, tab_id):
        return False

    try:
        tab_button = WebDriverWait(driver, timeout).until(
            EC.element_to_be_clickable((By.ID, tab_id))
        )
        tab_button.click()
        return True
    except TimeoutException:
        return False


def _save_debug_html(driver: WebDriver, filename: str) -> None:
    debug_path = Path("data/debug") / filename
    debug_path.parent.mkdir(parents=True, exist_ok=True)
    debug_path.write_text(driver.page_source, encoding="utf-8")


def _extract_purchase_datetime(driver: WebDriver, logger) -> datetime | None:
    data_compra = ProductParser.extract_data_compra(driver.page_source)
    if data_compra is not None:
        logger.info("Fase 2: data/hora da compra encontrada na pagina atual.")
    return data_compra


def _extract_meio_pagamento(driver: WebDriver, logger) -> str | None:
    meio_pagamento = ProductParser.extract_meio_pagamento(driver.page_source)
    if meio_pagamento:
        logger.info("Fase 2: meio de pagamento encontrado na pagina atual: %s", meio_pagamento)
    return meio_pagamento


def _extract_purchase_datetime_from_identificacao_tabs(driver: WebDriver, timeout: int, logger) -> datetime | None:
    for tab_id in IDENTIFICACAO_TAB_BUTTON_IDS:
        if not _try_click_tab(driver, tab_id, timeout):
            continue

        logger.info("Fase 2: aba '%s' aberta para buscar data da compra.", tab_id)
        data_compra = ProductParser.extract_data_compra(driver.page_source)
        if data_compra is not None:
            logger.info("Fase 2: data/hora da compra encontrada na aba '%s'.", tab_id)
            return data_compra

    return None


def _list_aba_button_ids(driver: WebDriver) -> list[str]:
    ids: list[str] = []
    for element in driver.find_elements(By.CSS_SELECTOR, "[id^='btn_aba']"):
        element_id = element.get_attribute("id")
        if element_id:
            ids.append(element_id)
    return ids


def _payment_tab_ids_to_try(driver: WebDriver) -> list[str]:
    discovered = _list_aba_button_ids(driver)
    tokens = ("cobr", "pag", "total", "valor", "adic")
    extra = [
        element_id
        for element_id in discovered
        if any(token in element_id.casefold() for token in tokens)
    ]
    ordered: list[str] = []
    for element_id in (*PAGAMENTO_TAB_BUTTON_IDS, *extra):
        if element_id not in ordered:
            ordered.append(element_id)
    return ordered


def _wait_tab_active(driver: WebDriver, tab_id: str, timeout: int) -> None:
    """A SEFAZ marca a aba ativa trocando a imagem para '..._on.gif'."""

    def _is_active(current_driver: WebDriver) -> bool:
        elements = current_driver.find_elements(By.ID, tab_id)
        if not elements:
            return False
        return "_on." in (elements[0].get_attribute("src") or "")

    try:
        WebDriverWait(driver, min(timeout, 8)).until(_is_active)
    except TimeoutException:
        logger_warning = "Fase 2: aba '%s' nao ficou ativa no tempo esperado."
        setup_logger(log_file="logs/phase2.log", logger_name="phase2").warning(logger_warning, tab_id)


def _extract_meio_pagamento_from_tabs(driver: WebDriver, timeout: int, logger) -> str | None:
    best: str | None = None
    saved_debug = False

    for tab_id in _payment_tab_ids_to_try(driver):
        if not _try_click_tab(driver, tab_id, timeout):
            continue

        logger.info("Fase 2: aba '%s' aberta para buscar meio de pagamento.", tab_id)
        _wait_tab_active(driver, tab_id, timeout)

        current = ProductParser.extract_meio_pagamento(driver.page_source)
        if not current:
            if not saved_debug:
                _save_debug_html(driver, "last_nfce_pagamento.html")
            continue

        logger.info("Fase 2: meio de pagamento encontrado na aba '%s': %s", tab_id, current)
        _save_debug_html(driver, "last_nfce_pagamento.html")
        saved_debug = True

        best = ProductParser.prefer_meio_pagamento(current, best)
        if not ProductParser.is_generic_meio_pagamento(best):
            return best

    return best


def Maps_to_products_tab(driver: WebDriver, timeout: int) -> dict[str, Any]:
    logger = setup_logger(log_file="logs/phase2.log", logger_name="phase2")
    logger.info("Iniciando Fase 2: navegacao para aba de Produtos / Servicos.")

    data_compra = _extract_purchase_datetime(driver, logger)
    meio_pagamento = _extract_meio_pagamento(driver, logger)
    if data_compra is None or ProductParser.is_generic_meio_pagamento(meio_pagamento):
        _save_debug_html(driver, "last_nfce_summary.html")

    try:
        visualizar_abas_button = WebDriverWait(driver, timeout).until(
            EC.element_to_be_clickable((By.ID, VISUALIZAR_ABAS_BUTTON_ID))
        )
    except TimeoutException as exc:
        logger.error(
            "Botao '%s' nao ficou clicavel no tempo esperado.",
            VISUALIZAR_ABAS_BUTTON_ID,
        )
        _raise_tabs_button_diagnostics(driver)
        raise RuntimeError("Falha ao localizar o botao 'Visualizar em Abas'.") from exc

    before_click_url = driver.current_url
    visualizar_abas_button.click()
    logger.info("Clique realizado em '%s'.", VISUALIZAR_ABAS_BUTTON_ID)

    try:
        WebDriverWait(driver, timeout).until(
            lambda current_driver: (
                PHASE2_TABS_PAGE_PATH in current_driver.current_url
                or current_driver.current_url != before_click_url
            )
        )
    except TimeoutException as exc:
        logger.error("Nao houve mudanca de URL apos clique em '%s'.", VISUALIZAR_ABAS_BUTTON_ID)
        raise RuntimeError("Falha ao carregar pagina de visualizacao em abas.") from exc

    logger.info("Pagina de abas carregada: %s", driver.current_url)
    aba_ids = _list_aba_button_ids(driver)
    if aba_ids:
        logger.info("Fase 2: abas disponiveis: %s", ", ".join(aba_ids))

    if data_compra is None:
        data_compra = _extract_purchase_datetime(driver, logger)

    meio_nas_abas = _extract_meio_pagamento(driver, logger)
    meio_pagamento = ProductParser.prefer_meio_pagamento(meio_nas_abas, meio_pagamento)

    if data_compra is None:
        data_compra = _extract_purchase_datetime_from_identificacao_tabs(driver, timeout, logger)

    if ProductParser.is_generic_meio_pagamento(meio_pagamento):
        meio_nas_tabs = _extract_meio_pagamento_from_tabs(driver, timeout, logger)
        meio_pagamento = ProductParser.prefer_meio_pagamento(meio_nas_tabs, meio_pagamento)

    if data_compra is None or ProductParser.is_generic_meio_pagamento(meio_pagamento):
        _save_debug_html(driver, "last_nfce_abas.html")
        if data_compra is None:
            logger.warning("Fase 2: data da compra nao encontrada antes da aba de produtos.")
        if ProductParser.is_generic_meio_pagamento(meio_pagamento):
            logger.warning(
                "Fase 2: meio de pagamento generico ou ausente antes da aba de produtos: %s",
                meio_pagamento,
            )

    try:
        WebDriverWait(driver, timeout).until(
            EC.presence_of_element_located((By.ID, PRODUTOS_TAB_BUTTON_ID))
        )

        produtos_tab_button = WebDriverWait(driver, timeout).until(
            EC.element_to_be_clickable((By.ID, PRODUTOS_TAB_BUTTON_ID))
        )
        produtos_tab_button.click()
        logger.info("Clique realizado na aba de produtos '%s'.", PRODUTOS_TAB_BUTTON_ID)
    except TimeoutException as exc:
        logger.error("Aba de produtos '%s' nao ficou disponivel no tempo esperado.", PRODUTOS_TAB_BUTTON_ID)
        raise RuntimeError("Falha ao abrir aba de Produtos / Servicos.") from exc
    except Exception:
        logger.exception("Erro inesperado ao clicar na aba de produtos.")
        raise

    logger.info("Fase 2 concluida com sucesso.")
    return {
        "data_compra": data_compra,
        "meio_pagamento": meio_pagamento,
    }



def Maps_to_Emitente_tab(driver: WebDriver, timeout: int) -> dict | None:
    logger = setup_logger(log_file="logs/phase2.log", logger_name="phase2")
    logger.info("Navegando para aba de Emitente.")

    try:
        emitente_tab_button = WebDriverWait(driver, timeout).until(
            EC.element_to_be_clickable((By.ID, EMITENTE_TAB_BUTTON))
        )
        emitente_tab_button.click()
        logger.info("Clique realizado na aba de emitente '%s'.", EMITENTE_TAB_BUTTON)
        
    except TimeoutException as exc:
        logger.error("Aba de emitente '%s' nao ficou disponivel no tempo esperado.", EMITENTE_TAB_BUTTON)
        raise RuntimeError("Falha ao abrir aba de Emitente.") from exc
    except Exception:
        logger.exception("Erro inesperado ao clicar na aba de emitente.")
        raise

    try:
        WebDriverWait(driver, timeout).until(
            EC.presence_of_element_located((By.XPATH, "//label[contains(text(), 'CNPJ') or contains(text(), 'Razão Social') or contains(text(), 'Razao Social')]"))
        )
    except TimeoutException:
        logger.warning("Conteudo da aba de emitente nao carregou no tempo esperado.")

    empresa_data = EmpresaParser.parse_page(driver.page_source)
    if empresa_data is None:
        logger.warning("Maps_to_Emitente_tab: nao foi possivel extrair dados do emitente.")

    logger.info("Aba de Emitente processada: %s", empresa_data)
    return empresa_data


def wait_for_products_content(driver: WebDriver, timeout: int) -> int:
    logger = setup_logger(log_file="logs/phase2.log", logger_name="phase2")

    try:
        WebDriverWait(driver, timeout).until(
            lambda current_driver: (
                len(current_driver.find_elements(By.CSS_SELECTOR, PRODUCT_TABLE_SELECTOR)) > 0
                or len(current_driver.find_elements(By.CSS_SELECTOR, PRODUCT_DESCRIPTION_SELECTOR)) > 0
            )
        )
    except TimeoutException as exc:
        logger.error(
            "Timeout aguardando renderizacao dos produtos apos abrir a aba. URL atual: %s",
            driver.current_url,
        )
        raise RuntimeError(
            "Produtos nao foram renderizados a tempo apos clique na aba de produtos. "
            "Verifique latencia da pagina ou mudanca de DOM."
        ) from exc

    product_count = len(driver.find_elements(By.CSS_SELECTOR, PRODUCT_TABLE_SELECTOR))
    logger.info("Conteudo de produtos estabilizado no DOM. Blocos encontrados: %s", product_count)
    return product_count
