from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.deps import get_current_user

from app.core.db import get_db
from app.schemas.institucion import InstitucionCreate, InstitucionResponse
from app.services.institucion import get_instituciones, get_institucion_by_id, create_institucion

router = APIRouter(
    prefix="/instituciones",  # Cambia a "/instituciones" en el otro archivo
    tags=["Instituciones"],
    dependencies=[Depends(get_current_user)]
)

@router.get("/", response_model=List[InstitucionResponse])
async def listar_instituciones(
    q: Optional[str] = None,
    skip: int = 0,
    limit: int = 10,
    db: AsyncSession = Depends(get_db)
):
    return await get_instituciones(db, q=q, skip=skip, limit=limit)

@router.get("/{institucion_id}", response_model=InstitucionResponse)
async def obtener_institucion(
    institucion_id: int,
    db: AsyncSession = Depends(get_db)
):
    institucion = await get_institucion_by_id(db, institucion_id=institucion_id)
    if not institucion:
        raise HTTPException(status_code=404, detail="Institución no encontrada")
    return institucion

@router.post("/", response_model=InstitucionResponse, status_code=status.HTTP_201_CREATED)
async def registrar_institucion(
    institucion_in: InstitucionCreate,
    db: AsyncSession = Depends(get_db)
):
    return await create_institucion(db, institucion_in=institucion_in)