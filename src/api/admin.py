from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from src.api.schemas import (
    AdminDashboardResponse,
    AdminUsuarioResponse,
    PaginatedAdminUsuariosResponse,
    UpdateUsuarioRoleRequest,
)
from src.api.security import require_admin, require_super_admin
from src.api.services.admin_service import (
    get_admin_dashboard,
    get_role_summary,
    list_usuarios,
    update_usuario_role,
)
from src.database.models import Usuario

admin_router = APIRouter(prefix="/admin", tags=["admin"])


@admin_router.get("/metrics", response_model=AdminDashboardResponse)
def admin_metrics(
    period: str = Query(default="30d", description="7d | 30d | mes | ano | geral"),
    _: Usuario = Depends(require_admin),
) -> AdminDashboardResponse:
    return AdminDashboardResponse(**get_admin_dashboard(period))


@admin_router.get("/usuarios", response_model=PaginatedAdminUsuariosResponse)
def admin_usuarios(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None, max_length=255),
    role: str | None = Query(default=None, max_length=20),
    _: Usuario = Depends(require_admin),
) -> PaginatedAdminUsuariosResponse:
    data = list_usuarios(page=page, page_size=page_size, search=search, role=role)
    return PaginatedAdminUsuariosResponse(**data, resumo_perfis=get_role_summary())


@admin_router.patch("/usuarios/{usuario_id}/role", response_model=AdminUsuarioResponse)
def admin_update_usuario_role(
    usuario_id: int,
    payload: UpdateUsuarioRoleRequest,
    actor: Usuario = Depends(require_super_admin),
) -> AdminUsuarioResponse:
    data = update_usuario_role(target_id=usuario_id, new_role=payload.role, actor_id=actor.id)
    return AdminUsuarioResponse(**data)
