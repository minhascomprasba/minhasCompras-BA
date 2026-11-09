"""Rotinas de retencao idempotentes.

- ``cleanup_import_sessions``: expira importacoes e libera captchas/navegadores. Barata;
  roda no startup e nas rotas de importacao.
- ``cleanup_auth_records`` e ``purge_expired_accounts``: rodam apenas pelo job diario
  (APScheduler, ver ``src/api/scheduler.py``) ou manualmente via
  ``python -m src.api.services.retention_service``.
"""
import logging
from datetime import datetime, timedelta
from pathlib import Path

from sqlalchemy import delete, or_, select

from src.api.errors import ApiError
from src.database.connection import SessionLocal
from src.database.models import (
    ACCOUNT_DELETION_GRACE_DAYS, AccountChallenge, AccountRateLimit, AccountDeletionEvent, AccountStatus, EmailVerificationCode,
    NfceImport, PasswordResetToken, Usuario,
)

logger = logging.getLogger(__name__)


def cleanup_auth_records(now=None):
    now = now or datetime.utcnow()
    auth_cutoff = now - timedelta(hours=24)
    with SessionLocal() as db:
        for model in (AccountChallenge, EmailVerificationCode, PasswordResetToken):
            db.execute(delete(model).where(or_(model.expires_at <= auth_cutoff, model.used_at <= auth_cutoff)))
        db.execute(delete(AccountRateLimit).where(AccountRateLimit.window <= auth_cutoff))
        db.execute(delete(AccountDeletionEvent).where(AccountDeletionEvent.expires_at <= now))
        db.commit()


def cleanup_import_sessions(now=None):
    from src.api.services.import_service import release_import_resources
    from src.api.services.account_service import lock_user
    now = now or datetime.utcnow()
    auth_cutoff = now - timedelta(hours=24)
    with SessionLocal() as db:
        candidates = list(db.execute(select(NfceImport.id, NfceImport.usuario_id).where(
            ((NfceImport.status == "WAITING_CAPTCHA") & (NfceImport.expires_at <= now))
            | (NfceImport.status.in_(["COMPLETED", "FAILED", "EXPIRED"]) & NfceImport.captcha_image_path.is_not(None)))))
        db.rollback()
        for import_id, owner_id in candidates:
            try:
                lock_user(db, owner_id, allow_pending=True)
            except ApiError:
                db.rollback()
                continue
            record = db.get(NfceImport, import_id, populate_existing=True)
            if not record or record.status == "PROCESSING" or (record.status == "WAITING_CAPTCHA" and record.expires_at > now):
                db.rollback()
                continue
            if record.status == "WAITING_CAPTCHA":
                record.status = "EXPIRED"
                record.finished_at = record.updated_at = now
                record.error_message = "Captcha expirado. Inicie uma nova importação."
            path = record.captcha_image_path
            # Remove first so failed unlink operations remain retryable on the next run.
            release_import_resources(import_id, path)
            record.captcha_image_path = None
            db.commit()
        active_paths = {Path(p).resolve() for p in db.scalars(select(NfceImport.captcha_image_path).where(NfceImport.captcha_image_path.is_not(None)))}
    for path in Path("data/captchas").glob("*.png"):
        if path.resolve() not in active_paths and datetime.utcfromtimestamp(path.stat().st_mtime) <= auth_cutoff:
            path.unlink(missing_ok=True)


def purge_expired_accounts(now=None):
    """Exclui definitivamente as contas PENDING_DELETION cuja carencia terminou.

    Execucoes perdidas apenas atrasam a exclusao; nunca a antecipam, pois
    ``delete_account`` revalida o prazo sob lock.
    """
    from src.api.services.account_service import delete_account
    now = now or datetime.utcnow()
    cutoff = now - timedelta(days=ACCOUNT_DELETION_GRACE_DAYS)
    purged, skipped = 0, 0
    with SessionLocal() as db:
        due_ids = list(db.scalars(select(Usuario.id).where(
            Usuario.status == AccountStatus.PENDING_DELETION.value,
            Usuario.deletion_requested_at <= cutoff,
        ).order_by(Usuario.id)))
        db.rollback()
        for user_id in due_ids:
            try:
                delete_account(db, user_id, now=now)
                purged += 1
            except ApiError as exc:
                db.rollback()
                if exc.code in {"DELETION_NOT_DUE", "USER_NOT_FOUND"}:
                    continue
                skipped += 1
                logger.warning("Exclusão da conta adiada (%s); nova tentativa na próxima execução.", exc.code)
    return {"purged": purged, "skipped": skipped}


def run_retention_jobs(now=None):
    now = now or datetime.utcnow()
    cleanup_auth_records(now)
    cleanup_import_sessions(now)
    result = purge_expired_accounts(now)
    return {**result, "ran_at": now}


# Compatibilidade: nome antigo usado em testes e scripts.
cleanup = run_retention_jobs


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    print(run_retention_jobs())
