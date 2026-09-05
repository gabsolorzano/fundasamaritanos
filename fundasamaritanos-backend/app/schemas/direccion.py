# app/schemas/direccion.py
from pydantic import BaseModel, Field, field_validator
from typing import Optional


class DireccionBase(BaseModel):
    """Esquema base con validaciones estrictas para creación y actualización."""
    calle_av: str = Field(..., min_length=2, max_length=100, description="Calle, avenida o vereda")
    edificio_casa: Optional[str] = Field(None, max_length=50, description="Edificio, casa, piso o número")
    urbanizacion: str = Field(..., min_length=2, max_length=100, description="Urbanización, sector o barrio")
    ciudad: str = Field(..., min_length=2, max_length=50, description="Ciudad")
    municipio: str = Field(..., min_length=2, max_length=50, description="Municipio")
    estado: str = Field(..., min_length=2, max_length=50, description="Estado")

    @field_validator("calle_av", "urbanizacion", "ciudad", "municipio", "estado", mode="before")
    @classmethod
    def limpiar_texto(cls, v):
        if isinstance(v, str):
            v = v.strip()
            if not v:
                raise ValueError("El campo no puede estar vacío o contener solo espacios")
        return v

    @field_validator("edificio_casa", mode="before")
    @classmethod
    def limpiar_edificio_casa(cls, v):
        if isinstance(v, str):
            v = v.strip()
            if not v:
                return None
        return v


class DireccionCreate(DireccionBase):
    pass


class DireccionUpdate(BaseModel):
    calle_av: Optional[str] = Field(None, min_length=2, max_length=100)
    edificio_casa: Optional[str] = Field(None, max_length=50)
    urbanizacion: Optional[str] = Field(None, min_length=2, max_length=100)
    ciudad: Optional[str] = Field(None, min_length=2, max_length=50)
    municipio: Optional[str] = Field(None, min_length=2, max_length=50)
    estado: Optional[str] = Field(None, min_length=2, max_length=50)

    @field_validator("calle_av", "urbanizacion", "ciudad", "municipio", "estado", mode="before")
    @classmethod
    def limpiar_texto_opcional(cls, v):
        if isinstance(v, str):
            v = v.strip()
            if not v:
                raise ValueError("El campo no puede estar vacío o contener solo espacios")
        return v

    @field_validator("edificio_casa", mode="before")
    @classmethod
    def limpiar_edificio_casa_opcional(cls, v):
        if isinstance(v, str):
            v = v.strip()
            if not v:
                return None
        return v


class DireccionResponse(BaseModel):
    """
    Esquema de respuesta. No hereda los validators estrictos de DireccionBase
    para evitar errores al serializar registros con datos legacy (campos vacíos en DB).
    """
    id_direccion: int
    calle_av: Optional[str] = None
    edificio_casa: Optional[str] = None
    urbanizacion: Optional[str] = None
    ciudad: Optional[str] = None
    municipio: Optional[str] = None
    estado: Optional[str] = None

    class Config:
        from_attributes = True