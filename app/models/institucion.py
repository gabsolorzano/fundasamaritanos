from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.core.db import Base

class Institucion(Base):
    __tablename__ = "instituciones"

    id_institucion = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(150), nullable=False)
    telefono = Column(String(20), nullable=True)
    id_direccion = Column(Integer, ForeignKey("direcciones.id_direccion"), nullable=False)

    direccion = relationship("Direccion")