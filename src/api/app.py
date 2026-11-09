from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import inspect, text

from src.api.errors import ApiError
from src.api.routers import router
from src.api.admin import admin_router
from src.api.auth import auth_router
from src.api.account import account_router
from src.api.jobs import jobs_router
from src.api.schemas import ErrorResponse
from src.api.services.import_service import driver_pool
from src.database.connection import engine
from src.database.models import Base, UserRole
from src.api import settings

API_DESCRIPTION = """
API REST do **Minhas Compras BA**: importa notas fiscais de consumidor eletronicas
(NFC-e) do portal da SEFAZ-BA a partir da chave de acesso de 44 digitos, com
resolucao manual do captcha pelo usuario, e expoe os dados normalizados de notas,
produtos, estabelecimentos e indicadores de gastos.

**Autenticacao:** as rotas de importacao, consulta e dashboard exigem o header
`Authorization: Bearer <token>`. Obtenha o token em `POST /api/v1/auth/login`
(ou em `POST /api/v1/auth/verify-email`, no primeiro acesso) e informe-o no botao
**Authorize**.

**Formato de erro:** todas as falhas retornam
`{"code": "...", "message": "...", "details": {...}}`.
"""

TAGS_METADATA = [
    {"name": "health", "description": "Sondas de liveness/readiness e estatisticas publicas agregadas."},
    {"name": "auth", "description": "Cadastro com confirmacao por e-mail, login JWT e recuperacao de senha."},
    {"name": "imports", "description": "Ciclo de importacao de NFC-e: abertura de sessao, captcha e acompanhamento."},
    {"name": "notas", "description": "Consulta paginada das notas fiscais importadas e de seus itens."},
    {"name": "dashboard", "description": "Indicadores agregados por mes e geolocalizacao dos estabelecimentos."},
    {"name": "account", "description": "Perfil do usuario: troca de e-mail/senha, exportacao de dados e exclusao da conta (LGPD)."},
    {"name": "admin", "description": "Indicadores administrativos e gestao de perfis e contas de usuarios."},
]

app = FastAPI(
    title="minhasCompras-BA API",
    version="1.0.0",
    description=API_DESCRIPTION,
    openapi_tags=TAGS_METADATA,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router)
app.include_router(auth_router, prefix=settings.API_PREFIX)
app.include_router(account_router, prefix=settings.API_PREFIX)
app.include_router(admin_router, prefix=settings.API_PREFIX)
app.include_router(jobs_router, prefix=settings.API_PREFIX)


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
            # Bancos antigos (ex.: Neon) podem ter notas_fiscais sem o FK de estabelecimento.
            # Nullable de proposito: notas ja existentes ficam NULL ate serem preenchidas;
            # create_all em banco novo ja cria a coluna NOT NULL via model.
            if "estabelecimento_id" not in columns:
                connection.execute(text("ALTER TABLE notas_fiscais ADD COLUMN estabelecimento_id INTEGER"))
                if engine.dialect.name == "postgresql":
                    connection.execute(
                        text(
                            "CREATE INDEX IF NOT EXISTS ix_notas_fiscais_estabelecimento_id "
                            "ON notas_fiscais (estabelecimento_id)"
                        )
                    )
                    if inspector.has_table("estabelecimento"):
                        connection.execute(
                            text(
                                "DO $$ BEGIN "
                                "ALTER TABLE notas_fiscais ADD CONSTRAINT fk_notas_fiscais_estabelecimento_id "
                                "FOREIGN KEY (estabelecimento_id) REFERENCES estabelecimento(id); "
                                "EXCEPTION WHEN duplicate_object THEN NULL; "
                                "END $$"
                            )
                        )
                else:
                    connection.execute(
                        text(
                            "CREATE INDEX IF NOT EXISTS ix_notas_fiscais_estabelecimento_id "
                            "ON notas_fiscais (estabelecimento_id)"
                        )
                    )
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
            connection.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS uq_usuarios_email_normalized ON usuarios (lower(email))"))
            if "status" not in usuario_columns:
                connection.execute(text("ALTER TABLE usuarios ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'"))
            connection.execute(text("CREATE INDEX IF NOT EXISTS ix_usuarios_status ON usuarios (status)"))
            if "deletion_requested_at" not in usuario_columns:
                connection.execute(text(f"ALTER TABLE usuarios ADD COLUMN deletion_requested_at {column_type}"))
            # Migra exclusoes agendadas no modelo anterior (deletion_scheduled_at + pending_account_deletions)
            # para status/deletion_requested_at. Idempotente: so toca contas ainda ACTIVE.
            if "deletion_scheduled_at" in usuario_columns and inspector.has_table("pending_account_deletions"):
                connection.execute(text(
                    "UPDATE usuarios SET status = 'PENDING_DELETION', deletion_requested_at = "
                    "(SELECT p.requested_at FROM pending_account_deletions p WHERE p.usuario_id = usuarios.id) "
                    "WHERE status = 'ACTIVE' AND deletion_scheduled_at IS NOT NULL "
                    "AND EXISTS (SELECT 1 FROM pending_account_deletions p WHERE p.usuario_id = usuarios.id)"
                ))
                # deletion_scheduled_at fica como coluna legada (sem uso) para permitir rollback;
                # pode ser removida depois que esta versao estiver estavel em producao.
            if "credential_version" not in usuario_columns:
                connection.execute(text("ALTER TABLE usuarios ADD COLUMN credential_version INTEGER NOT NULL DEFAULT 0"))
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

        if inspector.has_table("estabelecimento"):
            est_columns = {column["name"] for column in inspector.get_columns("estabelecimento")}
            if "latitude" not in est_columns:
                connection.execute(text("ALTER TABLE estabelecimento ADD COLUMN latitude FLOAT"))
            if "longitude" not in est_columns:
                connection.execute(text("ALTER TABLE estabelecimento ADD COLUMN longitude FLOAT"))


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)
    _ensure_schema_updates()
    # So libera captchas/navegadores orfaos; a exclusao de contas roda no job diario.
    from src.api.services.retention_service import cleanup_import_sessions
    cleanup_import_sessions()
    driver_pool.start()


@app.on_event("shutdown")
def on_shutdown() -> None:
    driver_pool.shutdown()


@app.exception_handler(ApiError)
def handle_api_error(_: Request, exc: ApiError) -> JSONResponse:
    payload = ErrorResponse(code=exc.code, message=exc.message, details={k: str(v) for k, v in exc.details.items()})
    return JSONResponse(status_code=exc.status_code, content=payload.model_dump())


@app.exception_handler(RequestValidationError)
def handle_request_validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
    payload = ErrorResponse(code="INVALID_REQUEST", message="Payload ou parametros invalidos.", details={"fields": ", ".join(".".join(map(str, e["loc"])) for e in exc.errors())})
    return JSONResponse(status_code=400, content=payload.model_dump())


@app.exception_handler(Exception)
def handle_generic_error(_: Request, exc: Exception) -> JSONResponse:
    payload = ErrorResponse(code="INTERNAL_ERROR", message="Erro interno.", details={})
    return JSONResponse(status_code=500, content=payload.model_dump())
