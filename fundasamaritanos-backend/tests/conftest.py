import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.security import create_access_token

@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as c:
        yield c

@pytest.fixture
def admin_token():
    return create_access_token({"sub": "1", "rol": "Administrador"})

@pytest.fixture
def editor_token():
    return create_access_token({"sub": "2", "rol": "Editor"})

@pytest.fixture
def lector_token():
    return create_access_token({"sub": "3", "rol": "Lector"})

@pytest.fixture
def admin_headers(admin_token: str):
    return {"Authorization": f"Bearer {admin_token}"}

@pytest.fixture
def editor_headers(editor_token: str):
    return {"Authorization": f"Bearer {editor_token}"}

@pytest.fixture
def lector_headers(lector_token: str):
    return {"Authorization": f"Bearer {lector_token}"}
