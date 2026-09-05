from sqlalchemy import Column, Integer, String, Date, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.core.db import Base

class Representante(Base):
    __tablename__ = "representantes"

    id_representante = Column(Integer, primary_key=True, index=True)
    id_direccion = Column(Integer, ForeignKey("direcciones.id_direccion"), nullable=False)
    nombres = Column(String(100), nullable=False)
    apellidos = Column(String(100), nullable=False)
    fecha_nacimiento = Column(Date, nullable=True)
    telefono_contacto = Column(String(20), nullable=False)
    ocupacion_laboral = Column(String(100), nullable=True)
    activo = Column(Boolean, default=True)

    direccion = relationship("Direccion")
    beneficiarias = relationship("BeneficiariaRepresentante", back_populates="representante")