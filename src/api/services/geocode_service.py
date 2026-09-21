"""Geocodificacao de estabelecimentos (CEP -> lat/lng) com persistencia.

Fluxo:
  1) BrasilAPI CEP v2 (quando traz coordinates)
  2) Nominatim/OpenStreetMap como fallback (rate-limited)

CEPs unicos sao resolvidos uma vez e replicados para todos os
estabelecimentos com o mesmo CEP. Coordenadas ficam no banco.
"""
from __future__ import annotations

import json
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

from sqlalchemy.orm import Session

from src.database.models import Estabelecimento
from utils.logger import setup_logger

logger = setup_logger(log_file="logs/geocode.log", logger_name="geocode")

_USER_AGENT = "minhasCompras-BA/1.0 (mapa de compras; contato local)"
_NOMINATIM_DELAY_S = 1.1


def clean_cep(cep: str | None) -> str:
    if not cep:
        return ""
    return "".join(c for c in cep if c.isdigit())


def format_address(
    logradouro: str | None,
    bairro: str | None,
    cidade: str | None,
    estado: str | None,
) -> str:
    line1 = ", ".join(p for p in (logradouro or "", bairro or "") if p)
    line2 = " - ".join(p for p in (cidade or "", estado or "") if p)
    return ", ".join(p for p in (line1, line2) if p)


def _http_get_json(url: str, timeout: float = 12.0) -> Any | None:
    req = urllib.request.Request(url, headers={"Accept": "application/json", "User-Agent": _USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, json.JSONDecodeError, ValueError) as exc:
        logger.debug("GET falhou (%s): %s", url, exc)
        return None


def _fetch_brasilapi(cep: str) -> tuple[dict[str, str] | None, tuple[float, float] | None]:
    data = _http_get_json(f"https://brasilapi.com.br/api/v2/cep/{cep}")
    if not isinstance(data, dict):
        return None, None

    address = {
        "logradouro": str(data.get("street") or ""),
        "bairro": str(data.get("neighborhood") or ""),
        "cidade": str(data.get("city") or ""),
        "estado": str(data.get("state") or ""),
    }
    coords_raw = (data.get("location") or {}).get("coordinates") or {}
    try:
        lat = float(coords_raw["latitude"])
        lng = float(coords_raw["longitude"])
        return address, (lat, lng)
    except (KeyError, TypeError, ValueError):
        return address, None


def _nominatim_search(params: dict[str, str]) -> tuple[float, float] | None:
    query = urllib.parse.urlencode({**params, "format": "jsonv2", "limit": "1", "countrycodes": "br"})
    data = _http_get_json(f"https://nominatim.openstreetmap.org/search?{query}")
    if not isinstance(data, list) or not data:
        return None
    try:
        return float(data[0]["lat"]), float(data[0]["lon"])
    except (KeyError, TypeError, ValueError, IndexError):
        return None


def geocode_address(
    *,
    cep: str,
    logradouro: str = "",
    bairro: str = "",
    cidade: str = "",
    estado: str = "",
) -> tuple[float, float] | None:
    """Resolve um endereco/CEP em coordenadas (BrasilAPI -> Nominatim)."""
    cep_digits = clean_cep(cep)
    if len(cep_digits) != 8:
        return None

    brasil_addr, coords = _fetch_brasilapi(cep_digits)
    if coords:
        return coords

    if brasil_addr:
        logradouro = logradouro or brasil_addr.get("logradouro", "")
        bairro = bairro or brasil_addr.get("bairro", "")
        cidade = cidade or brasil_addr.get("cidade", "")
        estado = estado or brasil_addr.get("estado", "")

    attempts: list[dict[str, str]] = []
    if logradouro and cidade:
        attempts.append(
            {
                "street": logradouro,
                "city": cidade,
                "state": estado,
                "postalcode": cep_digits,
            }
        )
    attempts.append({"postalcode": cep_digits, "state": estado})
    if bairro and cidade:
        attempts.append({"q": ", ".join(p for p in (bairro, cidade, estado, "Brasil") if p)})
    if cidade:
        attempts.append({"city": cidade, "state": estado})

    for i, params in enumerate(attempts):
        coords = _nominatim_search(params)
        if coords:
            return coords
        if i < len(attempts) - 1:
            time.sleep(_NOMINATIM_DELAY_S)
    return None


def geocode_and_persist_estabelecimento(session: Session, est: Estabelecimento) -> bool:
    """Geocodifica um estabelecimento e persiste lat/lng. Retorna True se salvou."""
    if est.latitude is not None and est.longitude is not None:
        return False
    cep = clean_cep(est.cep)
    if len(cep) != 8:
        return False

    coords = geocode_address(
        cep=cep,
        logradouro=est.logradouro or "",
        bairro=est.bairro or "",
        cidade=est.cidade or "",
        estado=est.estado or "",
    )
    if not coords:
        logger.info("Sem coordenadas para estabelecimento id=%s cep=%s", est.id, cep)
        return False

    est.latitude, est.longitude = coords
    session.add(est)
    return True


def ensure_coords_batch(session: Session, estabelecimentos: list[Estabelecimento]) -> int:
    """Geocodifica em batch por CEP unico e replica para todos sem coordenadas.

    Retorna quantos registros foram atualizados.
    """
    pending = [
        e
        for e in estabelecimentos
        if e.latitude is None or e.longitude is None
    ]
    if not pending:
        return 0

    # Agrupa pendentes por CEP.
    by_cep: dict[str, list[Estabelecimento]] = {}
    for e in pending:
        cep = clean_cep(e.cep)
        if len(cep) != 8:
            continue
        by_cep.setdefault(cep, []).append(e)

    # Cache: CEP ja conhecido neste lote ou em qualquer loja do banco.
    known_by_cep: dict[str, tuple[float, float]] = {}
    for e in estabelecimentos:
        cep = clean_cep(e.cep)
        if cep and e.latitude is not None and e.longitude is not None:
            known_by_cep.setdefault(cep, (float(e.latitude), float(e.longitude)))

    missing_ceps = [c for c in by_cep if c not in known_by_cep]
    if missing_ceps:
        # Reaproveita coordenadas de outras lojas (mesmo CEP, qualquer usuario).
        for row in (
            session.query(Estabelecimento)
            .filter(Estabelecimento.latitude.is_not(None))
            .filter(Estabelecimento.longitude.is_not(None))
            .filter(Estabelecimento.cep.is_not(None))
            .all()
        ):
            cep = clean_cep(row.cep)
            if cep in missing_ceps and cep not in known_by_cep:
                known_by_cep[cep] = (float(row.latitude), float(row.longitude))  # type: ignore[arg-type]


    updated = 0
    for i, (cep, group) in enumerate(by_cep.items()):
        if cep in known_by_cep:
            lat, lng = known_by_cep[cep]
        else:
            sample = group[0]
            coords = geocode_address(
                cep=cep,
                logradouro=sample.logradouro or "",
                bairro=sample.bairro or "",
                cidade=sample.cidade or "",
                estado=sample.estado or "",
            )
            if not coords:
                logger.info("Batch: CEP %s sem coordenadas (%d lojas)", cep, len(group))
                continue
            lat, lng = coords
            known_by_cep[cep] = (lat, lng)
            # Respeita Nominatim entre CEPs distintos quando o fallback foi usado.
            if i < len(by_cep) - 1:
                time.sleep(0.2)

        for e in group:
            e.latitude = lat
            e.longitude = lng
            session.add(e)
            updated += 1

    if updated:
        session.commit()
        logger.info("Batch geocode: %d estabelecimento(s) atualizado(s)", updated)
    return updated
