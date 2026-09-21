from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import delete, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from src.database.connection import SessionLocal
from src.database.models import ItemNotaFiscal, NotaFiscal, Produto, Estabelecimento
from src.domain.product_codes import (
    categoria_inicial_por_ncm,
    is_ean_valido,
    is_sem_gtin,
    normalizar_descricao,
)
from utils.logger import setup_logger



def _coerce_required_float(value: Any, field_name: str) -> float:
    if value is None:
        raise ValueError(f"Campo obrigatorio ausente: {field_name}")

    try:
        return float(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"Campo invalido para float em {field_name}: {value}") from exc


def _coerce_optional_float(value: Any, default: float = 0.0) -> float:
    if value is None:
        return default

    try:
        return float(value)
    except (TypeError, ValueError):
        return default



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


def _find_produto_por_ncm_e_descricao(
    session: Session,
    ncm: str,
    descricao: str,
) -> Produto | None:
    descricao_normalizada = normalizar_descricao(descricao)
    candidatos = session.execute(
        select(Produto).where(
            Produto.codigo_NCM_comercial == ncm,
            Produto.sem_gtin.is_(True),
        )
    ).scalars().all()

    for produto in candidatos:
        if normalizar_descricao(produto.descricao) == descricao_normalizada:
            return produto

    return None


def _find_or_create_produto(
    session: Session,
    *,
    ean: str | None,
    ncm: str | None,
    descricao: str,
    unidade_comercial: str | None,
) -> Produto:
    produto_sem_gtin = is_sem_gtin(ean)
    ean_valido = is_ean_valido(ean)

    produto_banco: Produto | None = None
    if ean_valido:
        produto_banco = session.execute(
            select(Produto).where(Produto.codigo_ean_comercial == ean)
        ).scalar_one_or_none()

    if produto_banco is None and produto_sem_gtin and ncm:
        produto_banco = _find_produto_por_ncm_e_descricao(session, ncm, descricao)

    if produto_banco is None:
        produto_banco = Produto(
            codigo_ean_comercial=ean if ean_valido else None,
            codigo_NCM_comercial=ncm,
            unidade_comercial=unidade_comercial,
            descricao=descricao,
            categoria=categoria_inicial_por_ncm(ncm),
            sem_gtin=produto_sem_gtin,
        )
        session.add(produto_banco)
        session.flush()
        return produto_banco

    if produto_sem_gtin and not produto_banco.sem_gtin:
        produto_banco.sem_gtin = True

    if ncm and not produto_banco.codigo_NCM_comercial:
        produto_banco.codigo_NCM_comercial = ncm

    if unidade_comercial and not produto_banco.unidade_comercial:
        produto_banco.unidade_comercial = unidade_comercial

    return produto_banco
    
def bulk_insert_produtos_with_nota_id(
    produtos: list[dict[str, Any]],
    codigo_nota_fiscal: str,
    usuario_id: int,
    estabelecimento_id: int,
    data_compra: datetime | None = None,
    meio_pagamento: str | None = None,
    valor_desconto_nota: float | None = None,
    valor_pago_nota: float | None = None,
) -> tuple[int, int]:

    logger = setup_logger(log_file="logs/phase4.log", logger_name="phase4")

    codigo_nota_fiscal = codigo_nota_fiscal.strip()
    if len(codigo_nota_fiscal) != 44 or not codigo_nota_fiscal.isdigit():
        raise ValueError("codigo_nota_fiscal invalido: informe exatamente 44 digitos numericos.")

    if not produtos:
        logger.warning("Fase 4: lista de produtos vazia para a nota %s.", codigo_nota_fiscal)
        return 0, 0

    session = SessionLocal()
    try:
        nota_fiscal = session.execute(
            select(NotaFiscal).where(
                NotaFiscal.codigo_acesso == codigo_nota_fiscal,
                NotaFiscal.usuario_id == usuario_id,
            )
        ).scalar_one_or_none()

        if nota_fiscal is None:
            nota_fiscal = NotaFiscal(
                codigo_acesso=codigo_nota_fiscal,
                usuario_id=usuario_id,
                estabelecimento_id=estabelecimento_id,
                valor_total_nota=0.0,
                data_compra=data_compra,
                meio_pagamento=meio_pagamento,
            )
            session.add(nota_fiscal)
            session.flush()
        else:
            if data_compra is not None:
                nota_fiscal.data_compra = data_compra
            if meio_pagamento:
                nota_fiscal.meio_pagamento = meio_pagamento
            nota_fiscal.estabelecimento_id = estabelecimento_id

        session.execute(
            delete(ItemNotaFiscal).where(ItemNotaFiscal.id_nota_fiscal == nota_fiscal.id)
        )
        
        session.flush()

        agregados: dict[int, dict[str, float]] = {}

        total_pago_calc = 0.0
        total_desconto_calc = 0.0

        for index, produto_scraped in enumerate(produtos, start=1):
            try:
                vt = _coerce_required_float(produto_scraped.get("valor_total"), "valor_total")
                qtd = _coerce_required_float(produto_scraped.get("quantidade"), "quantidade")
                valor_desconto = _coerce_optional_float(produto_scraped.get("valor_desconto"))
                valor_pago = _coerce_optional_float(produto_scraped.get("valor_pago"), default=max(vt - valor_desconto, 0.0))
                total_desconto_calc += valor_desconto
                total_pago_calc += valor_pago

                ean = _coerce_optional_str(produto_scraped.get("codigo_ean_comercial"))
                ncm = _coerce_optional_str(produto_scraped.get("codigo_ncm_comercial"))
                unidade_comercial = _coerce_optional_str(produto_scraped.get("unidade_comercial"))
                descricao = _coerce_required_str(produto_scraped.get("descricao"), "descricao")

                produto_banco = _find_or_create_produto(
                    session,
                    ean=ean,
                    ncm=ncm,
                    descricao=descricao,
                    unidade_comercial=unidade_comercial,
                )

                if produto_banco.id in agregados:
                    agregados[produto_banco.id]["quantidade"] += qtd
                    agregados[produto_banco.id]["valor_desconto"] += valor_desconto
                    agregados[produto_banco.id]["valor_pago"] += valor_pago
                else:
                    agregados[produto_banco.id] = {
                        "quantidade": qtd,
                        "valor_desconto": valor_desconto,
                        "valor_pago": valor_pago,
                    }

            except ValueError as exc:
                raise ValueError(f"Produto invalido na posicao {index}: {exc}") from exc

        # valor_total_nota e o valor PAGO (liquido). O bloco de totais da nota
        # (quando disponivel) e mais confiavel que a soma dos itens: muitas
        # notas so informam o desconto ali, sem detalhar por item.
        nota_fiscal.valor_total_nota = (
            valor_pago_nota if valor_pago_nota is not None else total_pago_calc
        )
        nota_fiscal.valor_desconto_nota = (
            valor_desconto_nota if valor_desconto_nota is not None else total_desconto_calc
        )

        records_itens = [
            ItemNotaFiscal(
                id_nota_fiscal=nota_fiscal.id,
                id_produto=produto_id,
                quantidade=dados["quantidade"],
                valor_unitario=(
                    dados["valor_pago"] / dados["quantidade"]
                    if dados["quantidade"] > 0
                    else 0.0
                ),
                valor_desconto=dados["valor_desconto"],
            )
            for produto_id, dados in agregados.items()
        ]

        session.add_all(records_itens)
        session.commit()

        logger.info(
            "Fase 4: %s itens vinculados com sucesso para a nota fiscal %s.",
            len(records_itens),
            codigo_nota_fiscal,
        )
        return len(records_itens), nota_fiscal.id

    except SQLAlchemyError:
        session.rollback()
        logger.exception("Fase 4: erro transacional ao processar a nota.")
        raise
    finally:
        session.close()

def get_or_create_estabelecimento(empresa_data: dict | None) -> int | None:
    if empresa_data is None:
        return None

    session = SessionLocal()
    try:
        existing = session.query(Estabelecimento).filter_by(cnpj=empresa_data["cnpj"]).first()
        if existing:
            return existing.id

        novo = Estabelecimento(
            razao_social=empresa_data["razao_social"],
            nome_fantasia=empresa_data["nome_fantasia"],
            cnpj=empresa_data["cnpj"],
            logradouro=empresa_data["logradouro"],
            bairro=empresa_data.get("bairro"),
            cidade=empresa_data["cidade"],
            estado=empresa_data["estado"],
            cep=empresa_data.get("cep"),
        )
        session.add(novo)
        session.commit()
        session.refresh(novo)
        return novo.id
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()