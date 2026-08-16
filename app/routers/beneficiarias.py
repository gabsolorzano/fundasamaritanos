# app/routers/beneficiarias.py
# Endpoints para la gestión de beneficiarias.
# GET /beneficiarias - Listado con paginación, filtros y ordenamiento.

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func, asc, desc  # <-- Agregamos or_
from sqlalchemy.orm import selectinload
from typing import Optional, List
from app.core.db import get_db
from app.core.deps import get_current_user
from app.models.beneficiaria import Beneficiaria
from app.models.expediente import Expediente
from app.models.institucion import Institucion
from app.models.estado_beneficiaria import EstadoBeneficiaria
from app.models.direccion import Direccion  # Para lugar de nacimiento
from app.models.usuario import Usuario
from app.models.representante import Representante
from app.models.beneficiaria_representante import BeneficiariaRepresentante
from app.schemas.beneficiaria import BeneficiariaResponse, BeneficiariaDetailResponse

router = APIRouter(
    prefix="/beneficiarias",
    tags=["beneficiarias"],
    dependencies=[Depends(get_current_user)]  # Todas las rutas requieren autenticación
)

#Filtros para las beneficiarias
@router.get("/", response_model=List[BeneficiariaResponse])
async def list_beneficiarias(
    # Filtros (todos opcionales)
    nombre: Optional[str] = Query(None, description="Filtrar por nombre (contiene, insensible a mayúsculas)"),
    apellido: Optional[str] = Query(None, description="Filtrar por apellido (contiene, insensible a mayúsculas)"),
    codigo_expediente: Optional[str] = Query(None, description="Filtrar por código de expediente (exacto)"),
    estado: Optional[str] = Query(None, description="Filtrar por estado (Activa, Egresada, Trasladada)"),
    institucion: Optional[str] = Query(None, description="Filtrar por nombre de institución (contiene, insensible)"),
    grado: Optional[str] = Query(None, description="Filtrar por grado actual (contiene, insensible)"),
    lugar_nacimiento: Optional[str] = Query(None, description="Filtrar por ciudad o estado de nacimiento (contiene, insensible)"),
    edad_min: Optional[int] = Query(None, ge=0, description="Edad mínima en años (inclusive)"),
    edad_max: Optional[int] = Query(None, ge=0, description="Edad máxima en años (inclusive)"),
    
    # Paginación
    skip: int = Query(0, ge=0, description="Número de registros a saltar"),
    limit: int = Query(10, ge=1, le=100, description="Máximo de registros a devolver"),
    
    # Ordenamiento
    order_by: str = Query(
        "id", 
        regex="^(id|nombres|apellidos|edad|estado|institucion|grado|lugar_nacimiento)$",
        description="Campo por el cual ordenar (id, nombres, apellidos, edad, estado, institucion, grado, lugar_nacimiento)"
    ),
    order_dir: str = Query("asc", regex="^(asc|desc)$", description="Dirección del ordenamiento (asc o desc)"),
    
    # Dependencias inyectadas
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    
    #Lista beneficiarias con paginación, filtros y ordenamiento.
    
    # Construir la consulta base con joins y relaciones
    # Join con expediente, institución, estado y lugar de nacimiento.
    # Usamos selectinload para cargar las relaciones en una sola consulta adicional.
    stmt = (
        select(Beneficiaria)
        .join(Beneficiaria.expediente)                    # Para filtrar por código de expediente
        .join(Beneficiaria.institucion)                   # Para filtrar por nombre de institución
        .join(Beneficiaria.estado_beneficiaria)           # Para filtrar por estado
        .join(Beneficiaria.lugar_nacimiento)              # Para filtrar por lugar de nacimiento
        .options(
            selectinload(Beneficiaria.expediente),
            selectinload(Beneficiaria.institucion),
            selectinload(Beneficiaria.estado_beneficiaria),
            selectinload(Beneficiaria.lugar_nacimiento)   # Cargamos la dirección de nacimiento
        )
    )
    
    # Construir lista de condiciones para los filtros
    conditions = []
    
    # Filtro por nombre (contiene, insensible a mayúsculas)
    if nombre:
        conditions.append(Beneficiaria.nombres.ilike(f"%{nombre}%"))
    
    # Filtro por apellido (contiene, insensible)
    if apellido:
        conditions.append(Beneficiaria.apellidos.ilike(f"%{apellido}%"))
    
    # Filtro por código de expediente (exacto)
    if codigo_expediente:
        conditions.append(Expediente.codigo_expediente == codigo_expediente)
    
    # Filtro por estado (exacto)
    if estado:
        conditions.append(EstadoBeneficiaria.descripcion == estado)
    
    # Filtro por institución (contiene, insensible)
    if institucion:
        conditions.append(Institucion.nombre.ilike(f"%{institucion}%"))
    
    # Filtro por grado actual (contiene, insensible)
    if grado:
        conditions.append(Beneficiaria.grado_actual.ilike(f"%{grado}%"))
    
    # Filtro por lugar de nacimiento (ciudad o estado, contiene, insensible)
    #    Buscamos en ciudad o estado de la dirección de nacimiento usando OR
    if lugar_nacimiento:
        conditions.append(
            or_(
                Direccion.ciudad.ilike(f"%{lugar_nacimiento}%"),
                Direccion.estado.ilike(f"%{lugar_nacimiento}%")
            )
        )
    
    # Filtro por edad mínima (años exactos, usando func.age)
    if edad_min is not None:
        conditions.append(
            func.extract('year', func.age(Beneficiaria.fecha_nacimiento)) >= edad_min
        )
    
    # Filtro por edad máxima
    if edad_max is not None:
        conditions.append(
            func.extract('year', func.age(Beneficiaria.fecha_nacimiento)) <= edad_max
        )
    
    # Aplicar todas las condiciones a la consulta
    if conditions:
        stmt = stmt.where(and_(*conditions))
    
    # Construir la cláusula ORDER BY dinámica
    # Mapeamos los nombres de campos del frontend a los atributos del modelo o expresiones
    order_map = {
        "id": Beneficiaria.id_beneficiaria,
        "nombres": Beneficiaria.nombres,
        "apellidos": Beneficiaria.apellidos,
        "edad": func.extract('year', func.age(Beneficiaria.fecha_nacimiento)),
        "estado": EstadoBeneficiaria.descripcion,
        "institucion": Institucion.nombre,
        "grado": Beneficiaria.grado_actual,
        # Para lugar de nacimiento, ordenamos por ciudad y luego estado
        "lugar_nacimiento": Direccion.ciudad  
    }
    
    # Obtener la columna correspondiente (por defecto 'id')
    order_column = order_map.get(order_by, Beneficiaria.id_beneficiaria)
    
    # Determinar dirección (ascendente o descendente)
    if order_dir == "desc":
        stmt = stmt.order_by(desc(order_column))
    else:
        stmt = stmt.order_by(asc(order_column))
    
    # Paginación
    stmt = stmt.offset(skip).limit(limit)
    
    # Ejecutar la consulta
    result = await db.execute(stmt)
    beneficiarias = result.scalars().all()
    
    # Devolver la lista de beneficiarias
    return beneficiarias

# Toda la info de beneficiaria por ID
@router.get("/{beneficiaria_id}", response_model=BeneficiariaDetailResponse)
async def get_beneficiaria(
    beneficiaria_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    #Obtiene una beneficiaria específica con todas sus relaciones
    #Consulta principal con todas las relaciones necesarias
    stmt = (
        select(Beneficiaria)
        .where(Beneficiaria.id_beneficiaria == beneficiaria_id)
        .options(
            selectinload(Beneficiaria.expediente).selectinload(Expediente.direccion),
            selectinload(Beneficiaria.institucion),
            selectinload(Beneficiaria.estado_beneficiaria),
            selectinload(Beneficiaria.lugar_nacimiento),
            selectinload(Beneficiaria.representantes)
                .selectinload(BeneficiariaRepresentante.parentesco),
            selectinload(Beneficiaria.representantes)
                .selectinload(BeneficiariaRepresentante.representante)
                .selectinload(Representante.direccion)
        )
    )
    result = await db.execute(stmt)
    beneficiaria = result.scalar_one_or_none()

    if not beneficiaria:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Beneficiaria con ID {beneficiaria_id} no encontrada"
        )

    #Obtener hermanas (otras beneficiarias del mismo expediente, excluyendo la actual)
    hermanas_stmt = (
        select(Beneficiaria)
        .where(
            Beneficiaria.id_expediente == beneficiaria.id_expediente,
            Beneficiaria.id_beneficiaria != beneficiaria.id_beneficiaria
        )
        .options(
            selectinload(Beneficiaria.expediente),
            selectinload(Beneficiaria.estado_beneficiaria)
        )
    )
    hermanas_result = await db.execute(hermanas_stmt)
    hermanas = hermanas_result.scalars().all()

    #Construir manualmente la respuesta
    #Convertimos los objetos SQLAlchemy a diccionarios con la estructura esperada
    response_data = {
        "id_beneficiaria": beneficiaria.id_beneficiaria,
        "nombres": beneficiaria.nombres,
        "apellidos": beneficiaria.apellidos,
        "cedula_identidad": beneficiaria.cedula_identidad,
        "fecha_nacimiento": beneficiaria.fecha_nacimiento,
        "grado_actual": beneficiaria.grado_actual,
        "fecha_egreso": beneficiaria.fecha_egreso,
        "estado": beneficiaria.estado_beneficiaria.descripcion, 
        "expediente": {
            "id_expediente": beneficiaria.expediente.id_expediente,
            "codigo_expediente": beneficiaria.expediente.codigo_expediente,
            "fecha_apertura": beneficiaria.expediente.fecha_apertura,
            "observaciones": beneficiaria.expediente.observaciones,
            "direccion": {
                "id_direccion": beneficiaria.expediente.direccion.id_direccion,
                "calle_av": beneficiaria.expediente.direccion.calle_av,
                "edificio_casa": beneficiaria.expediente.direccion.edificio_casa,
                "urbanizacion": beneficiaria.expediente.direccion.urbanizacion,
                "ciudad": beneficiaria.expediente.direccion.ciudad,
                "municipio": beneficiaria.expediente.direccion.municipio,
                "estado": beneficiaria.expediente.direccion.estado
            }
        },
        "institucion": {
            "id_institucion": beneficiaria.institucion.id_institucion,
            "nombre": beneficiaria.institucion.nombre,
            "telefono": beneficiaria.institucion.telefono
        },
        "lugar_nacimiento": {
            "id_direccion": beneficiaria.lugar_nacimiento.id_direccion,
            "calle_av": beneficiaria.lugar_nacimiento.calle_av,
            "edificio_casa": beneficiaria.lugar_nacimiento.edificio_casa,
            "urbanizacion": beneficiaria.lugar_nacimiento.urbanizacion,
            "ciudad": beneficiaria.lugar_nacimiento.ciudad,
            "municipio": beneficiaria.lugar_nacimiento.municipio,
            "estado": beneficiaria.lugar_nacimiento.estado
        },
        "representantes": [
            {
                "id_representante": br.representante.id_representante,
                "nombres": br.representante.nombres,
                "apellidos": br.representante.apellidos,
                "fecha_nacimiento": br.representante.fecha_nacimiento,
                "telefono_contacto": br.representante.telefono_contacto,
                "ocupacion_laboral": br.representante.ocupacion_laboral,
                "direccion": {
                    "id_direccion": br.representante.direccion.id_direccion,
                    "calle_av": br.representante.direccion.calle_av,
                    "edificio_casa": br.representante.direccion.edificio_casa,
                    "urbanizacion": br.representante.direccion.urbanizacion,
                    "ciudad": br.representante.direccion.ciudad,
                    "municipio": br.representante.direccion.municipio,
                    "estado": br.representante.direccion.estado
                },
                "parentesco": br.parentesco.descripcion 
            }
            for br in beneficiaria.representantes
        ],
        "hermanas": [
            {
                "id_beneficiaria": h.id_beneficiaria,
                "nombres": h.nombres,
                "apellidos": h.apellidos,
                "codigo_expediente": h.expediente.codigo_expediente,
                "estado": h.estado_beneficiaria.descripcion
            }
            for h in hermanas
        ]
    }

    #Pydantic validará y convertirá automáticamente
    return response_data