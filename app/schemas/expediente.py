# app/schemas/expediente.py
from pydantic import BaseModel
from datetime import date
from typing import Optional, List
from app.schemas.direccion import DireccionResponse

class ExpedienteBase(BaseModel):
    codigo_expediente: str
    id_direccion: int  
    fecha_apertura: date
    observaciones: Optional[str] = None
    activo: Optional[bool] = True

class ExpedienteCreate(ExpedienteBase):
    pass

class ExpedienteUpdate(BaseModel):
    codigo_expediente: Optional[str] = None
    id_direccion: Optional[int] = None
    fecha_apertura: Optional[date] = None
    observaciones: Optional[str] = None
    activo: Optional[bool] = None

class ExpedienteResponse(ExpedienteBase):
    id_expediente: int

    class Config:
        from_attributes = True

class ExpedienteDetailResponse(ExpedienteResponse):
    direccion: Optional[DireccionResponse] = None
    beneficiarias: List["BeneficiariaResponse"] = []  # <--- Entre comillas

# Importamos aquí abajo para cerrar el ciclo de manera ordenada
from app.schemas.beneficiaria import BeneficiariaResponse
ExpedienteDetailResponse.model_rebuild()