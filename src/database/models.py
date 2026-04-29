from __future__ import annotations

from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class NotaFiscal(Base):
    __tablename__ = "notas_fiscais"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    codigo_acesso: Mapped[str] = mapped_column(String(44), unique=True, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    produtos: Mapped[list[ProdutoExtraido]] = relationship(
        back_populates="nota_fiscal",
        cascade="all, delete-orphan",
    )


class ImportStatus(str, Enum):
    WAITING_CAPTCHA = "WAITING_CAPTCHA"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    EXPIRED = "EXPIRED"


class NfceImport(Base):
    __tablename__ = "nfce_imports"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    access_key: Mapped[str] = mapped_column(String(44), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    captcha_image_path: Mapped[str | None] = mapped_column(String, nullable=True)
    attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    error_message: Mapped[str | None] = mapped_column(String, nullable=True)
    nota_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    items_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class ProdutoExtraido(Base):
    __tablename__ = "produtos_extraidos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    id_nota_fiscal: Mapped[int] = mapped_column(ForeignKey("notas_fiscais.id"), nullable=False, index=True)
    descricao: Mapped[str] = mapped_column(String, nullable=False)
    quantidade: Mapped[float] = mapped_column(Float, nullable=False)
    valor_total: Mapped[float] = mapped_column(Float, nullable=False)
    unidade_comercial: Mapped[str | None] = mapped_column(String, nullable=True)
    codigo_ean_comercial: Mapped[str | None] = mapped_column(String, nullable=True)

    nota_fiscal: Mapped[NotaFiscal] = relationship(back_populates="produtos")
