# app/services/expediente.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.models.expediente import Expediente
from app.schemas.expediente import ExpedienteCreate, ExpedienteUpdate
from typing import Optional

class ExpedienteService:
    
    @staticmethod
    async def listar_expedientes(db: AsyncSession, skip: int = 0, limit: int = 100, activo: Optional[bool] = None):
        """Lista expedientes, permitiendo filtrar opcionalmente por activos o inactivos (historial)."""
        stmt = select(Expediente)
        
        # Si se envía un filtro de activo/inactivo, lo aplicamos
        if activo is not None:
            stmt = stmt.where(Expediente.activo == activo)
            
        stmt = stmt.offset(skip).limit(limit)
        result = await db.execute(stmt)
        return result.scalars().all()

    @staticmethod
    async def obtener_expediente_por_id(db: AsyncSession, expediente_id: int):
        """Obtiene un expediente específico precargando su dirección y todas sus beneficiarias."""
        stmt = (
            select(Expediente)
            .options(
                selectinload(Expediente.direccion),
                selectinload(Expediente.beneficiarias)
            )
            .where(Expediente.id_expediente == expediente_id)
        )
        result = await db.execute(stmt)
        return result.scalars().first()

    @staticmethod
    async def crear_expediente(db: AsyncSession, expediente_in: ExpedienteCreate):
        """Crea un nuevo expediente en la base de datos."""
        nuevo_expediente = Expediente(**expediente_in.model_dump())
        db.add(nuevo_expediente)
        await db.commit()
        await db.refresh(nuevo_expediente)
        return nuevo_expediente

    @staticmethod
    async def actualizar_expediente(db: AsyncSession, expediente_id: int, expediente_data: ExpedienteUpdate):
        """Actualiza un expediente existente (parcialmente)."""
        expediente = await ExpedienteService.obtener_expediente_por_id(db, expediente_id)
        if not expediente:
            return None
        
        update_data = expediente_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(expediente, key, value)
        
        await db.commit()
        await db.refresh(expediente)
        return expediente

    @staticmethod
    async def desactivar_expediente(db: AsyncSession, expediente_id: int):
        """Realiza un borrado lógico (desactivación) validando si tiene beneficiarias."""
        expediente = await ExpedienteService.obtener_expediente_por_id(db, expediente_id)
        if not expediente:
            return None
        
        if expediente.beneficiarias and len(expediente.beneficiarias) > 0:
            raise ValueError("No se puede desactivar el expediente porque tiene beneficiarias asociadas.")
        
        expediente.activo = False
        await db.commit()
        await db.refresh(expediente)
        return expediente