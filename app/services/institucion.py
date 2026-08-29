from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from fastapi import HTTPException, status
from app.models.institucion import Institucion
from app.schemas.institucion import InstitucionCreate, InstitucionUpdate

async def get_instituciones(db: AsyncSession, q: str | None = None, skip: int = 0, limit: int = 10):
    query = select(Institucion)
    if q:
        query = query.filter(Institucion.nombre.ilike(f"%{q}%"))
    result = await db.execute(query.offset(skip).limit(limit))
    return result.scalars().all()

async def get_institucion_by_id(db: AsyncSession, institucion_id: int) -> Institucion | None:
    result = await db.execute(select(Institucion).filter(Institucion.id_institucion == institucion_id))
    return result.scalars().first()

async def create_institucion(db: AsyncSession, institucion_in: InstitucionCreate) -> Institucion:
    db_obj = Institucion(
        nombre=institucion_in.nombre,
        telefono=institucion_in.telefono,
        id_direccion=institucion_in.id_direccion
    )
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

async def update_institucion(
    db: AsyncSession,
    institucion_id: int,
    datos: InstitucionUpdate
) -> Institucion:
    # Verificar que la institución existe
    result = await db.execute(
        select(Institucion).where(Institucion.id_institucion == institucion_id)
    )
    db_obj = result.scalar_one_or_none()

    if db_obj is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Institución no encontrada"
        )

    # Aplicar solo los campos que vienen en el body (actualización parcial)
    campos_actualizados = datos.model_dump(exclude_unset=True)
    for campo, valor in campos_actualizados.items():
        setattr(db_obj, campo, valor)

    await db.commit()
    await db.refresh(db_obj)
    return db_obj