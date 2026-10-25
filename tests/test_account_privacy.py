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
from src.api.services import account_service as accounts
from src.database.models import (
    AccountChallenge, Base, EmailVerificationCode, Estabelecimento, ItemNotaFiscal,
    NfceImport, NotaFiscal, PasswordResetToken, Produto, Usuario,
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
