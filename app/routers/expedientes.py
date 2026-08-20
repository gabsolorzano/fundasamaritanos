# app/routers/expedientes.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.core.db import get_db
from app.core.deps import get_current_user
from app.schemas.expediente import ExpedienteResponse, ExpedienteCreate, ExpedienteUpdate
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
    db: AsyncSession = Depends(get_db)
):
    #Lista todos los expedientes de la fundación.
    return await ExpedienteService.listar_expedientes(db, skip=skip, limit=limit)

@router.get("/{expediente_id}", response_model=ExpedienteResponse)
async def get_expediente(
    expediente_id: int,
    db: AsyncSession = Depends(get_db)
):
    #Obtiene un expediente específico por su ID.
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
    """Crea una nueva carpeta familiar (expediente)."""
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