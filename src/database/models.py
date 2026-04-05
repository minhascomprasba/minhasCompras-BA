from __future__ import annotations

from sqlalchemy import Float, Integer, String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class ProdutoExtraido(Base):
    __tablename__ = "produtos_extraidos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    descricao: Mapped[str] = mapped_column(String, nullable=False)
    quantidade: Mapped[float] = mapped_column(Float, nullable=False)
    valor_total: Mapped[float] = mapped_column(Float, nullable=False)
    unidade_comercial: Mapped[str | None] = mapped_column(String, nullable=True)
    codigo_ean_comercial: Mapped[str | None] = mapped_column(String, nullable=True)
