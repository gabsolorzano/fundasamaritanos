import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_lector_can_read_expedientes(client: AsyncClient, lector_headers: dict):
    response = await client.get("/expedientes/", headers=lector_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)

@pytest.mark.asyncio
async def test_lector_cannot_create_expediente(client: AsyncClient, lector_headers: dict):
    payload = {
        "codigo_expediente": "EXP-LECTOR-TEST",
        "id_direccion": 1,
        "fecha_apertura": "2026-01-01",
        "observaciones": "Intento no autorizado",
        "activo": True
    }
    response = await client.post("/expedientes/", json=payload, headers=lector_headers)
    assert response.status_code == 403
    assert "Acceso denegado" in response.json()["detail"]

@pytest.mark.asyncio
async def test_lector_cannot_delete_expediente(client: AsyncClient, lector_headers: dict):
    response = await client.delete("/expedientes/1", headers=lector_headers)
    assert response.status_code == 403
    assert "Acceso denegado" in response.json()["detail"]

@pytest.mark.asyncio
async def test_editor_cannot_delete_expediente(client: AsyncClient, editor_headers: dict):
    # El rol Editor puede crear/editar pero NO eliminar (requiere solo Administrador)
    response = await client.delete("/expedientes/1", headers=editor_headers)
    assert response.status_code == 403
    assert "Acceso denegado" in response.json()["detail"]

@pytest.mark.asyncio
async def test_unauthenticated_request_blocked(client: AsyncClient):
    response = await client.get("/expedientes/")
    assert response.status_code == 401
