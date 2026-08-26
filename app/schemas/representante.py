from pydantic import BaseModel, field_validator
from datetime import date
from typing import Optional, List
from .direccion import DireccionResponse

class RepresentanteBase(BaseModel):
    nombres: str
    apellidos: str
    fecha_nacimiento: Optional[date] = None
    telefono_contacto: str
    ocupacion_laboral: Optional[str] = None
    id_direccion: int

class RepresentanteCreate(RepresentanteBase):
    pass

class RepresentanteUpdate(BaseModel):
    nombres: Optional[str] = None
    apellidos: Optional[str] = None
    fecha_nacimiento: Optional[date] = None
    telefono_contacto: Optional[str] = None
    ocupacion_laboral: Optional[str] = None
    id_direccion: Optional[int] = None
    activo: Optional[bool] = None

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
                lista_formateada.append(v)
        return lista_formateada

    class Config:
        from_attributes = True