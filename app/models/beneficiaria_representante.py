from sqlalchemy import Column, Integer, ForeignKey, PrimaryKeyConstraint
from sqlalchemy.orm import relationship
from app.core.db import Base

class BeneficiariaRepresentante(Base):
    __tablename__ = "beneficiaria_representante"

    id_beneficiaria = Column(Integer, ForeignKey("beneficiarias.id_beneficiaria"), primary_key=True)
    id_representante = Column(Integer, ForeignKey("representantes.id_representante"), primary_key=True)
    id_parentesco = Column(Integer, ForeignKey("parentescos.id_parentesco"), nullable=False)

    beneficiaria = relationship("Beneficiaria", back_populates="representantes")
    representante = relationship("Representante", back_populates="beneficiarias")
    parentesco = relationship("Parentesco")