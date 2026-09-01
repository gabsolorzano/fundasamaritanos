from fastapi import FastAPI, Depends
from fastapi.security import OAuth2PasswordBearer
from app.routers import auth
from app.core.deps import get_current_user
from app.models.usuario import Usuario
from app.routers import beneficiarias
from app.routers import expedientes
from app.routers import representantes
from app.routers import direccion, institucion, personal
from app.routers import roles
from app.routers import dashboard


# Configurar el esquema de OAuth2 para Swagger
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

app = FastAPI(
    title="Fundasamaritanos API",
    version="1.0.0",
    swagger_ui_oauth2_redirect_url="/docs/oauth2-redirect"
)

#Incluir routers
app.include_router(auth.router)
app.include_router(beneficiarias.router)  
app.include_router(expedientes.router)
app.include_router(representantes.router)
app.include_router(direccion.router)
app.include_router(institucion.router)
app.include_router(personal.router)
app.include_router(roles.router)
app.include_router(dashboard.router)



@app.get("/")
async def root():
    return {"message": "API de Fundasamaritanos funcionando"}

@app.get("/me")
async def read_users_me(current_user: Usuario = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "nombre_usuario": current_user.nombre_usuario,
        "rol": current_user.rol.nombre_rol,
        "personal": {
            "nombre": current_user.personal.nombre,
            "apellido": current_user.personal.apellido,
            "cargo": current_user.personal.cargo.descripcion
        }
    }