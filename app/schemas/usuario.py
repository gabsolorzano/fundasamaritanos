#Esquemas para el login de usuarios.
from pydantic import BaseModel

class UsuarioLogin(BaseModel):
    #Datos que envía el usuario para iniciar sesión.
    nombre_usuario: str
    password: str

class UsuarioResponse(BaseModel):
    #Datos del usuario que se devuelven en el login (sin hash).
    id_usuario: int
    nombre_usuario: str
    rol: str
    nombres: str
    apellidos: str