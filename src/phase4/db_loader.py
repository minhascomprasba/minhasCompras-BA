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

    # 1. Validações Iniciais
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
            session.flush()  # Faz o banco gerar o id incremental (nota_fiscal.id)
        else:
            if data_compra is not None:
                nota_fiscal.data_compra = data_compra
            nota_fiscal.estabelecimento_id = estabelecimento_id

        session.execute(
            delete(ItemNotaFiscal).where(ItemNotaFiscal.id_nota_fiscal == nota_fiscal.id)
        )

        records_itens: list[ItemNotaFiscal] = []
        total_nota = 0.0

        for index, produto_scraped in enumerate(produtos, start=1):
            try:
                # Coerção dos valores brutos
                vt = _coerce_required_float(produto_scraped.get("valor_total"), "valor_total")
                qtd = _coerce_required_float(produto_scraped.get("quantidade"), "quantidade")
                valor_uni = vt / qtd if qtd > 0 else 0.0
                total_nota += vt
                
                ean = _coerce_optional_str(produto_scraped.get("codigo_ean_comercial"))
                ncm = _coerce_optional_str(produto_scraped.get("codigo_ncm_comercial"))
                descricao = _coerce_required_str(produto_scraped.get("descricao"), "descricao")

                if ean and ean != "SEM GTIN" and not ean.startswith("2"):
                    query_produto = select(Produto).where(Produto.codigo_ean_comercial == ean)
                else:
                    query_produto = select(Produto).where(Produto.descricao == descricao)
                
                produto_banco = session.execute(query_produto).scalar_one_or_none()

                if produto_banco is None:
                    categoria_definida = "Outros"
                    if ncm:
                        if ncm.startswith("22"):
                            categoria_definida = "Bebidas"
                        elif ncm.startswith("34"):
                            categoria_definida = "Limpeza"
                        # EXPANDIR ISSO AQUI 

                    produto_banco = Produto(
                        codigo_ean_comercial=ean,
                        codigo_NCM_comercial=ncm,
                        descricao=descricao,
                        categoria=categoria_definida
                    )
                    session.add(produto_banco)
                    session.flush()  

                item_nota = ItemNotaFiscal(
                    id_nota_fiscal=nota_fiscal.id, # ID incremental da Nota
                    id_produto=produto_banco.id,   # ID incremental do Produto
                    quantidade=qtd,
                    valor_unitario=valor_uni
                )
                records_itens.append(item_nota)

            except ValueError as exc:
                raise ValueError(f"Produto invalido na posicao {index}: {exc}") from exc
                
        nota_fiscal.valor_total_nota = total_nota

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

def get_or_create_estabelecimento(
    empresa_data: dict[str, Any]
) -> int:
    
    logger = setup_logger(log_file="logs/phase4.log", logger_name="phase4")
    
    if not empresa_data or not empresa_data.get("nome_fantasia"):
        logger.warning("Dados do estabelecimento vazios ou sem nome fantasia. Usando registro genérico.")
        nome_fantasia = "Estabelecimento Não Identificado"
    else:
        nome_fantasia = empresa_data["nome_fantasia"].strip()

    session = SessionLocal()
    try:
        estabelecimento = session.execute(
            select(Estabelecimento).where(Estabelecimento.nome_Fantasia == nome_fantasia)
        ).scalar_one_or_none()

        if estabelecimento is None:
            estabelecimento = Estabelecimento(
                nome_Fantasia=nome_fantasia,
                logradouro=empresa_data.get("logradouro"),  
                cidade=empresa_data.get("cidade"),
                estado=empresa_data.get("estado")
            )
            session.add(estabelecimento)
            session.flush()  
            session.commit()
            logger.info("Fase 4: Novo estabelecimento cadastrado: %s", nome_fantasia)
        
        return estabelecimento.id

    except SQLAlchemyError:
        session.rollback()
        logger.exception("Fase 4: Erro ao buscar/inserir estabelecimento.")
        raise
    finally:
        session.close()



