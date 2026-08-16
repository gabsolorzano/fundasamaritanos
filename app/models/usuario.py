from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from app.core.db import Base

class Usuario(Base):
    __tablename__ = "usuarios"

    id_usuario = Column(Integer, primary_key=True, index=True)
    id_personal = Column(Integer, ForeignKey("personal.id_personal"), unique=True, nullable=False)
    id_rol = Column(Integer, ForeignKey("roles.id_rol"), nullable=False)
    nombre_usuario = Column(String(50), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    ultimo_acceso = Column(DateTime, server_default=func.now(), onupdate=func.now())

    personal = relationship("Personal", back_populates="usuario")
    rol = relationship("Rol")