from __future__ import annotations

from typing import Any

from sqlalchemy.exc import SQLAlchemyError

from src.database.connection import SessionLocal
from src.database.models import ProdutoExtraido
from utils.logger import setup_logger



def _coerce_required_float(value: Any, field_name: str) -> float:
    if value is None:
        raise ValueError(f"Campo obrigatorio ausente: {field_name}")

    try:
        return float(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"Campo invalido para float em {field_name}: {value}") from exc



def _coerce_required_str(value: Any, field_name: str) -> str:
    if value is None:
        raise ValueError(f"Campo obrigatorio ausente: {field_name}")

    text = str(value).strip()
    if not text:
        raise ValueError(f"Campo obrigatorio vazio: {field_name}")
    return text



def _coerce_optional_str(value: Any) -> str | None:
    if value is None:
        return None

    text = str(value).strip()
    return text or None



def bulk_insert_produtos(produtos: list[dict[str, Any]]) -> int:
    logger = setup_logger(log_file="logs/phase4.log", logger_name="phase4")

    if not produtos:
        logger.warning("Fase 4: lista de produtos vazia. Nenhum registro inserido no banco.")
        return 0

    records: list[ProdutoExtraido] = []
    for index, produto in enumerate(produtos, start=1):
        try:
            record = ProdutoExtraido(
                descricao=_coerce_required_str(produto.get("descricao"), "descricao"),
                quantidade=_coerce_required_float(produto.get("quantidade"), "quantidade"),
                valor_total=_coerce_required_float(produto.get("valor_total"), "valor_total"),
                unidade_comercial=_coerce_optional_str(produto.get("unidade_comercial")),
                codigo_ean_comercial=_coerce_optional_str(produto.get("codigo_ean_comercial")),
            )
            records.append(record)
        except ValueError as exc:
            raise ValueError(f"Produto invalido na posicao {index}: {exc}") from exc

    session = SessionLocal()
    try:
        session.add_all(records)
        session.commit()
        logger.info("Fase 4: %s produtos inseridos no SQLite com sucesso.", len(records))
        return len(records)
    except SQLAlchemyError:
        session.rollback()
        logger.exception("Fase 4: erro transacional durante insercao no SQLite.")
        raise
    finally:
        session.close()
