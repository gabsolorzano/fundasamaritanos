import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_login_success_admin(client: AsyncClient):
    response = await client.post("/login", data={"username": "admin", "password": "admin123"})
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["rol"] == "Administrador"

@pytest.mark.asyncio
async def test_login_success_editor(client: AsyncClient):
    response = await client.post("/login", data={"username": "editor", "password": "editor123"})
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["rol"] == "Editor"

@pytest.mark.asyncio
async def test_login_success_lector(client: AsyncClient):
    response = await client.post("/login", data={"username": "lector", "password": "lector123"})
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["rol"] == "Lector"

@pytest.mark.asyncio
async def test_login_invalid_password(client: AsyncClient):
    response = await client.post("/login", data={"username": "admin", "password": "password_incorrecto"})
    assert response.status_code == 401
    assert "Usuario o contraseña incorrectos" in response.json()["detail"]

@pytest.mark.asyncio
async def test_login_nonexistent_user(client: AsyncClient):
    response = await client.post("/login", data={"username": "usuario_que_no_existe", "password": "123"})
    assert response.status_code == 401
    assert "Usuario o contraseña incorrectos" in response.json()["detail"]

@pytest.mark.asyncio
async def test_get_me_authorized(client: AsyncClient, admin_headers: dict):
    response = await client.get("/me", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["nombre_usuario"] == "admin"
    assert data["rol"] == "Administrador"
    assert "personal" in data

@pytest.mark.asyncio
async def test_get_me_unauthorized(client: AsyncClient):
    response = await client.get("/me")
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_get_me_invalid_token(client: AsyncClient):
    response = await client.get("/me", headers={"Authorization": "Bearer token_falso_invalido"})
    assert response.status_code == 401
