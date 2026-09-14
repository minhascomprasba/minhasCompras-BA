from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ErrorResponse(BaseModel):
    code: str
    message: str
    details: dict[str, str] = Field(default_factory=dict)


class HealthResponse(BaseModel):
    status: str


class ReadyResponse(BaseModel):
    status: str
    database: str


class ImportCreateRequest(BaseModel):
    access_key: str = Field(min_length=44, max_length=44)


class ImportCreateResponse(BaseModel):
    import_id: str
    status: str
    captcha_image_url: str
    expires_at: datetime


class CaptchaSubmitRequest(BaseModel):
    captcha_code: str = Field(min_length=1, max_length=20)


class CaptchaSubmitResponse(BaseModel):
    import_id: str
    status: str


class ImportStatusResponse(BaseModel):
    import_id: str
    status: str
    nota_id: int | None
    items_count: int | None
    error_message: str | None
    created_at: datetime
    updated_at: datetime
    finished_at: datetime | None


class ImportListItem(BaseModel):
    import_id: str
    access_key_masked: str
    status: str
    created_at: datetime


class PaginatedImportsResponse(BaseModel):
    data: list[ImportListItem]
    page: int
    page_size: int
    total: int


class NotaListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    codigo_acesso: str
    created_at: datetime
    data_compra: datetime | None = None
    itens_count: int
    valor_total_nota: float
    meio_pagamento: str | None = None


class NotaDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    codigo_acesso: str
    created_at: datetime
    data_compra: datetime | None = None
    valor_total_nota: float
    meio_pagamento: str | None = None



class ItemListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    id_nota_fiscal: int
    descricao: str
    quantidade: float
    valor_unitario: float
    valor_total: float
    unidade_comercial: str | None
    codigo_ean_comercial: str | None
    codigo_NCM_comercial: str | None
    sem_gtin: bool = False

class PaginatedItemsResponse(BaseModel):
    data: list[ItemListItem]
    page: int
    page_size: int
    total: int

class UserRegisterRequest(BaseModel):
    email: str = Field(..., max_length=255)
    password: str = Field(..., min_length=8, max_length=128)

class UserLoginRequest(BaseModel):
    email: str = Field(..., max_length=255)
    password: str = Field(..., min_length=8, max_length=128)

class UserResponse(BaseModel):
    id: int
    email: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class VerifyEmailRequest(BaseModel):
    email: str = Field(..., max_length=255)
    code: str = Field(..., min_length=6, max_length=6)

class ResendCodeRequest(BaseModel):
    email: str = Field(..., max_length=255)

class ForgotPasswordRequest(BaseModel):
    email: str = Field(..., max_length=255)

class ResetPasswordRequest(BaseModel):
    token: str = Field(..., min_length=1)
    password: str = Field(..., min_length=8, max_length=128)

class MessageResponse(BaseModel):
    message: str

class ResumoPeriodo(BaseModel):
    total_gasto_periodo: float

class PaginatedNotasResponse(BaseModel):
    data: list[NotaListItem]
    page: int
    page_size: int
    total: int
    resumo: ResumoPeriodo | None = None

class SystemStatsResponse(BaseModel):
    total_users: int
    total_notas_mes: int
    total_products: int


class MapaNotaItem(BaseModel):
    id: int
    codigo_acesso: str
    data_compra: datetime | None = None
    created_at: datetime
    valor_total_nota: float


class MapaPontoResponse(BaseModel):
    estabelecimento_id: int
    razao_social: str
    logradouro: str | None = None
    bairro: str | None = None
    cidade: str | None = None
    estado: str | None = None
    cep: str | None = None
    notas_count: int
    notas: list[MapaNotaItem] = Field(default_factory=list)


class GastoPorCategoriaResponse(BaseModel):
    categoria: str
    valor: float
    percentual: float


class HistoricoPrecoResponse(BaseModel):
    data: str  # Formato DD/MM
    preco: float


class ProdutoFrequenteResponse(BaseModel):
    nome: str
    historico: list[HistoricoPrecoResponse]
    codigo_NCM_comercial: str | None = None
    sem_gtin: bool = False


class GrupoNcmSemGtinResponse(BaseModel):
    ncm: str
    categoria: str
    quantidade_produtos: int
    valor_total: float
    produto_nome: str | None = None


class DashboardDataResponse(BaseModel):
    mesAno: str  # Formato "Junho 2026"
    mediaGastosMensal: float
    quantidadeNotas: int
    ticketMedio: float
    gastosPorCategoria: list[GastoPorCategoriaResponse]
    produtosFrequentes: list[ProdutoFrequenteResponse]
    gruposNcmSemGtin: list[GrupoNcmSemGtinResponse] = Field(default_factory=list)

