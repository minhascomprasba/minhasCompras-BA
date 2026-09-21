from __future__ import annotations

from datetime import date, datetime, time

from fastapi import APIRouter, Query, Request, Response, Depends
from fastapi.responses import FileResponse
from sqlalchemy import text

from src.api import settings
from src.api.security import get_current_user_id
from src.api.errors import RateLimitError, ValidationError
from src.api.rate_limit import InMemoryRateLimiter
from src.api.schemas import (
    CaptchaSubmitRequest,
    CaptchaSubmitResponse,
    DashboardDataResponse,
    HealthResponse,
    ImportCreateRequest,
    ImportCreateResponse,
    ImportStatusResponse,
    MapaPontoResponse,
    NotaDetailResponse,
    PaginatedImportsResponse,
    PaginatedItemsResponse,
    PaginatedNotasResponse,
    ReadyResponse,
    SystemStatsResponse,
)
from src.api.services.import_service import (
    get_captcha_image_path,
    get_import_status,
    get_nota,
    list_estabelecimentos_mapa,
    list_imports,
    list_items,
    list_notas,
    start_import,
    submit_captcha,
)
from src.api.services.dashboard_service import get_dashboard_data
from src.database.connection import SessionLocal
from src.database.models import Usuario, NotaFiscal, Produto

router = APIRouter(prefix=settings.API_PREFIX)
import_rate_limiter = InMemoryRateLimiter(settings.IMPORT_RATE_LIMIT_PER_MIN)


def _get_client_ip(request: Request) -> str:
    x_forwarded_for = request.headers.get("x-forwarded-for", "").strip()
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    if request.client is None:
        return "unknown"
    return request.client.host


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok")


@router.get("/ready", response_model=ReadyResponse)
def ready(response: Response) -> ReadyResponse:
    session = SessionLocal()
    try:
        session.execute(text("SELECT 1"))
        return ReadyResponse(status="ready", database="ok")
    except Exception:
        response.status_code = 503
        return ReadyResponse(status="not_ready", database="down")
    finally:
        session.close()


@router.get("/stats", response_model=SystemStatsResponse)
def get_system_stats() -> SystemStatsResponse:
    session = SessionLocal()
    try:
        total_users = session.query(Usuario).count()
        
        now = datetime.utcnow()
        inicio_mes = datetime(now.year, now.month, 1)
        total_notas_mes = session.query(NotaFiscal).filter(NotaFiscal.created_at >= inicio_mes).count()
        
        total_products = session.query(Produto).count()
        
        return SystemStatsResponse(
            total_users=total_users,
            total_notas_mes=total_notas_mes,
            total_products=total_products
        )
    except Exception:
        return SystemStatsResponse(total_users=0, total_notas_mes=0, total_products=0)
    finally:
        session.close()


@router.post("/imports/nfce", response_model=ImportCreateResponse, status_code=202)
def create_import(payload: ImportCreateRequest, request: Request, user_id: int = Depends(get_current_user_id)) -> ImportCreateResponse:
    client_ip = _get_client_ip(request)
    if not import_rate_limiter.allow(client_ip):
        raise RateLimitError(
            code="RATE_LIMIT_EXCEEDED",
            message="Limite de requisicoes excedido. Tente novamente em instantes.",
            details={"ip": client_ip},
        )

    created = start_import(payload.access_key, user_id, payload.source)
    return ImportCreateResponse(**created)


@router.get("/imports/nfce/{import_id}/captcha-image")
def captcha_image(import_id: str, user_id: int = Depends(get_current_user_id)) -> FileResponse:
    path = get_captcha_image_path(import_id, user_id)
    return FileResponse(path=path, media_type="image/png")


@router.post("/imports/nfce/{import_id}/captcha", response_model=CaptchaSubmitResponse, status_code=202)
def send_captcha(import_id: str, payload: CaptchaSubmitRequest, user_id: int = Depends(get_current_user_id)) -> CaptchaSubmitResponse:
    result = submit_captcha(import_id, payload.captcha_code, user_id)
    return CaptchaSubmitResponse(**result)


@router.get("/imports/nfce/{import_id}", response_model=ImportStatusResponse)
def import_status(import_id: str, user_id: int = Depends(get_current_user_id)) -> ImportStatusResponse:
    result = get_import_status(import_id, user_id)
    return ImportStatusResponse(**result)


@router.get("/imports/nfce", response_model=PaginatedImportsResponse)
def import_list(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    status: str | None = Query(default=None),
    user_id: int = Depends(get_current_user_id)
) -> PaginatedImportsResponse:
    data = list_imports(page=page, page_size=page_size, status=status, usuario_id=user_id)
    return PaginatedImportsResponse(**data)


@router.get("/notas", response_model=PaginatedNotasResponse)
def notas(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    from_date: str | None = Query(default=None, alias="from"),
    to_date: str | None = Query(default=None, alias="to"),
    user_id: int = Depends(get_current_user_id)
) -> PaginatedNotasResponse:
    parsed_from = None
    parsed_to = None

    if from_date:
        try:
            parsed_from = datetime.combine(date.fromisoformat(from_date), time.min)
        except ValueError as exc:
            raise ValidationError(
                code="INVALID_FROM_DATE",
                message="Parametro 'from' deve estar no formato YYYY-MM-DD.",
                details={"field": "from"},
            ) from exc
    if to_date:
        try:
            parsed_to = datetime.combine(date.fromisoformat(to_date), time.max)
        except ValueError as exc:
            raise ValidationError(
                code="INVALID_TO_DATE",
                message="Parametro 'to' deve estar no formato YYYY-MM-DD.",
                details={"field": "to"},
            ) from exc

    if parsed_from and parsed_to and parsed_from > parsed_to:
        raise ValidationError(
            code="INVALID_DATE_RANGE",
            message="Parametro 'from' nao pode ser maior que 'to'.",
            details={"from": from_date or "", "to": to_date or ""},
        )

    data = list_notas(page=page, page_size=page_size, from_date=parsed_from, to_date=parsed_to, usuario_id=user_id)
    return PaginatedNotasResponse(**data)


@router.get("/mapa", response_model=list[MapaPontoResponse])
def mapa(user_id: int = Depends(get_current_user_id)) -> list[MapaPontoResponse]:
    data = list_estabelecimentos_mapa(user_id)
    return [MapaPontoResponse(**item) for item in data]


@router.get("/notas/{nota_id}", response_model=NotaDetailResponse)
def nota_detail(nota_id: int, user_id: int = Depends(get_current_user_id)) -> NotaDetailResponse:
    data = get_nota(nota_id, user_id)
    return NotaDetailResponse(**data)


@router.get("/notas/{nota_id}/itens", response_model=PaginatedItemsResponse)
def nota_items(
    nota_id: int,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=100),
    user_id: int = Depends(get_current_user_id)
) -> PaginatedItemsResponse:
    data = list_items(nota_id=nota_id, page=page, page_size=page_size, usuario_id=user_id)
    return PaginatedItemsResponse(**data)


@router.get("/dashboard", response_model=list[DashboardDataResponse])
def dashboard(user_id: int = Depends(get_current_user_id)) -> list[DashboardDataResponse]:
    data = get_dashboard_data(user_id)
    return [DashboardDataResponse(**item) for item in data]


