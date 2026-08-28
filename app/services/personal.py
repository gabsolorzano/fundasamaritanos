from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from fastapi import HTTPException, status
from app.models.personal import Personal
from app.schemas.personal import PersonalCreate

async def crear_personal(db: AsyncSession, personal_in: PersonalCreate) -> Personal:
    # Consultar si ya existe un trabajador con la cedula ingresada
    stmt = select(Personal).where(Personal.cedula == personal_in.cedula)
    result = await db.execute(stmt)
    db_personal = result.scalar_one_or_none()

    if db_personal:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La cédula ya se encuentra registrada"
        )

    # Crear el nuevo registro de personal
    db_obj = Personal(
        nombre=personal_in.nombre,
        apellido=personal_in.apellido,
        cedula=personal_in.cedula,
        telefono=personal_in.telefono,
        activo=personal_in.activo,
        id_direccion=personal_in.id_direccion,
        id_cargo=personal_in.id_cargo,
        tipo_personal=personal_in.tipo_personal,
        estado=personal_in.estado
    )
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

async def obtener_todo_el_personal(
    db: AsyncSession,
    activo: bool | None = None,
    id_cargo: int | None = None,
    buscar: str | None = None
) -> list[Personal]:
    # Construye la consulta dinámicamente según los filtros recibidos
    stmt = select(Personal)

    if activo is not None:
        stmt = stmt.where(Personal.activo == activo)

    if id_cargo is not None:
        stmt = stmt.where(Personal.id_cargo == id_cargo)

    if buscar is not None:
        termino = f"%{buscar}%"
        stmt = stmt.where(
            Personal.nombre.ilike(termino) |
            Personal.apellido.ilike(termino) |
            Personal.cedula.ilike(termino)
        )

    stmt = stmt.order_by(Personal.id.asc())
    result = await db.execute(stmt)
    return result.scalars().all()
