from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
from threading import Lock
from uuid import uuid4

from selenium.common.exceptions import WebDriverException
from selenium.webdriver.remote.webdriver import WebDriver
from sqlalchemy import func, select

from src.api import settings
from src.api.errors import ConflictError, NotFoundError, ValidationError
from src.database.connection import SessionLocal
from src.database.models import (
    Estabelecimento,
    ImportSource,
    ImportStatus,
    ItemNotaFiscal,
    NfceImport,
    NotaFiscal,
    Produto,
)
from src.phase1.auth_flow import refresh_captcha_image, start_auth_session, submit_captcha_attempt
from src.phase2.navigation import Maps_to_Emitente_tab, Maps_to_products_tab, wait_for_products_content
from src.phase3.parser import EmpresaParser, ProductParser
from src.phase4.db_loader import bulk_insert_produtos_with_nota_id, get_or_create_estabelecimento


@dataclass
class RuntimeSession:
    driver: WebDriver
    captcha_path: Path
    expires_at: datetime


class ImportRuntimeStore:
    def __init__(self) -> None:
        self._sessions: dict[str, RuntimeSession] = {}
        self._lock = Lock()

    def set(self, import_id: str, session: RuntimeSession) -> None:
        with self._lock:
            self._sessions[import_id] = session

    def pop(self, import_id: str) -> RuntimeSession | None:
        with self._lock:
            return self._sessions.pop(import_id, None)

    def get(self, import_id: str) -> RuntimeSession | None:
        with self._lock:
            return self._sessions.get(import_id)

    def pop_expired(self, now: datetime) -> list[tuple[str, RuntimeSession]]:
        expired: list[tuple[str, RuntimeSession]] = []
        with self._lock:
            for import_id, session in list(self._sessions.items()):
                if session.expires_at <= now:
                    expired.append((import_id, session))
                    del self._sessions[import_id]
        return expired


runtime_store = ImportRuntimeStore()


def _validate_access_key(access_key: str) -> str:
    normalized = access_key.strip()
    if not re.fullmatch(r"\d{44}", normalized):
        raise ValidationError(
            code="INVALID_ACCESS_KEY",
            message="A chave deve conter 44 digitos numericos.",
            details={"field": "access_key"},
        )
    return normalized


def _build_import_id() -> str:
    return f"imp_{uuid4().hex[:12]}"


def _utcnow() -> datetime:
    return datetime.utcnow()


def _mask_access_key(access_key: str) -> str:
    if len(access_key) < 6:
        return "***"
    return f"{access_key[:3]}...{access_key[-3:]}"


def cleanup_expired_import_sessions() -> None:
    now = _utcnow()
    expired = runtime_store.pop_expired(now)
    if not expired:
        return

    session = SessionLocal()
    try:
        for import_id, runtime in expired:
            try:
                runtime.driver.quit()
            except Exception:
                pass

            record = session.get(NfceImport, import_id)
            if record is None:
                continue
            if record.status in (ImportStatus.COMPLETED.value, ImportStatus.FAILED.value, ImportStatus.EXPIRED.value):
                continue
            record.status = ImportStatus.EXPIRED.value
            record.error_message = "Captcha expirado. Inicie uma nova importacao."
            record.updated_at = now
            record.finished_at = now

        session.commit()
    finally:
        session.close()


def _normalize_source(source: str | None) -> str:
    if not source:
        return ImportSource.MANUAL.value
    normalized = source.strip().upper()
    if normalized not in {item.value for item in ImportSource}:
        raise ValidationError(
            code="INVALID_IMPORT_SOURCE",
            message="Canal de importacao invalido.",
            details={"field": "source"},
        )
    return normalized


def start_import(access_key: str, usuario_id: int, source: str | None = None) -> dict[str, object]:
    cleanup_expired_import_sessions()
    normalized_key = _validate_access_key(access_key)
    normalized_source = _normalize_source(source)
    import_id = _build_import_id()
    now = _utcnow()
    expires_at = now + timedelta(seconds=settings.CAPTCHA_TTL_SECONDS)

    captcha_path = Path("data/captchas") / f"{import_id}.png"
    driver = start_auth_session(
        access_key=normalized_key,
        timeout_seconds=settings.PAGE_TIMEOUT_SECONDS,
        headless=settings.HEADLESS,
        captcha_output_path=captcha_path,
    )

    runtime_store.set(import_id, RuntimeSession(driver=driver, captcha_path=captcha_path, expires_at=expires_at))

    session = SessionLocal()
    try:
        record = NfceImport(
            id=import_id,
            usuario_id=usuario_id,
            access_key=normalized_key,
            status=ImportStatus.WAITING_CAPTCHA.value,
            source=normalized_source,
            captcha_image_path=captcha_path.as_posix(),
            attempts=0,
            error_message=None,
            nota_id=None,
            items_count=None,
            expires_at=expires_at,
            created_at=now,
            updated_at=now,
            finished_at=None,
        )
        session.add(record)
        session.commit()
    except Exception:
        runtime = runtime_store.pop(import_id)
        if runtime is not None:
            runtime.driver.quit()
        raise
    finally:
        session.close()

    return {
        "import_id": import_id,
        "status": ImportStatus.WAITING_CAPTCHA.value,
        "captcha_image_url": f"{settings.API_PREFIX}/imports/nfce/{import_id}/captcha-image",
        "expires_at": expires_at,
    }


def _get_import_or_fail(import_id: str, usuario_id: int) -> NfceImport:
    session = SessionLocal()
    try:
        record = session.get(NfceImport, import_id)
        if record is None or record.usuario_id != usuario_id:
            raise NotFoundError("IMPORT_NOT_FOUND", "Importacao nao encontrada.", {"import_id": import_id})
        session.expunge(record)
        return record
    finally:
        session.close()


def get_import_status(import_id: str, usuario_id: int) -> dict[str, object]:
    cleanup_expired_import_sessions()
    record = _get_import_or_fail(import_id, usuario_id)
    return {
        "import_id": record.id,
        "status": record.status,
        "nota_id": record.nota_id,
        "items_count": record.items_count,
        "error_message": record.error_message,
        "created_at": record.created_at,
        "updated_at": record.updated_at,
        "finished_at": record.finished_at,
    }


def get_captcha_image_path(import_id: str, usuario_id: int) -> Path:
    cleanup_expired_import_sessions()
    record = _get_import_or_fail(import_id, usuario_id)

    if record.status != ImportStatus.WAITING_CAPTCHA.value:
        raise ConflictError(
            code="INVALID_IMPORT_STATUS",
            message="Captcha indisponivel para o estado atual da importacao.",
            details={"status": record.status},
        )

    if record.expires_at <= _utcnow():
        raise ConflictError(
            code="CAPTCHA_EXPIRED",
            message="Captcha expirado. Inicie uma nova importacao.",
            details={"import_id": import_id},
        )

    runtime = runtime_store.get(import_id)
    if runtime is None:
        raise ConflictError(
            code="SESSION_EXPIRED",
            message="Sessao de importacao expirada. Inicie uma nova importacao.",
            details={"import_id": import_id},
        )

    if not runtime.captcha_path.exists():
        raise NotFoundError(
            code="CAPTCHA_NOT_FOUND",
            message="Imagem de captcha nao encontrada.",
            details={"import_id": import_id},
        )

    return runtime.captcha_path


def submit_captcha(import_id: str, captcha_code: str, usuario_id: int) -> dict[str, object]:
    cleanup_expired_import_sessions()
    now = _utcnow()

    if not captcha_code.strip():
        raise ValidationError(
            code="INVALID_CAPTCHA_CODE",
            message="captcha_code deve ser informado.",
            details={"field": "captcha_code"},
        )

    session = SessionLocal()
    should_close_runtime = False
    try:
        record = session.get(NfceImport, import_id)
        if record is None or record.usuario_id != usuario_id:
            raise NotFoundError("IMPORT_NOT_FOUND", "Importacao nao encontrada.", {"import_id": import_id})

        if record.status != ImportStatus.WAITING_CAPTCHA.value:
            raise ConflictError(
                code="INVALID_IMPORT_STATUS",
                message="Importacao nao aceita captcha no estado atual.",
                details={"status": record.status},
            )

        if record.expires_at <= now:
            record.status = ImportStatus.EXPIRED.value
            record.error_message = "Captcha expirado. Inicie uma nova importacao."
            record.updated_at = now
            record.finished_at = now
            session.commit()
            should_close_runtime = True
            raise ConflictError(
                code="CAPTCHA_EXPIRED",
                message="Captcha expirado. Inicie uma nova importacao.",
                details={"import_id": import_id},
            )

        if record.attempts >= settings.MAX_CAPTCHA_ATTEMPTS:
            record.status = ImportStatus.FAILED.value
            record.error_message = "Limite de tentativas de captcha atingido."
            record.updated_at = now
            record.finished_at = now
            session.commit()
            should_close_runtime = True
            raise ConflictError(
                code="MAX_CAPTCHA_ATTEMPTS_REACHED",
                message="Limite de tentativas de captcha atingido.",
                details={"max_attempts": str(settings.MAX_CAPTCHA_ATTEMPTS)},
            )

        runtime = runtime_store.get(import_id)
        if runtime is None:
            raise ConflictError(
                code="SESSION_EXPIRED",
                message="Sessao de importacao expirada. Inicie uma nova importacao.",
                details={"import_id": import_id},
            )

        record.attempts += 1
        session.commit()

        did_auth = submit_captcha_attempt(
            driver=runtime.driver,
            captcha_code=captcha_code,
            timeout_seconds=settings.PAGE_TIMEOUT_SECONDS,
        )

        if not did_auth:
            if record.attempts >= settings.MAX_CAPTCHA_ATTEMPTS:
                record.status = ImportStatus.FAILED.value
                record.error_message = "Limite de tentativas de captcha atingido."
                failure_at = _utcnow()
                record.updated_at = failure_at
                record.finished_at = failure_at
                session.commit()
                should_close_runtime = True
                raise ConflictError(
                    code="MAX_CAPTCHA_ATTEMPTS_REACHED",
                    message="Limite de tentativas de captcha atingido.",
                    details={"max_attempts": str(settings.MAX_CAPTCHA_ATTEMPTS)},
                )

            refresh_captcha_image(runtime.driver, settings.PAGE_TIMEOUT_SECONDS, runtime.captcha_path)
            raise ConflictError(
                code="INVALID_CAPTCHA",
                message="Captcha invalido. Tente novamente.",
                details={"attempts": str(record.attempts)},
            )

        record.status = ImportStatus.PROCESSING.value
        record.updated_at = _utcnow()
        session.commit()


        # Produtos
        page_meta = Maps_to_products_tab(runtime.driver, settings.PAGE_TIMEOUT_SECONDS)
        data_compra = page_meta.get("data_compra")
        meio_pagamento = page_meta.get("meio_pagamento")
        wait_for_products_content(runtime.driver, settings.PAGE_TIMEOUT_SECONDS)
        parsed_page = ProductParser.parse_page(runtime.driver.page_source)

        # Dados do Emitente
        empresa_data = Maps_to_Emitente_tab(runtime.driver, settings.PAGE_TIMEOUT_SECONDS)
        estabelecimento_id = get_or_create_estabelecimento(empresa_data)

        products = parsed_page["produtos"]
        
        data_compra = data_compra or parsed_page.get("data_compra")
        meio_pagamento = meio_pagamento or parsed_page.get("meio_pagamento")
        if data_compra is None or meio_pagamento is None:
            debug_path = Path("data/debug/last_nfce_page.html")
            debug_path.parent.mkdir(parents=True, exist_ok=True)
            debug_path.write_text(runtime.driver.page_source, encoding="utf-8")

        items_count, nota_id = bulk_insert_produtos_with_nota_id(
            products,
            record.access_key,
            usuario_id,
            data_compra=data_compra,
            estabelecimento_id=estabelecimento_id,
            meio_pagamento=meio_pagamento,
            valor_desconto_nota=parsed_page.get("valor_desconto_nota"),
            valor_pago_nota=parsed_page.get("valor_pago_nota"),
        )

        finished_at = _utcnow()
        record.status = ImportStatus.COMPLETED.value
        record.nota_id = nota_id
        record.items_count = items_count
        record.error_message = None
        record.updated_at = finished_at
        record.finished_at = finished_at
        session.commit()
        should_close_runtime = True

        return {"import_id": import_id, "status": ImportStatus.COMPLETED.value}
    except (NotFoundError, ConflictError, ValidationError):
        raise
    except WebDriverException as exc:
        # A sessao do navegador morreu (Chrome fechou / perdeu conexao com o
        # DevTools). Tratamos como sessao expirada para o usuario reiniciar.
        if session.is_active:
            record = session.get(NfceImport, import_id)
            if record is not None:
                failure_time = _utcnow()
                record.status = ImportStatus.EXPIRED.value
                record.error_message = "Sessao do navegador encerrada. Inicie uma nova importacao."
                record.updated_at = failure_time
                record.finished_at = failure_time
                session.commit()
        should_close_runtime = True
        raise ConflictError(
            code="SESSION_EXPIRED",
            message="Sessao de importacao expirada. Inicie uma nova importacao.",
            details={"import_id": import_id},
        ) from exc
    except Exception as exc:
        if session.is_active:
            record = session.get(NfceImport, import_id)
            if record is not None:
                failure_time = _utcnow()
                record.status = ImportStatus.FAILED.value
                record.error_message = str(exc)
                record.updated_at = failure_time
                record.finished_at = failure_time
                session.commit()
        should_close_runtime = True
        raise
    finally:
        session.close()
        if should_close_runtime:
            runtime_to_close = runtime_store.pop(import_id)
            if runtime_to_close is not None:
                try:
                    runtime_to_close.driver.quit()
                except Exception:
                    pass

def list_imports(page: int, page_size: int, status: str | None, usuario_id: int) -> dict[str, object]:
    cleanup_expired_import_sessions()

    query_status = status.strip().upper() if status else None
    if query_status and query_status not in {item.value for item in ImportStatus}:
        raise ValidationError(
            code="INVALID_STATUS_FILTER",
            message="Status informado para filtro e invalido.",
            details={"field": "status"},
        )

    if page_size > 100:
        page_size = 100

    session = SessionLocal()
    try:
        base_query = select(NfceImport).where(NfceImport.usuario_id == usuario_id)
        count_query = select(func.count()).select_from(NfceImport).where(NfceImport.usuario_id == usuario_id)

        if query_status:
            base_query = base_query.where(NfceImport.status == query_status)
            count_query = count_query.where(NfceImport.status == query_status)

        total = session.execute(count_query).scalar_one()

        rows = session.execute(
            base_query.order_by(NfceImport.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        ).scalars()

        data = [
            {
                "import_id": row.id,
                "access_key_masked": _mask_access_key(row.access_key),
                "status": row.status,
                "created_at": row.created_at,
            }
            for row in rows
        ]

        return {"data": data, "page": page, "page_size": page_size, "total": total}
    finally:
        session.close()


def list_notas(page: int, page_size: int, from_date: datetime | None, to_date: datetime | None, usuario_id: int) -> dict[str, object]:
    if page_size > 100:
        page_size = 100

    session = SessionLocal()
    try:
        purchase_date = func.coalesce(NotaFiscal.data_compra, NotaFiscal.created_at)
        base_query = select(NotaFiscal).where(NotaFiscal.usuario_id == usuario_id)
        count_query = select(func.count()).select_from(NotaFiscal).where(NotaFiscal.usuario_id == usuario_id)
        sum_query = select(func.sum(NotaFiscal.valor_total_nota)).select_from(NotaFiscal).where(NotaFiscal.usuario_id == usuario_id)

        if from_date is not None:
            base_query = base_query.where(purchase_date >= from_date)
            count_query = count_query.where(purchase_date >= from_date)
            sum_query = sum_query.where(purchase_date >= from_date)

        if to_date is not None:
            base_query = base_query.where(purchase_date <= to_date)
            count_query = count_query.where(purchase_date <= to_date)
            sum_query = sum_query.where(purchase_date <= to_date)

        total = session.execute(count_query).scalar_one()
        total_gasto = session.execute(sum_query).scalar() or 0.0

        notas = session.execute(
            base_query.order_by(purchase_date.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        ).scalars()

        data = []
        for nota in notas:
            itens_count = session.execute(
                select(func.count()).select_from(ItemNotaFiscal).where(ItemNotaFiscal.id_nota_fiscal == nota.id)
            ).scalar_one()
            data.append(
                {
                    "id": nota.id,
                    "codigo_acesso": nota.codigo_acesso,
                    "created_at": nota.created_at,
                    "data_compra": nota.data_compra,
                    "itens_count": itens_count,
                    "valor_total_nota": nota.valor_total_nota,
                    "valor_desconto_nota": nota.valor_desconto_nota,
                    "meio_pagamento": nota.meio_pagamento,
                }
            )

        return {
            "data": data,
            "page": page,
            "page_size": page_size,
            "total": total,
            "resumo": {"total_gasto_periodo": float(total_gasto)}
        }
    finally:
        session.close()


def list_estabelecimentos_mapa(usuario_id: int) -> list[dict[str, object]]:
    """Estabelecimentos (com CEP) onde o usuario possui notas, agregados por
    local e ja trazendo a lista de notas de cada estabelecimento. Usado pela
    pagina de Mapa.

    Coordenadas faltantes sao geocodificadas em batch (1 request por CEP unico)
    e persistidas em estabelecimento.latitude/longitude para cargas seguintes.
    """
    from src.api.services.geocode_service import ensure_coords_batch, format_address

    session = SessionLocal()
    try:
        purchase_date = func.coalesce(NotaFiscal.data_compra, NotaFiscal.created_at)
        rows = session.execute(
            select(Estabelecimento, NotaFiscal)
            .join(NotaFiscal, NotaFiscal.estabelecimento_id == Estabelecimento.id)
            .where(NotaFiscal.usuario_id == usuario_id)
            .where(Estabelecimento.cep.is_not(None))
            .where(Estabelecimento.cep != "")
            .order_by(purchase_date.desc())
        ).all()

        # Batch geocode de lojas ainda sem lat/lng (persistido no banco).
        unique_est: dict[int, Estabelecimento] = {}
        for est, _nota in rows:
            unique_est.setdefault(est.id, est)
        ensure_coords_batch(session, list(unique_est.values()))
        # Recarrega coordenadas apos o commit do batch.
        for est_id in list(unique_est.keys()):
            refreshed = session.get(Estabelecimento, est_id)
            if refreshed is not None:
                unique_est[est_id] = refreshed

        grouped: dict[int, dict[str, object]] = {}
        for est, nota in rows:
            est = unique_est.get(est.id, est)
            entry = grouped.get(est.id)
            if entry is None:
                entry = {
                    "estabelecimento_id": est.id,
                    "razao_social": est.razao_social,
                    "logradouro": est.logradouro,
                    "bairro": est.bairro,
                    "cidade": est.cidade,
                    "estado": est.estado,
                    "cep": est.cep,
                    "latitude": est.latitude,
                    "longitude": est.longitude,
                    "endereco": format_address(est.logradouro, est.bairro, est.cidade, est.estado),
                    "notas": [],
                }
                grouped[est.id] = entry

            entry["notas"].append(
                {
                    "id": nota.id,
                    "codigo_acesso": nota.codigo_acesso,
                    "data_compra": nota.data_compra,
                    "created_at": nota.created_at,
                    "valor_total_nota": nota.valor_total_nota,
                }
            )

        result: list[dict[str, object]] = []
        for entry in grouped.values():
            entry["notas_count"] = len(entry["notas"])
            result.append(entry)

        result.sort(key=lambda e: e["notas_count"], reverse=True)
        return result
    finally:
        session.close()


def get_nota(nota_id: int, usuario_id: int) -> dict[str, object]:
    session = SessionLocal()
    try:
        nota = session.get(NotaFiscal, nota_id)
        if nota is None or nota.usuario_id != usuario_id:
            raise NotFoundError("NOTA_NOT_FOUND", "Nota fiscal nao encontrada.", {"nota_id": str(nota_id)})
        return {
            "id": nota.id,
            "codigo_acesso": nota.codigo_acesso,
            "created_at": nota.created_at,
            "data_compra": nota.data_compra,
            "valor_total_nota": nota.valor_total_nota,
            "valor_desconto_nota": nota.valor_desconto_nota,
            "meio_pagamento": nota.meio_pagamento,
        }
    finally:
        session.close()


def list_items(nota_id: int, page: int, page_size: int, usuario_id: int) -> dict[str, object]:
    if page_size > 100:
        page_size = 100

    session = SessionLocal()
    try:
        nota = session.get(NotaFiscal, nota_id)
        if nota is None or nota.usuario_id != usuario_id:
            raise NotFoundError("NOTA_NOT_FOUND", "Nota fiscal nao encontrada.", {"nota_id": str(nota_id)})

        total = session.execute(
            select(func.count()).select_from(ItemNotaFiscal).where(ItemNotaFiscal.id_nota_fiscal == nota_id)
        ).scalar_one()

        rows = session.execute(
            select(ItemNotaFiscal, Produto)
            .join(Produto, ItemNotaFiscal.id_produto == Produto.id)
            .where(ItemNotaFiscal.id_nota_fiscal == nota_id)
            .order_by(ItemNotaFiscal.id.asc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        ).all()
        
        data = [
            {
                "id": item.id,
                "id_nota_fiscal": item.id_nota_fiscal,
                "descricao": produto.descricao,
                "quantidade": item.quantidade,
                "valor_unitario": item.valor_unitario,
                "valor_total": round(item.quantidade * item.valor_unitario, 2),
                "valor_desconto": item.valor_desconto,
                "unidade_comercial": produto.unidade_comercial,
                "codigo_ean_comercial": produto.codigo_ean_comercial,
                "codigo_NCM_comercial": produto.codigo_NCM_comercial,
                "sem_gtin": produto.sem_gtin,
            }
            for item, produto in rows
        ]

        return {"data": data, "page": page, "page_size": page_size, "total": total}
    finally:
        session.close()
