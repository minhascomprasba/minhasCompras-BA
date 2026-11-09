"""Explicitly promote an existing, verified account using the configured database."""
from __future__ import annotations

import argparse

from sqlalchemy import func, select

from src.database.connection import SessionLocal
from src.database.models import Usuario, UserRole


def promote_admin(email: str) -> None:
    with SessionLocal() as session:
        usuario = session.execute(
            select(Usuario).where(func.lower(Usuario.email) == email.strip().lower())
        ).scalar_one_or_none()
        if usuario is None:
            raise ValueError("Usuário não encontrado. Cadastre e confirme o e-mail primeiro.")
        usuario.role = UserRole.SUPER_ADMIN.value
        session.commit()


def main() -> None:
    parser = argparse.ArgumentParser(description="Promove uma conta existente a administrador.")
    parser.add_argument("email", help="E-mail exato da conta a promover")
    args = parser.parse_args()

    try:
        promote_admin(args.email)
    except ValueError as error:
        parser.exit(1, f"{error}\n")

    print("Perfil de administrador atualizado. Entre novamente na aplicação.")


if __name__ == "__main__":
    main()
