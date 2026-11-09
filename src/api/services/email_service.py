"""SMTP delivery. Never include credentials or correspondence in application logs."""
import smtplib
from email.message import EmailMessage

from src.api import settings


def send_message(to_email: str, subject: str, body: str) -> None:
    if not (settings.SMTP_HOST and settings.SMTP_FROM):
        raise RuntimeError("SMTP não configurado")
    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = settings.SMTP_FROM
    message["To"] = to_email
    message.set_content(body)
    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=30) as server:
        if settings.SMTP_USE_TLS:
            server.starttls()
        if settings.SMTP_USER and settings.SMTP_PASSWORD:
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.send_message(message)


def send_password_reset_email(to_email: str, reset_url: str) -> None:
    send_message(to_email, "Redefinição de senha — Minhas Compras BA",
        f"Para redefinir sua senha, acesse {reset_url}\nVálido por {settings.PASSWORD_RESET_TOKEN_EXPIRATION_MINUTES} minutos. Se não solicitou, ignore.")


def send_email_verification_code(to_email: str, code: str) -> None:
    send_message(to_email, "Confirmação de cadastro — Minhas Compras BA",
        f"Seu código para confirmar o cadastro: {code}\nVálido por {settings.EMAIL_VERIFICATION_CODE_EXPIRATION_MINUTES} minutos. Se não solicitou, ignore.")


def send_account_change_code(to_email: str, code: str, operation: str) -> None:
    purpose = "alterar seu e-mail" if operation == "email" else "alterar sua senha"
    send_message(to_email, f"Código para {purpose} — Minhas Compras BA",
        f"Use {code} para {purpose}. Válido por 15 minutos. Se não solicitou, ignore e revise a segurança da conta.")


def send_account_deletion_scheduled(to_email, raw_token, scheduled_at):
    # URL fragment keeps the cancellation secret out of HTTP request URLs/access logs.
    cancel_url = f"{settings.FRONTEND_URL}/cancelar-exclusao#token={raw_token}"
    send_message(to_email, "Exclusão da conta agendada — Minhas Compras BA",
        f"A exclusão da sua conta foi solicitada. Sua conta está bloqueada para uso, mas os dados serão preservados durante 7 dias.\n"
        f"A exclusão definitiva poderá ocorrer a partir de {scheduled_at.strftime('%d/%m/%Y %H:%M')} UTC.\n"
        f"Se você não solicitou ou mudou de ideia, abra o link e confirme o cancelamento antes do prazo:\n{cancel_url}\n"
        "Cancelar não conecta automaticamente sua conta. Depois, entre novamente e altere a senha se suspeitar de acesso indevido.")
