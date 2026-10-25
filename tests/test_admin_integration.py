import unittest
from datetime import datetime, timedelta
from unittest.mock import patch

from sqlalchemy import create_engine, event, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from src.api.errors import ApiError
from src.api.security import require_admin, require_super_admin
from src.api.services import admin_service
from src.database.models import (
    Base, Estabelecimento, ItemNotaFiscal, NfceImport, NotaFiscal,
    PasswordResetToken, Produto, Usuario,
)
from src.database.promote_admin import promote_admin


class AdminIntegrationTests(unittest.TestCase):

    def setUp(self):
        self.engine = create_engine('sqlite://', poolclass=StaticPool)
        event.listen(self.engine, 'connect', lambda db, _: db.execute('PRAGMA foreign_keys=ON'))
        Base.metadata.create_all(self.engine)

        self.sessions = sessionmaker(self.engine, expire_on_commit=False)
        self.patch = patch.object(admin_service, 'SessionLocal', self.sessions)
        self.patch.start()

        with self.sessions() as session:
            session.add_all([
                Usuario(id=1, email='owner@example.com', password_hash='hash', role='SUPER_ADMIN'),
                Usuario(id=2, email='manager@example.com', password_hash='hash', role='ADMIN'),
                Usuario(id=3, email='angelo-admin@example.com', password_hash='hash', role='USER'),
            ])
            session.commit()

    def tearDown(self):
        self.patch.stop()
        self.engine.dispose()

    def assert_api_error(self, code, action):
        with self.assertRaises(ApiError) as caught:
            action()

        self.assertEqual(code, caught.exception.code)

    def test_roles_come_from_database_and_promotion_is_explicit(self):
        with self.sessions() as session:
            user = session.get(Usuario, 3)
            manager = session.get(Usuario, 2)

            self.assert_api_error('FORBIDDEN', lambda: require_admin(user))
            self.assertEqual(manager, require_admin(manager))
            self.assert_api_error('FORBIDDEN', lambda: require_super_admin(manager))

        with patch('src.database.promote_admin.SessionLocal', self.sessions):
            promote_admin(' ANGELO-ADMIN@example.com ')

        with self.sessions() as session:
            self.assertEqual('SUPER_ADMIN', require_super_admin(session.get(Usuario, 3)).role)

    def test_role_update_and_guards(self):
        result = admin_service.update_usuario_role(3, 'ADMIN', 1)

        self.assertEqual('ADMIN', result['role'])
        self.assert_api_error('CANNOT_CHANGE_OWN_ROLE', lambda: admin_service.update_usuario_role(1, 'USER', 1))
        self.assert_api_error('LAST_SUPER_ADMIN', lambda: admin_service.update_usuario_role(1, 'USER', 2))
        self.assert_api_error('CANNOT_DELETE_SELF', lambda: admin_service.delete_usuario_admin(1, 1))
        self.assert_api_error('FORBIDDEN', lambda: admin_service.delete_usuario_admin(3, 2))
        self.assert_api_error('USER_NOT_FOUND', lambda: admin_service.delete_usuario_admin(999, 1))

    def test_delete_cascades_owned_records_preserving_shared_catalog(self):
        now = datetime.utcnow()

        with self.sessions() as session:
            session.add(Estabelecimento(id=1, nome_fantasia='Loja', razao_social='Loja', cnpj='123', logradouro='Rua', cidade='Salvador', estado='BA'))
            session.add(Produto(id=1, descricao='Produto', categoria='Outros'))
            session.flush()

            nota = NotaFiscal(id=1, usuario_id=3, estabelecimento_id=1, codigo_acesso='1' * 44)
            nota.itens.append(ItemNotaFiscal(id_produto=1, quantidade=1, valor_unitario=10))

            session.add(nota)
            session.add(PasswordResetToken(usuario_id=3, token_hash='token', expires_at=now + timedelta(hours=1)))
            session.add(NfceImport(id='import', usuario_id=3, access_key='1' * 44, status='COMPLETED', expires_at=now))
            session.commit()

        result = admin_service.delete_usuario_admin(3, 1)

        self.assertTrue(result['deleted'])
        self.assertEqual(0, result['resumo_perfis']['USER'])

        with self.sessions() as session:
            for model in (NotaFiscal, ItemNotaFiscal, PasswordResetToken, NfceImport):
                self.assertEqual([], session.scalars(select(model)).all())

            self.assertIsNotNone(session.get(Produto, 1))
            self.assertIsNotNone(session.get(Estabelecimento, 1))

    def test_active_import_blocks_deletion(self):
        with self.sessions() as session:
            session.add(NfceImport(id='active', usuario_id=3, access_key='1' * 44, status='PROCESSING', expires_at=datetime.utcnow() + timedelta(minutes=5)))
            session.commit()

        self.assert_api_error('USER_HAS_ACTIVE_IMPORT', lambda: admin_service.delete_usuario_admin(3, 1))

        with self.sessions() as session:
            self.assertIsNotNone(session.get(Usuario, 3))


if __name__ == '__main__':
    unittest.main()
