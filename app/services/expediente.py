# app/services/expediente.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.expediente import Expediente
from app.schemas.expediente import ExpedienteCreate, ExpedienteUpdate

class ExpedienteService:
    
    @staticmethod
    async def listar_expedientes(db: AsyncSession, skip: int = 0, limit: int = 100):
        #Lista todos los expedientes con paginación.
        stmt = select(Expediente).offset(skip).limit(limit)
        result = await db.execute(stmt)
        return result.scalars().all()

    @staticmethod
    async def obtener_expediente_por_id(db: AsyncSession, expediente_id: int):
        #Obtiene un expediente específico por su ID.
        stmt = select(Expediente).where(Expediente.id_expediente == expediente_id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def crear_expediente(db: AsyncSession, expediente_in: ExpedienteCreate):
        #Crea un nuevo expediente en la base de datos.
        nuevo_expediente = Expediente(**expediente_in.model_dump())
        db.add(nuevo_expediente)
        await db.commit()
        await db.refresh(nuevo_expediente)
        return nuevo_expediente

    @staticmethod
    async def actualizar_expediente(db: AsyncSession, expediente_id: int, expediente_data: ExpedienteUpdate):
        #Actualiza un expediente existente (parcialmente).
        expediente = await ExpedienteService.obtener_expediente_por_id(db, expediente_id)
        if not expediente:
            return None
        
        update_data = expediente_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(expediente, key, value)
        
        await db.commit()
        await db.refresh(expediente)
        return expediente