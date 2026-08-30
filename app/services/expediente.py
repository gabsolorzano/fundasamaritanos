# app/services/expediente.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, asc, desc
from sqlalchemy.orm import selectinload
from typing import Optional
from datetime import date
from fastapi import HTTPException, status

from app.models.expediente import Expediente
from app.models.direccion import Direccion
from app.models.beneficiaria import Beneficiaria
from app.schemas.expediente import ExpedienteCreate, ExpedienteUpdate

ESTADO_ANULADA_ID = 4


class ExpedienteService:
    
    @staticmethod
    async def listar_expedientes(
        db: AsyncSession,
        codigo: Optional[str] = None,
        fecha_apertura: Optional[date] = None,
        fecha_min: Optional[date] = None,
        fecha_max: Optional[date] = None,
        activo: Optional[bool] = None,
        skip: int = 0,
        limit: int = 10,
        order_by: str = "id",
        order_dir: str = "asc"
    ):
        stmt = select(Expediente)
        
        conditions = []
        if activo is not None:
            conditions.append(Expediente.activo == activo)
        if codigo:
            conditions.append(Expediente.codigo_expediente.ilike(f"%{codigo}%"))
        if fecha_apertura:
            conditions.append(Expediente.fecha_apertura == fecha_apertura)
        if fecha_min:
            conditions.append(Expediente.fecha_apertura >= fecha_min)
        if fecha_max:
            conditions.append(Expediente.fecha_apertura <= fecha_max)
            
        if conditions:
            stmt = stmt.where(and_(*conditions))
            
        order_map = {
            "id": Expediente.id_expediente,
            "codigo": Expediente.codigo_expediente,
            "fecha_apertura": Expediente.fecha_apertura
        }
        order_col = order_map.get(order_by, Expediente.id_expediente)
        
        if order_dir == "desc":
            stmt = stmt.order_by(desc(order_col))
        else:
            stmt = stmt.order_by(asc(order_col))
            
        stmt = stmt.offset(skip).limit(limit)
        result = await db.execute(stmt)
        return result.scalars().all()

    @staticmethod
    async def obtener_expediente_por_id(db: AsyncSession, expediente_id: int):
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
        # 1. Validar que la dirección exista
        stmt_dir = select(Direccion).where(Direccion.id_direccion == expediente_in.id_direccion)
        res_dir = await db.execute(stmt_dir)
        if not res_dir.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"La dirección con ID {expediente_in.id_direccion} no existe."
            )

        # 2. Validar que el código no esté duplicado
        stmt_cod = select(Expediente).where(Expediente.codigo_expediente == expediente_in.codigo_expediente)
        res_cod = await db.execute(stmt_cod)
        if res_cod.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"El código de expediente '{expediente_in.codigo_expediente}' ya se encuentra registrado."
            )

        nuevo_expediente = Expediente(**expediente_in.model_dump())
        db.add(nuevo_expediente)
        await db.commit()
        await db.refresh(nuevo_expediente)
        return nuevo_expediente

    @staticmethod
    async def actualizar_expediente(db: AsyncSession, expediente_id: int, expediente_data: ExpedienteUpdate):
        stmt = select(Expediente).where(Expediente.id_expediente == expediente_id)
        result = await db.execute(stmt)
        expediente = result.scalar_one_or_none()
        
        if not expediente:
            return None
        
        update_data = expediente_data.model_dump(exclude_unset=True)

        # Validar dirección si se actualiza
        if "id_direccion" in update_data and update_data["id_direccion"] is not None:
            stmt_dir = select(Direccion).where(Direccion.id_direccion == update_data["id_direccion"])
            res_dir = await db.execute(stmt_dir)
            if not res_dir.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"La dirección con ID {update_data['id_direccion']} no existe."
                )

        # Validar código único si se actualiza
        if "codigo_expediente" in update_data and update_data["codigo_expediente"]:
            nuevo_codigo = update_data["codigo_expediente"]
            if nuevo_codigo != expediente.codigo_expediente:
                stmt_cod = select(Expediente).where(
                    and_(
                        Expediente.codigo_expediente == nuevo_codigo,
                        Expediente.id_expediente != expediente_id
                    )
                )
                res_cod = await db.execute(stmt_cod)
                if res_cod.scalar_one_or_none():
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"El código de expediente '{nuevo_codigo}' ya pertenece a otro expediente."
                    )

        for key, value in update_data.items():
            setattr(expediente, key, value)
        
        await db.commit()
        await db.refresh(expediente)
        return expediente

    @staticmethod
    async def eliminar_expediente(db: AsyncSession, expediente_id: int, force: bool = False):
        stmt = (
            select(Expediente)
            .options(selectinload(Expediente.beneficiarias))
            .where(Expediente.id_expediente == expediente_id)
        )
        result = await db.execute(stmt)
        expediente = result.scalar_one_or_none()
        
        if not expediente:
            return None
            
        if force:
            if expediente.beneficiarias:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"No se puede eliminar permanentemente el expediente {expediente.codigo_expediente} porque tiene {len(expediente.beneficiarias)} beneficiarias asociadas."
                )
            await db.delete(expediente)
            mensaje = f"Expediente con ID {expediente_id} eliminado permanentemente."
        else:
            # Validamos si alguna beneficiaria asociada está activa
            if expediente.beneficiarias:
                for b in expediente.beneficiarias:
                    if b.id_estado_beneficiaria != ESTADO_ANULADA_ID:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"No se puede desactivar el expediente porque la beneficiaria {b.nombres} {b.apellidos} se encuentra activa."
                        )
            
            expediente.activo = False
            mensaje = f"Expediente con ID {expediente_id} desactivado correctamente."

        await db.commit()
        return {"mensaje": mensaje}