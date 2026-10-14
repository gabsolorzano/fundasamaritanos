from pydantic import BaseModel, model_validator
from typing import Optional
from datetime import datetime

# ── Esquemas auxiliares para relaciones anidadas ──────────────────────────────

class CargoInfo(BaseModel):
    id_cargo: int
    descripcion: str

    class Config:
        from_attributes = True

class DireccionInfo(BaseModel):
    id_direccion: int
    calle_av: str
    edificio_casa: Optional[str] = None
    urbanizacion: str
    ciudad: str
    municipio: str
    estado: str

    class Config:
        from_attributes = True

class UsuarioInfo(BaseModel):
    id: int
    nombre_usuario: str
    id_rol: int
    rol_nombre: Optional[str] = None
    ultimo_acceso: Optional[datetime] = None

    @model_validator(mode="before")
    @classmethod
    def populate_rol_nombre(cls, data):
        if hasattr(data, "rol") and data.rol is not None:
            return {
                "id": data.id,
                "nombre_usuario": data.nombre_usuario,
                "id_rol": data.id_rol,
                "rol_nombre": getattr(data.rol, "nombre_rol", None),
                "ultimo_acceso": data.ultimo_acceso,
            }
        return data

    class Config:
        from_attributes = True

# ── Esquemas principales ──────────────────────────────────────────────────────

class PersonalBase(BaseModel):
    nombre: str
    apellido: str
    cedula: str
    telefono: Optional[str] = None
    activo: Optional[bool] = True
    id_direccion: int
    id_cargo: int
    tipo_personal: str
    estado: str

class PersonalCreate(PersonalBase):
    pass

class PersonalUpdate(BaseModel):
    nombre: Optional[str] = None
    apellido: Optional[str] = None
    cedula: Optional[str] = None
    telefono: Optional[str] = None
    activo: Optional[bool] = None
    id_direccion: Optional[int] = None
    id_cargo: Optional[int] = None
    tipo_personal: Optional[str] = None
    estado: Optional[str] = None

class PersonalResponse(PersonalBase):
    """Respuesta plana (listado) — incluye info básica de usuario si existe."""
    id: int
    cargo: Optional[CargoInfo] = None
    direccion: Optional[DireccionInfo] = None
    usuario: Optional[UsuarioInfo] = None

    class Config:
        from_attributes = True

class PersonalDetailResponse(BaseModel):
    """Respuesta detallada (por ID) — incluye objetos completos de relaciones."""
    id: int
    nombre: str
    apellido: str
    cedula: str
    telefono: Optional[str] = None
    tipo_personal: str
    estado: str
    activo: bool
    cargo: CargoInfo
    direccion: DireccionInfo
    usuario: Optional[UsuarioInfo] = None

    class Config:
        from_attributes = True
