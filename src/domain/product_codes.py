from __future__ import annotations

import re

SEM_GTIN_VALUE = "SEM GTIN"


def normalizar_descricao(descricao: str) -> str:
    texto = descricao.strip().upper()
    return re.sub(r"\s+", " ", texto)


def is_sem_gtin(ean: str | None) -> bool:
    if not ean:
        return False
    return ean.strip().upper() == SEM_GTIN_VALUE


def is_ean_valido(ean: str | None) -> bool:
    if not ean:
        return False
    ean_limpo = ean.strip()
    if not ean_limpo:
        return False
    if is_sem_gtin(ean_limpo):
        return False
    return not ean_limpo.startswith("2")


def categoria_inicial_por_ncm(ncm: str | None) -> str:
    if not ncm:
        return "Outros"

    ncm_clean = ncm.strip()
    if ncm_clean.startswith("22"):
        return "Bebidas"
    if ncm_clean.startswith("34"):
        return "Limpeza"
    return "Outros"
