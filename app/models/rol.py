from sqlalchemy import Column, Integer, String
from app.core.db import Base

class Rol(Base):
    __tablename__ = "roles"

    id_rol = Column(Integer, primary_key=True, index=True)
    nombre_rol = Column(String(30), unique=True, nullable=False)
    descripcion = Column(String(100), nullable=True)