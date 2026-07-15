from __future__ import annotations

import logging
import smtplib
from email.message import EmailMessage

from src.api import settings

logger = logging.getLogger(__name__)


def _is_smtp_configured() -> bool:
    return bool(settings.SMTP_HOST and settings.SMTP_FROM)


def send_password_reset_email(to_email: str, reset_url: str) -> None:
    subject = "Redefinição de senha — Minhas Compras BA"
    body = (
        "Olá,\n\n"
        "Recebemos uma solicitação para redefinir a senha da sua conta.\n"
        f"Acesse o link abaixo para criar uma nova senha (válido por "
        f"{settings.PASSWORD_RESET_TOKEN_EXPIRATION_MINUTES} minutos):\n\n"
        f"{reset_url}\n\n"
        "Se você não solicitou esta alteração, ignore este e-mail.\n\n"
        "Minhas Compras BA"
    )

    if not _is_smtp_configured():
        logger.warning(
            "SMTP não configurado. Link de redefinição para %s: %s",
            to_email,
            reset_url,
        )
        return

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = settings.SMTP_FROM
    message["To"] = to_email
    message.set_content(body)

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=30) as server:
            if settings.SMTP_USE_TLS:
                server.starttls()
            if settings.SMTP_USER and settings.SMTP_PASSWORD:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(message)
    except smtplib.SMTPException as exc:
        logger.exception("Falha ao enviar e-mail de redefinição para %s: %s", to_email, exc)
        raise
    else:
        logger.info("E-mail de redefinição enviado para %s", to_email)


def send_email_verification_code(to_email: str, code: str) -> None:
    subject = "Código de confirmação — Minhas Compras BA"
    body = (
        "Olá,\n\n"
        "Recebemos uma solicitação para criar uma conta com este e-mail.\n"
        "Use o código abaixo para confirmar seu cadastro (válido por "
        f"{settings.EMAIL_VERIFICATION_CODE_EXPIRATION_MINUTES} minutos):\n\n"
        f"{code}\n\n"
        "Se você não solicitou este cadastro, ignore este e-mail.\n\n"
        "Minhas Compras BA"
    )

    if not _is_smtp_configured():
        logger.warning(
            "SMTP não configurado. Código de confirmação para %s: %s",
            to_email,
            code,
        )
        return

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = settings.SMTP_FROM
    message["To"] = to_email
    message.set_content(body)

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=30) as server:
            if settings.SMTP_USE_TLS:
                server.starttls()
            if settings.SMTP_USER and settings.SMTP_PASSWORD:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(message)
    except smtplib.SMTPException as exc:
        logger.exception("Falha ao enviar código de confirmação para %s: %s", to_email, exc)
        raise
    else:
        logger.info("Código de confirmação enviado para %s", to_email)
