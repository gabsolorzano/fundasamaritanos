from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from app.core.db import get_db
from app.core.deps import get_current_user
from app.schemas.personal import PersonalCreate, PersonalResponse
from app.services import personal as personal_service

router = APIRouter(
    prefix="/personal",
    tags=["Personal"],
    dependencies=[Depends(get_current_user)]
)

@router.get("/", response_model=List[PersonalResponse], status_code=200)
async def listar_personal(
    activo: Optional[bool] = Query(None, description="Filtrar por estado activo/inactivo"),
    id_cargo: Optional[int] = Query(None, description="Filtrar por ID de cargo"),
    buscar: Optional[str] = Query(None, description="Buscar por nombre, apellido o cédula"),
    db: AsyncSession = Depends(get_db)
):
    # Pasa los filtros opcionales al servicio
    return await personal_service.obtener_todo_el_personal(
        db, activo=activo, id_cargo=id_cargo, buscar=buscar
    )

@router.post("/", response_model=PersonalResponse, status_code=status.HTTP_201_CREATED)
async def registrar_personal(
    personal_in: PersonalCreate,
    db: AsyncSession = Depends(get_db)
):
    # Registrar un nuevo personal en la base de datos
    nuevo_personal = await personal_service.crear_personal(db, personal_in=personal_in)
    return nuevo_personal
