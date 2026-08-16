from pydantic import BaseModel

class InstitucionResponse(BaseModel):
    id_institucion: int
    nombre: str
    telefono: str | None