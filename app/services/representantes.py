from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from typing import Optional

from app.models.representante import Representante
from app.models.beneficiaria_representante import BeneficiariaRepresentante
from app.models.beneficiaria import Beneficiaria
from app.models.expediente import Expediente
from app.models.estado_beneficiaria import EstadoBeneficiaria
from app.models.parentesco import Parentesco
from app.schemas.representante import RepresentanteCreate, RepresentanteUpdate

class RepresentanteService:

    @staticmethod
    async def listar_representantes(
        db: AsyncSession,
        nombre: Optional[str] = None,
        apellido: Optional[str] = None,
        telefono: Optional[str] = None,
        activo: Optional[bool] = None,
        skip: int = 0,
        limit: int = 10
    ):
        stmt = (
            select(Representante)
            .options(selectinload(Representante.direccion))
        )
        
        conditions = []
        if activo is not None:
            conditions.append(Representante.activo == activo)
        if nombre:
            conditions.append(Representante.nombres.ilike(f"%{nombre}%"))
        if apellido:
            conditions.append(Representante.apellidos.ilike(f"%{apellido}%"))
        if telefono:
            conditions.append(Representante.telefono_contacto.ilike(f"%{telefono}%"))
            
        if conditions:
            stmt = stmt.where(and_(*conditions))
            
        stmt = stmt.offset(skip).limit(limit)
        result = await db.execute(stmt)
        return result.scalars().all()

    @staticmethod
    async def obtener_representante_por_id(db: AsyncSession, representante_id: int):
        stmt = (
            select(Representante)
            .where(Representante.id_representante == representante_id)
            .options(
                selectinload(Representante.direccion),
                selectinload(Representante.beneficiarias)
                .selectinload(BeneficiariaRepresentante.beneficiaria)
                .selectinload(Beneficiaria.expediente),
                selectinload(Representante.beneficiarias)
                .selectinload(BeneficiariaRepresentante.beneficiaria)
                .selectinload(Beneficiaria.estado_beneficiaria),
                selectinload(Representante.beneficiarias)
                .selectinload(BeneficiariaRepresentante.parentesco)
            )
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def crear_representante(db: AsyncSession, representante_in: RepresentanteCreate):
        nuevo_representante = Representante(**representante_in.model_dump())
        db.add(nuevo_representante)
        await db.commit()
        await db.refresh(nuevo_representante)
        
        # Recargar para incluir la dirección en la respuesta
        stmt = (
            select(Representante)
            .where(Representante.id_representante == nuevo_representante.id_representante)
            .options(selectinload(Representante.direccion))
        )
        result = await db.execute(stmt)
        return result.scalar_one()

    @staticmethod
    async def actualizar_representante(db: AsyncSession, representante_id: int, representante_data: RepresentanteUpdate):
        stmt = (
            select(Representante)
            .where(Representante.id_representante == representante_id)
            .options(selectinload(Representante.direccion))
        )
        result = await db.execute(stmt)
        representante = result.scalar_one_or_none()
        
        if not representante:
            return None
            
        update_data = representante_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(representante, key, value)
            
        await db.commit()
        await db.refresh(representante)
        return representante

    @staticmethod
    async def eliminar_representante(db: AsyncSession, representante_id: int, force: bool = False):
        stmt = select(Representante).where(Representante.id_representante == representante_id)
        result = await db.execute(stmt)
        representante = result.scalar_one_or_none()
        
        if not representante:
            return None
            
        if force:
            await db.delete(representante)
            mensaje = f"Representante con ID {representante_id} eliminado permanentemente."
        else:
            representante.activo = False
            mensaje = f"Representante con ID {representante_id} desactivado lógicamente."
            
        await db.commit()
        return {"mensaje": mensaje}