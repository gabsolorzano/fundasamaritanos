from pydantic import BaseModel
from datetime import date
from .direccion import DireccionResponse

class RepresentanteResponse(BaseModel):
    id_representante: int
    nombres: str
    apellidos: str
    fecha_nacimiento: date | None
    telefono_contacto: str
    ocupacion_laboral: str | None
    direccion: DireccionResponse
    parentesco: str  # Descripción del parentesco