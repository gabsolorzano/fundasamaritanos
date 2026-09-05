from sqlalchemy import Column, Integer, String, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.core.db import Base

class Personal(Base):
    __tablename__ = "personal"

    id = Column(Integer, primary_key=True, index=True)
    id_direccion = Column(Integer, ForeignKey("direcciones.id_direccion"), nullable=False)
    id_cargo = Column(Integer, ForeignKey("cargos.id_cargo"), nullable=False)
    cedula = Column(String(15), unique=True, nullable=False)
    nombre = Column(String(100), nullable=False)
    apellido = Column(String(100), nullable=False)
    telefono = Column(String(20), nullable=True)
    tipo_personal = Column(String(20), nullable=False)  # Fijo, Voluntario
    estado = Column(String(20), nullable=False)  # Activo, Inactivo
    activo = Column(Boolean, default=True)

    direccion = relationship("Direccion")
    cargo = relationship("Cargo")
    usuario = relationship("Usuario", back_populates="personal", uselist=False)