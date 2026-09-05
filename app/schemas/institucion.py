# app/schemas/institucion.py
from pydantic import BaseModel, Field, field_validator
from typing import Optional
from app.schemas.direccion import DireccionResponse


class InstitucionBase(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=150, description="Nombre de la institución")
    telefono: Optional[str] = Field(None, min_length=7, max_length=20, description="Teléfono de contacto institucional")
    id_direccion: int = Field(..., description="ID de la dirección de la institución")

    @field_validator("nombre", mode="before")
    @classmethod
    def limpiar_nombre(cls, v):
        if isinstance(v, str):
            v = v.strip()
            if not v:
                raise ValueError("El nombre no puede estar vacío o contener solo espacios")
        return v

    @field_validator("telefono", mode="before")
    @classmethod
    def limpiar_telefono(cls, v):
        if isinstance(v, str):
            v = v.strip()
            if not v:
                return None
        return v


class InstitucionCreate(InstitucionBase):
    pass


class InstitucionUpdate(BaseModel):
    nombre: Optional[str] = Field(None, min_length=2, max_length=150)
    telefono: Optional[str] = Field(None, min_length=7, max_length=20)
    id_direccion: Optional[int] = None

    @field_validator("nombre", mode="before")
    @classmethod
    def limpiar_nombre_opcional(cls, v):
        if isinstance(v, str):
            v = v.strip()
            if not v:
                raise ValueError("El nombre no puede estar vacío o contener solo espacios")
        return v

    @field_validator("telefono", mode="before")
    @classmethod
    def limpiar_telefono_opcional(cls, v):
        if isinstance(v, str):
            v = v.strip()
            if not v:
                return None
        return v


class InstitucionResponse(InstitucionBase):
    id_institucion: int

    class Config:
        from_attributes = True


class InstitucionDetailResponse(InstitucionResponse):
    direccion: Optional[DireccionResponse] = None

    class Config:
        from_attributes = True