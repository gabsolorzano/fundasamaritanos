# app/models/beneficiaria.py
from sqlalchemy import Column, Integer, String, Date, ForeignKey, Boolean, Text
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
    observaciones = Column(Text, nullable=True)

    # Relaciones
    expediente = relationship("Expediente", back_populates="beneficiarias")
    institucion = relationship("Institucion")
    lugar_nacimiento = relationship("Direccion", foreign_keys=[id_direccion_lugar_nacimiento])
    estado_beneficiaria = relationship("EstadoBeneficiaria")

    # Relación muchos-a-muchos con Representante a través de la tabla intermedia
    representantes = relationship("BeneficiariaRepresentante", back_populates="beneficiaria")
    
    @property
    def estado(self) -> str:
        return self.estado_beneficiaria.descripcion if self.estado_beneficiaria else ""

    @property
    def codigo_expediente(self) -> str:
        return self.expediente.codigo_expediente if self.expediente else ""

    @property
    def institucion_nombre(self) -> str:
        return self.institucion.nombre if self.institucion else ""

    @property
    def representante_principal(self) -> str:
        if not self.representantes:
            return "Sin representante asignado"
        for br in self.representantes:
            if br.representante and br.representante.activo:
                parentesco = f" ({br.parentesco.descripcion})" if br.parentesco else ""
                return f"{br.representante.nombres} {br.representante.apellidos}{parentesco}"
        return "Sin representante asignado"

    @property
    def hermanas(self):
        if not self.expediente or not self.expediente.beneficiarias:
            return []
        curr_id = int(self.id_beneficiaria) if self.id_beneficiaria is not None else None
        return [b for b in self.expediente.beneficiarias if int(b.id_beneficiaria) != curr_id]