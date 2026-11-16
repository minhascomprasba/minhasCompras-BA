from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Any

from src.phase1.sefaz_client import SefazSession
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
PRODUCT_TABLE_SELECTOR = ".table_produtos"
PRODUCT_DESCRIPTION_SELECTOR = ".fixo-prod-serv-descricao span"


def _logger():
    return setup_logger(log_file="logs/phase2.log", logger_name="phase2")


def _raise_tabs_button_diagnostics(session: SefazSession) -> None:
    page = session.current_page

    if page.has_element("txt_chave_acesso") or page.has_element("txt_cod_antirobo"):
        raise RuntimeError(
            "Botao de visualizacao em abas nao encontrado. A pagina aparenta ter retornado para a tela de autenticacao. "
            "Verifique se houve erro residual de captcha/autenticacao. "
        )

    if PHASE1_PAGE_PATH in page.url:
        raise RuntimeError(
            "Botao de visualizacao em abas nao encontrado na pagina da Fase 1. "
            "Possivel queda parcial da pagina ou autenticacao incompleta. "
        )

    raise RuntimeError("Botao de visualizacao em abas nao encontrado. Verifique mudanca de DOM do portal.")


def _save_debug_html(session: SefazSession, filename: str) -> None:
    debug_path = Path("data/debug") / filename
    debug_path.parent.mkdir(parents=True, exist_ok=True)
    debug_path.write_text(session.page_source, encoding="utf-8")


def _extract_purchase_datetime(session: SefazSession, logger) -> datetime | None:
    data_compra = ProductParser.extract_data_compra(session.page_source)
    if data_compra is not None:
        logger.info("Fase 2: data/hora da compra encontrada na pagina atual.")
    return data_compra


def _extract_meio_pagamento(session: SefazSession, logger) -> str | None:
    meio_pagamento = ProductParser.extract_meio_pagamento(session.page_source)
    if meio_pagamento:
        logger.info("Fase 2: meio de pagamento encontrado na pagina atual: %s", meio_pagamento)
    return meio_pagamento


def _extract_purchase_datetime_from_identificacao_tabs(session: SefazSession, logger) -> datetime | None:
    for tab_id in IDENTIFICACAO_TAB_BUTTON_IDS:
        if not session.click(tab_id):
            continue

        logger.info("Fase 2: aba '%s' aberta para buscar data da compra.", tab_id)
        data_compra = ProductParser.extract_data_compra(session.page_source)
        if data_compra is not None:
            logger.info("Fase 2: data/hora da compra encontrada na aba '%s'.", tab_id)
            return data_compra

    return None


def _list_aba_button_ids(session: SefazSession) -> list[str]:
    soup = session.current_page.soup
    return [element["id"] for element in soup.select("[id^='btn_aba']") if element.get("id")]


def _payment_tab_ids_to_try(session: SefazSession) -> list[str]:
    tokens = ("cobr", "pag", "total", "valor", "adic")
    extra = [
        element_id
        for element_id in _list_aba_button_ids(session)
        if any(token in element_id.casefold() for token in tokens)
    ]
    ordered: list[str] = []
    for element_id in (*PAGAMENTO_TAB_BUTTON_IDS, *extra):
        if element_id not in ordered:
            ordered.append(element_id)
    return ordered


def _extract_meio_pagamento_from_tabs(session: SefazSession, logger) -> str | None:
    best: str | None = None
    saved_debug = False

    for tab_id in _payment_tab_ids_to_try(session):
        if not session.click(tab_id):
            continue

        logger.info("Fase 2: aba '%s' aberta para buscar meio de pagamento.", tab_id)

        current = ProductParser.extract_meio_pagamento(session.page_source)
        if not current:
            if not saved_debug:
                _save_debug_html(session, "last_nfce_pagamento.html")
            continue

        logger.info("Fase 2: meio de pagamento encontrado na aba '%s': %s", tab_id, current)
        _save_debug_html(session, "last_nfce_pagamento.html")
        saved_debug = True

        best = ProductParser.prefer_meio_pagamento(current, best)
        if not ProductParser.is_generic_meio_pagamento(best):
            return best

    return best


def Maps_to_products_tab(session: SefazSession, timeout: int) -> dict[str, Any]:
    logger = _logger()
    logger.info("Iniciando Fase 2: navegacao para aba de Produtos / Servicos.")

    data_compra = _extract_purchase_datetime(session, logger)
    meio_pagamento = _extract_meio_pagamento(session, logger)
    if data_compra is None or ProductParser.is_generic_meio_pagamento(meio_pagamento):
        _save_debug_html(session, "last_nfce_summary.html")

    if not session.current_page.has_element(VISUALIZAR_ABAS_BUTTON_ID):
        logger.error("Botao '%s' nao encontrado na pagina.", VISUALIZAR_ABAS_BUTTON_ID)
        _raise_tabs_button_diagnostics(session)

    before_click_url = session.current_url
    session.click(VISUALIZAR_ABAS_BUTTON_ID)
    logger.info("Clique realizado em '%s' (%s -> %s).", VISUALIZAR_ABAS_BUTTON_ID, before_click_url, session.current_url)

    if not session.current_page.has_element(PRODUTOS_TAB_BUTTON_ID):
        _save_debug_html(session, "last_nfce_abas.html")
        logger.error("Pagina de abas sem a aba de produtos '%s'.", PRODUTOS_TAB_BUTTON_ID)
        raise RuntimeError("Falha ao carregar pagina de visualizacao em abas.")

    logger.info("Pagina de abas carregada.")
    aba_ids = _list_aba_button_ids(session)
    if aba_ids:
        logger.info("Fase 2: abas disponiveis: %s", ", ".join(aba_ids))

    if data_compra is None:
        data_compra = _extract_purchase_datetime(session, logger)

    meio_nas_abas = _extract_meio_pagamento(session, logger)
    meio_pagamento = ProductParser.prefer_meio_pagamento(meio_nas_abas, meio_pagamento)

    if data_compra is None:
        data_compra = _extract_purchase_datetime_from_identificacao_tabs(session, logger)

    if ProductParser.is_generic_meio_pagamento(meio_pagamento):
        meio_nas_tabs = _extract_meio_pagamento_from_tabs(session, logger)
        meio_pagamento = ProductParser.prefer_meio_pagamento(meio_nas_tabs, meio_pagamento)

    if data_compra is None or ProductParser.is_generic_meio_pagamento(meio_pagamento):
        _save_debug_html(session, "last_nfce_abas.html")
        if data_compra is None:
            logger.warning("Fase 2: data da compra nao encontrada antes da aba de produtos.")
        if ProductParser.is_generic_meio_pagamento(meio_pagamento):
            logger.warning(
                "Fase 2: meio de pagamento generico ou ausente antes da aba de produtos: %s",
                meio_pagamento,
            )

    if not session.click(PRODUTOS_TAB_BUTTON_ID):
        logger.error("Aba de produtos '%s' nao encontrada.", PRODUTOS_TAB_BUTTON_ID)
        raise RuntimeError("Falha ao abrir aba de Produtos / Servicos.")
    logger.info("Clique realizado na aba de produtos '%s'.", PRODUTOS_TAB_BUTTON_ID)

    logger.info("Fase 2 concluida com sucesso.")
    return {
        "data_compra": data_compra,
        "meio_pagamento": meio_pagamento,
    }


def Maps_to_Emitente_tab(session: SefazSession, timeout: int) -> dict | None:
    logger = _logger()
    logger.info("Navegando para aba de Emitente.")

    if not session.click(EMITENTE_TAB_BUTTON):
        logger.error("Aba de emitente '%s' nao encontrada.", EMITENTE_TAB_BUTTON)
        raise RuntimeError("Falha ao abrir aba de Emitente.")
    logger.info("Clique realizado na aba de emitente '%s'.", EMITENTE_TAB_BUTTON)

    empresa_data = EmpresaParser.parse_page(session.page_source)
    if empresa_data is None:
        _save_debug_html(session, "last_nfce_emitente.html")
        logger.warning("Maps_to_Emitente_tab: nao foi possivel extrair dados do emitente.")

    logger.info("Aba de Emitente processada: %s", empresa_data)
    return empresa_data


def wait_for_products_content(session: SefazSession, timeout: int) -> int:
    """Confere se a pagina atual traz os produtos (o HTML ja chega completo)."""
    logger = _logger()
    soup = session.current_page.soup

    if not soup.select(PRODUCT_TABLE_SELECTOR) and not soup.select(PRODUCT_DESCRIPTION_SELECTOR):
        _save_debug_html(session, "last_nfce_produtos.html")
        logger.error("Pagina da aba de produtos sem os blocos de produto.")
        raise RuntimeError("Produtos nao encontrados na aba de Produtos / Servicos. Verifique mudanca de DOM.")

    product_count = len(soup.select(PRODUCT_TABLE_SELECTOR))
    logger.info("Conteudo de produtos encontrado. Blocos encontrados: %s", product_count)
    return product_count
