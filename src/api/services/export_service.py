import json
from datetime import datetime

from fastapi.encoders import jsonable_encoder
from fastapi.responses import Response
from sqlalchemy import select

from src.database.models import Estabelecimento, Produto


def fields(record, names):
    return {name: getattr(record, name) for name in names.split()}


def export_account(db, user):
    """Explicit allowlists keep secrets and filesystem details out of exports."""
    invoices, product_ids, establishment_ids = [], set(), set()
    for invoice in user.notas:
        data = fields(invoice, "id codigo_acesso valor_total_nota valor_desconto_nota data_compra meio_pagamento created_at estabelecimento_id")
        data["items"] = [fields(item, "id id_produto valor_unitario quantidade valor_desconto") for item in invoice.itens]
        invoices.append(data)
        establishment_ids.add(invoice.estabelecimento_id)
        product_ids.update(item.id_produto for item in invoice.itens)
    data = {
        "schema_version": 1, "exported_at": datetime.utcnow(),
        "account": fields(user, "id email role created_at"), "invoices": invoices,
        "products": [fields(p, "id descricao codigo_ean_comercial codigo_NCM_comercial unidade_comercial categoria sem_gtin") for p in db.scalars(select(Produto).where(Produto.id.in_(product_ids)))],
        "establishments": [fields(e, "id nome_fantasia razao_social cnpj logradouro bairro cidade estado cep latitude longitude") for e in db.scalars(select(Estabelecimento).where(Estabelecimento.id.in_(establishment_ids)))],
        "imports": [fields(i, "id access_key status source attempts nota_id items_count expires_at created_at updated_at finished_at") for i in user.imports],
    }
    return Response(json.dumps(jsonable_encoder(data), ensure_ascii=False), media_type="application/json",
        headers={"Content-Disposition": 'attachment; filename="minhas-compras-dados-v1.json"', "Cache-Control": "no-store"})
