from pydantic import BaseModel
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
    ultimo_acceso: Optional[datetime] = None

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
    """Respuesta plana (listado) — solo claves foráneas."""
    id: int

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
