# app/routers/representantes.py
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.core.db import get_db
from app.core.deps import get_current_user, require_editor_or_admin, require_admin_only
from app.schemas.representante import (
    RepresentanteResponse,
    RepresentanteDetailResponse,
    RepresentanteCreate,
    RepresentanteUpdate
)
from app.services.representantes import RepresentanteService

router = APIRouter(
    prefix="/representantes",
    tags=["representantes"],
    dependencies=[Depends(get_current_user)]
)

@router.get("/", response_model=List[RepresentanteResponse], status_code=status.HTTP_200_OK)
async def list_representantes(
    nombre: Optional[str] = Query(None, description="Filtrar por nombre"),
    apellido: Optional[str] = Query(None, description="Filtrar por apellido"),
    telefono: Optional[str] = Query(None, description="Filtrar por teléfono"),
    ocupacion: Optional[str] = Query(None, description="Filtrar por ocupación laboral"),
    activo: Optional[bool] = Query(True, description="Filtrar por activos (true) o inactivos (false)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    order_by: str = Query("id", regex="^(id|nombres|apellidos|telefono|ocupacion)$"),
    order_dir: str = Query("asc", regex="^(asc|desc)$"),
    db: AsyncSession = Depends(get_db)
):
    # Lista todos los representantes con filtros dinámicos y paginación
    return await RepresentanteService.listar_representantes(
        db=db, nombre=nombre, apellido=apellido, telefono=telefono,
        ocupacion=ocupacion, activo=activo, skip=skip, limit=limit,
        order_by=order_by, order_dir=order_dir
    )

@router.get("/{representante_id}", response_model=RepresentanteDetailResponse, status_code=status.HTTP_200_OK)
async def get_representante(
    representante_id: int,
    db: AsyncSession = Depends(get_db)
):
    # Obtiene el detalle completo de un representante con sus beneficiarias asociadas
    representante = await RepresentanteService.obtener_representante_por_id(db, representante_id)
    if not representante:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Representante con ID {representante_id} no encontrado"
        )
    return representante

@router.post(
    "/", 
    response_model=RepresentanteResponse, 
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_editor_or_admin)]
)
async def create_representante(
    representante_in: RepresentanteCreate,
    db: AsyncSession = Depends(get_db)
):
    # Registra un nuevo representante (Requiere rol Editor o Administrador)
    return await RepresentanteService.crear_representante(db, representante_in)

@router.put(
    "/{representante_id}", 
    response_model=RepresentanteResponse, 
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_editor_or_admin)]
)
async def update_representante(
    representante_id: int,
    representante_in: RepresentanteUpdate,
    db: AsyncSession = Depends(get_db)
):
    # Actualiza los datos de un representante existente (Requiere rol Editor o Administrador)
    representante_actualizado = await RepresentanteService.actualizar_representante(db, representante_id, representante_in)
    if not representante_actualizado:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Representante con ID {representante_id} no encontrado"
        )
    return representante_actualizado

@router.delete(
    "/{representante_id}", 
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_admin_only)]
)
async def delete_representante(
    representante_id: int,
    force: bool = Query(False, description="Si es True, elimina permanentemente al representante (borrado físico)."),
    db: AsyncSession = Depends(get_db)
):
    # Desactiva (borrado lógico) o elimina permanentemente a un representante (Solo Administrador)
    resultado = await RepresentanteService.eliminar_representante(db, representante_id, force=force)
    if not resultado:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Representante con ID {representante_id} no encontrado"
        )
    return resultado