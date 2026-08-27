from typing import List, Optional
from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.deps import get_current_user

from app.core.db import get_db  # Asegúrate de que esta sea la función que inyecta tu sesión de base de datos
from app.schemas.direccion import DireccionCreate, DireccionResponse
from app.services import direccion as direccion_service

# Creamos el router con un prefijo común y una etiqueta para la documentación
router = APIRouter(
    prefix="/direcciones",  
    tags=["Direcciones"],
    dependencies=[Depends(get_current_user)]
)

@router.get("/", response_model=List[DireccionResponse])
async def listar_o_buscar_direcciones(
    q: Optional[str] = None,
    skip: int = 0,
    limit: int = 10,
    db: AsyncSession = Depends(get_db)
):
    
    #Permite listar todas las direcciones o filtrarlas con ?q=texto 

    direcciones = await direccion_service.get_direcciones(db, q=q, skip=skip, limit=limit)
    return direcciones

@router.post("/", response_model=DireccionResponse, status_code=status.HTTP_201_CREATED)
async def registrar_direccion(
    direccion_in: DireccionCreate,
    db: AsyncSession = Depends(get_db)
):
    
    #Recibe los datos validados y registra una nueva dirección en la base de datos.
    
    nueva_direccion = await direccion_service.create_direccion(db, direccion_in=direccion_in)
    return nueva_direccion

@router.get("/{direccion_id}", response_model=DireccionResponse)
async def obtener_direccion_por_id(
    direccion_id: int,
    db: AsyncSession = Depends(get_db)
):
    #Obtiene los detalles de una dirección específica a través de su ID.

    direccion = await direccion_service.get_direccion_by_id(db, direccion_id=direccion_id)
    if not direccion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="La dirección solicitada no existe."
        )
    return direccion