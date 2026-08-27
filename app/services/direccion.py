from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.direccion import Direccion
from app.schemas.direccion import DireccionCreate

async def get_direcciones(db: AsyncSession, q: str | None = None, skip: int = 0, limit: int = 10):
    
    #Busca direcciones de forma flexible (por urbanización, municipio, ciudad o calle)
    #o lista todas si no se pasa ningún texto de búsqueda (?q=).
    
    query = select(Direccion)
    if q:
        query = query.filter(
            (Direccion.urbanizacion.ilike(f"%{q}%")) |
            (Direccion.municipio.ilike(f"%{q}%")) |
            (Direccion.ciudad.ilike(f"%{q}%")) |
            (Direccion.estado.ilike(f"%{q}%")) |
            (Direccion.edificio_casa.ilike(f"%{q}%")) |
            (Direccion.calle_av.ilike(f"%{q}%"))
        )
    result = await db.execute(query.offset(skip).limit(limit))
    return result.scalars().all()

async def create_direccion(db: AsyncSession, direccion_in: DireccionCreate) -> Direccion:
    
    #Toma los datos validados por Pydantic, crea el objeto de la base de datos,
    #lo guarda y lo retorna con su ID generado.
    
    db_obj = Direccion(
        calle_av=direccion_in.calle_av,
        edificio_casa=direccion_in.edificio_casa,
        urbanizacion=direccion_in.urbanizacion,
        ciudad=direccion_in.ciudad,
        municipio=direccion_in.municipio,
        estado=direccion_in.estado
    )
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

async def get_direccion_by_id(db: AsyncSession, direccion_id: int) -> Direccion | None:
    result = await db.execute(select(Direccion).filter(Direccion.id_direccion == direccion_id))
    return result.scalars().first()