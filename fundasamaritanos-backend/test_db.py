import asyncio
from sqlalchemy import text
from app.core.db import engine

async def test_connection():
    try:
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT 1"))
            print("✅ Conexión exitosa a la base de datos:", result.scalar())
    except Exception as e:
        print("❌ Error de conexión:", e)
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(test_connection())