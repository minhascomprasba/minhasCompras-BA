"""Idempotent cleanup; run hourly independently of API traffic."""
from datetime import datetime, timedelta
from pathlib import Path

from sqlalchemy import delete, or_, select

from src.api.errors import ApiError
from src.database.connection import SessionLocal
from src.database.models import AccountChallenge, AccountRateLimit, AccountDeletionEvent, EmailVerificationCode, NfceImport, PasswordResetToken, PendingAccountDeletion


def cleanup(now=None):
    from src.api.services.import_service import release_import_resources
    from src.api.services.account_service import lock_user, delete_account
    now = now or datetime.utcnow()
    auth_cutoff = now - timedelta(hours=24)
    with SessionLocal() as db:
        for model in (AccountChallenge, EmailVerificationCode, PasswordResetToken):
            db.execute(delete(model).where(or_(model.expires_at <= auth_cutoff, model.used_at <= auth_cutoff)))
        db.execute(delete(AccountRateLimit).where(AccountRateLimit.window <= auth_cutoff))
        db.execute(delete(AccountDeletionEvent).where(AccountDeletionEvent.expires_at <= now))
        db.commit()
        candidates = list(db.execute(select(NfceImport.id, NfceImport.usuario_id).where(
            ((NfceImport.status == "WAITING_CAPTCHA") & (NfceImport.expires_at <= now))
            | NfceImport.status.in_(["COMPLETED", "FAILED", "EXPIRED"]))))
        db.rollback()
        for import_id, owner_id in candidates:
            try:
                lock_user(db, owner_id)
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
            # Remove first so failed unlink operations remain retryable next hour.
            release_import_resources(import_id, path)
            record.captcha_image_path = None
            db.commit()
        pending_ids = list(db.scalars(select(PendingAccountDeletion.usuario_id).where(PendingAccountDeletion.scheduled_at <= now)))
        db.rollback()
        for user_id in pending_ids:
            try:
                delete_account(db, user_id, now=now)
            except ApiError as exc:
                db.rollback()
                if exc.code not in {"DELETION_NOT_DUE", "USER_NOT_FOUND"}:
                    import logging
                    logging.getLogger(__name__).warning("Exclusão adiada: há impedimento operacional.")
        active_paths = {Path(p).resolve() for p in db.scalars(select(NfceImport.captcha_image_path).where(NfceImport.captcha_image_path.is_not(None)))}
    for path in Path("data/captchas").glob("*.png"):
        if path.resolve() not in active_paths and datetime.utcfromtimestamp(path.stat().st_mtime) <= auth_cutoff:
            path.unlink(missing_ok=True)


if __name__ == "__main__":
    cleanup()
