# app/routers/institucion.py
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.deps import get_current_user

from app.core.db import get_db
from app.schemas.institucion import (
    InstitucionCreate,
    InstitucionUpdate,
    InstitucionResponse,
    InstitucionDetailResponse
)
from app.services.institucion import (
    get_instituciones,
    get_institucion_by_id,
    create_institucion,
    update_institucion,
    delete_institucion
)

router = APIRouter(
    prefix="/instituciones",  
    tags=["Instituciones"],
    dependencies=[Depends(get_current_user)]
)

@router.get("/", response_model=List[InstitucionResponse], status_code=status.HTTP_200_OK)
async def listar_instituciones(
    q: Optional[str] = Query(None, description="Filtrar por nombre de la institución"),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    order_by: str = Query("id", regex="^(id|nombre|telefono)$"),
    order_dir: str = Query("asc", regex="^(asc|desc)$"),
    db: AsyncSession = Depends(get_db)
):
    # Lista todas las instituciones con filtros y ordenamiento determinista
    return await get_instituciones(db, q=q, skip=skip, limit=limit, order_by=order_by, order_dir=order_dir)

@router.get("/{institucion_id}", response_model=InstitucionDetailResponse, status_code=status.HTTP_200_OK)
async def obtener_institucion(
    institucion_id: int,
    db: AsyncSession = Depends(get_db)
):
    # Obtiene el detalle de una institución incluyendo su dirección completa
    institucion = await get_institucion_by_id(db, institucion_id=institucion_id)
    if not institucion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Institución con ID {institucion_id} no encontrada"
        )
    return institucion

@router.post("/", response_model=InstitucionResponse, status_code=status.HTTP_201_CREATED)
async def registrar_institucion(
    institucion_in: InstitucionCreate,
    db: AsyncSession = Depends(get_db)
):
    # Registra una nueva institución
    return await create_institucion(db, institucion_in=institucion_in)

@router.patch("/{institucion_id}", response_model=InstitucionResponse, status_code=status.HTTP_200_OK)
async def actualizar_institucion(
    institucion_id: int,
    datos: InstitucionUpdate,
    db: AsyncSession = Depends(get_db)
):
    # Actualiza parcialmente los campos de una institución existente
    institucion_actualizada = await update_institucion(db, institucion_id=institucion_id, datos=datos)
    if not institucion_actualizada:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Institución con ID {institucion_id} no encontrada"
        )
    return institucion_actualizada

@router.delete("/{institucion_id}", status_code=status.HTTP_200_OK)
async def eliminar_institucion(
    institucion_id: int,
    db: AsyncSession = Depends(get_db)
):
    # Elimina una institución si no tiene beneficiarias asignadas
    resultado = await delete_institucion(db, institucion_id=institucion_id)
    if not resultado:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Institución con ID {institucion_id} no encontrada"
        )
    return resultado