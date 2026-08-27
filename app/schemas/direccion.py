from pydantic import BaseModel
from typing import Optional

class DireccionBase(BaseModel):
    calle_av: str
    edificio_casa: Optional[str] = None
    urbanizacion: str
    ciudad: str
    municipio: str
    estado: str

class DireccionCreate(DireccionBase):
    pass

class DireccionResponse(DireccionBase):
    id_direccion: int

    class Config:
        from_attributes = True