from sqlalchemy import Column, Integer, String
from app.core.db import Base

class EstadoBeneficiaria(Base):
    __tablename__ = "estado_beneficiaria"

    id_estado_beneficiaria = Column(Integer, primary_key=True, index=True)
    descripcion = Column(String(30), unique=True, nullable=False)