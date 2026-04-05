from __future__ import annotations

from datetime import datetime

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
