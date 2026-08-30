# app/services/direccion.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, asc, desc
from typing import Optional
from fastapi import HTTPException, status

from app.models.direccion import Direccion
from app.models.personal import Personal
from app.models.expediente import Expediente
from app.models.beneficiaria import Beneficiaria
from app.models.representante import Representante
from app.models.institucion import Institucion
from app.schemas.direccion import DireccionCreate, DireccionUpdate


async def get_direcciones(
    db: AsyncSession,
    q: Optional[str] = None,
    ciudad: Optional[str] = None,
    municipio: Optional[str] = None,
    estado: Optional[str] = None,
    skip: int = 0,
    limit: int = 10,
    order_by: str = "id",
    order_dir: str = "asc"
):
    # Lista y busca direcciones con filtros dinámicos y paginación ordenada
    query = select(Direccion)
    conditions = []

    if q:
        termino = f"%{q}%"
        conditions.append(
            or_(
                Direccion.urbanizacion.ilike(termino),
                Direccion.municipio.ilike(termino),
                Direccion.ciudad.ilike(termino),
                Direccion.estado.ilike(termino),
                Direccion.edificio_casa.ilike(termino),
                Direccion.calle_av.ilike(termino)
            )
        )
    if ciudad:
        conditions.append(Direccion.ciudad.ilike(f"%{ciudad}%"))
    if municipio:
        conditions.append(Direccion.municipio.ilike(f"%{municipio}%"))
    if estado:
        conditions.append(Direccion.estado.ilike(f"%{estado}%"))

    if conditions:
        query = query.where(and_(*conditions))

    order_map = {
        "id": Direccion.id_direccion,
        "ciudad": Direccion.ciudad,
        "municipio": Direccion.municipio,
        "estado": Direccion.estado,
        "urbanizacion": Direccion.urbanizacion
    }
    order_col = order_map.get(order_by, Direccion.id_direccion)

    if order_dir == "desc":
        query = query.order_by(desc(order_col))
    else:
        query = query.order_by(asc(order_col))

    result = await db.execute(query.offset(skip).limit(limit))
    return result.scalars().all()


async def get_direccion_by_id(db: AsyncSession, direccion_id: int) -> Direccion | None:
    result = await db.execute(select(Direccion).filter(Direccion.id_direccion == direccion_id))
    return result.scalars().first()


async def create_direccion(db: AsyncSession, direccion_in: DireccionCreate) -> Direccion:
    db_obj = Direccion(
        calle_av=direccion_in.calle_av,
        edificio_casa=direccion_in.edificio_casa,
        urbanizacion=direccion_in.urbanizacion,
        ciudad=direccion_in.ciudad,
        municipio=direccion_in.municipio,
        estado=direccion_in.estado
    )
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj


async def update_direccion(
    db: AsyncSession,
    direccion_id: int,
    datos: DireccionUpdate
) -> Direccion | None:
    direccion = await get_direccion_by_id(db, direccion_id)
    if not direccion:
        return None

    update_data = datos.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(direccion, key, value)

    await db.commit()
    await db.refresh(direccion)
    return direccion


async def delete_direccion(db: AsyncSession, direccion_id: int) -> dict | None:
    direccion = await get_direccion_by_id(db, direccion_id)
    if not direccion:
        return None

    # Verificar si la dirección está siendo utilizada en alguna otra tabla
    res_per = await db.execute(select(Personal).where(Personal.id_direccion == direccion_id))
    if res_per.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se puede eliminar la dirección porque está asociada a uno o más miembros del personal."
        )

    res_exp = await db.execute(select(Expediente).where(Expediente.id_direccion == direccion_id))
    if res_exp.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se puede eliminar la dirección porque está asociada a uno o más expedientes familiares."
        )

    res_ben = await db.execute(select(Beneficiaria).where(Beneficiaria.id_direccion_lugar_nacimiento == direccion_id))
    if res_ben.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se puede eliminar la dirección porque está registrada como lugar de nacimiento de una o más beneficiarias."
        )

    res_rep = await db.execute(select(Representante).where(Representante.id_direccion == direccion_id))
    if res_rep.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se puede eliminar la dirección porque está asociada a uno o más representantes."
        )

    res_inst = await db.execute(select(Institucion).where(Institucion.id_direccion == direccion_id))
    if res_inst.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se puede eliminar la dirección porque está asociada a una o más instituciones."
        )

    await db.delete(direccion)
    await db.commit()
    return {"mensaje": f"Dirección con ID {direccion_id} eliminada correctamente."}