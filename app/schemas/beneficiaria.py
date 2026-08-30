# app/schemas/beneficiaria.py
from pydantic import BaseModel, computed_field, field_validator, model_validator, Field
from datetime import date
from typing import Optional, List
from .direccion import DireccionResponse
from .institucion import InstitucionResponse
from .representante import RepresentanteResponse


class BeneficiariaBase(BaseModel):
    nombres: str = Field(..., min_length=2, max_length=100, description="Nombres de la beneficiaria")
    apellidos: str = Field(..., min_length=2, max_length=100, description="Apellidos de la beneficiaria")
    cedula_identidad: Optional[str] = Field(None, max_length=15, description="Cédula de identidad (si posee)")
    fecha_nacimiento: date = Field(..., description="Fecha de nacimiento")
    grado_actual: Optional[str] = Field(None, max_length=50, description="Grado escolar actual")
    fecha_egreso: Optional[date] = None
    observaciones: Optional[str] = None

    @field_validator("nombres", "apellidos", mode="before")
    @classmethod
    def limpiar_texto(cls, v):
        if isinstance(v, str):
            v = v.strip()
            if not v:
                raise ValueError("El campo no puede estar vacío o contener solo espacios")
        return v

    @field_validator("fecha_nacimiento")
    @classmethod
    def validar_fecha_nacimiento(cls, v: date) -> date:
        if v > date.today():
            raise ValueError("La fecha de nacimiento no puede ser una fecha futura")
        return v

    @model_validator(mode="after")
    def validar_fechas_coherentes(self):
        if self.fecha_egreso and self.fecha_nacimiento:
            if self.fecha_egreso < self.fecha_nacimiento:
                raise ValueError("La fecha de egreso no puede ser anterior a la fecha de nacimiento")
        return self


class BeneficiariaCreate(BeneficiariaBase):
    id_expediente: int
    id_institucion: int
    id_direccion_lugar_nacimiento: int
    id_estado_beneficiaria: int
    id_representante: Optional[int] = None
    id_parentesco: Optional[int] = None

    @model_validator(mode="after")
    def validar_representante_y_parentesco(self):
        rep = self.id_representante
        par = self.id_parentesco
        if (rep is not None and par is None) or (rep is None and par is not None):
            raise ValueError("Debe proporcionar tanto el representante como el parentesco juntos")
        return self


class BeneficiariaUpdate(BaseModel):
    nombres: Optional[str] = Field(None, min_length=2, max_length=100)
    apellidos: Optional[str] = Field(None, min_length=2, max_length=100)
    cedula_identidad: Optional[str] = Field(None, max_length=15)
    fecha_nacimiento: Optional[date] = None
    grado_actual: Optional[str] = Field(None, max_length=50)
    fecha_egreso: Optional[date] = None
    id_expediente: Optional[int] = None
    id_institucion: Optional[int] = None
    id_estado_beneficiaria: Optional[int] = None
    id_direccion_lugar_nacimiento: Optional[int] = None
    observaciones: Optional[str] = None
    id_representante: Optional[int] = None
    id_parentesco: Optional[int] = None

    @field_validator("nombres", "apellidos", mode="before")
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

    @model_validator(mode="after")
    def validar_fechas_y_representante(self):
        if self.fecha_egreso and self.fecha_nacimiento:
            if self.fecha_egreso < self.fecha_nacimiento:
                raise ValueError("La fecha de egreso no puede ser anterior a la fecha de nacimiento")
        
        rep = self.id_representante
        par = self.id_parentesco
        if (rep is not None and par is None) or (rep is None and par is not None):
            raise ValueError("Debe proporcionar tanto el representante como el parentesco juntos")
        return self


class BeneficiariaResponse(BeneficiariaBase):
    id_beneficiaria: int
    id_expediente: int
    id_institucion: int
    id_estado_beneficiaria: int
    activo: bool

    @computed_field
    @property
    def edad(self) -> int:
        today = date.today()
        return today.year - self.fecha_nacimiento.year - (
            (today.month, today.day) < (self.fecha_nacimiento.month, self.fecha_nacimiento.day)
        )

    class Config:
        from_attributes = True


class BeneficiariaDetailResponse(BaseModel):
    id_beneficiaria: int
    nombres: str
    apellidos: str
    cedula_identidad: Optional[str] = None
    fecha_nacimiento: date
    grado_actual: Optional[str] = None
    fecha_egreso: Optional[date] = None
    estado: str  
    activo: bool
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
                    "id_direccion": rep.id_direccion,   
                    "activo": rep.activo,
                    "direccion": rep.direccion,
                    "parentesco": br.parentesco.descripcion if br.parentesco else ""
                }
                lista_formateada.append(rep_dict)
            else:
                lista_formateada.append(br)
        return lista_formateada

    # 2. Validador para transformar las hermanas al formato simple
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


# Importamos aquí de forma segura para resolver referencias de tipos adelantadas
from app.schemas.expediente import ExpedienteResponse
BeneficiariaDetailResponse.model_rebuild()