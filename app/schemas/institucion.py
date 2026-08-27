from pydantic import BaseModel
from typing import Optional

class InstitucionBase(BaseModel):
    nombre: str
    telefono: Optional[str] = None
    id_direccion: int

class InstitucionCreate(InstitucionBase):
    pass

class InstitucionResponse(InstitucionBase):
    id_institucion: int

    class Config:
        from_attributes = True