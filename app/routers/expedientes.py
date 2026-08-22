# app/routers/expedientes.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.core.db import get_db
from app.core.deps import get_current_user
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

@router.get("/", response_model=List[ExpedienteResponse])
async def list_expedientes(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    activo: Optional[bool] = Query(None, description="Filtrar por activos (true) o inactivos/historial (false)"),
    db: AsyncSession = Depends(get_db)
):
    #Lista todos los expedientes, con opción opcional de filtrar por estado activo.
    return await ExpedienteService.listar_expedientes(db, skip=skip, limit=limit, activo=activo)

@router.get("/{expediente_id}", response_model=ExpedienteDetailResponse)
async def get_expediente(
    expediente_id: int,
    db: AsyncSession = Depends(get_db)
):
    #Obtiene el detalle completo de un expediente, incluyendo su dirección y las beneficiarias asociadas.
    expediente = await ExpedienteService.obtener_expediente_por_id(db, expediente_id)
    if not expediente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Expediente con ID {expediente_id} no encontrado"
        )
    return expediente

@router.post("/", response_model=ExpedienteResponse, status_code=status.HTTP_201_CREATED)
async def create_expediente(
    expediente_in: ExpedienteCreate,
    db: AsyncSession = Depends(get_db)
):
    #Crea una nueva carpeta familiar (expediente).
    return await ExpedienteService.crear_expediente(db, expediente_in)

@router.put("/{expediente_id}", response_model=ExpedienteResponse)
async def update_expediente(
    expediente_id: int,
    expediente_in: ExpedienteUpdate,
    db: AsyncSession = Depends(get_db)
):
    #Actualiza la información o las observaciones de un expediente.
    expediente_actualizado = await ExpedienteService.actualizar_expediente(db, expediente_id, expediente_in)
    if not expediente_actualizado:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Expediente con ID {expediente_id} no encontrado"
        )
    return expediente_actualizado

@router.delete("/{expediente_id}", response_model=ExpedienteResponse)
async def delete_expediente(
    expediente_id: int,
    db: AsyncSession = Depends(get_db)
):
    #Desactiva lógicamente un expediente si no tiene beneficiarias activas.
    try:
        expediente_desactivado = await ExpedienteService.desactivar_expediente(db, expediente_id)
        if not expediente_desactivado:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Expediente con ID {expediente_id} no encontrado"
            )
        return expediente_desactivado
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )