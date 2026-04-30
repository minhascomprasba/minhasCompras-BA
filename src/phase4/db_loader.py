from __future__ import annotations

from typing import Any

from sqlalchemy import delete, select
from sqlalchemy.exc import SQLAlchemyError

from src.database.connection import SessionLocal
from src.database.models import NotaFiscal, ProdutoExtraido
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



def bulk_insert_produtos(produtos: list[dict[str, Any]], codigo_nota_fiscal: str) -> int:
    logger = setup_logger(log_file="logs/phase4.log", logger_name="phase4")

    codigo_nota_fiscal = codigo_nota_fiscal.strip()
    if len(codigo_nota_fiscal) != 44 or not codigo_nota_fiscal.isdigit():
        raise ValueError("codigo_nota_fiscal invalido: informe exatamente 44 digitos numericos.")

    if not produtos:
        logger.warning(
            "Fase 4: lista de produtos vazia para a nota fiscal %s. Nenhum registro inserido.",
            codigo_nota_fiscal,
        )
        return 0

    session = SessionLocal()
    try:
        nota_fiscal = session.execute(
            select(NotaFiscal).where(NotaFiscal.codigo_acesso == codigo_nota_fiscal)
        ).scalar_one_or_none()

        if nota_fiscal is None:
            nota_fiscal = NotaFiscal(codigo_acesso=codigo_nota_fiscal)
            session.add(nota_fiscal)
            session.flush()

        session.execute(
            delete(ProdutoExtraido).where(ProdutoExtraido.id_nota_fiscal == nota_fiscal.id)
        )

        records: list[ProdutoExtraido] = []
        for index, produto in enumerate(produtos, start=1):
            try:
                record = ProdutoExtraido(
                    id_nota_fiscal=nota_fiscal.id,
                    descricao=_coerce_required_str(produto.get("descricao"), "descricao"),
                    quantidade=_coerce_required_float(produto.get("quantidade"), "quantidade"),
                    valor_total=_coerce_required_float(produto.get("valor_total"), "valor_total"),
                    unidade_comercial=_coerce_optional_str(produto.get("unidade_comercial")),
                    codigo_ean_comercial=_coerce_optional_str(produto.get("codigo_ean_comercial")),
                )
                records.append(record)
            except ValueError as exc:
                raise ValueError(f"Produto invalido na posicao {index}: {exc}") from exc

        session.add_all(records)
        session.commit()
        logger.info(
            "Fase 4: %s produtos persistidos para nota fiscal %s no SQLite.",
            len(records),
            codigo_nota_fiscal,
        )
        return len(records)
    except SQLAlchemyError:
        session.rollback()
        logger.exception("Fase 4: erro transacional durante insercao no SQLite.")
        raise
    finally:
        session.close()


def bulk_insert_produtos_with_nota_id(produtos: list[dict[str, Any]], codigo_nota_fiscal: str) -> tuple[int, int]:
    logger = setup_logger(log_file="logs/phase4.log", logger_name="phase4")

    codigo_nota_fiscal = codigo_nota_fiscal.strip()
    if len(codigo_nota_fiscal) != 44 or not codigo_nota_fiscal.isdigit():
        raise ValueError("codigo_nota_fiscal invalido: informe exatamente 44 digitos numericos.")

    if not produtos:
        logger.warning(
            "Fase 4: lista de produtos vazia para a nota fiscal %s. Nenhum registro inserido.",
            codigo_nota_fiscal,
        )
        return 0, 0

    session = SessionLocal()
    try:
        nota_fiscal = session.execute(
            select(NotaFiscal).where(NotaFiscal.codigo_acesso == codigo_nota_fiscal)
        ).scalar_one_or_none()

        if nota_fiscal is None:
            nota_fiscal = NotaFiscal(codigo_acesso=codigo_nota_fiscal)
            session.add(nota_fiscal)
            session.flush()

        session.execute(
            delete(ProdutoExtraido).where(ProdutoExtraido.id_nota_fiscal == nota_fiscal.id)
        )

        records: list[ProdutoExtraido] = []
        for index, produto in enumerate(produtos, start=1):
            try:
                record = ProdutoExtraido(
                    id_nota_fiscal=nota_fiscal.id,
                    descricao=_coerce_required_str(produto.get("descricao"), "descricao"),
                    quantidade=_coerce_required_float(produto.get("quantidade"), "quantidade"),
                    valor_total=_coerce_required_float(produto.get("valor_total"), "valor_total"),
                    unidade_comercial=_coerce_optional_str(produto.get("unidade_comercial")),
                    codigo_ean_comercial=_coerce_optional_str(produto.get("codigo_ean_comercial")),
                )
                records.append(record)
            except ValueError as exc:
                raise ValueError(f"Produto invalido na posicao {index}: {exc}") from exc

        session.add_all(records)
        session.commit()
        logger.info(
            "Fase 4: %s produtos persistidos para nota fiscal %s no SQLite.",
            len(records),
            codigo_nota_fiscal,
        )
        return len(records), nota_fiscal.id
    except SQLAlchemyError:
        session.rollback()
        logger.exception("Fase 4: erro transacional durante insercao no SQLite.")
        raise
    finally:
        session.close()
