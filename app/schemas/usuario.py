from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class UsuarioBase(BaseModel):
    email: str

class UsuarioCreate(UsuarioBase):
    password: str
    personal_id: int
    id_rol: int

class UsuarioResponse(UsuarioBase):
    id: int
    personal_id: int
    id_rol: int
    ultimo_acceso: Optional[datetime] = None

    class Config:
        from_attributes = True