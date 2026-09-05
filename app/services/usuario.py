from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from fastapi import HTTPException, status
from app.models.personal import Personal
from app.models.usuario import Usuario
from app.schemas.usuario import UsuarioCreate, UsuarioUpdate
from app.core.security import get_password_hash

async def crear_usuario_para_personal(
    db: AsyncSession,
    personal_id: int,
    datos: UsuarioCreate
) -> Usuario:
    # 1. Verificar que el registro de Personal con personal_id exista
    stmt_personal = select(Personal).where(Personal.id == personal_id)
    result_personal = await db.execute(stmt_personal)
    personal = result_personal.scalar_one_or_none()

    if not personal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Personal no encontrado"
        )

    # 2. REGLA DE NEGOCIO: Solo personal con estado 'Activo' puede tener usuario
    if personal.estado.strip().lower() != "activo":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se puede crear un usuario para personal con estado '{personal.estado}'. "
                   f"Solo el personal con estado 'Activo' puede tener credenciales de acceso."
        )

    # 3. Comprobar si el trabajador ya tiene un Usuario asignado (relación 1 a 1)
    stmt_usuario_existente = select(Usuario).where(Usuario.personal_id == personal_id)
    result_usuario_existente = await db.execute(stmt_usuario_existente)
    usuario_existente = result_usuario_existente.scalar_one_or_none()

    if usuario_existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El trabajador ya cuenta con un usuario registrado"
        )

    # 3. Comprobar que el nombre_usuario enviado no esté en uso por otro usuario
    stmt_nombre_existente = select(Usuario).where(Usuario.nombre_usuario == datos.nombre_usuario)
    result_nombre_existente = await db.execute(stmt_nombre_existente)
    nombre_existente = result_nombre_existente.scalar_one_or_none()

    if nombre_existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El nombre de usuario ya está registrado"
        )

    # Cifrar contraseña
    hashed_password = get_password_hash(datos.password)

    # Crear objeto de usuario
    db_obj = Usuario(
        personal_id=personal_id,
        id_rol=datos.id_rol,
        nombre_usuario=datos.nombre_usuario,
        password_hash=hashed_password
    )
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

async def actualizar_usuario_de_personal(
    db: AsyncSession,
    personal_id: int,
    datos: UsuarioUpdate
) -> Usuario:
    # 1. Verificar que el registro de Personal con personal_id exista
    stmt_personal = select(Personal).where(Personal.id == personal_id)
    result_personal = await db.execute(stmt_personal)
    personal = result_personal.scalar_one_or_none()

    if not personal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Personal no encontrado"
        )

    # 2. Verificar que ese trabajador tenga un Usuario asociado
    stmt_usuario = select(Usuario).where(Usuario.personal_id == personal_id)
    result_usuario = await db.execute(stmt_usuario)
    db_obj = result_usuario.scalar_one_or_none()

    if not db_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El trabajador no tiene un usuario registrado"
        )

    # 3. Si se recibe un nuevo nombre_usuario y es diferente al actual, verificar que no esté en uso
    datos_actualizados = datos.model_dump(exclude_unset=True)
    if "nombre_usuario" in datos_actualizados and datos_actualizados["nombre_usuario"] != db_obj.nombre_usuario:
        stmt_nombre = select(Usuario).where(Usuario.nombre_usuario == datos_actualizados["nombre_usuario"])
        result_nombre = await db.execute(stmt_nombre)
        if result_nombre.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El nombre de usuario ya está en uso"
            )

    # Cifrar contraseña si viene en la petición
    if "password" in datos_actualizados:
        password_plana = datos_actualizados.pop("password")
        db_obj.password_hash = get_password_hash(password_plana)

    # Actualizar los demás campos
    for campo, valor in datos_actualizados.items():
        setattr(db_obj, campo, valor)

    await db.commit()
    await db.refresh(db_obj)
    return db_obj
