from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
from app.models.personal import Personal
from app.models.usuario import Usuario
from app.schemas.personal import PersonalCreate, PersonalUpdate

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

async def obtener_personal_por_id(db: AsyncSession, personal_id: int) -> Personal:
    # Carga el registro con sus relaciones en una sola consulta
    stmt = (
        select(Personal)
        .where(Personal.id == personal_id)
        .options(
            selectinload(Personal.cargo),
            selectinload(Personal.direccion),
            selectinload(Personal.usuario),
        )
    )
    result = await db.execute(stmt)
    personal = result.scalar_one_or_none()

    if personal is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Personal no encontrado"
        )

    return personal

async def actualizar_personal(
    db: AsyncSession,
    personal_id: int,
    datos: PersonalUpdate
) -> Personal:
    # 1. Buscar el registro por personal_id
    stmt = (
        select(Personal)
        .where(Personal.id == personal_id)
        .options(
            selectinload(Personal.cargo),
            selectinload(Personal.direccion),
            selectinload(Personal.usuario)
        )
    )
    result = await db.execute(stmt)
    db_obj = result.scalar_one_or_none()

    if db_obj is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Personal no encontrado"
        )

    # 2. Si viene la cédula y es diferente a la actual, verificar duplicados
    datos_actualizados = datos.model_dump(exclude_unset=True)
    if "cedula" in datos_actualizados and datos_actualizados["cedula"] != db_obj.cedula:
        stmt_cedula = select(Personal).where(Personal.cedula == datos_actualizados["cedula"])
        result_cedula = await db.execute(stmt_cedula)
        if result_cedula.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La cédula ya pertenece a otro trabajador"
            )

    # 3. Actualizar únicamente los campos que hayan sido enviados
    for campo, valor in datos_actualizados.items():
        setattr(db_obj, campo, valor)

    await db.commit()
    await db.refresh(db_obj)
    return db_obj

async def desactivar_personal(
    db: AsyncSession,
    personal_id: int,
    permanente: bool = False
) -> Personal | None:
    # 1. Buscar el registro por personal_id
    stmt = select(Personal).where(Personal.id == personal_id)
    result = await db.execute(stmt)
    db_obj = result.scalar_one_or_none()

    if db_obj is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Personal no encontrado"
        )

    if permanente:
        # Borrado definitivo
        # Primero borrar usuario asociado si existe
        stmt_usuario = select(Usuario).where(Usuario.personal_id == personal_id)
        result_usuario = await db.execute(stmt_usuario)
        usuario = result_usuario.scalar_one_or_none()
        if usuario:
            await db.delete(usuario)
        
        await db.delete(db_obj)
        await db.commit()
        return None
    else:
        # Borrado lógico
        db_obj.activo = False
        await db.commit()
        await db.refresh(db_obj)
        return db_obj


