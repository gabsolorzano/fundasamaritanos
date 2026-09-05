# app/routers/roles.py
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel
from typing import Optional

from app.core.db import get_db
from app.core.deps import get_current_user
from app.models.rol import Rol


# ── Schema de respuesta (mínimo, sin modificación) ───────────────────────────

class RolResponse(BaseModel):
    id_rol: int
    nombre_rol: str
    descripcion: Optional[str] = None

    class Config:
        from_attributes = True


# ── Router ────────────────────────────────────────────────────────────────────

router = APIRouter(
    prefix="/roles",
    tags=["Roles"],
    dependencies=[Depends(get_current_user)]
)


@router.get("/", response_model=List[RolResponse], status_code=status.HTTP_200_OK)
async def listar_roles(db: AsyncSession = Depends(get_db)):
    """Lista todos los roles del sistema. Los roles son fijos y no se pueden modificar."""
    result = await db.execute(select(Rol).order_by(Rol.id_rol.asc()))
    return result.scalars().all()


@router.get("/{rol_id}", response_model=RolResponse, status_code=status.HTTP_200_OK)
async def obtener_rol(rol_id: int, db: AsyncSession = Depends(get_db)):
    """Obtiene el detalle de un rol específico."""
    result = await db.execute(select(Rol).where(Rol.id_rol == rol_id))
    rol = result.scalar_one_or_none()
    if not rol:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Rol con ID {rol_id} no encontrado."
        )
    return rol


@router.delete("/{rol_id}", status_code=status.HTTP_403_FORBIDDEN)
async def eliminar_rol(rol_id: int):
    """
    Operación no permitida. Los roles del sistema son fijos ('Administrador', 'Editor', 'Lector')
    y no pueden ser eliminados para preservar la integridad del control de acceso.
    """
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=(
            "La eliminación de roles del sistema está prohibida. "
            "Los roles 'Administrador', 'Editor' y 'Lector' son fijos y no pueden ser borrados."
        )
    )


@router.post("/", status_code=status.HTTP_403_FORBIDDEN)
async def crear_rol():
    """Operación no permitida. Los roles del sistema son catálogos fijos y no admiten altas."""
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="No se pueden crear nuevos roles. El catálogo de roles es fijo del sistema."
    )


@router.put("/{rol_id}", status_code=status.HTTP_403_FORBIDDEN)
@router.patch("/{rol_id}", status_code=status.HTTP_403_FORBIDDEN)
async def modificar_rol(rol_id: int):
    """Operación no permitida. Los roles del sistema son inmutables."""
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="No se pueden modificar los roles del sistema."
    )
