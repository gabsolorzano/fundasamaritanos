# app/schemas/representante.py
from pydantic import BaseModel, Field, field_validator
from datetime import date
from typing import Optional, List
from .direccion import DireccionResponse


class RepresentanteBase(BaseModel):
    nombres: str = Field(..., min_length=2, max_length=100, description="Nombres del representante")
    apellidos: str = Field(..., min_length=2, max_length=100, description="Apellidos del representante")
    fecha_nacimiento: Optional[date] = Field(None, description="Fecha de nacimiento del representante")
    telefono_contacto: str = Field(..., min_length=7, max_length=20, description="Teléfono de contacto (ej: 0412-1234567)")
    ocupacion_laboral: Optional[str] = Field(None, max_length=100, description="Ocupación laboral o profesión")
    id_direccion: int = Field(..., description="ID de la dirección de residencia")

    @field_validator("nombres", "apellidos", "telefono_contacto", mode="before")
    @classmethod
    def limpiar_texto(cls, v):
        if isinstance(v, str):
            v = v.strip()
            if not v:
                raise ValueError("El campo no puede estar vacío o contener solo espacios")
        return v

    @field_validator("fecha_nacimiento")
    @classmethod
    def validar_fecha_nacimiento(cls, v: Optional[date]) -> Optional[date]:
        if v and v > date.today():
            raise ValueError("La fecha de nacimiento no puede ser una fecha futura")
        return v


class RepresentanteCreate(RepresentanteBase):
    pass


class RepresentanteUpdate(BaseModel):
    nombres: Optional[str] = Field(None, min_length=2, max_length=100)
    apellidos: Optional[str] = Field(None, min_length=2, max_length=100)
    fecha_nacimiento: Optional[date] = None
    telefono_contacto: Optional[str] = Field(None, min_length=7, max_length=20)
    ocupacion_laboral: Optional[str] = Field(None, max_length=100)
    id_direccion: Optional[int] = None
    activo: Optional[bool] = None

    @field_validator("nombres", "apellidos", "telefono_contacto", mode="before")
    @classmethod
    def limpiar_texto_opcional(cls, v):
        if isinstance(v, str):
            v = v.strip()
            if not v:
                raise ValueError("El campo no puede estar vacío o contener solo espacios")
        return v

    @field_validator("fecha_nacimiento")
    @classmethod
    def validar_fecha_nacimiento_opcional(cls, v: Optional[date]) -> Optional[date]:
        if v and v > date.today():
            raise ValueError("La fecha de nacimiento no puede ser una fecha futura")
        return v


class RepresentanteResponse(RepresentanteBase):
    id_representante: int
    activo: bool
    direccion: DireccionResponse
    parentesco: Optional[str] = None

    class Config:
        from_attributes = True


class BeneficiariaDeRepresentanteResponse(BaseModel):
    id_beneficiaria: int
    nombres: str
    apellidos: str
    codigo_expediente: str
    grado_actual: Optional[str] = None
    estado: str
    parentesco: str

    class Config:
        from_attributes = True


class RepresentanteDetailResponse(BaseModel):
    id_representante: int
    nombres: str
    apellidos: str
    fecha_nacimiento: Optional[date] = None
    telefono_contacto: str
    ocupacion_laboral: Optional[str] = None
    activo: bool
    direccion: DireccionResponse
    beneficiarias: List[BeneficiariaDeRepresentanteResponse] = []

    @field_validator("beneficiarias", mode="before")
    @classmethod
    def transformar_beneficiarias(cls, v):
        if not v:
            return []
        
        lista_formateada = []
        for br in v:
            if hasattr(br, "beneficiaria") and br.beneficiaria:
                ben = br.beneficiaria
                ben_dict = {
                    "id_beneficiaria": ben.id_beneficiaria,
                    "nombres": ben.nombres,
                    "apellidos": ben.apellidos,
                    "codigo_expediente": ben.expediente.codigo_expediente if ben.expediente else "",
                    "grado_actual": ben.grado_actual,
                    "estado": ben.estado_beneficiaria.descripcion if ben.estado_beneficiaria else "",
                    "parentesco": br.parentesco.descripcion if br.parentesco else ""
                }
                lista_formateada.append(ben_dict)
            else:
                lista_formateada.append(br)
        return lista_formateada

    class Config:
        from_attributes = True