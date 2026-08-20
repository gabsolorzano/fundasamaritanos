# app/schemas/expediente.py
from pydantic import BaseModel
from datetime import date
from typing import Optional

# Esquema base: Los campos que coinciden con tu modelo
class ExpedienteBase(BaseModel):
    codigo_expediente: str
    id_direccion: int  
    fecha_apertura: date
    observaciones: Optional[str] = None

# Esquema para CREAR (hereda de Base)
class ExpedienteCreate(ExpedienteBase):
    pass

# Esquema para ACTUALIZAR (todos los campos opcionales)
class ExpedienteUpdate(BaseModel):
    codigo_expediente: Optional[str] = None
    id_direccion: Optional[int] = None
    fecha_apertura: Optional[date] = None
    observaciones: Optional[str] = None

# Esquema para RESPUESTA 
class ExpedienteResponse(ExpedienteBase):
    id_expediente: int

    class Config:
        from_attributes = True