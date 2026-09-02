from typing import List, Optional
from fastapi import APIRouter, Depends, status, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.deps import get_current_user, require_editor_or_admin, require_admin_only

from app.core.db import get_db
from app.schemas.direccion import DireccionCreate, DireccionUpdate, DireccionResponse
from app.services import direccion as direccion_service

router = APIRouter(
    prefix="/direcciones",  
    tags=["Direcciones"],
    dependencies=[Depends(get_current_user)]
)

@router.get("/", response_model=List[DireccionResponse], status_code=status.HTTP_200_OK)
async def listar_o_buscar_direcciones(
    q: Optional[str] = Query(None, description="Búsqueda libre en calle, edificio, urbanización, ciudad, municipio o estado"),
    ciudad: Optional[str] = Query(None, description="Filtrar por ciudad"),
    municipio: Optional[str] = Query(None, description="Filtrar por municipio"),
    estado: Optional[str] = Query(None, description="Filtrar por estado"),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    order_by: str = Query("id", regex="^(id|ciudad|municipio|estado|urbanizacion)$"),
    order_dir: str = Query("asc", regex="^(asc|desc)$"),
    db: AsyncSession = Depends(get_db)
):
    # Permite listar y filtrar direcciones con paginación y ordenamiento
    return await direccion_service.get_direcciones(
        db, q=q, ciudad=ciudad, municipio=municipio, estado=estado,
        skip=skip, limit=limit, order_by=order_by, order_dir=order_dir
    )

@router.get("/{direccion_id}", response_model=DireccionResponse, status_code=status.HTTP_200_OK)
async def obtener_direccion_por_id(
    direccion_id: int,
    db: AsyncSession = Depends(get_db)
):
    # Obtiene los detalles de una dirección específica por su ID
    direccion = await direccion_service.get_direccion_by_id(db, direccion_id=direccion_id)
    if not direccion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="La dirección solicitada no existe."
        )
    return direccion

@router.post(
    "/", 
    response_model=DireccionResponse, 
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_editor_or_admin)]
)
async def registrar_direccion(
    direccion_in: DireccionCreate,
    db: AsyncSession = Depends(get_db)
):
    # Registra una nueva dirección en la base de datos (Requiere rol Editor o Administrador)
    return await direccion_service.create_direccion(db, direccion_in=direccion_in)

@router.put(
    "/{direccion_id}", 
    response_model=DireccionResponse, 
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_editor_or_admin)]
)
async def actualizar_direccion(
    direccion_id: int,
    direccion_in: DireccionUpdate,
    db: AsyncSession = Depends(get_db)
):
    # Actualiza parcialmente los datos de una dirección existente (Requiere rol Editor o Administrador)
    direccion_actualizada = await direccion_service.update_direccion(db, direccion_id=direccion_id, datos=direccion_in)
    if not direccion_actualizada:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="La dirección solicitada no existe."
        )
    return direccion_actualizada

@router.delete(
    "/{direccion_id}", 
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_admin_only)]
)
async def eliminar_direccion(
    direccion_id: int,
    db: AsyncSession = Depends(get_db)
):
    # Elimina una dirección si no está asociada a ningún otro registro del sistema (Solo Administrador)
    resultado = await direccion_service.delete_direccion(db, direccion_id=direccion_id)
    if not resultado:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="La dirección solicitada no existe."
        )
    return resultado