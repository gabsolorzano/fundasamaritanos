from pydantic import BaseModel
from typing import Optional

class InstitucionBase(BaseModel):
    nombre: str
    telefono: Optional[str] = None
    id_direccion: int

class InstitucionCreate(InstitucionBase):
    pass

class InstitucionUpdate(BaseModel):
    """Todos los campos son opcionales para permitir actualizaciones parciales."""
    nombre: Optional[str] = None
    telefono: Optional[str] = None
    id_direccion: Optional[int] = None

class InstitucionResponse(InstitucionBase):
    id_institucion: int

    class Config:
        from_attributes = True