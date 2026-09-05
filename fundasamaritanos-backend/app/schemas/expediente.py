# app/schemas/expediente.py
from pydantic import BaseModel, Field, field_validator
from datetime import date
from typing import Optional, List
from app.schemas.direccion import DireccionResponse


class ExpedienteBase(BaseModel):
    codigo_expediente: str = Field(..., min_length=2, max_length=50, description="Código único del expediente (ej: EXP-2026-001)")
    id_direccion: int = Field(..., description="ID de la dirección del expediente")
    fecha_apertura: date = Field(..., description="Fecha de apertura del expediente")
    observaciones: Optional[str] = Field(None, description="Observaciones generales")
    activo: Optional[bool] = Field(True, description="Estado activo del expediente")

    @field_validator("codigo_expediente", mode="before")
    @classmethod
    def limpiar_codigo(cls, v):
        if isinstance(v, str):
            v = v.strip()
            if not v:
                raise ValueError("El código de expediente no puede estar vacío o contener solo espacios")
        return v

    @field_validator("fecha_apertura")
    @classmethod
    def validar_fecha_apertura(cls, v: date) -> date:
        if v > date.today():
            raise ValueError("La fecha de apertura no puede ser una fecha futura")
        return v


class ExpedienteCreate(ExpedienteBase):
    pass


class ExpedienteUpdate(BaseModel):
    codigo_expediente: Optional[str] = Field(None, min_length=2, max_length=50)
    id_direccion: Optional[int] = None
    fecha_apertura: Optional[date] = None
    observaciones: Optional[str] = None
    activo: Optional[bool] = None

    @field_validator("codigo_expediente", mode="before")
    @classmethod
    def limpiar_codigo_opcional(cls, v):
        if isinstance(v, str):
            v = v.strip()
            if not v:
                raise ValueError("El código de expediente no puede estar vacío o contener solo espacios")
        return v

    @field_validator("fecha_apertura")
    @classmethod
    def validar_fecha_apertura_opcional(cls, v: Optional[date]) -> Optional[date]:
        if v and v > date.today():
            raise ValueError("La fecha de apertura no puede ser una fecha futura")
        return v


class ExpedienteResponse(ExpedienteBase):
    id_expediente: int

    class Config:
        from_attributes = True


class ExpedienteDetailResponse(ExpedienteResponse):
    direccion: Optional[DireccionResponse] = None
    beneficiarias: List["BeneficiariaResponse"] = []

    class Config:
        from_attributes = True


# Importamos aquí abajo para cerrar el ciclo de manera ordenada
from app.schemas.beneficiaria import BeneficiariaResponse
ExpedienteDetailResponse.model_rebuild()