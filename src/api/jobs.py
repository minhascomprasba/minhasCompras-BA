"""Disparo manual dos jobs (o agendamento diario roda no APScheduler, ver src/api/scheduler.py)."""
import hmac

from fastapi import APIRouter, Header

from src.api import settings
from src.api.errors import ApiError
from src.api.services.retention_service import run_retention_jobs

jobs_router = APIRouter(prefix="/internal/jobs", tags=["internal"], include_in_schema=False)


def _require_job_secret(provided: str | None) -> None:
    if not settings.JOB_SECRET:
        # Sem segredo configurado o endpoint fica indisponivel, nunca aberto.
        raise ApiError("JOBS_DISABLED", "Jobs internos desativados: defina JOB_SECRET.", 503)
    if not provided or not hmac.compare_digest(provided.encode(), settings.JOB_SECRET.encode()):
        raise ApiError("UNAUTHORIZED", "Não autorizado.", 401)


@jobs_router.post("/retention")
def retention_job(x_job_secret: str | None = Header(default=None)):
    """Limpeza diaria: registros de autenticacao, captchas e exclusao das contas com carencia vencida."""
    _require_job_secret(x_job_secret)
    return run_retention_jobs()
