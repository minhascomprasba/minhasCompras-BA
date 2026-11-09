"""Exercise actual ASGI routes and SMTP transport without external services."""
import asyncio
import json
import re
import socketserver
import tempfile
import threading
import unittest
from datetime import datetime, timedelta
from email import policy
from email.parser import BytesParser
from unittest.mock import patch

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from src.api import auth, security, settings
from src.api.app import app
from src.database.models import Base, Usuario


class SMTPHandler(socketserver.StreamRequestHandler):
    def handle(self):
        self.wfile.write(b'220 localhost test SMTP\r\n')
        while True:
            line = self.rfile.readline()
            if not line:
                break
            verb = line.split(b' ', 1)[0].strip().upper()
            if verb in (b'EHLO', b'HELO'):
                self.wfile.write(b'250 localhost\r\n')
            elif verb == b'DATA':
                self.wfile.write(b'354 End with dot\r\n')
                body = []
                while (part := self.rfile.readline()) not in (b'.\r\n', b''):
                    body.append(part)
                self.server.messages.append(BytesParser(policy=policy.default).parsebytes(b''.join(body)))
                self.wfile.write(b'250 Accepted\r\n')
            elif verb == b'QUIT':
                self.wfile.write(b'221 Bye\r\n')
                break
            else:
                self.wfile.write(b'250 OK\r\n')


class APISMTPTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.engine = create_engine('sqlite:///' + self.temp.name + '/api.db')
        event.listen(self.engine, 'connect', lambda db, _: db.execute('PRAGMA foreign_keys=ON'))
        Base.metadata.create_all(self.engine)
        self.sessions = sessionmaker(self.engine, expire_on_commit=False)
        with self.sessions() as db:
            hashed = security.get_password_hash('StrongPass1!')
            db.add_all([Usuario(id=1, email='user@example.com', password_hash=hashed), Usuario(id=2, email='admin@example.com', password_hash=hashed, role='SUPER_ADMIN')])
            db.commit()
        self.smtp = socketserver.TCPServer(('127.0.0.1', 0), SMTPHandler)
        self.smtp.messages = []
        self.thread = threading.Thread(target=self.smtp.serve_forever, daemon=True)
        self.thread.start()
        self.patches = [patch('src.api.services.admin_service.SessionLocal', self.sessions), patch.object(security, 'SessionLocal', self.sessions), patch.multiple(settings,
            SMTP_HOST='127.0.0.1', SMTP_PORT=self.smtp.server_address[1], SMTP_FROM='test@example.com', SMTP_USE_TLS=False, SMTP_USER='', SMTP_PASSWORD='')]
        for item in self.patches:
            item.start()
        def get_db():
            with self.sessions() as db:
                yield db
        app.dependency_overrides[auth.get_db] = get_db

    def tearDown(self):
        app.dependency_overrides.clear()
        for item in reversed(self.patches):
            item.stop()
        self.smtp.shutdown()
        self.smtp.server_close()
        self.thread.join()
        self.engine.dispose()
        self.temp.cleanup()

    def request(self, method, path, payload=None, token=None):
        async def invoke():
            body = json.dumps(payload).encode() if payload is not None else b''
            headers = [(b'content-type', b'application/json')]
            if token:
                headers.append((b'authorization', f'Bearer {token}'.encode()))
            scope = {'type': 'http', 'asgi': {'version': '3.0'}, 'http_version': '1.1',
                     'method': method, 'scheme': 'http', 'path': '/api/v1' + path,
                     'raw_path': ('/api/v1' + path).encode(), 'query_string': b'',
                     'headers': headers, 'client': ('127.0.0.1', 1234), 'server': ('test', 80)}
            sent = False
            events = []
            async def receive():
                nonlocal sent
                if not sent:
                    sent = True
                    return {'type': 'http.request', 'body': body, 'more_body': False}
                return {'type': 'http.disconnect'}
            async def send(message):
                events.append(message)
            await app(scope, receive, send)
            start = next(e for e in events if e['type'] == 'http.response.start')
            output = b''.join(e.get('body', b'') for e in events if e['type'] == 'http.response.body')
            return start['status'], json.loads(output), dict(start['headers'])
        return asyncio.run(invoke())

    def code(self):
        return re.search(r'\b\d{6}\b', self.smtp.messages[-1].get_body().get_content()).group()

    def test_complete_profile_flow_over_http_and_smtp(self):
        status, data, _ = self.request('POST', '/auth/login', {'email': 'user@example.com', 'password': 'StrongPass1!'})
        self.assertEqual(200, status)
        original = token = data['access_token']
        self.assertEqual(403, self.request('GET', '/admin/account-deletions', token=token)[0])
        admin = security.create_access_token(2)
        status, data, _ = self.request('POST', '/auth/email-change/request', {'current_password': 'StrongPass1!', 'new_email': 'changed@example.com'}, token)
        self.assertEqual(202, status)
        self.assertEqual('changed@example.com', self.smtp.messages[-1]['To'])
        status, data, _ = self.request('POST', '/auth/email-change/verify', {'challenge_id': data['challenge_id'], 'code': self.code()}, token)
        self.assertEqual(200, status)
        token = data['access_token']
        for protected in ['/auth/me', '/notas', '/notas/1', '/notas/1/itens', '/mapa', '/dashboard', '/imports/nfce']:
            self.assertEqual(401, self.request('GET', protected, token=original)[0], protected)
        status, data, _ = self.request('POST', '/auth/password-change/request', {'current_password': 'StrongPass1!', 'new_password': 'ChangedPass2!'}, token)
        self.assertEqual(202, status)
        status, data, _ = self.request('POST', '/auth/password-change/verify', {'challenge_id': data['challenge_id'], 'code': self.code()}, token)
        self.assertEqual(200, status)
        token = data['access_token']
        status, export, headers = self.request('POST', '/auth/me/export', {'password': 'ChangedPass2!'}, token)
        self.assertEqual(200, status)
        self.assertEqual(b'no-store', headers[b'cache-control'])
        self.assertEqual('changed@example.com', export['account']['email'])
        self.assertEqual(422, self.request('DELETE', '/auth/me', {'password': 'wrong'}, token)[0])
        self.assertEqual(200, self.request('GET', '/auth/me', token=token)[0])
        status, scheduled, _ = self.request('DELETE', '/auth/me', {'password': 'ChangedPass2!'}, token)
        self.assertEqual(202, status)
        cancel_token = re.search(r'#token=([A-Za-z0-9_-]+)', self.smtp.messages[-1].get_body().get_content()).group(1)
        self.assertEqual(409, self.request('POST', '/auth/login', {'email': 'changed@example.com', 'password': 'ChangedPass2!'})[0])
        self.assertEqual(200, self.request('POST', '/auth/account-deletion/cancel', {'token': cancel_token})[0])
        self.assertEqual(422, self.request('POST', '/auth/account-deletion/cancel', {'token': cancel_token})[0])
        status, login, _ = self.request('POST', '/auth/login', {'email': 'changed@example.com', 'password': 'ChangedPass2!'})
        self.assertEqual(200, status)
        token = login['access_token']
        status, scheduled, _ = self.request('DELETE', '/auth/me', {'password': 'ChangedPass2!'}, token)
        self.assertEqual(202, status)
        status, listed, _ = self.request('GET', '/admin/usuarios', token=admin)
        self.assertEqual(200, status)
        self.assertEqual('PENDING_DELETION', next(u for u in listed['data'] if u['id'] == 1)['status'])
        from src.api.services import retention_service
        with patch.object(retention_service, 'SessionLocal', self.sessions):
            retention_service.cleanup(datetime.fromisoformat(scheduled['scheduled_at']) + timedelta(seconds=1))
        self.assertEqual(401, self.request('GET', '/auth/me', token=token)[0])
        self.assertEqual(200, self.request('GET', '/auth/me', token=admin)[0])
        status, history, _ = self.request('GET', '/admin/account-deletions', token=admin)
        self.assertEqual(200, status)
        self.assertEqual(1, history['total'])
        self.assertEqual('SELF_SERVICE', history['data'][0]['source'])
        self.assertNotIn('changed@example.com', json.dumps(history))

    def test_password_recovery_delivers_link_and_revokes_old_session(self):
        old = security.create_access_token(1)
        status, _, _ = self.request('POST', '/auth/forgot-password', {'email': 'user@example.com'})
        self.assertEqual(200, status)
        body = self.smtp.messages[-1].get_body().get_content()
        recovery_token = re.search(r'token=([A-Za-z0-9_-]+)', body).group(1)
        status, _, _ = self.request('POST', '/auth/reset-password', {'token': recovery_token, 'password': 'RecoveredPass2!'})
        self.assertEqual(200, status)
        self.assertEqual(401, self.request('GET', '/auth/me', token=old)[0])
        status, _, _ = self.request('POST', '/auth/login', {'email': 'user@example.com', 'password': 'RecoveredPass2!'})
        self.assertEqual(200, status)

    def test_smtp_failure_is_reported_without_claiming_delivery(self):
        token = security.create_access_token(1)
        with patch('src.api.services.email_service.smtplib.SMTP', side_effect=OSError('unavailable')):
            status, data, _ = self.request('POST', '/auth/email-change/request', {'current_password': 'StrongPass1!', 'new_email': 'new@example.com'}, token)
        self.assertEqual(503, status)
        self.assertEqual('EMAIL_DELIVERY_FAILED', data['code'])

    def test_invalid_payload_does_not_echo_credentials(self):
        token = security.create_access_token(1)
        status, data, _ = self.request('POST', '/auth/password-change/request', {'current_password': 'secret-current-value', 'new_password': 'secret'}, token)
        self.assertEqual(400, status)
        self.assertNotIn('secret', json.dumps(data))
