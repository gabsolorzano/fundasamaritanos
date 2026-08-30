# app/services/institucion.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, asc, desc
from sqlalchemy.orm import selectinload
from typing import Optional
from fastapi import HTTPException, status

from app.models.institucion import Institucion
from app.models.direccion import Direccion
from app.models.beneficiaria import Beneficiaria
from app.schemas.institucion import InstitucionCreate, InstitucionUpdate


async def get_instituciones(
    db: AsyncSession,
    q: Optional[str] = None,
    skip: int = 0,
    limit: int = 10,
    order_by: str = "id",
    order_dir: str = "asc"
):
    query = select(Institucion)
    if q:
        query = query.filter(Institucion.nombre.ilike(f"%{q}%"))

    order_map = {
        "id": Institucion.id_institucion,
        "nombre": Institucion.nombre,
        "telefono": Institucion.telefono
    }
    order_col = order_map.get(order_by, Institucion.id_institucion)

    if order_dir == "desc":
        query = query.order_by(desc(order_col))
    else:
        query = query.order_by(asc(order_col))

    result = await db.execute(query.offset(skip).limit(limit))
    return result.scalars().all()


async def get_institucion_by_id(db: AsyncSession, institucion_id: int) -> Institucion | None:
    stmt = (
        select(Institucion)
        .where(Institucion.id_institucion == institucion_id)
        .options(selectinload(Institucion.direccion))
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def create_institucion(db: AsyncSession, institucion_in: InstitucionCreate) -> Institucion:
    # 1. Validar que la dirección exista
    stmt_dir = select(Direccion).where(Direccion.id_direccion == institucion_in.id_direccion)
    res_dir = await db.execute(stmt_dir)
    if not res_dir.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"La dirección con ID {institucion_in.id_direccion} no existe."
        )

    # 2. Validar nombre único
    stmt_nom = select(Institucion).where(Institucion.nombre.ilike(institucion_in.nombre))
    res_nom = await db.execute(stmt_nom)
    if res_nom.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ya se encuentra registrada una institución con el nombre '{institucion_in.nombre}'."
        )

    db_obj = Institucion(
        nombre=institucion_in.nombre,
        telefono=institucion_in.telefono,
        id_direccion=institucion_in.id_direccion
    )
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)

    # Cargar relación con dirección
    return await get_institucion_by_id(db, db_obj.id_institucion)


async def update_institucion(
    db: AsyncSession,
    institucion_id: int,
    datos: InstitucionUpdate
) -> Institucion | None:
    institucion = await get_institucion_by_id(db, institucion_id)
    if not institucion:
        return None

    update_data = datos.model_dump(exclude_unset=True)

    # Validar dirección si se actualiza
    if "id_direccion" in update_data and update_data["id_direccion"] is not None:
        stmt_dir = select(Direccion).where(Direccion.id_direccion == update_data["id_direccion"])
        res_dir = await db.execute(stmt_dir)
        if not res_dir.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"La dirección con ID {update_data['id_direccion']} no existe."
            )

    # Validar nombre único si se actualiza
    if "nombre" in update_data and update_data["nombre"]:
        nuevo_nombre = update_data["nombre"]
        if nuevo_nombre.lower() != institucion.nombre.lower():
            stmt_nom = select(Institucion).where(
                and_(
                    Institucion.nombre.ilike(nuevo_nombre),
                    Institucion.id_institucion != institucion_id
                )
            )
            res_nom = await db.execute(stmt_nom)
            if res_nom.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Ya existe otra institución con el nombre '{nuevo_nombre}'."
                )

    for campo, valor in update_data.items():
        setattr(institucion, campo, valor)

    await db.commit()
    await db.refresh(institucion)
    return await get_institucion_by_id(db, institucion_id)


async def delete_institucion(db: AsyncSession, institucion_id: int) -> dict | None:
    institucion = await get_institucion_by_id(db, institucion_id)
    if not institucion:
        return None

    # Verificar si tiene beneficiarias asociadas
    res_ben = await db.execute(select(Beneficiaria).where(Beneficiaria.id_institucion == institucion_id))
    if res_ben.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se puede eliminar la institución porque tiene una o más beneficiarias asignadas."
        )

    await db.delete(institucion)
    await db.commit()
    return {"mensaje": f"Institución con ID {institucion_id} eliminada correctamente."}