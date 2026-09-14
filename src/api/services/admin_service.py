from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.api.errors import ConflictError, NotFoundError, ValidationError
from src.api.services.dashboard_service import PORTUGUESE_MONTHS
from src.database.connection import SessionLocal
from src.database.models import (
    Estabelecimento,
    ImportSource,
    ImportStatus,
    ItemNotaFiscal,
    NfceImport,
    NotaFiscal,
    Produto,
    Usuario,
    UserRole,
)

PERIOD_7D = "7d"
PERIOD_30D = "30d"
PERIOD_MONTH = "mes"
PERIOD_YEAR = "ano"
PERIOD_ALL = "geral"
VALID_PERIODS = (PERIOD_7D, PERIOD_30D, PERIOD_MONTH, PERIOD_YEAR, PERIOD_ALL)

WEEKDAY_LABELS = ("Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom")
MONTH_ABBR = {
    1: "Jan", 2: "Fev", 3: "Mar", 4: "Abr", 5: "Mai", 6: "Jun",
    7: "Jul", 8: "Ago", 9: "Set", 10: "Out", 11: "Nov", 12: "Dez",
}
MAX_HISTORY_BUCKETS = 12
TOP_PRODUTOS_LIMIT = 10
TOP_REDES_LIMIT = 5
LOGS_LIMIT = 15

FINAL_IMPORT_STATUSES = (
    ImportStatus.COMPLETED.value,
    ImportStatus.FAILED.value,
    ImportStatus.EXPIRED.value,
)

KPI_DESCRIPTIONS = {
    "citizens": (
        "Métrica primária de alcance social. Mede a penetração da tecnologia desenvolvida na UEFS "
        "junto à sociedade civil."
    ),
    "receipts": (
        "Mede o engajamento contínuo: um número crescente de notas por usuário comprova que a "
        "ferramenta se tornou um hábito real de controle financeiro, e não um uso único descartável."
    ),
    "items": (
        "Representa o tamanho real da base de conhecimento: cada item catalogado alimenta a base "
        "estatística de preços da Bahia, tornando a amostra cada vez mais densa e confiável para "
        "pesquisas."
    ),
    "volume": (
        "Demonstra a relevância econômica do projeto: o volume financeiro consolidado traduz o "
        "impacto do software em números compreensíveis para fomento, imprensa e comunidade acadêmica."
    ),
    "stability": (
        "Observabilidade da infraestrutura: taxa de sucesso e tempo médio do robô que interage com o "
        "portal da SEFAZ-BA. Quedas sinalizam a necessidade de manutenção antes que os usuários "
        "comecem a reclamar."
    ),
}

CHANNEL_LABELS = {
    ImportSource.QR_CODE.value: ("QR Code", "var(--brand-green)"),
    ImportSource.PHOTO.value: ("Foto / Câmera", "var(--brand-blue-light)"),
    ImportSource.MANUAL.value: ("Chave Manual", "var(--warning)"),
}
UNKNOWN_SLICE_COLOR = "var(--text-muted)"
EMPTY_SLICE_COLOR = "var(--border-color)"

PAYMENT_COLORS = {
    "Pix": "var(--brand-blue-light)",
    "Cartões": "#ec4899",
    "Dinheiro": "var(--brand-green)",
    "Vales e Benefícios": "var(--warning)",
    "Outros": "#8b5cf6",
    "Não informado": UNKNOWN_SLICE_COLOR,
}


@dataclass(frozen=True)
class Bucket:
    label: str
    start: datetime
    end: datetime


@dataclass(frozen=True)
class PeriodWindow:
    key: str
    label: str
    mes_ano: str
    janela_label: str
    bucket_label: str
    start: datetime | None
    end: datetime
    previous_start: datetime | None
    previous_end: datetime | None
    buckets: tuple[Bucket, ...]

    @property
    def has_previous(self) -> bool:
        return self.previous_start is not None and self.previous_end is not None


def normalize_period(period: str | None) -> str:
    if not period:
        return PERIOD_30D
    normalized = period.strip().lower()
    if normalized not in VALID_PERIODS:
        raise ValidationError(
            code="INVALID_PERIOD",
            message="Período informado é inválido.",
            details={"field": "period", "allowed": ", ".join(VALID_PERIODS)},
        )
    return normalized


def _start_of_day(moment: datetime) -> datetime:
    return moment.replace(hour=0, minute=0, second=0, microsecond=0)


def _start_of_month(moment: datetime) -> datetime:
    return moment.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def _add_month(moment: datetime) -> datetime:
    if moment.month == 12:
        return moment.replace(year=moment.year + 1, month=1)
    return moment.replace(month=moment.month + 1)


def _daily_buckets(start: datetime, end: datetime) -> tuple[Bucket, ...]:
    buckets: list[Bucket] = []
    cursor = start
    while cursor < end:
        next_cursor = cursor + timedelta(days=1)
        buckets.append(Bucket(label=WEEKDAY_LABELS[cursor.weekday()], start=cursor, end=next_cursor))
        cursor = next_cursor
    return tuple(buckets)


def _weekly_buckets(start: datetime, end: datetime) -> tuple[Bucket, ...]:
    buckets: list[Bucket] = []
    cursor = start
    index = 1
    while cursor < end:
        next_cursor = min(cursor + timedelta(days=7), end)
        buckets.append(Bucket(label=f"S{index}", start=cursor, end=next_cursor))
        cursor = next_cursor
        index += 1
    return tuple(buckets)


def _monthly_buckets(start: datetime, end: datetime) -> tuple[Bucket, ...]:
    buckets: list[Bucket] = []
    cursor = _start_of_month(start)
    while cursor < end:
        next_cursor = _add_month(cursor)
        label = MONTH_ABBR[cursor.month]
        if start.year != end.year or cursor.year != end.year:
            label = f"{label}/{str(cursor.year)[-2:]}"
        buckets.append(Bucket(label=label, start=cursor, end=min(next_cursor, end)))
        cursor = next_cursor
    return tuple(buckets[-MAX_HISTORY_BUCKETS:])


def _format_date(moment: datetime) -> str:
    return moment.strftime("%d/%m/%Y")


def _resolve_window(period: str, now: datetime, earliest: datetime | None) -> PeriodWindow:
    end = now
    mes_ano = f"{PORTUGUESE_MONTHS[now.month]} {now.year}"

    if period == PERIOD_7D:
        start = _start_of_day(now) - timedelta(days=6)
        previous_start = start - timedelta(days=7)
        return PeriodWindow(
            key=period,
            label="Últimos 7 dias",
            mes_ano=mes_ano,
            janela_label=f"{_format_date(start)} a {_format_date(now)}",
            bucket_label="Dia",
            start=start,
            end=end,
            previous_start=previous_start,
            previous_end=start,
            buckets=_daily_buckets(start, _start_of_day(now) + timedelta(days=1)),
        )

    if period == PERIOD_30D:
        start = _start_of_day(now) - timedelta(days=29)
        previous_start = start - timedelta(days=30)
        return PeriodWindow(
            key=period,
            label="Últimos 30 dias",
            mes_ano=mes_ano,
            janela_label=f"{_format_date(start)} a {_format_date(now)}",
            bucket_label="Semana",
            start=start,
            end=end,
            previous_start=previous_start,
            previous_end=start,
            buckets=_weekly_buckets(start, _start_of_day(now) + timedelta(days=1)),
        )

    if period == PERIOD_MONTH:
        start = _start_of_month(now)
        previous_end = start
        previous_start = _start_of_month(start - timedelta(days=1))
        return PeriodWindow(
            key=period,
            label="Mês a Mês",
            mes_ano=mes_ano,
            janela_label=f"{mes_ano} (comparado a {PORTUGUESE_MONTHS[previous_start.month]} {previous_start.year})",
            bucket_label="Semana",
            start=start,
            end=end,
            previous_start=previous_start,
            previous_end=previous_end,
            buckets=_weekly_buckets(start, _start_of_day(now) + timedelta(days=1)),
        )

    if period == PERIOD_YEAR:
        start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        previous_start = start.replace(year=start.year - 1)
        return PeriodWindow(
            key=period,
            label="Ano a Ano",
            mes_ano=f"Ano {now.year}",
            janela_label=f"{now.year} (comparado a {previous_start.year})",
            bucket_label="Mês",
            start=start,
            end=end,
            previous_start=previous_start,
            previous_end=start,
            buckets=_monthly_buckets(start, _add_month(_start_of_month(now))),
        )

    history_start = _start_of_month(earliest or now)
    return PeriodWindow(
        key=PERIOD_ALL,
        label="Geral (Todo o Histórico)",
        mes_ano="Todo o histórico",
        janela_label=f"desde {_format_date(history_start)}",
        bucket_label="Mês",
        start=None,
        end=end,
        previous_start=None,
        previous_end=None,
        buckets=_monthly_buckets(history_start, _add_month(_start_of_month(now))),
    )


def _thousands(value: int) -> str:
    return f"{value:,}".replace(",", ".")


def _decimal(value: float, places: int = 1) -> str:
    return f"{value:.{places}f}".replace(".", ",")


def _format_quantity(value: int) -> str:
    if abs(value) >= 1_000_000:
        return f"{_decimal(value / 1_000_000)} mi"
    return _thousands(value)


def _format_money(value: float) -> str:
    if abs(value) >= 1_000_000:
        return f"R$ {_decimal(value / 1_000_000)} mi"
    inteiro, _, centavos = f"{value:,.2f}".partition(".")
    return f"R$ {inteiro.replace(',', '.')},{centavos}"


def _format_seconds(value: float) -> str:
    if value >= 60:
        minutos = int(value // 60)
        segundos = int(value % 60)
        return f"{minutos}min {segundos}s"
    return f"{_decimal(value)}s"


def _direction(current: float, previous: float) -> str:
    return "up" if current >= previous else "down"


def _apply_window(stmt, column, start: datetime | None, end: datetime | None):
    if start is not None:
        stmt = stmt.where(column >= start)
    if end is not None:
        stmt = stmt.where(column < end)
    return stmt


def _count_usuarios(session: Session, start: datetime | None, end: datetime | None) -> int:
    stmt = _apply_window(select(func.count()).select_from(Usuario), Usuario.created_at, start, end)
    return int(session.execute(stmt).scalar() or 0)


def _count_notas(session: Session, start: datetime | None, end: datetime | None) -> int:
    stmt = _apply_window(select(func.count()).select_from(NotaFiscal), NotaFiscal.created_at, start, end)
    return int(session.execute(stmt).scalar() or 0)


def _count_itens(session: Session, start: datetime | None, end: datetime | None) -> int:
    stmt = select(func.count()).select_from(ItemNotaFiscal).join(
        NotaFiscal, ItemNotaFiscal.id_nota_fiscal == NotaFiscal.id
    )
    return int(session.execute(_apply_window(stmt, NotaFiscal.created_at, start, end)).scalar() or 0)


def _sum_volume(session: Session, start: datetime | None, end: datetime | None) -> float:
    stmt = select(func.coalesce(func.sum(NotaFiscal.valor_total_nota), 0.0))
    return float(session.execute(_apply_window(stmt, NotaFiscal.created_at, start, end)).scalar() or 0.0)


def _scraper_stats(
    session: Session, start: datetime | None, end: datetime | None
) -> tuple[float | None, float | None, int]:
    """Taxa de sucesso (%), tempo medio das importacoes concluidas (s) e total finalizado."""
    stmt = select(NfceImport.status, NfceImport.created_at, NfceImport.finished_at).where(
        NfceImport.status.in_(FINAL_IMPORT_STATUSES)
    )
    rows = session.execute(_apply_window(stmt, NfceImport.created_at, start, end)).all()
    if not rows:
        return None, None, 0

    completed = [row for row in rows if row.status == ImportStatus.COMPLETED.value]
    success_rate = len(completed) / len(rows) * 100
    durations = [
        (row.finished_at - row.created_at).total_seconds()
        for row in completed
        if row.finished_at and row.created_at
    ]
    avg_duration = sum(durations) / len(durations) if durations else None
    return success_rate, avg_duration, len(rows)


def _build_kpis(session: Session, window: PeriodWindow) -> list[dict[str, object]]:
    previous = (window.previous_start, window.previous_end) if window.has_previous else (None, None)

    usuarios_total = _count_usuarios(session, None, None)
    usuarios_periodo = _count_usuarios(session, window.start, window.end)
    usuarios_anterior = _count_usuarios(session, *previous) if window.has_previous else 0

    notas_total = _count_notas(session, None, None)
    notas_periodo = _count_notas(session, window.start, window.end)
    notas_anterior = _count_notas(session, *previous) if window.has_previous else 0

    itens_total = _count_itens(session, None, None)
    itens_periodo = _count_itens(session, window.start, window.end)
    itens_anterior = _count_itens(session, *previous) if window.has_previous else 0

    volume_total = _sum_volume(session, None, None)
    volume_periodo = _sum_volume(session, window.start, window.end)
    volume_anterior = _sum_volume(session, *previous) if window.has_previous else 0.0

    taxa, tempo_medio, finalizados = _scraper_stats(session, window.start, window.end)
    taxa_anterior, _, finalizados_anteriores = (
        _scraper_stats(session, *previous) if window.has_previous else (None, None, 0)
    )

    if taxa is None:
        estabilidade_valor = "—"
        estabilidade_trend = "Nenhuma importação finalizada no período"
        estabilidade_direcao = "down"
    else:
        estabilidade_valor = f"{_decimal(taxa)}%"
        if taxa_anterior is None or finalizados_anteriores == 0:
            estabilidade_trend = f"{_thousands(finalizados)} importações finalizadas"
            estabilidade_direcao = "up" if taxa >= 90 else "down"
        else:
            delta_pp = taxa - taxa_anterior
            sinal = "+" if delta_pp >= 0 else "-"
            estabilidade_trend = f"{sinal}{_decimal(abs(delta_pp))} p.p. vs anterior"
            estabilidade_direcao = _direction(taxa, taxa_anterior)

    return [
        {
            "id": "citizens",
            "icon": "citizens",
            "label": "Cidadãos Cadastrados",
            "value": _format_quantity(usuarios_total),
            "trendLabel": f"+{_format_quantity(usuarios_periodo)} no período",
            "trendDirection": _direction(usuarios_periodo, usuarios_anterior),
            "description": KPI_DESCRIPTIONS["citizens"],
        },
        {
            "id": "receipts",
            "icon": "receipts",
            "label": "Notas Fiscais Importadas",
            "value": _format_quantity(notas_total),
            "trendLabel": f"+{_format_quantity(notas_periodo)} no período",
            "trendDirection": _direction(notas_periodo, notas_anterior),
            "description": KPI_DESCRIPTIONS["receipts"],
        },
        {
            "id": "items",
            "icon": "items",
            "label": "Itens Digitalizados",
            "value": _format_quantity(itens_total),
            "trendLabel": f"+{_format_quantity(itens_periodo)} no período",
            "trendDirection": _direction(itens_periodo, itens_anterior),
            "description": KPI_DESCRIPTIONS["items"],
        },
        {
            "id": "volume",
            "icon": "volume",
            "label": "Volume Financeiro Rastreado",
            "value": _format_money(volume_total),
            "trendLabel": f"+{_format_money(volume_periodo)} no período",
            "trendDirection": _direction(volume_periodo, volume_anterior),
            "description": KPI_DESCRIPTIONS["volume"],
        },
        {
            "id": "stability",
            "icon": "stability",
            "label": "Estabilidade do Scraper",
            "value": estabilidade_valor,
            "trendLabel": estabilidade_trend,
            "trendDirection": estabilidade_direcao,
            "extraMetric": {
                "label": "Tempo Médio",
                "value": _format_seconds(tempo_medio) if tempo_medio is not None else "—",
            },
            "description": KPI_DESCRIPTIONS["stability"],
        },
    ]


def _build_growth(session: Session, window: PeriodWindow) -> list[dict[str, object]]:
    if not window.buckets:
        return []

    first_start = window.buckets[0].start
    last_end = window.buckets[-1].end

    usuarios_base = _count_usuarios(session, None, first_start)
    notas_base = _count_notas(session, None, first_start)

    usuarios_datas = session.execute(
        _apply_window(select(Usuario.created_at), Usuario.created_at, first_start, last_end)
    ).scalars().all()
    notas_datas = session.execute(
        _apply_window(select(NotaFiscal.created_at), NotaFiscal.created_at, first_start, last_end)
    ).scalars().all()

    pontos: list[dict[str, object]] = []
    usuarios_acumulado = usuarios_base
    notas_acumulado = notas_base
    for bucket in window.buckets:
        usuarios_acumulado += sum(1 for data in usuarios_datas if bucket.start <= data < bucket.end)
        notas_acumulado += sum(1 for data in notas_datas if bucket.start <= data < bucket.end)
        pontos.append(
            {"semana": bucket.label, "usuarios": usuarios_acumulado, "notas": notas_acumulado}
        )
    return pontos


def _build_scraper_performance(session: Session, window: PeriodWindow) -> list[dict[str, object]]:
    if not window.buckets:
        return []

    first_start = window.buckets[0].start
    last_end = window.buckets[-1].end

    stmt = select(NfceImport.status, NfceImport.created_at).where(
        NfceImport.status.in_(FINAL_IMPORT_STATUSES)
    )
    rows = session.execute(_apply_window(stmt, NfceImport.created_at, first_start, last_end)).all()

    resultado: list[dict[str, object]] = []
    for bucket in window.buckets:
        do_bucket = [row for row in rows if bucket.start <= row.created_at < bucket.end]
        resultado.append(
            {
                "dia": bucket.label,
                "completed": sum(1 for row in do_bucket if row.status == ImportStatus.COMPLETED.value),
                "expired": sum(1 for row in do_bucket if row.status == ImportStatus.EXPIRED.value),
                "failed": sum(1 for row in do_bucket if row.status == ImportStatus.FAILED.value),
            }
        )
    return resultado


def _build_top_produtos(session: Session, window: PeriodWindow) -> list[dict[str, object]]:
    ocorrencias = func.count(ItemNotaFiscal.id).label("ocorrencias")
    preco_medio = func.avg(ItemNotaFiscal.valor_unitario).label("preco_medio")
    stmt = (
        select(Produto.id, Produto.descricao, ocorrencias, preco_medio)
        .join(ItemNotaFiscal, ItemNotaFiscal.id_produto == Produto.id)
        .join(NotaFiscal, ItemNotaFiscal.id_nota_fiscal == NotaFiscal.id)
        .group_by(Produto.id, Produto.descricao)
        .order_by(ocorrencias.desc())
        .limit(TOP_PRODUTOS_LIMIT)
    )
    rows = session.execute(_apply_window(stmt, NotaFiscal.created_at, window.start, window.end)).all()
    if not rows:
        return []

    precos_anteriores: dict[int, float] = {}
    if window.has_previous:
        anterior_stmt = (
            select(ItemNotaFiscal.id_produto, func.avg(ItemNotaFiscal.valor_unitario))
            .join(NotaFiscal, ItemNotaFiscal.id_nota_fiscal == NotaFiscal.id)
            .where(ItemNotaFiscal.id_produto.in_([row.id for row in rows]))
            .group_by(ItemNotaFiscal.id_produto)
        )
        precos_anteriores = {
            produto_id: float(media)
            for produto_id, media in session.execute(
                _apply_window(
                    anterior_stmt, NotaFiscal.created_at, window.previous_start, window.previous_end
                )
            ).all()
            if media is not None
        }

    produtos: list[dict[str, object]] = []
    for row in rows:
        atual = float(row.preco_medio or 0.0)
        anterior = precos_anteriores.get(row.id)
        variacao = ((atual - anterior) / anterior * 100) if anterior else 0.0
        produtos.append(
            {
                "nome": row.descricao,
                "precoMedio": round(atual, 2),
                "variacaoPercentual": round(variacao, 1),
                "ocorrencias": int(row.ocorrencias or 0),
            }
        )
    return produtos


def _build_alcance(session: Session, window: PeriodWindow) -> dict[str, object]:
    notas_count = func.count(NotaFiscal.id).label("notas_count")
    stmt = (
        select(Estabelecimento.cidade, Estabelecimento.nome_fantasia, notas_count)
        .join(NotaFiscal, NotaFiscal.estabelecimento_id == Estabelecimento.id)
        .group_by(Estabelecimento.cidade, Estabelecimento.nome_fantasia)
        .order_by(notas_count.desc())
    )
    rows = session.execute(_apply_window(stmt, NotaFiscal.created_at, window.start, window.end)).all()

    cidades: dict[str, int] = {}
    redes: dict[str, int] = {}
    for cidade, nome_fantasia, quantidade in rows:
        if cidade:
            cidades[cidade] = cidades.get(cidade, 0) + int(quantidade or 0)
        if nome_fantasia:
            redes[nome_fantasia] = redes.get(nome_fantasia, 0) + int(quantidade or 0)

    redes_lideres = [nome for nome, _ in sorted(redes.items(), key=lambda item: item[1], reverse=True)][
        :TOP_REDES_LIMIT
    ]

    if cidades:
        cidade_lider, notas_lider = max(cidades.items(), key=lambda item: item[1])
        nota = f"{cidade_lider} lidera o período com {_thousands(notas_lider)} notas importadas"
    else:
        nota = "Nenhuma nota importada no período selecionado"

    return {
        "totalCidades": len(cidades),
        "redesMonitoradas": len(redes),
        "redesLideres": redes_lideres,
        "nota": nota,
    }


def _to_slices(contagens: dict[str, int], cores: dict[str, str]) -> list[dict[str, object]]:
    total = sum(contagens.values())
    if total == 0:
        return [{"label": "Sem dados no período", "percentual": 100, "color": EMPTY_SLICE_COLOR}]

    ordenadas = [item for item in sorted(contagens.items(), key=lambda item: item[1], reverse=True) if item[1] > 0]
    slices = [
        {
            "label": label,
            "percentual": round(quantidade / total * 100, 1),
            "color": cores.get(label, UNKNOWN_SLICE_COLOR),
        }
        for label, quantidade in ordenadas
    ]

    # O donut e desenhado com conic-gradient, entao a soma precisa fechar em 100%.
    # O residuo do arredondamento vai para a maior fatia, onde 0,1 p.p. e imperceptivel.
    residuo = round(100 - sum(float(fatia["percentual"]) for fatia in slices), 1)
    if residuo and slices:
        slices[0]["percentual"] = round(float(slices[0]["percentual"]) + residuo, 1)
    return slices


def _normalize_meio_pagamento(valor: str | None) -> str:
    if not valor:
        return "Não informado"

    texto = valor.lower()
    if "pix" in texto:
        return "Pix"
    if "cart" in texto or "crédito" in texto or "credito" in texto or "débito" in texto or "debito" in texto:
        return "Cartões"
    if "dinheiro" in texto or "espécie" in texto or "especie" in texto:
        return "Dinheiro"
    if "vale" in texto or "alimenta" in texto or "refei" in texto:
        return "Vales e Benefícios"
    return "Outros"


def _build_telemetria(session: Session, window: PeriodWindow) -> dict[str, object]:
    canais_stmt = select(NfceImport.source, func.count(NfceImport.id)).group_by(NfceImport.source)
    canais_rows = session.execute(
        _apply_window(canais_stmt, NfceImport.created_at, window.start, window.end)
    ).all()

    canais: dict[str, int] = {}
    cores_canais: dict[str, str] = {}
    for source, quantidade in canais_rows:
        label, cor = CHANNEL_LABELS.get(source or "", ("Não informado", UNKNOWN_SLICE_COLOR))
        canais[label] = canais.get(label, 0) + int(quantidade or 0)
        cores_canais[label] = cor

    pagamentos_stmt = select(NotaFiscal.meio_pagamento, func.count(NotaFiscal.id)).group_by(
        NotaFiscal.meio_pagamento
    )
    pagamentos_rows = session.execute(
        _apply_window(pagamentos_stmt, NotaFiscal.created_at, window.start, window.end)
    ).all()

    pagamentos: dict[str, int] = {}
    for meio, quantidade in pagamentos_rows:
        label = _normalize_meio_pagamento(meio)
        pagamentos[label] = pagamentos.get(label, 0) + int(quantidade or 0)

    gtin_stmt = (
        select(Produto.sem_gtin, func.count(func.distinct(Produto.id)))
        .join(ItemNotaFiscal, ItemNotaFiscal.id_produto == Produto.id)
        .join(NotaFiscal, ItemNotaFiscal.id_nota_fiscal == NotaFiscal.id)
        .group_by(Produto.sem_gtin)
    )
    gtin_rows = session.execute(
        _apply_window(gtin_stmt, NotaFiscal.created_at, window.start, window.end)
    ).all()

    com_gtin = 0
    sem_gtin = 0
    for flag, quantidade in gtin_rows:
        if flag:
            sem_gtin += int(quantidade or 0)
        else:
            com_gtin += int(quantidade or 0)

    total_produtos = com_gtin + sem_gtin
    if total_produtos:
        percentual_com_gtin = round(com_gtin / total_produtos * 100)
        percentual_sem_gtin = 100 - percentual_com_gtin
    else:
        percentual_com_gtin = 0
        percentual_sem_gtin = 0

    return {
        "canaisImportacao": _to_slices(canais, cores_canais),
        "meiosPagamento": _to_slices(pagamentos, PAYMENT_COLORS),
        "qualidadeCatalogo": {
            "comGtin": percentual_com_gtin,
            "semGtin": percentual_sem_gtin,
            "produtosCatalogados": total_produtos,
        },
    }


def _classify_log(status: str, error_message: str | None) -> str:
    mensagem = (error_message or "").lower()
    if "limite de tentativas" in mensagem:
        return "limite_captcha"
    if "timeout" in mensagem or "tempo" in mensagem:
        return "timeout_sefaz"
    if status == ImportStatus.EXPIRED.value:
        return "captcha_expirado"
    return "scraper_falha"


def _mask_access_key(access_key: str) -> str:
    if len(access_key) < 10:
        return "NFC-e ***"
    return f"NFC-e {access_key[:6]}...{access_key[-4:]}"


def _build_logs(session: Session, window: PeriodWindow) -> list[dict[str, object]]:
    stmt = (
        select(NfceImport)
        .where(NfceImport.status.in_((ImportStatus.FAILED.value, ImportStatus.EXPIRED.value)))
        .order_by(NfceImport.created_at.desc())
        .limit(LOGS_LIMIT)
    )
    rows = session.execute(
        _apply_window(stmt, NfceImport.created_at, window.start, window.end)
    ).scalars().all()

    return [
        {
            "importId": row.id,
            "dataHora": (row.finished_at or row.updated_at or row.created_at).strftime("%d/%m/%Y %H:%M"),
            "idNota": _mask_access_key(row.access_key),
            "tentativas": row.attempts,
            "erro": row.error_message or "Falha não detalhada pelo robô",
            "status": _classify_log(row.status, row.error_message),
        }
        for row in rows
    ]


def get_admin_dashboard(period: str | None) -> dict[str, object]:
    normalized = normalize_period(period)
    session = SessionLocal()
    try:
        earliest = session.execute(select(func.min(Usuario.created_at))).scalar()
        window = _resolve_window(normalized, datetime.utcnow(), earliest)
        return {
            "periodo": window.key,
            "periodoLabel": window.label,
            "mesAno": window.mes_ano,
            "janelaLabel": window.janela_label,
            "bucketLabel": window.bucket_label,
            "kpis": _build_kpis(session, window),
            "crescimentoAdesao": _build_growth(session, window),
            "performanceScraper": _build_scraper_performance(session, window),
            "topProdutos": _build_top_produtos(session, window),
            "alcanceGeografico": _build_alcance(session, window),
            "telemetria": _build_telemetria(session, window),
            "logs": _build_logs(session, window),
        }
    finally:
        session.close()


def _serialize_usuario(
    usuario: Usuario, notas_count: int = 0, itens_count: int = 0, ultima_atividade: datetime | None = None
) -> dict[str, object]:
    return {
        "id": usuario.id,
        "email": usuario.email,
        "role": usuario.role,
        "created_at": usuario.created_at,
        "notas_count": notas_count,
        "itens_count": itens_count,
        "ultima_atividade": ultima_atividade,
    }


def list_usuarios(page: int, page_size: int, search: str | None, role: str | None) -> dict[str, object]:
    normalized_role = role.strip().upper() if role else None
    if normalized_role and normalized_role not in {item.value for item in UserRole}:
        raise ValidationError(
            code="INVALID_ROLE_FILTER",
            message="Perfil informado para filtro é inválido.",
            details={"field": "role"},
        )

    session = SessionLocal()
    try:
        base = select(Usuario)
        count_stmt = select(func.count()).select_from(Usuario)

        if search:
            termo = f"%{search.strip()}%"
            base = base.where(Usuario.email.ilike(termo))
            count_stmt = count_stmt.where(Usuario.email.ilike(termo))
        if normalized_role:
            base = base.where(Usuario.role == normalized_role)
            count_stmt = count_stmt.where(Usuario.role == normalized_role)

        total = int(session.execute(count_stmt).scalar() or 0)
        usuarios = session.execute(
            base.order_by(Usuario.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        ).scalars().all()

        data: list[dict[str, object]] = []
        for usuario in usuarios:
            notas_count = int(
                session.execute(
                    select(func.count())
                    .select_from(NotaFiscal)
                    .where(NotaFiscal.usuario_id == usuario.id)
                ).scalar()
                or 0
            )
            itens_count = int(
                session.execute(
                    select(func.count())
                    .select_from(ItemNotaFiscal)
                    .join(NotaFiscal, ItemNotaFiscal.id_nota_fiscal == NotaFiscal.id)
                    .where(NotaFiscal.usuario_id == usuario.id)
                ).scalar()
                or 0
            )
            ultima_atividade = session.execute(
                select(func.max(NotaFiscal.created_at)).where(NotaFiscal.usuario_id == usuario.id)
            ).scalar()
            data.append(_serialize_usuario(usuario, notas_count, itens_count, ultima_atividade))

        return {"data": data, "page": page, "page_size": page_size, "total": total}
    finally:
        session.close()


def update_usuario_role(target_id: int, new_role: str, actor_id: int) -> dict[str, object]:
    normalized_role = (new_role or "").strip().upper()
    if normalized_role not in {item.value for item in UserRole}:
        raise ValidationError(
            code="INVALID_ROLE",
            message="Perfil inválido. Use USER, ADMIN ou SUPER_ADMIN.",
            details={"field": "role"},
        )

    if target_id == actor_id:
        raise ConflictError(
            code="CANNOT_CHANGE_OWN_ROLE",
            message="Você não pode alterar o seu próprio perfil de acesso.",
            details={"usuario_id": str(target_id)},
        )

    session = SessionLocal()
    try:
        usuario = session.get(Usuario, target_id)
        if usuario is None:
            raise NotFoundError(
                code="USER_NOT_FOUND",
                message="Usuário não encontrado.",
                details={"usuario_id": str(target_id)},
            )

        if usuario.role == UserRole.SUPER_ADMIN.value and normalized_role != UserRole.SUPER_ADMIN.value:
            super_admins = int(
                session.execute(
                    select(func.count())
                    .select_from(Usuario)
                    .where(Usuario.role == UserRole.SUPER_ADMIN.value)
                ).scalar()
                or 0
            )
            if super_admins <= 1:
                raise ConflictError(
                    code="LAST_SUPER_ADMIN",
                    message="O sistema precisa manter pelo menos um super admin.",
                    details={"usuario_id": str(target_id)},
                )

        usuario.role = normalized_role
        session.commit()
        session.refresh(usuario)
        return _serialize_usuario(usuario)
    finally:
        session.close()


def get_role_summary() -> dict[str, int]:
    session = SessionLocal()
    try:
        rows = session.execute(
            select(Usuario.role, func.count(Usuario.id)).group_by(Usuario.role)
        ).all()
        resumo = {item.value: 0 for item in UserRole}
        for role, quantidade in rows:
            resumo[role] = int(quantidade or 0)
        return resumo
    finally:
        session.close()
