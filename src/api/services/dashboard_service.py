from __future__ import annotations

from datetime import datetime
from sqlalchemy import select, func, text
from src.database.connection import SessionLocal
from src.database.models import NotaFiscal, ItemNotaFiscal, Produto

PORTUGUESE_MONTHS = {
    1: "Janeiro", 2: "Fevereiro", 3: "Março", 4: "Abril",
    5: "Maio", 6: "Junho", 7: "Julho", 8: "Agosto",
    9: "Setembro", 10: "Outubro", 11: "Novembro", 12: "Dezembro"
}


def obter_categoria_por_ncm(ncm: str | None, categoria_db: str | None) -> str:
    """
    Determina dinamicamente a categoria com base nos primeiros dígitos do NCM,
    ou retorna a categoria padrão do banco caso não corresponda a um NCM específico.
    """
    if not ncm:
        return categoria_db or "Outros"
    
    ncm_clean = ncm.strip()
    if ncm_clean.startswith("22"):
        return "Bebidas"
    elif ncm_clean.startswith("34"):
        return "Limpeza"
    elif ncm_clean.startswith("27"):
        return "Combustível"
    elif ncm_clean.startswith("30"):
        return "Farmácia"
    elif ncm_clean.startswith(("61", "62", "63")):
        return "Vestuário"
    elif ncm_clean.startswith(("02", "03", "04", "07", "08", "09", "10", "11", "12", "15", "16", "17", "18", "19", "20", "21")):
        return "Mercado"
    
    # Se já tem uma categoria válida no banco diferente de "Outros", usa ela
    if categoria_db and categoria_db != "Outros":
        return categoria_db
    
    return "Outros"


def get_dashboard_data(user_id: int) -> list[dict[str, object]]:
    """
    Busca os dados agregados para o dashboard do usuário, agrupados por mês.
    Lógica de datas compatível de forma agnóstica com SQLite e PostgreSQL.
    """
    session = SessionLocal()
    try:
        # 1. Buscar todas as datas de compra das notas fiscais do usuário
        purchase_date_expr = func.coalesce(NotaFiscal.data_compra, NotaFiscal.created_at)
        stmt_dates = (
            select(purchase_date_expr)
            .where(NotaFiscal.usuario_id == user_id)
        )
        dates = session.execute(stmt_dates).scalars().all()
        
        if not dates:
            return []
            
        # Agrupa em pares (ano, mes) únicos e ordena do mais recente ao mais antigo
        months = sorted(list({(dt.year, dt.month) for dt in dates if dt}), reverse=True)
        
        dashboard_list = []
        
        for year, month in months:
            # Determina o intervalo do mês corrente de forma agnóstica
            start_date = datetime(year, month, 1)
            if month == 12:
                end_date = datetime(year + 1, 1, 1)
            else:
                end_date = datetime(year, month + 1, 1)
                
            # A. KPIs do Mês (Total spent, note count, ticket médio)
            stmt_kpis = (
                select(
                    func.sum(NotaFiscal.valor_total_nota).label("total_spent"),
                    func.count(NotaFiscal.id).label("note_count")
                )
                .where(
                    NotaFiscal.usuario_id == user_id,
                    purchase_date_expr >= start_date,
                    purchase_date_expr < end_date
                )
            )
            kpis_res = session.execute(stmt_kpis).first()
            total_spent = float(kpis_res.total_spent) if kpis_res and kpis_res.total_spent else 0.0
            note_count = int(kpis_res.note_count) if kpis_res and kpis_res.note_count else 0
            ticket_medio = total_spent / note_count if note_count > 0 else 0.0
            
            # B. Gastos por Categoria (Usando mapeamento NCM)
            stmt_items = (
                select(
                    Produto.categoria,
                    Produto.codigo_NCM_comercial,
                    ItemNotaFiscal.quantidade,
                    ItemNotaFiscal.valor_unitario
                )
                .join(ItemNotaFiscal, ItemNotaFiscal.id_produto == Produto.id)
                .join(NotaFiscal, ItemNotaFiscal.id_nota_fiscal == NotaFiscal.id)
                .where(
                    NotaFiscal.usuario_id == user_id,
                    purchase_date_expr >= start_date,
                    purchase_date_expr < end_date
                )
            )
            items_rows = session.execute(stmt_items).all()
            
            categorias_map: dict[str, float] = {}
            total_itens_spent = 0.0
            
            for cat_db, ncm, qtd, val_uni in items_rows:
                cat_nome = obter_categoria_por_ncm(ncm, cat_db)
                item_total = float(qtd * val_uni)
                categorias_map[cat_nome] = categorias_map.get(cat_nome, 0.0) + item_total
                total_itens_spent += item_total
                
            gastos_por_categoria = []
            for cat_nome, val in categorias_map.items():
                percentual = (val / total_itens_spent * 100) if total_itens_spent > 0 else 0.0
                gastos_por_categoria.append({
                    "categoria": cat_nome,
                    "valor": round(val, 2),
                    "percentual": round(percentual, 2)
                })
                
            # Ordena decrescente por valor total gasto na categoria
            gastos_por_categoria.sort(key=lambda x: x["valor"], reverse=True)
            
            # C. Produtos Frequentes (Top 5 mais comprados no mês)
            stmt_top_prods = (
                select(
                    Produto.id,
                    Produto.descricao,
                    Produto.codigo_NCM_comercial,
                    Produto.sem_gtin,
                    func.count(ItemNotaFiscal.id).label("contagem")
                )
                .join(ItemNotaFiscal, ItemNotaFiscal.id_produto == Produto.id)
                .join(NotaFiscal, ItemNotaFiscal.id_nota_fiscal == NotaFiscal.id)
                .where(
                    NotaFiscal.usuario_id == user_id,
                    purchase_date_expr >= start_date,
                    purchase_date_expr < end_date
                )
                .group_by(
                    Produto.id,
                    Produto.descricao,
                    Produto.codigo_NCM_comercial,
                    Produto.sem_gtin,
                )
                .order_by(text("contagem DESC"))
                .limit(5)
            )
            top_prods_res = session.execute(stmt_top_prods).all()
            
            produtos_frequentes = []
            for prod_id, prod_desc, prod_ncm, prod_sem_gtin, _ in top_prods_res:
                # Histórico de preços deste produto específico no mês corrente
                stmt_history = (
                    select(
                        purchase_date_expr.label("data_compra"),
                        ItemNotaFiscal.valor_unitario
                    )
                    .join(NotaFiscal, ItemNotaFiscal.id_nota_fiscal == NotaFiscal.id)
                    .where(
                        NotaFiscal.usuario_id == user_id,
                        ItemNotaFiscal.id_produto == prod_id,
                        purchase_date_expr >= start_date,
                        purchase_date_expr < end_date
                    )
                    .order_by(text("data_compra ASC"))
                )
                history_res = session.execute(stmt_history).all()
                
                historico = []
                for row_dt, row_preco in history_res:
                    dt_str = row_dt.strftime("%d/%m") if row_dt else ""
                    historico.append({
                        "data": dt_str,
                        "preco": float(row_preco)
                    })
                    
                produtos_frequentes.append({
                    "nome": prod_desc,
                    "historico": historico,
                    "codigo_NCM_comercial": prod_ncm,
                    "sem_gtin": bool(prod_sem_gtin),
                })

            stmt_grupos_ncm = (
                select(
                    Produto.codigo_NCM_comercial,
                    Produto.categoria,
                    func.count(func.distinct(Produto.id)).label("qtd_produtos"),
                    func.sum(ItemNotaFiscal.quantidade * ItemNotaFiscal.valor_unitario).label("valor_total"),
                    func.min(Produto.descricao).label("exemplo_nome"),
                )
                .join(ItemNotaFiscal, ItemNotaFiscal.id_produto == Produto.id)
                .join(NotaFiscal, ItemNotaFiscal.id_nota_fiscal == NotaFiscal.id)
                .where(
                    NotaFiscal.usuario_id == user_id,
                    Produto.sem_gtin.is_(True),
                    Produto.codigo_NCM_comercial.is_not(None),
                    purchase_date_expr >= start_date,
                    purchase_date_expr < end_date,
                )
                .group_by(Produto.codigo_NCM_comercial, Produto.categoria)
                .order_by(text("valor_total DESC"))
            )
            grupos_ncm_res = session.execute(stmt_grupos_ncm).all()

            grupos_ncm_sem_gtin = []
            for ncm_val, cat_db, qtd_produtos, valor_total, exemplo_nome in grupos_ncm_res:
                if not ncm_val:
                    continue
                grupos_ncm_sem_gtin.append({
                    "ncm": ncm_val,
                    "categoria": obter_categoria_por_ncm(ncm_val, cat_db),
                    "quantidade_produtos": int(qtd_produtos or 0),
                    "valor_total": round(float(valor_total or 0.0), 2),
                    "produto_nome": exemplo_nome,
                })
                
            mes_nome = PORTUGUESE_MONTHS.get(month, "Outro")
            dashboard_list.append({
                "mesAno": f"{mes_nome} {year}",
                "mediaGastosMensal": round(total_spent, 2),
                "quantidadeNotas": note_count,
                "ticketMedio": round(ticket_medio, 2),
                "gastosPorCategoria": gastos_por_categoria,
                "produtosFrequentes": produtos_frequentes,
                "gruposNcmSemGtin": grupos_ncm_sem_gtin,
            })
            
        return dashboard_list
        
    finally:
        session.close()
