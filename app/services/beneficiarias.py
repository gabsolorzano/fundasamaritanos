# app/services/beneficiarias.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func, asc, desc, delete
from sqlalchemy.orm import selectinload
from typing import Optional
from datetime import date
from fastapi import HTTPException, status

from app.models.beneficiaria import Beneficiaria
from app.models.expediente import Expediente
from app.models.institucion import Institucion
from app.models.estado_beneficiaria import EstadoBeneficiaria
from app.models.direccion import Direccion
from app.models.representante import Representante
from app.models.parentesco import Parentesco
from app.models.beneficiaria_representante import BeneficiariaRepresentante
from app.schemas.beneficiaria import BeneficiariaCreate, BeneficiariaUpdate

# Constantes para estados de beneficiarias
ESTADO_ACTIVA_ID = 1
ESTADO_EGRESADA_ID = 2
ESTADO_TRASLADADA_ID = 3
ESTADO_ANULADA_ID = 4


class BeneficiariaService:
    
    @staticmethod
    async def listar_beneficiarias(
        db: AsyncSession,
        nombre: Optional[str] = None,
        apellido: Optional[str] = None,
        codigo_expediente: Optional[str] = None,
        estado: Optional[str] = None,
        institucion: Optional[str] = None,
        grado: Optional[str] = None,
        lugar_nacimiento: Optional[str] = None,
        fecha_nacimiento: Optional[date] = None,
        edad: Optional[int] = None,
        edad_min: Optional[int] = None,
        edad_max: Optional[int] = None,
        activo: Optional[bool] = None,
        skip: int = 0,
        limit: int = 10,
        order_by: str = "id",
        order_dir: str = "asc"
    ):
        stmt = select(Beneficiaria)
        
        # Uniones condicionales (outerjoin) solo si se requiere filtrar u ordenar por la tabla relacionada
        necesita_expediente = bool(codigo_expediente or order_by == "codigo_expediente")
        necesita_estado = bool(estado or order_by == "estado")
        necesita_institucion = bool(institucion or order_by == "institucion")
        necesita_direccion = bool(lugar_nacimiento or order_by == "lugar_nacimiento")

        if necesita_expediente:
            stmt = stmt.outerjoin(Beneficiaria.expediente)
        if necesita_estado:
            stmt = stmt.outerjoin(Beneficiaria.estado_beneficiaria)
        if necesita_institucion:
            stmt = stmt.outerjoin(Beneficiaria.institucion)
        if necesita_direccion:
            stmt = stmt.outerjoin(Beneficiaria.lugar_nacimiento)

        conditions = []
        if activo is not None:
            conditions.append(Beneficiaria.activo == activo)
        
        if nombre:
            conditions.append(Beneficiaria.nombres.ilike(f"%{nombre}%"))
        if apellido:
            conditions.append(Beneficiaria.apellidos.ilike(f"%{apellido}%"))
        if codigo_expediente:
            conditions.append(Expediente.codigo_expediente.ilike(f"%{codigo_expediente}%"))
        if estado:
            conditions.append(EstadoBeneficiaria.descripcion.ilike(f"%{estado}%"))
        if institucion:
            conditions.append(Institucion.nombre.ilike(f"%{institucion}%"))
        if grado:
            conditions.append(Beneficiaria.grado_actual.ilike(f"%{grado}%"))
        if lugar_nacimiento:
            conditions.append(
                or_(
                    Direccion.ciudad.ilike(f"%{lugar_nacimiento}%"),
                    Direccion.estado.ilike(f"%{lugar_nacimiento}%")
                )
            )
        if fecha_nacimiento:
            conditions.append(Beneficiaria.fecha_nacimiento == fecha_nacimiento)
        if edad is not None:
            conditions.append(func.extract('year', func.age(Beneficiaria.fecha_nacimiento)) == edad)
        if edad_min is not None:
            conditions.append(func.extract('year', func.age(Beneficiaria.fecha_nacimiento)) >= edad_min)
        if edad_max is not None:
            conditions.append(func.extract('year', func.age(Beneficiaria.fecha_nacimiento)) <= edad_max)
        
        if conditions:
            stmt = stmt.where(and_(*conditions))
        
        order_map = {
            "id": Beneficiaria.id_beneficiaria,
            "nombres": Beneficiaria.nombres,
            "apellidos": Beneficiaria.apellidos,
            "edad": func.extract('year', func.age(Beneficiaria.fecha_nacimiento)),
            "estado": EstadoBeneficiaria.descripcion,
            "institucion": Institucion.nombre,
            "grado": Beneficiaria.grado_actual,
            "lugar_nacimiento": Direccion.ciudad  
        }
        
        order_column = order_map.get(order_by, Beneficiaria.id_beneficiaria)
        
        if order_dir == "desc":
            stmt = stmt.order_by(desc(order_column))
        else:
            stmt = stmt.order_by(asc(order_column))
        
        stmt = stmt.offset(skip).limit(limit)
        
        result = await db.execute(stmt)
        return result.scalars().all()

    @staticmethod
    async def obtener_beneficiaria_por_id(db: AsyncSession, beneficiaria_id: int):
        stmt = (
            select(Beneficiaria)
            .where(Beneficiaria.id_beneficiaria == beneficiaria_id)
            .options(
                selectinload(Beneficiaria.expediente).selectinload(Expediente.direccion),
                selectinload(Beneficiaria.expediente).selectinload(Expediente.beneficiarias).selectinload(Beneficiaria.estado_beneficiaria),
                selectinload(Beneficiaria.institucion),
                selectinload(Beneficiaria.estado_beneficiaria),
                selectinload(Beneficiaria.lugar_nacimiento),
                selectinload(Beneficiaria.representantes).selectinload(BeneficiariaRepresentante.parentesco),
                selectinload(Beneficiaria.representantes).selectinload(BeneficiariaRepresentante.representante).selectinload(Representante.direccion)
            )
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()
    
    @staticmethod
    async def validar_claves_foraneas(
        db: AsyncSession,
        id_expediente: Optional[int] = None,
        id_institucion: Optional[int] = None,
        id_direccion: Optional[int] = None,
        id_estado: Optional[int] = None,
        id_representante: Optional[int] = None,
        id_parentesco: Optional[int] = None
    ):
        if id_expediente is not None:
            res = await db.execute(select(Expediente).where(Expediente.id_expediente == id_expediente))
            if not res.scalar_one_or_none():
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"El expediente con ID {id_expediente} no existe.")

        if id_institucion is not None:
            res = await db.execute(select(Institucion).where(Institucion.id_institucion == id_institucion))
            if not res.scalar_one_or_none():
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"La institución con ID {id_institucion} no existe.")

        if id_direccion is not None:
            res = await db.execute(select(Direccion).where(Direccion.id_direccion == id_direccion))
            if not res.scalar_one_or_none():
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"La dirección con ID {id_direccion} no existe.")

        if id_estado is not None:
            res = await db.execute(select(EstadoBeneficiaria).where(EstadoBeneficiaria.id_estado_beneficiaria == id_estado))
            if not res.scalar_one_or_none():
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"El estado de beneficiaria con ID {id_estado} no existe.")

        if id_representante is not None:
            res = await db.execute(select(Representante).where(Representante.id_representante == id_representante))
            if not res.scalar_one_or_none():
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"El representante con ID {id_representante} no existe.")

        if id_parentesco is not None:
            res = await db.execute(select(Parentesco).where(Parentesco.id_parentesco == id_parentesco))
            if not res.scalar_one_or_none():
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"El parentesco con ID {id_parentesco} no existe.")

    @staticmethod
    async def crear_beneficiaria(db: AsyncSession, beneficiaria_in: BeneficiariaCreate):
        # 1. Validar claves foráneas
        await BeneficiariaService.validar_claves_foraneas(
            db=db,
            id_expediente=beneficiaria_in.id_expediente,
            id_institucion=beneficiaria_in.id_institucion,
            id_direccion=beneficiaria_in.id_direccion_lugar_nacimiento,
            id_estado=beneficiaria_in.id_estado_beneficiaria,
            id_representante=beneficiaria_in.id_representante,
            id_parentesco=beneficiaria_in.id_parentesco
        )

        # 2. Validar cédula única si fue provista
        if beneficiaria_in.cedula_identidad:
            stmt_cedula = select(Beneficiaria).where(
                Beneficiaria.cedula_identidad == beneficiaria_in.cedula_identidad
            )
            res_cedula = await db.execute(stmt_cedula)
            if res_cedula.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"La cédula '{beneficiaria_in.cedula_identidad}' ya pertenece a otra beneficiaria."
                )

        datos_dict = beneficiaria_in.model_dump()
        
        # Extraemos los campos de la tabla intermedia
        id_representante = datos_dict.pop("id_representante", None)
        id_parentesco = datos_dict.pop("id_parentesco", None)

        # Creamos la beneficiaria
        nueva_beneficiaria = Beneficiaria(**datos_dict)
        db.add(nueva_beneficiaria)
        await db.commit()
        await db.refresh(nueva_beneficiaria)
        
        # Si se especificó un representante, creamos el vínculo
        if id_representante is not None and id_parentesco is not None:
            vinculo = BeneficiariaRepresentante(
                id_beneficiaria=nueva_beneficiaria.id_beneficiaria,
                id_representante=id_representante,
                id_parentesco=id_parentesco
            )
            db.add(vinculo)
            await db.commit()
        
        return nueva_beneficiaria  
    
    @staticmethod
    async def actualizar_beneficiaria(db: AsyncSession, beneficiaria_id: int, datos_actualizacion: BeneficiariaUpdate):
        stmt = select(Beneficiaria).where(Beneficiaria.id_beneficiaria == beneficiaria_id)
        result = await db.execute(stmt)
        beneficiaria = result.scalar_one_or_none()
        
        if not beneficiaria:
            return None
            
        datos_dict = datos_actualizacion.model_dump(exclude_unset=True)
        
        # 1. Validar claves foráneas si se van a actualizar
        await BeneficiariaService.validar_claves_foraneas(
            db=db,
            id_expediente=datos_dict.get("id_expediente"),
            id_institucion=datos_dict.get("id_institucion"),
            id_direccion=datos_dict.get("id_direccion_lugar_nacimiento"),
            id_estado=datos_dict.get("id_estado_beneficiaria"),
            id_representante=datos_dict.get("id_representante"),
            id_parentesco=datos_dict.get("id_parentesco")
        )

        # 2. Validar cédula única si cambió
        if "cedula_identidad" in datos_dict and datos_dict["cedula_identidad"]:
            nueva_cedula = datos_dict["cedula_identidad"]
            if nueva_cedula != beneficiaria.cedula_identidad:
                stmt_cedula = select(Beneficiaria).where(
                    and_(
                        Beneficiaria.cedula_identidad == nueva_cedula,
                        Beneficiaria.id_beneficiaria != beneficiaria_id
                    )
                )
                res_cedula = await db.execute(stmt_cedula)
                if res_cedula.scalar_one_or_none():
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"La cédula '{nueva_cedula}' ya pertenece a otra beneficiaria."
                    )

        # 3. Extraer datos de la tabla intermedia
        has_representante = "id_representante" in datos_dict
        id_representante = datos_dict.pop("id_representante", None)
        
        has_parentesco = "id_parentesco" in datos_dict
        id_parentesco = datos_dict.pop("id_parentesco", None)

        # 4. Actualizar campos propios de la beneficiaria
        for key, value in datos_dict.items():
            setattr(beneficiaria, key, value)
            
        # 5. REGLA DE NEGOCIO: Si cambió de estado, sincronizar bandera activo
        if "id_estado_beneficiaria" in datos_dict:
            nuevo_estado_id = datos_dict["id_estado_beneficiaria"]
            if nuevo_estado_id == ESTADO_ACTIVA_ID:
                beneficiaria.activo = True
            else:
                beneficiaria.activo = False

        # 6. Gestionar tabla intermedia
        if has_representante or has_parentesco:
            stmt_vinculo = select(BeneficiariaRepresentante).where(
                BeneficiariaRepresentante.id_beneficiaria == beneficiaria_id
            )
            res_vinculo = await db.execute(stmt_vinculo)
            vinculo_existente = res_vinculo.scalar_one_or_none()

            if vinculo_existente:
                if has_representante and id_representante is not None:
                    vinculo_existente.id_representante = id_representante
                if has_parentesco and id_parentesco is not None:
                    vinculo_existente.id_parentesco = id_parentesco
            else:
                if id_representante is not None and id_parentesco is not None:
                    nuevo_vinculo = BeneficiariaRepresentante(
                        id_beneficiaria=beneficiaria_id,
                        id_representante=id_representante,
                        id_parentesco=id_parentesco
                    )
                    db.add(nuevo_vinculo)

        await db.commit()
        await db.refresh(beneficiaria)
        return beneficiaria
    
    @staticmethod
    async def eliminar_beneficiaria(db: AsyncSession, beneficiaria_id: int, force: bool = False):
        stmt = select(Beneficiaria).where(Beneficiaria.id_beneficiaria == beneficiaria_id)
        result = await db.execute(stmt)
        beneficiaria = result.scalar_one_or_none()
        
        if not beneficiaria:
            return None
            
        if force:
            # Eliminar primero los vínculos en la tabla intermedia para evitar violación de FK
            await db.execute(
                delete(BeneficiariaRepresentante).where(
                    BeneficiariaRepresentante.id_beneficiaria == beneficiaria_id
                )
            )
            await db.delete(beneficiaria)
            mensaje = f"Beneficiaria con ID {beneficiaria_id} fue eliminada permanentemente."
        else:
            beneficiaria.activo = False
            beneficiaria.id_estado_beneficiaria = ESTADO_ANULADA_ID 
            mensaje = f"Beneficiaria con ID {beneficiaria_id} fue desactivada y marcada como Anulada."
        
        await db.commit()
        
        return {"mensaje": mensaje}