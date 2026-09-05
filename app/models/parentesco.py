from sqlalchemy import Column, Integer, String
from app.core.db import Base

class Parentesco(Base):
    __tablename__ = "parentescos"

    id_parentesco = Column(Integer, primary_key=True, index=True)
    descripcion = Column(String(30), unique=True, nullable=False)