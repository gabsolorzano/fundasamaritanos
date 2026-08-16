from sqlalchemy import Column, Integer, String, Date, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.db import Base

class Expediente(Base):
    __tablename__ = "expedientes"

    id_expediente = Column(Integer, primary_key=True, index=True)
    codigo_expediente = Column(String(50), unique=True, nullable=False)
    id_direccion = Column(Integer, ForeignKey("direcciones.id_direccion"), nullable=False)
    fecha_apertura = Column(Date, nullable=False)
    observaciones = Column(Text, nullable=True)

    direccion = relationship("Direccion")
    beneficiarias = relationship("Beneficiaria", back_populates="expediente")