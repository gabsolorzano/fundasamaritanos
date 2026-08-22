# app/services/beneficiarias.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func, asc, desc
from sqlalchemy.orm import selectinload
from typing import Optional

from app.models.beneficiaria import Beneficiaria
from app.models.expediente import Expediente
from app.models.institucion import Institucion
from app.models.estado_beneficiaria import EstadoBeneficiaria
from app.models.direccion import Direccion
from app.models.representante import Representante
from app.models.beneficiaria_representante import BeneficiariaRepresentante
from app.schemas.beneficiaria import BeneficiariaCreate, BeneficiariaUpdate, BeneficiariaDetailResponse

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
        edad_min: Optional[int] = None,
        edad_max: Optional[int] = None,
        activo: Optional[bool] = None,
        skip: int = 0,
        limit: int = 10,
        order_by: str = "id",
        order_dir: str = "asc"
    ):
        stmt = (
            select(Beneficiaria)
            .join(Beneficiaria.expediente)
            .join(Beneficiaria.institucion)
            .join(Beneficiaria.estado_beneficiaria)
            .join(Beneficiaria.lugar_nacimiento)
            .options(
                selectinload(Beneficiaria.expediente),
                selectinload(Beneficiaria.institucion),
                selectinload(Beneficiaria.estado_beneficiaria),
                selectinload(Beneficiaria.lugar_nacimiento)
            )
        )
        
        conditions = []
        if activo is not None:
            conditions.append(Beneficiaria.activo == activo)
        
        if nombre:
            conditions.append(Beneficiaria.nombres.ilike(f"%{nombre}%"))
        if apellido:
            conditions.append(Beneficiaria.apellidos.ilike(f"%{apellido}%"))
        if codigo_expediente:
            conditions.append(Expediente.codigo_expediente == codigo_expediente)
        if estado:
            conditions.append(EstadoBeneficiaria.descripcion == estado)
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
        beneficiaria = result.scalar_one_or_none()

        if not beneficiaria:
            return None

        # Pydantic valida y construye todo automáticamente en una sola línea
        return BeneficiariaDetailResponse.model_validate(beneficiaria)
    
    @staticmethod
    async def crear_beneficiaria(db: AsyncSession, beneficiaria_in: BeneficiariaCreate):
        #Convertimos los datos validados del esquema Pydantic a un diccionario 
        #y se los pasamos a nuestro modelo de SQLAlchemy.
        nueva_beneficiaria = Beneficiaria(**beneficiaria_in.model_dump())
        
        #Añadimos el nuevo objeto a la sesión de trabajo actual.
        db.add(nueva_beneficiaria)
        
        #Hacemos "commit" para guardar físicamente los cambios en la base de datos.
        await db.commit()
        
        #Refrescamos el objeto para obtener los datos autogenerados por Postgres 
        #(como el id_beneficiaria que se crea automáticamente).
        await db.refresh(nueva_beneficiaria)
        
        return nueva_beneficiaria  
    
    @staticmethod
    async def actualizar_beneficiaria(db: AsyncSession, beneficiaria_id: int, datos_actualizacion):
        # Buscamos a la beneficiaria
        stmt = select(Beneficiaria).where(Beneficiaria.id_beneficiaria == beneficiaria_id)
        result = await db.execute(stmt)
        beneficiaria = result.scalar_one_or_none()
        
        if not beneficiaria:
            return None
            
        # CONVERTIMOS EL OBJETO PYDANTIC A DICCIONARIO IGNORANDO LOS VALORES QUE NO SE ENVIARON (None)
        datos_dict = datos_actualizacion.model_dump(exclude_unset=True)

        # Actualizamos los campos dinámicamente
        for key, value in datos_dict.items():
            setattr(beneficiaria, key, value)
            
        # REGLA DE NEGOCIO: Si le cambiaron el estado, verificamos si debe desactivarse
        if "id_estado_beneficiaria" in datos_dict:
            nuevo_estado_id = datos_dict["id_estado_beneficiaria"]
            
            # Si el nuevo estado es diferente de 1 (Activa), la marcamos como inactiva automáticamente
            if nuevo_estado_id != 1:
                beneficiaria.activo = False
            else:
                beneficiaria.activo = True

        await db.commit()
        await db.refresh(beneficiaria)
        return beneficiaria
    
    @staticmethod
    async def eliminar_beneficiaria(db: AsyncSession, beneficiaria_id: int, force: bool = False):
        # Buscamos a la beneficiaria
        stmt = select(Beneficiaria).where(Beneficiaria.id_beneficiaria == beneficiaria_id)
        result = await db.execute(stmt)
        beneficiaria = result.scalar_one_or_none()
        
        # Si no existe, salimos
        if not beneficiaria:
            return None
            
        # Verificamos qué tipo de borrado nos pidieron
        if force:
            # BORRADO FÍSICO PERMANENTE (Para errores de tipeo al crear)
            await db.delete(beneficiaria)
            mensaje = f"Beneficiaria con ID {beneficiaria_id} fue eliminada PERMANENTEMENTE."
        else:
            # BORRADO LÓGICO + CAMBIO DE ESTADO (ID 4 = Anulada)
            beneficiaria.activo = False
            beneficiaria.id_estado_beneficiaria = 4 
            mensaje = f"Beneficiaria con ID {beneficiaria_id} fue desactivada y marcada como Anulada."
        
        # Guardamos los cambios
        await db.commit()
        
        return {"mensaje": mensaje}