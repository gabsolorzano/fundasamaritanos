# app/schemas/beneficiaria.py
from pydantic import BaseModel, computed_field
from datetime import date
from typing import Optional, List
from .direccion import DireccionResponse
from .expediente import ExpedienteResponse
from .institucion import InstitucionResponse
from .representante import RepresentanteResponse


class BeneficiariaBase(BaseModel):
    #Campos base de una beneficiaria.
    nombres: str
    apellidos: str
    cedula_identidad: Optional[str] = None
    fecha_nacimiento: date
    grado_actual: Optional[str] = None
    fecha_egreso: Optional[date] = None
    observaciones: Optional[str] = None

class BeneficiariaCreate(BeneficiariaBase):
    #Campos necesarios para CREAR una beneficiaria.
    id_expediente: int
    id_institucion: int
    id_direccion_lugar_nacimiento: int
    id_estado_beneficiaria: int

class BeneficiariaUpdate(BaseModel):
    #Campos que se pueden ACTUALIZAR.
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
    #Respuesta completa (con relaciones básicas)
    id_beneficiaria: int
    id_expediente: int
    id_institucion: int
    id_estado_beneficiaria: int
    #incluir datos relacionados (expediente, institucion, etc.)
    class Config:
        from_attributes = True  # Permite convertir desde objetos SQLAlchemy
        
class BeneficiariaDetailResponse(BaseModel):
    id_beneficiaria: int
    nombres: str
    apellidos: str
    cedula_identidad: str | None
    fecha_nacimiento: date
    grado_actual: str | None
    fecha_egreso: date | None
    estado: str  # Descripción del estado
    observaciones: Optional[str] = None
    expediente: ExpedienteResponse
    institucion: InstitucionResponse
    lugar_nacimiento: DireccionResponse
    representantes: List[RepresentanteResponse]
    hermanas: List["BeneficiariaSimpleResponse"]  # Evitamos recursión

    @computed_field
    @property
    def edad(self) -> int:
        #Calcula la edad automáticamente a partir de la fecha de nacimiento.
        today = date.today()
        return today.year - self.fecha_nacimiento.year - (
            (today.month, today.day) < (self.fecha_nacimiento.month, self.fecha_nacimiento.day)
        )

class BeneficiariaSimpleResponse(BaseModel):
    id_beneficiaria: int
    nombres: str
    apellidos: str
    codigo_expediente: str
    estado: str
        