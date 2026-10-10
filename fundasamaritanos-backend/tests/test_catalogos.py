import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_get_roles(client: AsyncClient, admin_headers: dict):
    response = await client.get("/roles/", headers=admin_headers)
    assert response.status_code == 200
    roles = response.json()
    assert isinstance(roles, list)
    nombres_roles = [r["nombre_rol"] for r in roles]
    assert "Administrador" in nombres_roles
    assert "Editor" in nombres_roles
    assert "Lector" in nombres_roles

@pytest.mark.asyncio
async def test_get_instituciones(client: AsyncClient, admin_headers: dict):
    response = await client.get("/instituciones/", headers=admin_headers)
    assert response.status_code == 200
    instituciones = response.json()
    assert isinstance(instituciones, list)
    assert len(instituciones) > 0

@pytest.mark.asyncio
async def test_get_direcciones(client: AsyncClient, admin_headers: dict):
    response = await client.get("/direcciones/", headers=admin_headers)
    assert response.status_code == 200
    direcciones = response.json()
    assert isinstance(direcciones, list)
    assert len(direcciones) > 0

@pytest.mark.asyncio
async def test_get_representantes(client: AsyncClient, admin_headers: dict):
    response = await client.get("/representantes/?limit=5", headers=admin_headers)
    assert response.status_code == 200
    representantes = response.json()
    assert isinstance(representantes, list)
    assert len(representantes) > 0

@pytest.mark.asyncio
async def test_get_dashboard_stats(client: AsyncClient, admin_headers: dict):
    # El dashboard devuelve métricas consolidadas del sistema
    response = await client.get("/dashboard/kpis", headers=admin_headers)
    # Si la ruta es /dashboard/kpis o /dashboard/
    if response.status_code == 404:
        response = await client.get("/dashboard/", headers=admin_headers)
    assert response.status_code == 200
