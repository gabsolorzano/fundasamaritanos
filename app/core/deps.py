# app/core/deps.py
from typing import List, Callable
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError  
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.core.db import get_db
from app.core.config import settings
from app.models.usuario import Usuario
from app.models.personal import Personal  

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> Usuario:
    # Valida el token JWT y devuelve el usuario autenticado cargando su personal y rol
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudo validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(
            token, 
            settings.SECRET_KEY, 
            algorithms=[settings.ALGORITHM]
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        try:
            user_id_int = int(user_id)
        except ValueError:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    stmt = (
        select(Usuario)
        .where(Usuario.id == user_id_int)
        .options(
            selectinload(Usuario.personal).selectinload(Personal.cargo),
            selectinload(Usuario.rol)
        )
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if user is None:
        raise credentials_exception

    # Verificar que el personal esté activo
    if not user.personal or not user.personal.activo or user.personal.estado.strip().lower() != "activo":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario inactivo o personal no activo"
        )

    return user


def require_roles(roles_permitidos: List[str]) -> Callable:
    """
    Fábrica de dependencias para autorización RBAC.
    Verifica que el rol del usuario autenticado se encuentre dentro de los roles_permitidos.
    Si no cumple, arroja un HTTP 403 Forbidden.
    """
    async def role_checker(current_user: Usuario = Depends(get_current_user)) -> Usuario:
        nombre_rol_usuario = current_user.rol.nombre_rol if current_user.rol else None
        
        if nombre_rol_usuario not in roles_permitidos:
            roles_str = ", ".join(roles_permitidos)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acceso denegado. Se requiere uno de los siguientes roles: [{roles_str}]. Tu rol actual es: '{nombre_rol_usuario}'."
            )
        return current_user

    return role_checker


# Dependencias preconfiguradas para uso directo en endpoints
require_admin_only = require_roles(["Administrador"])
require_editor_or_admin = require_roles(["Administrador", "Editor"])