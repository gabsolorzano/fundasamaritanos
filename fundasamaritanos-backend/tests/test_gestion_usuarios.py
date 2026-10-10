import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_ciclo_completo_creacion_usuario_y_credenciales(client: AsyncClient, admin_headers: dict):
    # 1. Crear un nuevo trabajador en Personal
    nuevo_personal_payload = {
        "id_direccion": 1,
        "id_cargo": 1,
        "cedula": "V-99887766",
        "nombre": "Carlos",
        "apellido": "Prueba",
        "telefono": "0412-1112233",
        "tipo_personal": "Fijo",
        "estado": "Activo",
        "activo": True
    }
    resp_personal = await client.post("/personal/", json=nuevo_personal_payload, headers=admin_headers)
    assert resp_personal.status_code == 201, f"Error creando personal: {resp_personal.text}"
    personal_data = resp_personal.json()
    personal_id = personal_data["id"]

    try:
        # 2. Asignar credenciales de usuario al trabajador
        nuevo_usuario_payload = {
            "nombre_usuario": "carlos.prueba",
            "password": "Password123*",
            "personal_id": personal_id,
            "id_rol": 2 # Editor
        }
        resp_usuario = await client.post(f"/personal/{personal_id}/usuario", json=nuevo_usuario_payload, headers=admin_headers)
        assert resp_usuario.status_code == 201, f"Error asignando usuario: {resp_usuario.text}"
        usuario_data = resp_usuario.json()
        assert usuario_data["nombre_usuario"] == "carlos.prueba"
        assert usuario_data["id_rol"] == 2

        # 3. Probar inicio de sesión (Login) con el usuario recién creado
        login_resp = await client.post("/login", data={"username": "carlos.prueba", "password": "Password123*"})
        assert login_resp.status_code == 200, f"Error iniciando sesión: {login_resp.text}"
        token_data = login_resp.json()
        assert "access_token" in token_data
        assert token_data["rol"] == "Editor"

        # 4. Probar /me con el token del nuevo usuario
        user_headers = {"Authorization": f"Bearer {token_data['access_token']}"}
        me_resp = await client.get("/me", headers=user_headers)
        assert me_resp.status_code == 200
        me_data = me_resp.json()
        assert me_data["nombre_usuario"] == "carlos.prueba"
        assert me_data["rol"] == "Editor"
        assert me_data["personal"]["nombre"] == "Carlos"

        # 5. Regla de negocio: No se puede asignar un segundo usuario al mismo trabajador
        segundo_usuario_payload = {
            "nombre_usuario": "carlos.duplicado",
            "password": "Password123*",
            "personal_id": personal_id,
            "id_rol": 3
        }
        resp_duplicado = await client.post(f"/personal/{personal_id}/usuario", json=segundo_usuario_payload, headers=admin_headers)
        assert resp_duplicado.status_code == 400
        assert "ya cuenta con un usuario" in resp_duplicado.json()["detail"]

        # 6. Actualizar credenciales (cambio de rol a Administrador y cambio de contraseña)
        update_usuario_payload = {
            "id_rol": 1, # Cambiar a Administrador
            "password": "NuevaPassword456*"
        }
        update_resp = await client.put(f"/personal/{personal_id}/usuario", json=update_usuario_payload, headers=admin_headers)
        assert update_resp.status_code == 200
        assert update_resp.json()["id_rol"] == 1

        # 7. Verificar login con la nueva contraseña
        login_actualizado = await client.post("/login", data={"username": "carlos.prueba", "password": "NuevaPassword456*"})
        assert login_actualizado.status_code == 200
        assert login_actualizado.json()["rol"] == "Administrador"

        # 8. Verificar que la contraseña anterior ya no es válida
        login_antiguo = await client.post("/login", data={"username": "carlos.prueba", "password": "Password123*"})
        assert login_antiguo.status_code == 401

    finally:
        # 9. Limpieza: Eliminar permanentemente el personal de prueba
        del_resp = await client.delete(f"/personal/{personal_id}?permanente=true", headers=admin_headers)
        assert del_resp.status_code == 200

@pytest.mark.asyncio
async def test_crear_usuario_para_personal_inexistente(client: AsyncClient, admin_headers: dict):
    payload = {
        "nombre_usuario": "fantasma",
        "password": "Password123*",
        "personal_id": 99999,
        "id_rol": 3
    }
    resp = await client.post("/personal/99999/usuario", json=payload, headers=admin_headers)
    assert resp.status_code == 404
