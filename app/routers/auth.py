# app/routers/auth.py
# Rutas de autenticación.
# POST /login: Inicia sesión y devuelve un token JWT.

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload  #carga relaciones de forma eficiente
from app.core.db import get_db
from app.core.security import verify_password, create_access_token
from app.models.usuario import Usuario
from app.schemas.token import Token

router = APIRouter(tags=["auth"])

@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    #Endpoint de login.
    #Recibe usuario y contraseña en formato form-data (OAuth2PasswordRequestForm).
    #Verifica credenciales, carga las relaciones necesarias y devuelve un JWT.
    
    #Consultar el usuario cargando explícitamente las relaciones 'personal' y 'rol'
    stmt = (
        select(Usuario)
        .where(Usuario.nombre_usuario == form_data.username)
        .options(
            selectinload(Usuario.personal),  # Carga la relación con Personal
            selectinload(Usuario.rol)        # Carga la relación con Rol
        )
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    #Validar existencia y contraseña
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    #Verificar que el personal esté activo
    #user.personal es un objeto Personal cargado, no genera nueva consulta
    if not user.personal.activo or user.personal.estado != "Activo":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario inactivo o personal no activo"
        )

    #Datos para el token (sub = ID del usuario, rol = nombre del rol)
    #Convertimos id_usuario a str por estándar JWT
    token_data = {
        "sub": str(user.id_usuario),  # JWT recomienda string en 'sub'
        "rol": user.rol.nombre_rol    # user.rol ya está cargado por selectinload
    }
    access_token = create_access_token(token_data)

    #Respuesta con el token y el rol
    return Token(
        access_token=access_token,
        token_type="bearer",
        rol=user.rol.nombre_rol
    )