from sqlalchemy import Column, Integer, String
from app.core.db import Base

class Direccion(Base):
    __tablename__ = "direcciones"

    id_direccion = Column(Integer, primary_key=True, index=True)
    calle_av = Column(String(100), nullable=False)
    edificio_casa = Column(String(50), nullable=True)
    urbanizacion = Column(String(100), nullable=False)
    ciudad = Column(String(50), nullable=False)
    municipio = Column(String(50), nullable=False)
    estado = Column(String(50), nullable=False)