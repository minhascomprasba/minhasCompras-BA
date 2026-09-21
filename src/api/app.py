from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import func, inspect, text

from src.api.errors import ApiError
from src.api.routers import router
from src.api.admin import admin_router
from src.api.auth import auth_router
from src.api.schemas import ErrorResponse
from src.database.connection import SessionLocal, engine
from src.database.models import Base, Usuario, UserRole
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
app.include_router(admin_router, prefix=settings.API_PREFIX)


def _ensure_schema_updates() -> None:
    inspector = inspect(engine)
    column_type = "TIMESTAMP" if engine.dialect.name == "postgresql" else "DATETIME"
    boolean_type = "BOOLEAN" if engine.dialect.name == "postgresql" else "INTEGER"
    boolean_default = "FALSE" if engine.dialect.name == "postgresql" else "0"

    with engine.begin() as connection:
        if inspector.has_table("notas_fiscais"):
            columns = {column["name"] for column in inspector.get_columns("notas_fiscais")}
            if "data_compra" not in columns:
                connection.execute(text(f"ALTER TABLE notas_fiscais ADD COLUMN data_compra {column_type}"))
            if "meio_pagamento" not in columns:
                connection.execute(text("ALTER TABLE notas_fiscais ADD COLUMN meio_pagamento VARCHAR"))
            if "valor_desconto_nota" not in columns:
                connection.execute(
                    text("ALTER TABLE notas_fiscais ADD COLUMN valor_desconto_nota FLOAT NOT NULL DEFAULT 0")
                )
                # Notas antigas nao tinham desconto rastreado: valor_total_nota
                # ja era o valor pago (sem desconto conhecido), permanece igual.

        if inspector.has_table("itens_nota_fiscal"):
            item_columns = {column["name"] for column in inspector.get_columns("itens_nota_fiscal")}
            if "valor_desconto" not in item_columns:
                connection.execute(
                    text("ALTER TABLE itens_nota_fiscal ADD COLUMN valor_desconto FLOAT NOT NULL DEFAULT 0")
                )

        if inspector.has_table("produto"):
            produto_columns = {column["name"] for column in inspector.get_columns("produto")}
            if "sem_gtin" not in produto_columns:
                connection.execute(
                    text(f"ALTER TABLE produto ADD COLUMN sem_gtin {boolean_type} NOT NULL DEFAULT {boolean_default}")
                )

        if inspector.has_table("usuarios"):
            usuario_columns = {column["name"] for column in inspector.get_columns("usuarios")}
            if "role" not in usuario_columns:
                connection.execute(
                    text(
                        "ALTER TABLE usuarios ADD COLUMN role VARCHAR(20) NOT NULL "
                        f"DEFAULT '{UserRole.USER.value}'"
                    )
                )

        if inspector.has_table("nfce_imports"):
            import_columns = {column["name"] for column in inspector.get_columns("nfce_imports")}
            if "source" not in import_columns:
                connection.execute(text("ALTER TABLE nfce_imports ADD COLUMN source VARCHAR(20)"))


def _bootstrap_super_admins() -> None:
    """Promove a super admin os e-mails listados em SUPER_ADMIN_EMAILS.

    E o unico caminho para criar o primeiro super admin: a partir dele a
    promocao de outros usuarios acontece pelo painel administrativo.
    """
    if not settings.SUPER_ADMIN_EMAILS:
        return

    session = SessionLocal()
    try:
        usuarios = (
            session.query(Usuario)
            .filter(func.lower(Usuario.email).in_(settings.SUPER_ADMIN_EMAILS))
            .all()
        )
        for usuario in usuarios:
            if usuario.role != UserRole.SUPER_ADMIN.value:
                usuario.role = UserRole.SUPER_ADMIN.value
        session.commit()
    finally:
        session.close()


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)
    _ensure_schema_updates()
    _bootstrap_super_admins()


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
