from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from src.api.errors import ApiError
from src.api.routers import router
from src.api.auth import auth_router
from src.api.schemas import ErrorResponse
from src.database.connection import engine
from src.database.models import Base
from src.api import settings

app = FastAPI(title="minhasCompras-BA API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router)
app.include_router(auth_router, prefix=settings.API_PREFIX)


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)


@app.exception_handler(ApiError)
def handle_api_error(_: Request, exc: ApiError) -> JSONResponse:
    payload = ErrorResponse(code=exc.code, message=exc.message, details={k: str(v) for k, v in exc.details.items()})
    return JSONResponse(status_code=exc.status_code, content=payload.model_dump())


@app.exception_handler(RequestValidationError)
def handle_request_validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
    payload = ErrorResponse(code="INVALID_REQUEST", message="Payload ou parametros invalidos.", details={"errors": str(exc.errors())})
    return JSONResponse(status_code=400, content=payload.model_dump())


@app.exception_handler(Exception)
def handle_generic_error(_: Request, exc: Exception) -> JSONResponse:
    payload = ErrorResponse(code="INTERNAL_ERROR", message="Erro interno.", details={"error": str(exc)})
    return JSONResponse(status_code=500, content=payload.model_dump())
