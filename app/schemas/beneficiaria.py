# app/schemas/beneficiaria.py
from pydantic import BaseModel, computed_field, field_validator
from datetime import date
from typing import Optional, List
from .direccion import DireccionResponse
from .institucion import InstitucionResponse
from .representante import RepresentanteResponse


class BeneficiariaBase(BaseModel):
    nombres: str
    apellidos: str
    cedula_identidad: Optional[str] = None
    fecha_nacimiento: date
    grado_actual: Optional[str] = None
    fecha_egreso: Optional[date] = None
    observaciones: Optional[str] = None


class BeneficiariaCreate(BeneficiariaBase):
    id_expediente: int
    id_institucion: int
    id_direccion_lugar_nacimiento: int
    id_estado_beneficiaria: int


class BeneficiariaUpdate(BaseModel):
    nombres: Optional[str] = None
    apellidos: Optional[str] = None
    cedula_identidad: Optional[str] = None
    fecha_nacimiento: Optional[date] = None
    grado_actual: Optional[str] = None
    fecha_egreso: Optional[date] = None
    id_institucion: Optional[int] = None
    id_estado_beneficiaria: Optional[int] = None
    id_direccion_lugar_nacimiento: Optional[int] = None
    observaciones: Optional[str] = None


class BeneficiariaResponse(BeneficiariaBase):
    id_beneficiaria: int
    id_expediente: int
    id_institucion: int
    id_estado_beneficiaria: int

    class Config:
        from_attributes = True
         
         
class BeneficiariaDetailResponse(BaseModel):
    id_beneficiaria: int
    nombres: str
    apellidos: str
    cedula_identidad: str | None
    fecha_nacimiento: date
    grado_actual: str | None
    fecha_egreso: date | None
    estado: str  
    observaciones: Optional[str] = None
    expediente: "ExpedienteResponse"
    institucion: InstitucionResponse
    lugar_nacimiento: DireccionResponse
    representantes: List[RepresentanteResponse]
    hermanas: List["BeneficiariaSimpleResponse"]  

    @computed_field
    @property
    def edad(self) -> int:
        today = date.today()
        return today.year - self.fecha_nacimiento.year - (
            (today.month, today.day) < (self.fecha_nacimiento.month, self.fecha_nacimiento.day)
        )

    # 1. Validador para transformar los representantes de la tabla intermedia
    @field_validator("representantes", mode="before")
    @classmethod
    def transformar_representantes(cls, v):
        if not v:
            return []
        
        lista_formateada = []
        for br in v:
            if hasattr(br, "representante") and br.representante:
                rep = br.representante
                rep_dict = {
                    "id_representante": rep.id_representante,
                    "nombres": rep.nombres,
                    "apellidos": rep.apellidos,
                    "fecha_nacimiento": rep.fecha_nacimiento,
                    "telefono_contacto": rep.telefono_contacto,
                    "ocupacion_laboral": rep.ocupacion_laboral,
                    "direccion": rep.direccion,
                    "parentesco": br.parentesco.descripcion if br.parentesco else ""
                }
                lista_formateada.append(rep_dict)
            else:
                lista_formateada.append(br)
        return lista_formateada

    # 2. Validador nuevo para transformar las hermanas al formato simple
    @field_validator("hermanas", mode="before")
    @classmethod
    def transformar_hermanas(cls, v):
        if not v:
            return []
        
        lista_formateada = []
        for h in v:
            if hasattr(h, "id_beneficiaria"):
                h_dict = {
                    "id_beneficiaria": h.id_beneficiaria,
                    "nombres": h.nombres,
                    "apellidos": h.apellidos,
                    "codigo_expediente": h.expediente.codigo_expediente if h.expediente else "",
                    "estado": h.estado_beneficiaria.descripcion if h.estado_beneficiaria else ""
                }
                lista_formateada.append(h_dict)
            else:
                lista_formateada.append(h)
        return lista_formateada

    class Config:
        from_attributes = True


class BeneficiariaSimpleResponse(BaseModel):
    id_beneficiaria: int
    nombres: str
    apellidos: str
    codigo_expediente: str
    estado: str

    class Config:
        from_attributes = True


# Importamos aquí abajo de forma segura para que Python no se confunda al arrancar
from app.schemas.expediente import ExpedienteResponse
BeneficiariaDetailResponse.model_rebuild()