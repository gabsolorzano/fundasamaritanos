from pydantic import BaseModel
from typing import Optional

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

class PersonalResponse(PersonalBase):
    id: int

    class Config:
        from_attributes = True
