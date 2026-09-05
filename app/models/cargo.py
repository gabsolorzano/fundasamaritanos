from sqlalchemy import Column, Integer, String
from app.core.db import Base

class Cargo(Base):
    __tablename__ = "cargos"

    id_cargo = Column(Integer, primary_key=True, index=True)
    descripcion = Column(String(50), unique=True, nullable=False)