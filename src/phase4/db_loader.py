from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import delete, select
from sqlalchemy.exc import SQLAlchemyError

from src.database.connection import SessionLocal
from src.database.models import ItemNotaFiscal, NotaFiscal, Produto, Estabelecimento
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
    
def bulk_insert_produtos_with_nota_id(
    produtos: list[dict[str, Any]],
    codigo_nota_fiscal: str,
    usuario_id: int,
    estabelecimento_id: int,
    data_compra: datetime | None = None,
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
            )
            session.add(nota_fiscal)
            session.flush()
        else:
            if data_compra is not None:
                nota_fiscal.data_compra = data_compra
            nota_fiscal.estabelecimento_id = estabelecimento_id

        session.execute(
            delete(ItemNotaFiscal).where(ItemNotaFiscal.id_nota_fiscal == nota_fiscal.id)
        )
        
        session.flush()

        agregados: dict[int, dict[str, float]] = {}

        total_nota = 0.0

        for index, produto_scraped in enumerate(produtos, start=1):
            try:
                vt = _coerce_required_float(produto_scraped.get("valor_total"), "valor_total")
                qtd = _coerce_required_float(produto_scraped.get("quantidade"), "quantidade")
                total_nota += vt

                ean = _coerce_optional_str(produto_scraped.get("codigo_ean_comercial"))
                ncm = _coerce_optional_str(produto_scraped.get("codigo_ncm_comercial"))
                unidade_comercial = _coerce_optional_str(produto_scraped.get("unidade_comercial"))
                descricao = _coerce_required_str(produto_scraped.get("descricao"), "descricao")

                
                ean_valido = bool(ean) and ean != "SEM GTIN" and not ean.startswith("2")

                produto_banco = None
                if ean_valido:
                    produto_banco = session.execute(
                        select(Produto).where(Produto.codigo_ean_comercial == ean)
                    ).scalar_one_or_none()

                if produto_banco is None:
                    categoria_definida = "Outros"
                    if ncm:
                        if ncm.startswith("22"):
                            categoria_definida = "Bebidas"
                        elif ncm.startswith("34"):
                            categoria_definida = "Limpeza"

                    produto_banco = Produto(
                        codigo_ean_comercial=ean if ean_valido else None,
                        codigo_NCM_comercial=ncm,
                        unidade_comercial=unidade_comercial,
                        descricao=descricao,
                        categoria=categoria_definida,
                    )
                    session.add(produto_banco)
                    session.flush()

                if produto_banco.id in agregados:
                    agregados[produto_banco.id]["quantidade"] += qtd
                    agregados[produto_banco.id]["valor_total"] += vt
                else:
                    agregados[produto_banco.id] = {
                        "quantidade": qtd,
                        "valor_total": vt,
                    }

            except ValueError as exc:
                raise ValueError(f"Produto invalido na posicao {index}: {exc}") from exc

        nota_fiscal.valor_total_nota = total_nota

        records_itens = [
            ItemNotaFiscal(
                id_nota_fiscal=nota_fiscal.id,
                id_produto=produto_id,
                quantidade=dados["quantidade"],
                valor_unitario=(
                    dados["valor_total"] / dados["quantidade"]
                    if dados["quantidade"] > 0
                    else 0.0
                ),
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