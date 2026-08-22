from pydantic import BaseModel

class DireccionResponse(BaseModel):
    id_direccion: int
    calle_av: str
    edificio_casa: str | None
    urbanizacion: str
    ciudad: str
    municipio: str
    estado: str
    
    class Config:
        from_attributes = True