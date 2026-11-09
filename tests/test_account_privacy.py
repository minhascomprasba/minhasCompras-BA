import json
import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

import jwt
from sqlalchemy import create_engine, event, select
from sqlalchemy.orm import sessionmaker
from starlette.requests import Request

from src.api import auth, security, settings
from src.api.account import ChallengeVerification, EmailChangeRequest, PasswordChangeRequest
from src.api.errors import ApiError
from src.api.services import account_service as accounts, retention_service
from src.api.services.export_service import export_account
from src.database.models import (
    AccountChallenge, AccountDeletionEvent, Base, EmailVerificationCode, Estabelecimento, ItemNotaFiscal,
    NfceImport, NotaFiscal, PasswordResetToken, PendingAccountDeletion, Produto, Usuario,
)

PASSWORD = 'StrongPass1!'


class AccountTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.password_hash = security.get_password_hash(PASSWORD)

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.engine = create_engine('sqlite:///' + self.temp.name + '/test.db', connect_args={'check_same_thread': False, 'timeout': 20})
        event.listen(self.engine, 'connect', lambda db, _: db.execute('PRAGMA foreign_keys=ON'))
        Base.metadata.create_all(self.engine)
        self.sessions = sessionmaker(self.engine, expire_on_commit=False)
        self.auth_patch = patch.object(security, 'SessionLocal', self.sessions)
        self.auth_patch.start()
        with self.sessions() as db:
            db.add_all([Usuario(id=1, email='one@example.com', password_hash=self.password_hash),
                        Usuario(id=2, email='two@example.com', password_hash=self.password_hash),
                        Usuario(id=3, email='admin@example.com', password_hash=self.password_hash, role='SUPER_ADMIN')])
            db.commit()

    def tearDown(self):
        self.auth_patch.stop()
        self.engine.dispose()
        self.temp.cleanup()

    def assert_error(self, code, call):
        with self.assertRaises(ApiError) as caught:
            call()
        self.assertEqual(code, caught.exception.code)
        return caught.exception

    def purge(self, db, user_id):
        with patch('src.api.services.email_service.send_account_deletion_scheduled'):
            accounts.schedule_account_deletion(db, user_id)
        due = datetime.utcnow() - timedelta(seconds=1)
        db.get(PendingAccountDeletion, user_id).scheduled_at = due
        db.get(Usuario, user_id).deletion_scheduled_at = due
        db.commit()
        accounts.delete_account(db, user_id)

    def issue(self, operation='email', user_id=1):
        payload = EmailChangeRequest(current_password=PASSWORD, new_email='new@example.com') if operation == 'email' else PasswordChangeRequest(current_password=PASSWORD, new_password='ChangedPass2!')
        with self.sessions() as db, patch('src.api.services.email_service.send_account_change_code') as mail:
            result = accounts.request_change(db, user_id, operation, payload, '127.0.0.1')
            code = mail.call_args.args[1]
        return ChallengeVerification(challenge_id=result['challenge_id'], code=code)

    def verify(self, payload, operation='email', user_id=1):
        with self.sessions() as db:
            return accounts.verify_change(db, user_id, operation, payload)

    def authenticate(self, token):
        return security.get_current_user_id(Request({'type': 'http', 'headers': [(b'authorization', f'Bearer {token}'.encode())]}))

    def test_email_change_revokes_old_and_legacy_sessions_and_reset(self):
        legacy = jwt.encode({'sub': '1', 'exp': datetime.utcnow() + timedelta(hours=1)}, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
        old = security.create_access_token(1)
        self.assertEqual(1, self.authenticate(legacy))
        with self.sessions() as db:
            db.add(PasswordResetToken(usuario_id=1, token_hash='reset', expires_at=datetime.utcnow() + timedelta(hours=1)))
            db.commit()
        payload = self.issue()
        result = self.verify(payload)
        self.assertEqual('new@example.com', result['user']['email'])
        self.assertEqual(1, self.authenticate(result['access_token']))
        for token in [old, legacy]:
            self.assert_error('UNAUTHORIZED', lambda: self.authenticate(token))
        self.assert_error('INVALID_CHALLENGE', lambda: self.verify(payload))
        with self.sessions() as db:
            self.assertIsNotNone(db.scalar(select(PasswordResetToken)).used_at)
            challenge = db.get(AccountChallenge, payload.challenge_id)
            self.assertNotEqual(payload.code, challenge.code_hash)

    def test_password_change_and_operation_and_ownership_isolation(self):
        payload = self.issue('password')
        self.assert_error('INVALID_CHALLENGE', lambda: self.verify(payload))
        self.assert_error('INVALID_CHALLENGE', lambda: self.verify(payload, 'password', 2))
        self.verify(payload, 'password')
        with self.sessions() as db:
            self.assertTrue(security.verify_password('ChangedPass2!', db.get(Usuario, 1).password_hash))

    def test_wrong_password_is_field_validation_not_unauthorized(self):
        with self.sessions() as db:
            error = self.assert_error('WRONG_PASSWORD', lambda: accounts.request_change(db, 1, 'email', EmailChangeRequest(current_password='bad', new_email='new@example.com'), 'ip'))
            self.assertEqual(422, error.status_code)
            self.assertEqual('current_password', error.details['field'])

    def test_validation_and_email_conflict_at_request_and_confirmation(self):
        with self.sessions() as db:
            for email, code in [('bad', 'INVALID_EMAIL'), (' TWO@example.com ', 'EMAIL_IN_USE')]:
                self.assert_error(code, lambda: accounts.check_email(db, email, 1))
        payload = self.issue()
        with self.sessions() as db:
            db.get(Usuario, 2).email = 'new@example.com'
            db.commit()
        self.assert_error('EMAIL_IN_USE', lambda: self.verify(payload))

    def test_expiry_and_attempt_limit(self):
        payload = self.issue()
        wrong = ChallengeVerification(challenge_id=payload.challenge_id, code='999999' if payload.code != '999999' else '000000')
        for _ in range(5):
            self.assert_error('INVALID_CODE', lambda: self.verify(wrong))
        self.assert_error('INVALID_CHALLENGE', lambda: self.verify(payload))
        payload = self.issue()
        with self.sessions() as db:
            db.get(AccountChallenge, payload.challenge_id).expires_at = datetime.utcnow() - timedelta(seconds=1)
            db.commit()
        self.assert_error('INVALID_CHALLENGE', lambda: self.verify(payload))

    def test_resend_invalidates_only_same_operation(self):
        old = self.issue()
        password = self.issue('password')
        current = self.issue()
        self.assert_error('INVALID_CHALLENGE', lambda: self.verify(old))
        self.verify(current)
        self.assert_error('INVALID_CHALLENGE', lambda: self.verify(password, 'password'))

    def test_rate_limit_user_and_ip_is_database_backed(self):
        for _ in range(3):
            self.issue()
        with self.sessions() as db:
            self.assert_error('RATE_LIMIT_EXCEEDED', lambda: accounts.consume_rate_limit(db, 1, 'other-ip'))
        with self.sessions() as db:
            self.assert_error('RATE_LIMIT_EXCEEDED', lambda: accounts.consume_rate_limit(db, 2, '127.0.0.1'))

    def test_delivery_failure_does_not_leave_usable_challenge(self):
        with self.sessions() as db, patch('src.api.services.email_service.send_account_change_code', side_effect=RuntimeError()):
            self.assert_error('EMAIL_DELIVERY_FAILED', lambda: accounts.request_change(db, 1, 'email', EmailChangeRequest(current_password=PASSWORD, new_email='new@example.com'), 'ip'))
        with self.sessions() as db:
            self.assertEqual([], db.scalars(select(AccountChallenge)).all())

    def test_weak_new_passwords_do_not_consume_pin_limit_and_legacy_password_works(self):
        with self.sessions() as db:
            db.get(Usuario, 1).password_hash = security.get_password_hash('password')
            db.commit()
            for _ in range(4):
                error = self.assert_error('WEAK_PASSWORD', lambda: accounts.request_change(db, 1, 'password',
                    PasswordChangeRequest(current_password='password', new_password='password'), 'ip'))
                self.assertEqual('new_password', error.details['field'])
            login = auth.login(SimpleNamespace(email='one@example.com', password='password'), db)
            self.assertEqual(1, login.user.id)
        with self.sessions() as db, patch('src.api.services.email_service.send_account_change_code') as mail:
            result = accounts.request_change(db, 1, 'password',
                PasswordChangeRequest(current_password='password', new_password='ChangedPass2!'), 'ip')
            self.assertIn('challenge_id', result)
            mail.assert_called_once()

    def test_schedule_failure_preserves_account_sessions_and_no_pending_record(self):
        old_token = security.create_access_token(1)
        with self.sessions() as db, patch('src.api.services.email_service.send_account_deletion_scheduled', side_effect=OSError()):
            self.assert_error('EMAIL_DELIVERY_FAILED', lambda: accounts.schedule_account_deletion(db, 1, PASSWORD))
        with self.sessions() as db:
            self.assertIsNone(db.get(Usuario, 1).deletion_scheduled_at)
            self.assertIsNone(db.get(PendingAccountDeletion, 1))
        self.assertEqual(1, self.authenticate(old_token))

    def test_grace_period_preserves_data_cancel_is_explicit_and_replay_safe(self):
        self.seed_data()
        old_token = security.create_access_token(1)
        with self.sessions() as db, patch('src.api.services.email_service.send_account_deletion_scheduled') as mail:
            result = accounts.schedule_account_deletion(db, 1, PASSWORD)
            raw_token = mail.call_args.args[1]
            self.assertEqual('PENDING_DELETION', result['status'])
            self.assertTrue(6.99 < (result['scheduled_at'] - datetime.utcnow()).total_seconds() / 86400 <= 7)
        self.assert_error('UNAUTHORIZED', lambda: self.authenticate(old_token))
        with self.sessions() as db:
            self.assertIsNotNone(db.get(Usuario, 1))
            self.assertEqual(2, len(db.scalars(select(NotaFiscal)).all()))
            self.assertNotEqual(raw_token, db.get(PendingAccountDeletion, 1).token_hash)
            self.assert_error('ACCOUNT_PENDING_DELETION', lambda: accounts.lock_user(db, 1))
            db.rollback()
            self.assert_error('DELETION_NOT_DUE', lambda: accounts.delete_account(db, 1))
            db.rollback()
            self.assert_error('INVALID_DELETION_TOKEN', lambda: accounts.cancel_account_deletion(db, 'wrong-token'))
            db.rollback()
            accounts.cancel_account_deletion(db, raw_token)
            self.assertIsNone(db.get(Usuario, 1).deletion_scheduled_at)
            self.assertIsNone(db.get(PendingAccountDeletion, 1))
            self.assert_error('INVALID_DELETION_TOKEN', lambda: accounts.cancel_account_deletion(db, raw_token))
        self.assert_error('UNAUTHORIZED', lambda: self.authenticate(old_token))

    def test_scheduler_finalizes_only_at_deadline_and_cancellation_then_expires(self):
        with self.sessions() as db, patch('src.api.services.email_service.send_account_deletion_scheduled') as mail:
            result = accounts.schedule_account_deletion(db, 1, PASSWORD)
            raw_token = mail.call_args.args[1]
        deadline = result['scheduled_at']
        with patch.object(retention_service, 'SessionLocal', self.sessions):
            retention_service.cleanup(deadline - timedelta(seconds=1))
        with self.sessions() as db:
            self.assertIsNotNone(db.get(Usuario, 1))
            self.assertEqual([], db.scalars(select(AccountDeletionEvent)).all())
        with patch.object(retention_service, 'SessionLocal', self.sessions):
            retention_service.cleanup(deadline)
            retention_service.cleanup(deadline)
        with self.sessions() as db:
            self.assertIsNone(db.get(Usuario, 1))
            self.assertIsNone(db.get(PendingAccountDeletion, 1))
            self.assertEqual(1, len(db.scalars(select(AccountDeletionEvent)).all()))
            self.assert_error('INVALID_DELETION_TOKEN', lambda: accounts.cancel_account_deletion(db, raw_token))

    def test_password_rules(self):
        for password, code in [('short', 'INVALID_PASSWORD'), ('lowercaseonly', 'WEAK_PASSWORD'), ('A' * 129, 'INVALID_PASSWORD')]:
            self.assert_error(code, lambda: (auth._validate_password_rules(password), auth._validate_password_strength(password)))

    def test_concurrent_confirmation_only_one_succeeds(self):
        payload = self.issue()
        def confirm(_):
            try:
                self.verify(payload)
                return 'ok'
            except ApiError as error:
                return error.code
        with ThreadPoolExecutor(max_workers=2) as executor:
            results = list(executor.map(confirm, range(2)))
        self.assertCountEqual(['ok', 'INVALID_CHALLENGE'], results)

    def test_recovery_complexity_rules_preserve_token_until_valid_password(self):
        token, hashed = security.generate_reset_token()
        with self.sessions() as db:
            record = PasswordResetToken(usuario_id=1, token_hash=hashed,
                expires_at=datetime.utcnow() + timedelta(minutes=10))
            db.add(record)
            db.commit()
            for password, rule in [
                ('Aa1!', 'min_length'), ('Aa1!' + 'x' * 125, 'max_length'),
                ('password1!', 'uppercase'), ('PASSWORD1!', 'lowercase'),
                ('Password!!', 'digit'), ('Password12', 'special'),
            ]:
                with self.subTest(rule=rule):
                    with self.assertRaises(ApiError) as caught:
                        auth.reset_password(SimpleNamespace(token=token, password=password), db)
                    self.assertEqual(422, caught.exception.status_code)
                    self.assertEqual(rule, caught.exception.details['rule'])
                    db.refresh(record)
                    self.assertIsNone(record.used_at)
                    self.assertTrue(security.verify_password(PASSWORD, db.get(Usuario, 1).password_hash))
            auth.reset_password(SimpleNamespace(token=token, password='RecoveredPass2!'), db)
            db.refresh(record)
            self.assertIsNotNone(record.used_at)
            self.assertTrue(security.verify_password('RecoveredPass2!', db.get(Usuario, 1).password_hash))

    def test_recovery_revokes_sessions_and_challenges(self):
        challenge = self.issue()
        token, hashed = security.generate_reset_token()
        with self.sessions() as db:
            db.add(PasswordResetToken(usuario_id=1, token_hash=hashed, expires_at=datetime.utcnow() + timedelta(minutes=10)))
            db.commit()
            auth.reset_password(SimpleNamespace(token=token, password='RecoveredPass2!'), db)
        self.assert_error('UNAUTHORIZED', lambda: self.authenticate(security.create_access_token(1)))
        self.assert_error('INVALID_CHALLENGE', lambda: self.verify(challenge))
        with self.sessions() as db:
            self.assert_error('INVALID_RESET_TOKEN', lambda: auth.reset_password(SimpleNamespace(token=token, password='RecoveredPass2!'), db))

    def seed_data(self):
        with self.sessions() as db:
            db.add(Estabelecimento(id=1, nome_fantasia='Loja', razao_social='Loja', cnpj='1', logradouro='Rua', cidade='Feira', estado='BA'))
            db.add(Produto(id=1, descricao='Produto', categoria='Outros'))
            db.flush()
            for user_id in (1, 2):
                invoice = NotaFiscal(usuario_id=user_id, estabelecimento_id=1, codigo_acesso=str(user_id) * 44)
                invoice.itens.append(ItemNotaFiscal(id_produto=1, quantidade=1, valor_unitario=10))
                db.add(invoice)
            db.add(NfceImport(id='finished', usuario_id=1, access_key='1' * 44, status='COMPLETED', expires_at=datetime.utcnow(), captcha_image_path='/private/secret.png'))
            db.add(EmailVerificationCode(email='one@example.com', password_hash='secret', code_hash='pin', expires_at=datetime.utcnow()))
            db.commit()

    def test_export_allowlists_and_account_deletion(self):
        self.seed_data()
        self.issue()
        with self.sessions() as db:
            response = export_account(db, db.get(Usuario, 1))
            exported = json.loads(response.body)
            self.assertEqual('no-store', response.headers['cache-control'])
            self.assertEqual(1, len(exported['invoices']))
            for secret in ['password_hash', 'code_hash', 'token_hash', 'credential_version', '/private', 'two@example.com']:
                self.assertNotIn(secret, response.body.decode())
            self.purge(db, 1)
        with self.sessions() as db:
            self.assertIsNone(db.get(Usuario, 1))
            self.assertIsNotNone(db.get(Usuario, 2))
            self.assertEqual(1, len(db.scalars(select(NotaFiscal)).all()))
            self.assertEqual(1, len(db.scalars(select(ItemNotaFiscal)).all()))
            for model in [AccountChallenge, EmailVerificationCode, NfceImport]:
                self.assertEqual([], db.scalars(select(model)).all())
            self.assertIsNotNone(db.get(Produto, 1))
            self.assertIsNotNone(db.get(Estabelecimento, 1))
        self.assert_error('UNAUTHORIZED', lambda: self.authenticate(security.create_access_token(1)))

    def test_deletion_history_has_no_account_identifiers_and_failed_deletion_leaves_no_event(self):
        with self.sessions() as db:
            self.assert_error('LAST_SUPER_ADMIN', lambda: self.purge(db, 3))
            db.rollback()
            self.assertEqual([], db.scalars(select(AccountDeletionEvent)).all())
            self.purge(db, 1)
            events = db.scalars(select(AccountDeletionEvent)).all()
            self.assertEqual(1, len(events))
            self.assertEqual('SELF_SERVICE', events[0].source)
            self.assertEqual(datetime.utcnow().date(), events[0].occurred_on)
            self.assertEqual({'id', 'occurred_on', 'source', 'expires_at'}, set(AccountDeletionEvent.__table__.columns.keys()))
            self.assertNotIn('one@example.com', str(events[0].__dict__))
        from src.api.services import admin_service
        with patch.object(admin_service, 'SessionLocal', self.sessions):
            page = admin_service.list_account_deletions(1, 20)
            self.assertEqual(1, page['total'])
            self.assertEqual('ERASED', page['data'][0]['status'])
            self.assertEqual({'id', 'occurred_on', 'source', 'status'}, set(page['data'][0]))

    def test_expired_processing_still_blocks_deletion_and_last_admin_guard(self):
        with self.sessions() as db:
            self.assert_error('LAST_SUPER_ADMIN', lambda: self.purge(db, 3))
            db.rollback()
            db.add(NfceImport(id='processing', usuario_id=1, access_key='1' * 44, status='PROCESSING', expires_at=datetime.utcnow() - timedelta(hours=1)))
            db.commit()
            self.assert_error('USER_HAS_ACTIVE_IMPORT', lambda: self.purge(db, 1))

    def test_retention_boundaries_idempotency_and_captcha_cleanup(self):
        now = datetime.utcnow()
        path = Path('data/captchas/test-retention.png')
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(b'test')
        self.addCleanup(lambda: path.unlink(missing_ok=True))
        with self.sessions() as db:
            db.add_all([AccountDeletionEvent(id='expired-event', occurred_on=now.date(), source='SELF_SERVICE', expires_at=now),
                AccountDeletionEvent(id='retained-event', occurred_on=now.date(), source='ADMIN', expires_at=now + timedelta(days=1))])
            for code, hours in [('old', 24), ('recent', 23)]:
                db.add(EmailVerificationCode(email='one@example.com', password_hash='hash', code_hash=code, expires_at=now - timedelta(hours=hours)))
            db.add(NfceImport(id='expired', usuario_id=1, access_key='1' * 44, status='WAITING_CAPTCHA', expires_at=now - timedelta(seconds=1), captcha_image_path=str(path)))
            db.commit()
        with patch.object(retention_service, 'SessionLocal', self.sessions):
            retention_service.cleanup(now)
            retention_service.cleanup(now)
        self.assertFalse(path.exists())
        with self.sessions() as db:
            self.assertEqual(['retained-event'], [e.id for e in db.scalars(select(AccountDeletionEvent))])
            self.assertEqual(['recent'], [c.code_hash for c in db.scalars(select(EmailVerificationCode))])
            self.assertEqual('EXPIRED', db.get(NfceImport, 'expired').status)

    def test_concurrent_last_admin_deletions_keep_one_admin(self):
        with self.sessions() as db:
            db.add(Usuario(id=4, email='second-admin@example.com', password_hash=self.password_hash, role='SUPER_ADMIN'))
            db.commit()
        def remove(user_id):
            with self.sessions() as db:
                try:
                    self.purge(db, user_id)
                    return 'ok'
                except ApiError as error:
                    return error.code
        with patch('src.api.services.email_service.send_account_deletion_scheduled'), ThreadPoolExecutor(max_workers=2) as executor:
            self.assertCountEqual(['ok', 'LAST_SUPER_ADMIN'], list(executor.map(remove, [3, 4])))

    def test_import_creation_cannot_recreate_deleted_user_data(self):
        from unittest.mock import Mock
        from src.api.services import import_service
        driver = Mock()
        def create_browser(**kwargs):
            kwargs['captcha_output_path'].parent.mkdir(parents=True, exist_ok=True)
            kwargs['captcha_output_path'].write_bytes(b'captcha')
            with self.sessions() as db:
                self.purge(db, 1)
            return driver
        with patch.object(import_service, 'SessionLocal', self.sessions), patch.object(import_service, 'cleanup_expired_import_sessions'), patch.object(import_service.driver_pool, 'acquire', return_value=driver), patch.object(import_service, 'start_auth_session', side_effect=create_browser):
            self.assert_error('USER_NOT_FOUND', lambda: import_service.start_import('1' * 44, 1))
        driver.quit.assert_called_once()
        with self.sessions() as db:
            self.assertEqual([], db.scalars(select(NfceImport)).all())

    def test_receipt_persistence_rechecks_user_after_deletion(self):
        from src.phase4 import db_loader
        self.seed_data()
        with self.sessions() as db:
            self.purge(db, 1)
        with patch.object(db_loader, 'SessionLocal', self.sessions):
            self.assert_error('USER_NOT_FOUND', lambda: db_loader.bulk_insert_produtos_with_nota_id(
                [{'descricao': 'Produto', 'quantidade': 1, 'valor_total': 10}], '1' * 44, 1, 1))
        with self.sessions() as db:
            self.assertEqual([2], [n.usuario_id for n in db.scalars(select(NotaFiscal))])

    def test_schema_backfill_preserves_legacy_records(self):
        from importlib import import_module
        from sqlalchemy import text
        app_module = import_module('src.api.app')
        legacy = create_engine('sqlite:///' + self.temp.name + '/legacy.db')
        with legacy.begin() as connection:
            connection.execute(text("CREATE TABLE usuarios (id INTEGER PRIMARY KEY, email VARCHAR UNIQUE NOT NULL, password_hash VARCHAR NOT NULL, created_at DATETIME NOT NULL)"))
            connection.execute(text("INSERT INTO usuarios VALUES (1, 'legacy@example.com', 'original-hash', '2026-01-01')"))
        with patch.object(app_module, 'engine', legacy):
            Base.metadata.create_all(legacy)
            app_module._ensure_schema_updates()
            app_module._ensure_schema_updates()
        with legacy.connect() as connection:
            row = connection.execute(text('SELECT email, password_hash, credential_version, role FROM usuarios')).one()
            self.assertEqual(('legacy@example.com', 'original-hash', 0, 'USER'), tuple(row))
        legacy.dispose()


if __name__ == '__main__':
    unittest.main()
