from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from app.core.db import get_db
from app.core.deps import get_current_user
from app.schemas.personal import PersonalCreate, PersonalResponse, PersonalDetailResponse, PersonalUpdate
from app.schemas.usuario import UsuarioCreate, UsuarioResponse, UsuarioUpdate
from app.services import personal as personal_service
from app.services import usuario as usuario_service

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

@router.get("/{personal_id}", response_model=PersonalDetailResponse, status_code=200)
async def obtener_personal(
    personal_id: int,
    db: AsyncSession = Depends(get_db)
):
    # Retorna el detalle completo de un trabajador con sus relaciones
    return await personal_service.obtener_personal_por_id(db, personal_id=personal_id)

@router.put("/{personal_id}", response_model=PersonalResponse, status_code=200)
async def actualizar_personal(
    personal_id: int,
    personal_in: PersonalUpdate,
    db: AsyncSession = Depends(get_db)
):
    # Actualizar un personal existente en la base de datos
    return await personal_service.actualizar_personal(db, personal_id=personal_id, datos=personal_in)

@router.post("/{personal_id}/usuario", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED)
async def registrar_usuario_personal(
    personal_id: int,
    usuario_in: UsuarioCreate,
    db: AsyncSession = Depends(get_db)
):
    # Asignar credenciales de acceso (Usuario) a un personal existente
    return await usuario_service.crear_usuario_para_personal(db, personal_id=personal_id, datos=usuario_in)

@router.put("/{personal_id}/usuario", response_model=UsuarioResponse, status_code=200)
async def actualizar_usuario_personal(
    personal_id: int,
    usuario_in: UsuarioUpdate,
    db: AsyncSession = Depends(get_db)
):
    # Actualizar credenciales de acceso (Usuario) de un personal existente
    return await usuario_service.actualizar_usuario_de_personal(db, personal_id=personal_id, datos=usuario_in)

@router.post("/", response_model=PersonalResponse, status_code=status.HTTP_201_CREATED)
async def registrar_personal(
    personal_in: PersonalCreate,
    db: AsyncSession = Depends(get_db)
):
    # Registrar un nuevo personal en la base de datos
    nuevo_personal = await personal_service.crear_personal(db, personal_in=personal_in)
    return nuevo_personal

@router.delete("/{personal_id}", status_code=200)
async def desactivar_personal(
    personal_id: int,
    permanente: bool = Query(False, description="Si es True, realiza un borrado físico definitivo del personal y su usuario asociado. Por defecto es un borrado lógico (desactivación)."),
    db: AsyncSession = Depends(get_db)
):
    # Desactivar (borrado lógico) o eliminar definitivamente a un trabajador
    await personal_service.desactivar_personal(db, personal_id=personal_id, permanente=permanente)
    tipo_borrado = "eliminado definitivamente" if permanente else "desactivado correctamente"
    return {"mensaje": f"El trabajador con ID {personal_id} ha sido {tipo_borrado}"}



