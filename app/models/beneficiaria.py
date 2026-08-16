from sqlalchemy import Column, Integer, String, Date, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.core.db import Base

class Beneficiaria(Base):
    __tablename__ = "beneficiarias"

    id_beneficiaria = Column(Integer, primary_key=True, index=True)
    id_expediente = Column(Integer, ForeignKey("expedientes.id_expediente"), nullable=False)
    id_institucion = Column(Integer, ForeignKey("instituciones.id_institucion"), nullable=False)
    id_direccion_lugar_nacimiento = Column(Integer, ForeignKey("direcciones.id_direccion"), nullable=False)
    id_estado_beneficiaria = Column(Integer, ForeignKey("estado_beneficiaria.id_estado_beneficiaria"), nullable=False)

    nombres = Column(String(100), nullable=False)
    apellidos = Column(String(100), nullable=False)
    cedula_identidad = Column(String(15), nullable=True)
    fecha_nacimiento = Column(Date, nullable=False)
    grado_actual = Column(String(50), nullable=True)
    fecha_egreso = Column(Date, nullable=True)
    activo = Column(Boolean, default=True)  # Soft delete

    # Relaciones
    expediente = relationship("Expediente", back_populates="beneficiarias")
    institucion = relationship("Institucion")
    lugar_nacimiento = relationship("Direccion", foreign_keys=[id_direccion_lugar_nacimiento])
    estado_beneficiaria = relationship("EstadoBeneficiaria")

    # Relación muchos-a-muchos con Representante a través de la tabla intermedia
    representantes = relationship("BeneficiariaRepresentante", back_populates="beneficiaria")