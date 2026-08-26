from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.core.db import get_db
from app.core.deps import get_current_user
from app.models.usuario import Usuario
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

@router.get("/", response_model=List[RepresentanteResponse])
async def list_representantes(
    nombre: Optional[str] = Query(None, description="Filtrar por nombre"),
    apellido: Optional[str] = Query(None, description="Filtrar por apellido"),
    telefono: Optional[str] = Query(None, description="Filtrar por teléfono"),
    activo: Optional[bool] = Query(True, description="Filtrar por activos"),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    return await RepresentanteService.listar_representantes(
        db=db, nombre=nombre, apellido=apellido, telefono=telefono, activo=activo, skip=skip, limit=limit
    )

@router.get("/{representante_id}", response_model=RepresentanteDetailResponse)
async def get_representante(
    representante_id: int,
    db: AsyncSession = Depends(get_db)
):
    representante = await RepresentanteService.obtener_representante_por_id(db, representante_id)
    if not representante:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Representante con ID {representante_id} no encontrado"
        )
    return representante

@router.post("/", response_model=RepresentanteResponse, status_code=status.HTTP_201_CREATED)
async def create_representante(
    representante_in: RepresentanteCreate,
    db: AsyncSession = Depends(get_db)
):
    return await RepresentanteService.crear_representante(db, representante_in)

@router.put("/{representante_id}", response_model=RepresentanteResponse)
async def update_representante(
    representante_id: int,
    representante_in: RepresentanteUpdate,
    db: AsyncSession = Depends(get_db)
):
    representante_actualizado = await RepresentanteService.actualizar_representante(db, representante_id, representante_in)
    if not representante_actualizado:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Representante con ID {representante_id} no encontrado"
        )
    return representante_actualizado

@router.delete("/{representante_id}", status_code=status.HTTP_200_OK)
async def delete_representante(
    representante_id: int,
    force: bool = Query(False, description="Borrado físico permanente"),
    db: AsyncSession = Depends(get_db)
):
    resultado = await RepresentanteService.eliminar_representante(db, representante_id, force)
    if not resultado:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Representante con ID {representante_id} no encontrado"
        )
    return resultado