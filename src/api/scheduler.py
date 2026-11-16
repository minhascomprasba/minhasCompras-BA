"""Agendador de jobs dentro do processo da API (APScheduler).

O job diario de retencao exclui as contas com carencia vencida e limpa registros
temporarios. So dispara enquanto o processo da API esta no ar: se a instancia estiver
parada no horario, a execucao daquele dia e perdida, mas a seguinte processa todas
as contas vencidas (a exclusao atrasa, nunca e antecipada).

Execucao manual: ``python -m src.api.services.retention_service``.
"""
import logging

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from src.api.services.retention_service import run_retention_jobs

logger = logging.getLogger(__name__)

RETENTION_JOB_ID = "retention-daily"
RETENTION_JOB_TIMEZONE = "America/Bahia"
RETENTION_JOB_HOUR = 3
RETENTION_JOB_MINUTE = 0

_scheduler: BackgroundScheduler | None = None


def _run_retention_job() -> None:
    try:
        result = run_retention_jobs()
        logger.info("Job de retenção concluído: %s contas excluídas, %s adiadas.", result["purged"], result["skipped"])
    except Exception:
        # Nao derruba o agendador; a proxima execucao tenta de novo.
        logger.exception("Falha no job de retenção.")


def build_scheduler() -> BackgroundScheduler:
    scheduler = BackgroundScheduler(timezone=RETENTION_JOB_TIMEZONE)
    scheduler.add_job(
        _run_retention_job,
        CronTrigger(hour=RETENTION_JOB_HOUR, minute=RETENTION_JOB_MINUTE, timezone=RETENTION_JOB_TIMEZONE),
        id=RETENTION_JOB_ID,
        replace_existing=True,
        coalesce=True,           # varias execucoes atrasadas viram uma so
        max_instances=1,         # nunca roda em paralelo consigo mesmo
        misfire_grace_time=3600, # tolera ate 1h de atraso (ex.: processo ocupado)
    )
    return scheduler


def start_scheduler() -> None:
    global _scheduler
    if _scheduler is not None:
        return
    _scheduler = build_scheduler()
    _scheduler.start()
    logger.info("Job de retenção agendado; próxima execução: %s", _scheduler.get_job(RETENTION_JOB_ID).next_run_time)


def shutdown_scheduler() -> None:
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None
