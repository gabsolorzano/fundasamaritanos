# app/routers/beneficiarias.py

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List

from app.core.db import get_db
from app.core.deps import get_current_user
from app.models.usuario import Usuario
from app.schemas.beneficiaria import BeneficiariaResponse, BeneficiariaDetailResponse
from app.services.beneficiarias import BeneficiariaService  # Importamos nuestro nuevo servicio
from app.schemas.beneficiaria import BeneficiariaResponse, BeneficiariaDetailResponse, BeneficiariaCreate
from app.schemas.beneficiaria import BeneficiariaResponse, BeneficiariaDetailResponse, BeneficiariaCreate, BeneficiariaUpdate

router = APIRouter(
    prefix="/beneficiarias",
    tags=["beneficiarias"],
    dependencies=[Depends(get_current_user)]
)

# Usamos GET para listar todas las beneficiarias, por defecto activas
@router.get("/", response_model=List[BeneficiariaResponse])
async def list_beneficiarias(
    nombre: Optional[str] = Query(None, description="Filtrar por nombre"),
    apellido: Optional[str] = Query(None, description="Filtrar por apellido"),
    codigo_expediente: Optional[str] = Query(None, description="Filtrar por código de expediente"),
    estado: Optional[str] = Query(None, description="Filtrar por estado"),
    institucion: Optional[str] = Query(None, description="Filtrar por nombre de institución"),
    grado: Optional[str] = Query(None, description="Filtrar por grado actual"),
    lugar_nacimiento: Optional[str] = Query(None, description="Filtrar por ciudad o estado de nacimiento"),
    edad_min: Optional[int] = Query(None, ge=0, description="Edad mínima"),
    edad_max: Optional[int] = Query(None, ge=0, description="Edad máxima"),
    activo: Optional[bool] = Query(True, description="Filtrar por activas (true) o inactivas/histórico (false)"), # <-- NUEVO
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    order_by: str = Query("id", regex="^(id|nombres|apellidos|edad|estado|institucion|grado|lugar_nacimiento)$"),
    order_dir: str = Query("asc", regex="^(asc|desc)$"),
    db: AsyncSession = Depends(get_db)
):
    beneficiarias = await BeneficiariaService.listar_beneficiarias(
        db=db, nombre=nombre, apellido=apellido, codigo_expediente=codigo_expediente, 
        estado=estado, institucion=institucion, grado=grado, 
        lugar_nacimiento=lugar_nacimiento, edad_min=edad_min, edad_max=edad_max, 
        activo=activo, 
        skip=skip, limit=limit, order_by=order_by, order_dir=order_dir
    )
    
    return beneficiarias

# Usamos GET para pbtener toda la info asociada a una beneficiaria
@router.get("/{beneficiaria_id}", response_model=BeneficiariaDetailResponse)
async def get_beneficiaria(
    beneficiaria_id: int,
    db: AsyncSession = Depends(get_db)
):
    # Llamamos al servicio para obtener la beneficiaria
    response_data = await BeneficiariaService.obtener_beneficiaria_por_id(db, beneficiaria_id)

    # Validamos si existe
    if not response_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Beneficiaria con ID {beneficiaria_id} no encontrada"
        )

    return response_data

# Usamos POST para crear recursos. 
@router.post("/", response_model=BeneficiariaResponse, status_code=status.HTTP_201_CREATED)
async def create_beneficiaria(
    beneficiaria_in: BeneficiariaCreate, # FastAPI validará que lleguen todos los datos requeridos
    db: AsyncSession = Depends(get_db)
):
    # Recibimos los datos y se los delegamos a nuestro servicio
    nueva_beneficiaria = await BeneficiariaService.crear_beneficiaria(db, beneficiaria_in)
    
    return nueva_beneficiaria

# Usamos PUT para actualizar un recurso existente.
# Necesitamos pedir el ID en la URL (/{beneficiaria_id}) para saber a quién actualizar.
@router.put("/{beneficiaria_id}", response_model=BeneficiariaResponse)
async def update_beneficiaria(
    beneficiaria_id: int,
    beneficiaria_in: BeneficiariaUpdate,
    db: AsyncSession = Depends(get_db)
):
    # Intentamos actualizar llamando a nuestro servicio
    beneficiaria_actualizada = await BeneficiariaService.actualizar_beneficiaria(
        db, 
        beneficiaria_id, 
        beneficiaria_in
    )
    
    # Si el servicio nos devuelve None, significa que no encontró ese ID
    if not beneficiaria_actualizada:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Beneficiaria con ID {beneficiaria_id} no encontrada"
        )
        
    return beneficiaria_actualizada

# Usamos DELETE para la acción de eliminar.
@router.delete("/{beneficiaria_id}", status_code=status.HTTP_200_OK)
async def delete_beneficiaria(
    beneficiaria_id: int,
    force: bool = Query(False, description="Si es True, elimina permanentemente el registro (borrado físico)"),
    db: AsyncSession = Depends(get_db)
):
    resultado = await BeneficiariaService.eliminar_beneficiaria(db, beneficiaria_id, force)
    
    if not resultado:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Beneficiaria con ID {beneficiaria_id} no encontrada"
        )
        
    return resultado