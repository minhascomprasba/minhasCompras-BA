from __future__ import annotations

from datetime import date, datetime
from enum import Enum

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, String, UniqueConstraint, Index, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class UserRole(str, Enum):
    USER = "USER"
    ADMIN = "ADMIN"
    SUPER_ADMIN = "SUPER_ADMIN"


ADMIN_ROLES = (UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value)


class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False, default=UserRole.USER.value, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    deletion_scheduled_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    credential_version: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")

    notas: Mapped[list[NotaFiscal]] = relationship(back_populates="usuario", cascade="all, delete-orphan")
    imports: Mapped[list[NfceImport]] = relationship(back_populates="usuario", cascade="all, delete-orphan")
    password_reset_tokens: Mapped[list[PasswordResetToken]] = relationship(back_populates="usuario", cascade="all, delete-orphan")


Index("uq_usuarios_email_normalized", func.lower(Usuario.email), unique=True)


class EmailVerificationCode(Base):
    __tablename__ = "email_verification_codes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    code_hash: Mapped[str] = mapped_column(String, nullable=False, index=True)
    attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    used_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), nullable=False, index=True)
    token_hash: Mapped[str] = mapped_column(String, nullable=False, unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    used_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    usuario: Mapped[Usuario] = relationship(back_populates="password_reset_tokens")


class NotaFiscal(Base):
    __tablename__ = "notas_fiscais"
    __table_args__ = (UniqueConstraint("usuario_id", "codigo_acesso", name="uq_notas_fiscais_usuario_codigo_acesso"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), nullable=False, index=True)
    estabelecimento_id: Mapped[int] = mapped_column(ForeignKey("estabelecimento.id"), nullable=False, index=True)
    codigo_acesso: Mapped[str] = mapped_column(String(44), nullable=False, index=True)

    # valor_total_nota e o valor PAGO (liquido, ja descontado). O valor bruto,
    # se precisar, e valor_total_nota + valor_desconto_nota.
    valor_total_nota: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    valor_desconto_nota: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    data_compra: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    meio_pagamento: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    usuario: Mapped[Usuario] = relationship(back_populates="notas")
    itens: Mapped[list[ItemNotaFiscal]] = relationship(back_populates="nota_fiscal", cascade="all, delete-orphan")

# TABELA N-N
class ItemNotaFiscal(Base):
    __tablename__ = "itens_nota_fiscal"
    __table_args__ = (UniqueConstraint("id_produto", "id_nota_fiscal", name="uq_item_nota_fiscal"),)
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    id_produto: Mapped[int] = mapped_column(ForeignKey("produto.id"), nullable=False, index=True)
    id_nota_fiscal: Mapped[int] = mapped_column(ForeignKey("notas_fiscais.id"), nullable=False, index=True)
    # valor_unitario e o preco unitario PAGO (liquido, ja descontado).
    valor_unitario: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    quantidade: Mapped[int] = mapped_column(Float, nullable=False, default=0)
    valor_desconto: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    
    nota_fiscal: Mapped[NotaFiscal] = relationship(back_populates="itens") 
    


class ImportStatus(str, Enum):
    WAITING_CAPTCHA = "WAITING_CAPTCHA"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    EXPIRED = "EXPIRED"


class ImportSource(str, Enum):
    QR_CODE = "QR_CODE"
    PHOTO = "PHOTO"
    MANUAL = "MANUAL"


class NfceImport(Base):
    __tablename__ = "nfce_imports"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), nullable=False, index=True)
    access_key: Mapped[str] = mapped_column(String(44), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    source: Mapped[str | None] = mapped_column(String(20), nullable=True, index=True)
    captcha_image_path: Mapped[str | None] = mapped_column(String, nullable=True)
    attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    error_message: Mapped[str | None] = mapped_column(String, nullable=True)
    nota_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    items_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    usuario: Mapped[Usuario] = relationship(back_populates="imports")


class Estabelecimento(Base):
    __tablename__ = "estabelecimento"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nome_fantasia: Mapped[str] = mapped_column(String, nullable=False)
    razao_social: Mapped[str] = mapped_column(String, nullable=False)
    cnpj: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    logradouro: Mapped[str] = mapped_column(String, nullable=False)
    bairro: Mapped[str | None] = mapped_column(String, nullable=True)
    cidade: Mapped[str] = mapped_column(String, nullable=False)
    estado: Mapped[str] = mapped_column(String, nullable=False)
    cep: Mapped[str | None] = mapped_column(String, nullable=True)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)



class Produto(Base):
    
    __tablename__= 'produto'
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    descricao: Mapped[str] = mapped_column(String, nullable=False)
    codigo_ean_comercial: Mapped[str | None] = mapped_column(String, nullable=True)
    codigo_NCM_comercial: Mapped[str | None] = mapped_column(String, nullable=True, index=True)
    unidade_comercial: Mapped[str | None] = mapped_column(String, nullable=True)
    categoria: Mapped[str] = mapped_column(String, nullable=False)
    sem_gtin: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)





# class ProdutoExtraido(Base):
#     __tablename__ = "produtos_extraidos"

#     id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
#     id_nota_fiscal: Mapped[int] = mapped_column(ForeignKey("notas_fiscais.id"), nullable=False, index=True)
#     descricao: Mapped[str] = mapped_column(String, nullable=False)
#     quantidade: Mapped[float] = mapped_column(Float, nullable=False)
#     valor_total: Mapped[float] = mapped_column(Float, nullable=False)
#     unidade_comercial: Mapped[str | None] = mapped_column(String, nullable=True)
#     codigo_ean_comercial: Mapped[str | None] = mapped_column(String, nullable=True)

#     nota_fiscal: Mapped[NotaFiscal] = relationship(back_populates="produtos")


class AccountChallenge(Base):
    __tablename__ = "account_challenges"
    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), index=True)
    operation: Mapped[str] = mapped_column(String(20))
    credential_version: Mapped[int] = mapped_column(Integer)
    proposed_value: Mapped[str] = mapped_column(String)
    code_hash: Mapped[str] = mapped_column(String)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    expires_at: Mapped[datetime] = mapped_column(DateTime)
    used_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class AccountRateLimit(Base):
    __tablename__ = "account_rate_limits"
    key: Mapped[str] = mapped_column(String(100), primary_key=True)
    window: Mapped[datetime] = mapped_column(DateTime)
    count: Mapped[int] = mapped_column(Integer, default=0)


class AccountDeletionEvent(Base):
    """Minimal operational evidence with no account or actor identifier."""
    __tablename__ = "account_deletion_events"
    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    occurred_on: Mapped[date] = mapped_column(Date, nullable=False)
    source: Mapped[str] = mapped_column(String(20), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)


class PendingAccountDeletion(Base):
    __tablename__ = "pending_account_deletions"
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), primary_key=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    requested_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    scheduled_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)
    source: Mapped[str] = mapped_column(String(20), nullable=False)
