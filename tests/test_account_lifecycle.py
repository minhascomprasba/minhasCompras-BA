"""Ciclo de vida da conta: status, carencia, reativacao, purge diario e migracao do modelo anterior."""
import tempfile
import unittest
from datetime import datetime, timedelta
from unittest.mock import patch

from sqlalchemy import create_engine, event, inspect, text
from sqlalchemy.orm import sessionmaker

from src.api import security, settings
from src.api.errors import ApiError
from src.api.services import account_service as accounts, admin_service, retention_service
from src.database.models import Base, PendingAccountDeletion, Usuario

PASSWORD = 'StrongPass1!'
GRACE = timedelta(days=settings.ACCOUNT_DELETION_GRACE_DAYS)


class AccountLifecycleTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.password_hash = security.get_password_hash(PASSWORD)

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.engine = create_engine('sqlite:///' + self.temp.name + '/test.db', connect_args={'check_same_thread': False})
        event.listen(self.engine, 'connect', lambda db, _: db.execute('PRAGMA foreign_keys=ON'))
        Base.metadata.create_all(self.engine)
        self.sessions = sessionmaker(self.engine, expire_on_commit=False)
        self.patches = [
            patch.object(security, 'SessionLocal', self.sessions),
            patch.object(retention_service, 'SessionLocal', self.sessions),
            patch.object(admin_service, 'SessionLocal', self.sessions),
            patch('src.api.services.email_service.send_account_deletion_scheduled'),
        ]
        for item in self.patches:
            item.start()
        with self.sessions() as db:
            db.add_all([Usuario(id=1, email='one@example.com', password_hash=self.password_hash),
                        Usuario(id=2, email='two@example.com', password_hash=self.password_hash),
                        Usuario(id=3, email='admin@example.com', password_hash=self.password_hash, role='SUPER_ADMIN')])
            db.commit()

    def tearDown(self):
        for item in reversed(self.patches):
            item.stop()
        self.engine.dispose()
        self.temp.cleanup()

    def assert_error(self, code, call):
        with self.assertRaises(ApiError) as caught:
            call()
        self.assertEqual(code, caught.exception.code)

    def schedule(self, user_id, requested_at=None):
        with self.sessions() as db:
            accounts.schedule_account_deletion(db, user_id)
            if requested_at is not None:
                db.get(Usuario, user_id).deletion_requested_at = requested_at
                db.commit()

    def test_new_accounts_are_active_and_schedule_sets_status(self):
        with self.sessions() as db:
            self.assertEqual('ACTIVE', db.get(Usuario, 1).status)
            self.assertIsNone(accounts.deletion_deadline(db.get(Usuario, 1)))
        self.schedule(1)
        with self.sessions() as db:
            user = db.get(Usuario, 1)
            self.assertEqual('PENDING_DELETION', user.status)
            self.assertEqual(user.deletion_requested_at + GRACE, accounts.deletion_deadline(user))

    def test_owner_reactivation_requires_valid_password_and_revokes_old_sessions(self):
        self.schedule(1)
        with self.sessions() as db:
            self.assert_error('INVALID_CREDENTIALS', lambda: accounts.reactivate_with_password(db, 'one@example.com', 'WrongPass1!'))
            self.assert_error('INVALID_CREDENTIALS', lambda: accounts.reactivate_with_password(db, 'missing@example.com', PASSWORD))
            stale_version = db.get(Usuario, 1).credential_version
        with self.sessions() as db:
            result = accounts.reactivate_with_password(db, 'ONE@example.com', PASSWORD)
        self.assertEqual(1, result['user']['id'])
        with self.sessions() as db:
            user = db.get(Usuario, 1)
            self.assertEqual(('ACTIVE', None), (user.status, user.deletion_requested_at))
            self.assertGreater(user.credential_version, stale_version)
            self.assertIsNone(db.get(PendingAccountDeletion, 1))
            self.assert_error('ACCOUNT_NOT_PENDING_DELETION', lambda: accounts.reactivate_with_password(db, 'one@example.com', PASSWORD))

    def test_reactivation_is_rejected_after_deadline(self):
        self.schedule(1, requested_at=datetime.utcnow() - GRACE - timedelta(seconds=1))
        with self.sessions() as db:
            self.assert_error('DELETION_DEADLINE_PASSED', lambda: accounts.reactivate_with_password(db, 'one@example.com', PASSWORD))
        self.assert_error('DELETION_DEADLINE_PASSED', lambda: admin_service.reactivate_usuario_admin(1))

    def test_admin_reactivates_any_pending_account(self):
        self.schedule(2)
        result = admin_service.reactivate_usuario_admin(2)
        self.assertEqual(('ACTIVE', None, None), (result['status'], result['deletion_requested_at'], result['deletion_scheduled_at']))
        self.assert_error('ACCOUNT_NOT_PENDING_DELETION', lambda: admin_service.reactivate_usuario_admin(2))
        self.assert_error('USER_NOT_FOUND', lambda: admin_service.reactivate_usuario_admin(999))

    def test_purge_uses_status_and_grace_period_only(self):
        now = datetime.utcnow()
        self.schedule(1, requested_at=now - GRACE)                          # vence exatamente agora
        self.schedule(2, requested_at=now - GRACE + timedelta(seconds=1))   # ainda na carencia
        with self.sessions() as db:
            # Conta ATIVA com data antiga (dado inconsistente) nunca e excluida.
            db.get(Usuario, 3).deletion_requested_at = now - GRACE * 10
            db.commit()
        self.assertEqual({'purged': 1, 'skipped': 0}, retention_service.purge_expired_accounts(now))
        self.assertEqual({'purged': 0, 'skipped': 0}, retention_service.purge_expired_accounts(now))
        with self.sessions() as db:
            self.assertIsNone(db.get(Usuario, 1))
            self.assertEqual('PENDING_DELETION', db.get(Usuario, 2).status)
            self.assertEqual('ACTIVE', db.get(Usuario, 3).status)

    def test_import_cleanup_never_purges_accounts(self):
        self.schedule(1, requested_at=datetime.utcnow() - GRACE * 2)
        retention_service.cleanup_import_sessions()
        with self.sessions() as db:
            self.assertIsNotNone(db.get(Usuario, 1))

    def test_schema_update_migrates_legacy_pending_deletions(self):
        from src.api import app as app_module
        legacy = create_engine('sqlite:///' + self.temp.name + '/legacy.db')
        requested = datetime(2026, 11, 1, 12, 0, 0)
        with legacy.begin() as conn:
            conn.execute(text("CREATE TABLE usuarios (id INTEGER PRIMARY KEY, email VARCHAR NOT NULL, password_hash VARCHAR NOT NULL, "
                              "role VARCHAR(20) NOT NULL DEFAULT 'USER', created_at DATETIME NOT NULL, deletion_scheduled_at DATETIME, "
                              "credential_version INTEGER NOT NULL DEFAULT 0)"))
            conn.execute(text("CREATE TABLE pending_account_deletions (usuario_id INTEGER PRIMARY KEY, token_hash VARCHAR(64) NOT NULL, "
                              "requested_at DATETIME NOT NULL, scheduled_at DATETIME NOT NULL, source VARCHAR(20) NOT NULL)"))
            conn.execute(text("INSERT INTO usuarios (id, email, password_hash, created_at, deletion_scheduled_at) VALUES "
                              "(1, 'a@x.com', 'h', '2026-01-01', :scheduled), (2, 'b@x.com', 'h', '2026-01-01', NULL)"),
                         {'scheduled': requested + timedelta(days=7)})
            conn.execute(text("INSERT INTO pending_account_deletions VALUES (1, 'hash', :requested, :scheduled, 'ADMIN')"),
                         {'requested': requested, 'scheduled': requested + timedelta(days=7)})
        with patch.object(app_module, 'engine', legacy):
            app_module._ensure_schema_updates()
            app_module._ensure_schema_updates()  # idempotente
        with legacy.connect() as conn:
            rows = conn.execute(text("SELECT id, status, deletion_requested_at FROM usuarios ORDER BY id")).all()
        self.assertEqual('PENDING_DELETION', rows[0].status)
        self.assertEqual(requested, datetime.fromisoformat(str(rows[0].deletion_requested_at)))
        self.assertEqual(('ACTIVE', None), (rows[1].status, rows[1].deletion_requested_at))
        self.assertIn('ix_usuarios_status', {ix['name'] for ix in inspect(legacy).get_indexes('usuarios')})
        legacy.dispose()


if __name__ == '__main__':
    unittest.main()
