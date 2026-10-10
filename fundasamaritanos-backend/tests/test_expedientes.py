import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_list_expedientes(client: AsyncClient, admin_headers: dict):
    response = await client.get("/expedientes/?limit=5", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert "codigo_expediente" in data[0]

@pytest.mark.asyncio
async def test_get_expediente_not_found(client: AsyncClient, admin_headers: dict):
    response = await client.get("/expedientes/999999", headers=admin_headers)
    assert response.status_code == 404

@pytest.mark.asyncio
async def test_validation_future_date_rejected(client: AsyncClient, editor_headers: dict):
    # La validación de negocio prohíbe fechas futuras de apertura
    payload = {
        "codigo_expediente": "EXP-FUTURO-TEST",
        "id_direccion": 1,
        "fecha_apertura": "2099-12-31",
        "observaciones": "Prueba fecha futura",
        "activo": True
    }
    response = await client.post("/expedientes/", json=payload, headers=editor_headers)
    assert response.status_code == 422
    assert "futura" in str(response.json())

@pytest.mark.asyncio
async def test_validation_empty_code_rejected(client: AsyncClient, editor_headers: dict):
    payload = {
        "codigo_expediente": "   ",
        "id_direccion": 1,
        "fecha_apertura": "2026-01-01",
        "observaciones": "Código vacío",
        "activo": True
    }
    response = await client.post("/expedientes/", json=payload, headers=editor_headers)
    assert response.status_code == 422

@pytest.mark.asyncio
async def test_expediente_crud_lifecycle(client: AsyncClient, editor_headers: dict, admin_headers: dict):
    codigo_test = "EXP-TEST-UNIT-2026"
    
    # 1. Crear con Editor
    create_payload = {
        "codigo_expediente": codigo_test,
        "id_direccion": 1,
        "fecha_apertura": "2026-01-15",
        "observaciones": "Creado por prueba unitaria",
        "activo": True
    }
    create_resp = await client.post("/expedientes/", json=create_payload, headers=editor_headers)
    assert create_resp.status_code == 201
    created_data = create_resp.json()
    expediente_id = created_data["id_expediente"]
    assert created_data["codigo_expediente"] == codigo_test

    # 2. Consultar detalle
    get_resp = await client.get(f"/expedientes/{expediente_id}", headers=editor_headers)
    assert get_resp.status_code == 200
    assert get_resp.json()["id_expediente"] == expediente_id

    # 3. Actualizar con Editor
    update_payload = {
        "observaciones": "Actualizado por prueba unitaria"
    }
    put_resp = await client.put(f"/expedientes/{expediente_id}", json=update_payload, headers=editor_headers)
    assert put_resp.status_code == 200
    assert put_resp.json()["observaciones"] == "Actualizado por prueba unitaria"

    # 4. Eliminar permanentemente con Administrador (limpieza)
    del_resp = await client.delete(f"/expedientes/{expediente_id}?force=true", headers=admin_headers)
    assert del_resp.status_code == 200

    # 5. Verificar que ya no existe
    verify_resp = await client.get(f"/expedientes/{expediente_id}", headers=admin_headers)
    assert verify_resp.status_code == 404
