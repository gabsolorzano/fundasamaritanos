import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_list_beneficiarias(client: AsyncClient, admin_headers: dict):
    response = await client.get("/beneficiarias/?limit=5", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert "nombres" in data[0]

@pytest.mark.asyncio
async def test_get_beneficiaria_not_found(client: AsyncClient, admin_headers: dict):
    response = await client.get("/beneficiarias/999999", headers=admin_headers)
    assert response.status_code == 404

@pytest.mark.asyncio
async def test_beneficiaria_future_birth_rejected(client: AsyncClient, editor_headers: dict):
    # La fecha de nacimiento no puede ser futura
    payload = {
        "id_expediente": 1,
        "id_institucion": 1,
        "id_direccion_lugar_nacimiento": 1,
        "id_estado_beneficiaria": 1,
        "nombres": "Prueba",
        "apellidos": "Futura",
        "fecha_nacimiento": "2099-01-01"
    }
    response = await client.post("/beneficiarias/", json=payload, headers=editor_headers)
    assert response.status_code == 422
    assert "futura" in str(response.json())

@pytest.mark.asyncio
async def test_beneficiaria_egreso_before_nacimiento_rejected(client: AsyncClient, editor_headers: dict):
    # Fecha de egreso no puede ser anterior a la fecha de nacimiento
    payload = {
        "id_expediente": 1,
        "id_institucion": 1,
        "id_direccion_lugar_nacimiento": 1,
        "id_estado_beneficiaria": 2, # Egresada
        "nombres": "Prueba",
        "apellidos": "Incoherente",
        "fecha_nacimiento": "2015-05-10",
        "fecha_egreso": "2010-01-01"
    }
    response = await client.post("/beneficiarias/", json=payload, headers=editor_headers)
    assert response.status_code == 422
    assert "egreso" in str(response.json())

@pytest.mark.asyncio
async def test_beneficiaria_empty_names_rejected(client: AsyncClient, editor_headers: dict):
    payload = {
        "id_expediente": 1,
        "id_institucion": 1,
        "id_direccion_lugar_nacimiento": 1,
        "id_estado_beneficiaria": 1,
        "nombres": "   ",
        "apellidos": "Valido",
        "fecha_nacimiento": "2015-05-10"
    }
    response = await client.post("/beneficiarias/", json=payload, headers=editor_headers)
    assert response.status_code == 422
