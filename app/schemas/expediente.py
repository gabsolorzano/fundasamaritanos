from pydantic import BaseModel
from datetime import date
from .direccion import DireccionResponse

class ExpedienteResponse(BaseModel):
    id_expediente: int
    codigo_expediente: str
    fecha_apertura: date
    observaciones: str | None
    direccion: DireccionResponse