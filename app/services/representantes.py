# app/services/representantes.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, asc, desc, delete
from sqlalchemy.orm import selectinload
from typing import Optional
from fastapi import HTTPException, status

from app.models.representante import Representante
from app.models.direccion import Direccion
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
        ocupacion: Optional[str] = None,
        activo: Optional[bool] = None,
        skip: int = 0,
        limit: int = 10,
        order_by: str = "id",
        order_dir: str = "asc"
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
        if ocupacion:
            conditions.append(Representante.ocupacion_laboral.ilike(f"%{ocupacion}%"))
            
        if conditions:
            stmt = stmt.where(and_(*conditions))
            
        order_map = {
            "id": Representante.id_representante,
            "nombres": Representante.nombres,
            "apellidos": Representante.apellidos,
            "telefono": Representante.telefono_contacto,
            "ocupacion": Representante.ocupacion_laboral
        }
        order_col = order_map.get(order_by, Representante.id_representante)
        
        if order_dir == "desc":
            stmt = stmt.order_by(desc(order_col))
        else:
            stmt = stmt.order_by(asc(order_col))
            
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
        # 1. Validar que la dirección exista
        stmt_dir = select(Direccion).where(Direccion.id_direccion == representante_in.id_direccion)
        res_dir = await db.execute(stmt_dir)
        if not res_dir.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"La dirección con ID {representante_in.id_direccion} no existe."
            )

        nuevo_representante = Representante(**representante_in.model_dump())
        db.add(nuevo_representante)
        await db.commit()
        await db.refresh(nuevo_representante)
        
        # Cargar relación con dirección para retornar objeto completo
        stmt = (
            select(Representante)
            .where(Representante.id_representante == nuevo_representante.id_representante)
            .options(selectinload(Representante.direccion))
        )
        result = await db.execute(stmt)
        return result.scalar_one()

    @staticmethod
    async def actualizar_representante(db: AsyncSession, representante_id: int, representante_data: RepresentanteUpdate):
        stmt = select(Representante).where(Representante.id_representante == representante_id)
        result = await db.execute(stmt)
        representante = result.scalar_one_or_none()
        
        if not representante:
            return None
            
        update_data = representante_data.model_dump(exclude_unset=True)

        # Validar dirección si se actualiza
        if "id_direccion" in update_data and update_data["id_direccion"] is not None:
            stmt_dir = select(Direccion).where(Direccion.id_direccion == update_data["id_direccion"])
            res_dir = await db.execute(stmt_dir)
            if not res_dir.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"La dirección con ID {update_data['id_direccion']} no existe."
                )

        for key, value in update_data.items():
            setattr(representante, key, value)
            
        await db.commit()
        await db.refresh(representante)

        # Cargar dirección
        stmt_reload = (
            select(Representante)
            .where(Representante.id_representante == representante.id_representante)
            .options(selectinload(Representante.direccion))
        )
        res_reload = await db.execute(stmt_reload)
        return res_reload.scalar_one()

    @staticmethod
    async def eliminar_representante(db: AsyncSession, representante_id: int, force: bool = False):
        stmt = select(Representante).where(Representante.id_representante == representante_id)
        result = await db.execute(stmt)
        representante = result.scalar_one_or_none()
        
        if not representante:
            return None
            
        if force:
            # Eliminar primero los vínculos en la tabla intermedia para evitar violación de FK
            await db.execute(
                delete(BeneficiariaRepresentante).where(
                    BeneficiariaRepresentante.id_representante == representante_id
                )
            )
            await db.delete(representante)
            mensaje = f"Representante con ID {representante_id} eliminado permanentemente."
        else:
            representante.activo = False
            mensaje = f"Representante con ID {representante_id} desactivado correctamente."
            
        await db.commit()
        return {"mensaje": mensaje}