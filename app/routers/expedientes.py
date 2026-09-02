# app/routers/expedientes.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from datetime import date

from app.core.db import get_db
from app.core.deps import get_current_user, require_editor_or_admin, require_admin_only
from app.schemas.expediente import (
    ExpedienteResponse, 
    ExpedienteDetailResponse, 
    ExpedienteCreate, 
    ExpedienteUpdate
)
from app.services.expediente import ExpedienteService

router = APIRouter(
    prefix="/expedientes",
    tags=["expedientes"],
    dependencies=[Depends(get_current_user)]
)

@router.get("/", response_model=List[ExpedienteResponse], status_code=status.HTTP_200_OK)
async def list_expedientes(
    codigo: Optional[str] = Query(None, description="Filtrar por código de expediente (ej: EXP-2026)"),
    fecha_apertura: Optional[date] = Query(None, description="Filtrar por fecha exacta de apertura (YYYY-MM-DD)"),
    fecha_min: Optional[date] = Query(None, description="Fecha mínima de apertura"),
    fecha_max: Optional[date] = Query(None, description="Fecha máxima de apertura"),
    activo: Optional[bool] = Query(None, description="Filtrar por activos (true) o inactivos/historial (false)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    order_by: str = Query("id", regex="^(id|codigo|fecha_apertura)$"),
    order_dir: str = Query("asc", regex="^(asc|desc)$"),
    db: AsyncSession = Depends(get_db)
):
    # Lista todos los expedientes con filtros dinámicos y paginación
    return await ExpedienteService.listar_expedientes(
        db, codigo=codigo, fecha_apertura=fecha_apertura, fecha_min=fecha_min,
        fecha_max=fecha_max, activo=activo, skip=skip, limit=limit,
        order_by=order_by, order_dir=order_dir
    )

@router.get("/{expediente_id}", response_model=ExpedienteDetailResponse, status_code=status.HTTP_200_OK)
async def get_expediente(
    expediente_id: int,
    db: AsyncSession = Depends(get_db)
):
    # Obtiene el detalle completo de un expediente con su dirección y beneficiarias asociadas
    expediente = await ExpedienteService.obtener_expediente_por_id(db, expediente_id)
    if not expediente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Expediente con ID {expediente_id} no encontrado"
        )
    return expediente

@router.post(
    "/", 
    response_model=ExpedienteResponse, 
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_editor_or_admin)]
)
async def create_expediente(
    expediente_in: ExpedienteCreate,
    db: AsyncSession = Depends(get_db)
):
    # Crea un nuevo expediente familiar (Requiere rol Editor o Administrador)
    return await ExpedienteService.crear_expediente(db, expediente_in)

@router.put(
    "/{expediente_id}", 
    response_model=ExpedienteResponse, 
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_editor_or_admin)]
)
async def update_expediente(
    expediente_id: int,
    expediente_in: ExpedienteUpdate,
    db: AsyncSession = Depends(get_db)
):
    # Actualiza un expediente existente (Requiere rol Editor o Administrador)
    expediente_actualizado = await ExpedienteService.actualizar_expediente(db, expediente_id, expediente_in)
    if not expediente_actualizado:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Expediente con ID {expediente_id} no encontrado"
        )
    return expediente_actualizado

@router.delete(
    "/{expediente_id}", 
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_admin_only)]
)
async def delete_expediente(
    expediente_id: int,
    force: bool = Query(False, description="Si es True, elimina permanentemente el expediente (borrado físico)."),
    db: AsyncSession = Depends(get_db)
):
    # Desactiva (borrado lógico) o elimina permanentemente un expediente (Solo Administrador)
    resultado = await ExpedienteService.eliminar_expediente(db, expediente_id, force=force)
    if not resultado:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Expediente con ID {expediente_id} no encontrado"
        )
    return resultado