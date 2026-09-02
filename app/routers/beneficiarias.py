# app/routers/beneficiarias.py

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from datetime import date

from app.core.db import get_db
from app.core.deps import get_current_user, require_editor_or_admin, require_admin_only
from app.schemas.beneficiaria import (
    BeneficiariaResponse,
    BeneficiariaDetailResponse,
    BeneficiariaCreate,
    BeneficiariaUpdate
)
from app.services.beneficiarias import BeneficiariaService

router = APIRouter(
    prefix="/beneficiarias",
    tags=["beneficiarias"],
    dependencies=[Depends(get_current_user)]
)

@router.get("/", response_model=List[BeneficiariaResponse], status_code=status.HTTP_200_OK)
async def list_beneficiarias(
    nombre: Optional[str] = Query(None, description="Filtrar por nombre"),
    apellido: Optional[str] = Query(None, description="Filtrar por apellido"),
    codigo_expediente: Optional[str] = Query(None, description="Filtrar por código de expediente"),
    estado: Optional[str] = Query(None, description="Filtrar por estado"),
    institucion: Optional[str] = Query(None, description="Filtrar por nombre de institución"),
    grado: Optional[str] = Query(None, description="Filtrar por grado actual"),
    lugar_nacimiento: Optional[str] = Query(None, description="Filtrar por ciudad o estado de nacimiento"),
    fecha_nacimiento: Optional[date] = Query(None, description="Filtrar por fecha exacta de nacimiento (YYYY-MM-DD)"),
    edad: Optional[int] = Query(None, ge=0, description="Filtrar por edad exacta en años"),
    edad_min: Optional[int] = Query(None, ge=0, description="Edad mínima"),
    edad_max: Optional[int] = Query(None, ge=0, description="Edad máxima"),
    activo: Optional[bool] = Query(True, description="Filtrar por activas (true) o inactivas/histórico (false)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    order_by: str = Query("id", regex="^(id|nombres|apellidos|edad|estado|institucion|grado|lugar_nacimiento)$"),
    order_dir: str = Query("asc", regex="^(asc|desc)$"),
    db: AsyncSession = Depends(get_db)
):
    # Lista todas las beneficiarias con filtros dinámicos y paginación
    return await BeneficiariaService.listar_beneficiarias(
        db=db, nombre=nombre, apellido=apellido, codigo_expediente=codigo_expediente, 
        estado=estado, institucion=institucion, grado=grado, 
        lugar_nacimiento=lugar_nacimiento, fecha_nacimiento=fecha_nacimiento,
        edad=edad, edad_min=edad_min, edad_max=edad_max, 
        activo=activo, 
        skip=skip, limit=limit, order_by=order_by, order_dir=order_dir
    )


@router.get("/{beneficiaria_id}", response_model=BeneficiariaDetailResponse, status_code=status.HTTP_200_OK)
async def get_beneficiaria(
    beneficiaria_id: int,
    db: AsyncSession = Depends(get_db)
):
    # Obtiene toda la información asociada a una beneficiaria por su ID
    beneficiaria = await BeneficiariaService.obtener_beneficiaria_por_id(db, beneficiaria_id)

    if not beneficiaria:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Beneficiaria con ID {beneficiaria_id} no encontrada"
        )

    return beneficiaria

@router.post(
    "/", 
    response_model=BeneficiariaResponse, 
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_editor_or_admin)]
)
async def create_beneficiaria(
    beneficiaria_in: BeneficiariaCreate,
    db: AsyncSession = Depends(get_db)
):
    # Registra una nueva beneficiaria (Requiere rol Editor o Administrador)
    return await BeneficiariaService.crear_beneficiaria(db, beneficiaria_in)

@router.put(
    "/{beneficiaria_id}", 
    response_model=BeneficiariaResponse, 
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_editor_or_admin)]
)
async def update_beneficiaria(
    beneficiaria_id: int,
    beneficiaria_in: BeneficiariaUpdate,
    db: AsyncSession = Depends(get_db)
):
    # Actualiza los datos de una beneficiaria existente (Requiere rol Editor o Administrador)
    beneficiaria_actualizada = await BeneficiariaService.actualizar_beneficiaria(
        db, 
        beneficiaria_id, 
        beneficiaria_in
    )
    
    if not beneficiaria_actualizada:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Beneficiaria con ID {beneficiaria_id} no encontrada"
        )
        
    return beneficiaria_actualizada

@router.delete(
    "/{beneficiaria_id}", 
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_admin_only)]
)
async def delete_beneficiaria(
    beneficiaria_id: int,
    force: bool = Query(False, description="Si es True, elimina permanentemente el registro (borrado físico)"),
    db: AsyncSession = Depends(get_db)
):
    # Desactiva (borrado lógico) o elimina permanentemente a una beneficiaria (Solo Administrador)
    resultado = await BeneficiariaService.eliminar_beneficiaria(db, beneficiaria_id, force)
    
    if not resultado:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Beneficiaria con ID {beneficiaria_id} no encontrada"
        )
        
    return resultado