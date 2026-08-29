import asyncio
from datetime import date, datetime
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import AsyncSessionLocal, engine, Base
from app.models import (
    Direccion, Institucion, EstadoBeneficiaria, Parentesco, 
    Cargo, Rol, Expediente, Beneficiaria, Representante, 
    BeneficiariaRepresentante, Personal, Usuario
)

import bcrypt

async def truncate_tables(session: AsyncSession):
    """Elimina todos los datos de las tablas en orden inverso (respeta FK)"""
    tables = [
        "beneficiaria_representante", "usuarios", "personal", 
        "beneficiarias", "expedientes", "representantes",
        "instituciones", "direcciones", "estado_beneficiaria",
        "parentescos", "cargos", "roles"
    ]
    for table in tables:
        await session.execute(text(f"TRUNCATE TABLE {table} RESTART IDENTITY CASCADE"))
    await session.commit()

async def seed():
    async with AsyncSessionLocal() as session:
        #Limpiar datos existentes (para evitar duplicados)
        await truncate_tables(session)

        #CATÁLOGOS BÁSICOS
        print("Insertando catálogos...")
        
        # Direcciones
        dir1 = Direccion(calle_av="Sector Divino Niño", edificio_casa="", urbanizacion="La Rinconada", ciudad="Caracas", municipio="Libertador", estado="Distrito Capital")
        dir2 = Direccion(calle_av="", edificio_casa="", urbanizacion="", ciudad="Guanare", municipio="", estado="Portuguesa")
        dir3 = Direccion(calle_av="", edificio_casa="", urbanizacion="", ciudad="Carupano", municipio="", estado="Sucre")
        dir4 = Direccion(calle_av="", edificio_casa="", urbanizacion="", ciudad="Margarita", municipio="", estado="Nueva Esparta")
        session.add_all([dir1, dir2, dir3, dir4])
        await session.flush()  #Para obtener IDs
        dir_map = {1: dir1.id_direccion, 2: dir2.id_direccion, 3: dir3.id_direccion, 4: dir4.id_direccion}
        
        #Instituciones (todas con dirección 1)
        inst_data = [
            "Unidad Educativa Nacional Bolivariana (U.E.N.B.)",
            "Colegio Fe y Alegría Las Mayas",
            "U.E.B. Caciques Tiuna",
            "U.E.B. Centauro Bicentenario",
            "Liceo Técnica MacGregori",
            "Liceo Pedro Emilio Coll",
            "Colegio República de Venezuela",
            "U.E.N.B. República de Venezuela"
        ]
        instituciones = []
        for nombre in inst_data:
            instituciones.append(Institucion(nombre=nombre, id_direccion=dir_map[1]))
        session.add_all(instituciones)
        await session.flush()
        #Creamos un dict para buscar por nombre
        inst_map = {inst.nombre: inst.id_institucion for inst in instituciones}

        #Estados beneficiaria
        estados = ["Activa", "Egresada", "Trasladada", "Anulada"]
        for desc in estados:
            session.add(EstadoBeneficiaria(descripcion=desc))
        await session.flush()
        
        # Obtenemos el ID de 'Activa' para asignarlo por defecto a las niñas
        estado_activa = (await session.execute(text("SELECT id_estado_beneficiaria FROM estado_beneficiaria WHERE descripcion = 'Activa'"))).scalar()

        #Parentescos (en masculino/estándar)
        parentescos = ["Padre", "Madre", "Tío", "Abuelo", "Hermano Mayor", "Tutor Legal"]
        for desc in parentescos:
            session.add(Parentesco(descripcion=desc))
        await session.flush()
        parent_map = {}
        for p in parentescos:
            res = await session.execute(text(f"SELECT id_parentesco FROM parentescos WHERE descripcion = '{p}'"))
            parent_map[p] = res.scalar()

        #Cargos
        cargos = ["Coordinador", "Trabajador Social", "Administrativo", "Cocinera", "Mantenimiento"]
        for desc in cargos:
            session.add(Cargo(descripcion=desc))
        await session.flush()
        cargo_coordinador = (await session.execute(text("SELECT id_cargo FROM cargos WHERE descripcion = 'Coordinador'"))).scalar()

        #Roles
        roles = [
            ("Administrador", "Acceso total"),
            ("Editor", "Puede crear y editar"),
            ("Lector", "Solo lectura")
        ]
        for nombre, desc in roles:
            session.add(Rol(nombre_rol=nombre, descripcion=desc))
        await session.flush()
        rol_admin = (await session.execute(text("SELECT id_rol FROM roles WHERE nombre_rol = 'Administrador'"))).scalar()

        #FAMILIAS (DATOS REALES + 1 FICTICIA)
        print("Insertando familias...")
        
        # Estructura: lista de familias con expediente, beneficiarias y representantes
        familias = [
            #Familia 1 (Real)
            {
                "codigo": "EXP-00935-YB-2017",
                "direccion_id": dir_map[1],
                "beneficiarias": [
                    {"nombres": "Greiling Esmeralda", "apellidos": "Quintero Ochoa", "cedula": "34.106086", "fecha_nac": date(2011, 2, 20), "lugar_nac": 2, "institucion": "Unidad Educativa Nacional Bolivariana (U.E.N.B.)", "grado": "Educación Especial"},
                    {"nombres": "Enyerlin Rosalba", "apellidos": "Quintero Ochoa", "cedula": "37.090.800", "fecha_nac": date(2015, 2, 24), "lugar_nac": 2, "institucion": "Colegio Fe y Alegría Las Mayas", "grado": None}
                ],
                "representantes": [
                    {"nombres": "Gregoria", "apellidos": "Ochoa", "telefono": "0424 1982189", "ocupacion": "Obrera de mantenimiento en U.E.N.B. Cacique Tiuna", "parentesco": "Madre"}
                ]
            },
            #Familia 2 (Real)
            {
                "codigo": "EXP-0104-001-015-2022",
                "direccion_id": dir_map[1],
                "beneficiarias": [
                    {"nombres": "Abrahamderlys Nazareth", "apellidos": "Ochoa", "cedula": None, "fecha_nac": date(2017, 1, 6), "lugar_nac": 1, "institucion": "U.E.B. Caciques Tiuna", "grado": "3er grado"}
                ],
                "representantes": [
                    {"nombres": "Alexander José", "apellidos": "Ochoa García", "telefono": "0416 1537906", "ocupacion": "Descarga camiones en Mercado Mayor de Coche", "parentesco": "Padre"}
                ]
            },
            #Familia 3 (Real)
            {
                "codigo": "EXP-023-11-OT-2021",
                "direccion_id": dir_map[1],
                "beneficiarias": [
                    {"nombres": "Haranza Sharla Aida", "apellidos": "Soto Solórzano", "cedula": None, "fecha_nac": date(2017, 4, 13), "lugar_nac": 1, "institucion": "U.E.B. Centauro Bicentenario", "grado": "4to grado"},
                    {"nombres": "Hilary Arianny", "apellidos": "Soto Solórzano", "cedula": None, "fecha_nac": date(2012, 12, 23), "lugar_nac": 1, "institucion": "Liceo Técnica MacGregori", "grado": "2do año"}
                ],
                "representantes": [
                    {"nombres": "Daury Josefina", "apellidos": "Solórzano", "telefono": "0424 2243914", "ocupacion": "No especificada", "parentesco": "Madre"}
                ]
            },
            #Familia 4 (Real) -> Código nuevo
            {
                "codigo": "EXP-2026-001",
                "direccion_id": dir_map[1],
                "beneficiarias": [
                    {"nombres": "Meila Carolina", "apellidos": "Machado González", "cedula": None, "fecha_nac": date(2012, 1, 27), "lugar_nac": 1, "institucion": "Liceo Pedro Emilio Coll", "grado": "1er año"},
                    {"nombres": "Judith Melani", "apellidos": "Machado González", "cedula": None, "fecha_nac": date(2014, 10, 13), "lugar_nac": 1, "institucion": "Colegio República de Venezuela", "grado": "4to grado"}
                ],
                "representantes": [
                    {"nombres": "Elida María", "apellidos": "González", "telefono": "0412 3301709", "ocupacion": "Cocinera", "parentesco": "Madre"}
                ]
            },
            #Familia 5 (Real) -> Código nuevo
            {
                "codigo": "EXP-2026-002",
                "direccion_id": dir_map[1],
                "beneficiarias": [
                    {"nombres": "Kleidys Keviannys", "apellidos": "Tovar Villahermosa", "cedula": None, "fecha_nac": date(2015, 2, 19), "lugar_nac": 3, "institucion": "Colegio Fe y Alegría Las Mayas", "grado": "5to grado"},
                    {"nombres": "Emilanny Keliannys", "apellidos": "Tovar Villahermosa", "cedula": None, "fecha_nac": date(2014, 1, 1), "lugar_nac": 3, "institucion": "Colegio Fe y Alegría Las Mayas", "grado": "6to grado"} # Año aprox
                ],
                "representantes": [
                    {"nombres": "Milagros del Carmen", "apellidos": "Villahermosa Díaz", "telefono": "0412 7588097", "ocupacion": "Cocinera", "parentesco": "Madre"}
                ]
            },
            #Familia 6 (Real) -> Código nuevo
            {
                "codigo": "EXP-2026-003",
                "direccion_id": dir_map[1],
                "beneficiarias": [
                    {"nombres": "Gabriela Alexandra", "apellidos": "Meza Ramos", "cedula": "36.837.200", "fecha_nac": date(2012, 12, 26), "lugar_nac": 4, "institucion": "Colegio Fe y Alegría Las Mayas", "grado": "6to grado"},
                    {"nombres": "Alexa Andreina", "apellidos": "Rojas Ramos", "cedula": None, "fecha_nac": date(2015, 7, 6), "lugar_nac": 1, "institucion": "Colegio Fe y Alegría Las Mayas", "grado": "5to grado"}
                ],
                "representantes": [
                    {"nombres": "Aurora del Carmen", "apellidos": "Ramos Malavé", "telefono": "0412 3377117", "ocupacion": "Obrera de mantenimiento", "parentesco": "Madre"}
                ]
            },
            #Familia 7 (Real) -> Código nuevo, sin representante asignado (creamos genérico)
            {
                "codigo": "EXP-2026-004",
                "direccion_id": dir_map[1],
                "beneficiarias": [
                    {"nombres": "María Gabriela", "apellidos": "Morales Montiel", "cedula": None, "fecha_nac": date(2013, 9, 24), "lugar_nac": 1, "institucion": "U.E.N.B. República de Venezuela", "grado": None},
                    {"nombres": "Andrea Carolina", "apellidos": "Morales Montiel", "cedula": None, "fecha_nac": date(2015, 1, 1), "lugar_nac": 1, "institucion": "U.E.N.B. República de Venezuela", "grado": None},
                    {"nombres": "Adriana Lucía", "apellidos": "Morales Montiel", "cedula": None, "fecha_nac": date(2021, 1, 1), "lugar_nac": 1, "institucion": "U.E.N.B. República de Venezuela", "grado": "Preescolar"}
                ],
                "representantes": [
                    {"nombres": "Sin representante", "apellidos": "asignado", "telefono": "0000000", "ocupacion": "No especificada", "parentesco": "Tutor Legal"}
                ]
            },
            #Familia 8 (FICTICIA) -> Para pruebas de búsqueda
            {
                "codigo": "EXP-FICT-001",
                "direccion_id": dir_map[1],
                "beneficiarias": [
                    {"nombres": "María Ficticia", "apellidos": "Pérez Gómez", "cedula": "99.999.999", "fecha_nac": date(2016, 5, 15), "lugar_nac": 1, "institucion": "Colegio Fe y Alegría Las Mayas", "grado": "4to grado"},
                    {"nombres": "Ana Ficticia", "apellidos": "Pérez Gómez", "cedula": "88.888.888", "fecha_nac": date(2018, 8, 20), "lugar_nac": 1, "institucion": "U.E.B. Caciques Tiuna", "grado": "2do grado"}
                ],
                "representantes": [
                    {"nombres": "Juan Ficticio", "apellidos": "Pérez", "telefono": "0412 0000000", "ocupacion": "Ingeniero", "parentesco": "Padre"}
                ]
            }
        ]

        today = date.today()

        for fam in familias:
            # Crear expediente
            exp = Expediente(
                codigo_expediente=fam["codigo"],
                id_direccion=fam["direccion_id"],
                fecha_apertura=today,
                observaciones=""
            )
            session.add(exp)
            await session.flush()
            exp_id = exp.id_expediente

            # Insertar beneficiarias
            for ben_data in fam["beneficiarias"]:
                ben = Beneficiaria(
                    id_expediente=exp_id,
                    id_institucion=inst_map[ben_data["institucion"]],
                    id_direccion_lugar_nacimiento=dir_map[ben_data["lugar_nac"]],
                    id_estado_beneficiaria=estado_activa,
                    nombres=ben_data["nombres"],
                    apellidos=ben_data["apellidos"],
                    cedula_identidad=ben_data.get("cedula"),
                    fecha_nacimiento=ben_data["fecha_nac"],
                    grado_actual=ben_data.get("grado"),
                    fecha_egreso=None,
                    activo=True
                )
                session.add(ben)
            await session.flush()

            # Obtener IDs de las beneficiarias recién creadas para este expediente
            stmt = text(f"SELECT id_beneficiaria FROM beneficiarias WHERE id_expediente = {exp_id} ORDER BY id_beneficiaria")
            ben_ids = (await session.execute(stmt)).scalars().all()

            # Insertar representantes y relaciones
            for rep_data in fam["representantes"]:
                rep = Representante(
                    id_direccion=fam["direccion_id"],
                    nombres=rep_data["nombres"],
                    apellidos=rep_data["apellidos"],
                    fecha_nacimiento=None,
                    telefono_contacto=rep_data["telefono"],
                    ocupacion_laboral=rep_data.get("ocupacion"),
                    activo=True
                )
                session.add(rep)
                await session.flush()
                rep_id = rep.id_representante

                # Asociar a todas las beneficiarias de esta familia
                parent_id = parent_map[rep_data["parentesco"]]
                for ben_id in ben_ids:
                    rel = BeneficiariaRepresentante(
                        id_beneficiaria=ben_id,
                        id_representante=rep_id,
                        id_parentesco=parent_id
                    )
                    session.add(rel)

        #USUARIO ADMIN
        print("Creando usuario administrador...")
        personal = Personal(
            id_direccion=dir_map[1],
            id_cargo=cargo_coordinador,
            cedula="12345678",
            nombre="Admin",
            apellido="Sistema",
            telefono="0412-0000000",
            tipo_personal="Fijo",
            estado="Activo",
            activo=True
        )
        session.add(personal)
        await session.flush()

        usuario = Usuario(
            personal_id=personal.id,
            id_rol=rol_admin,
            nombre_usuario="admin",
            password_hash=bcrypt.hashpw("admin123".encode('utf-8'), bcrypt.gensalt()).decode('utf-8'),
            ultimo_acceso=datetime.now()
        )
        session.add(usuario)
        
        await session.commit()
        print("OK: ¡Seed completado exitosamente!")
        print(f"   - {len(familias)} expedientes creados.")
        print("   - Usuario admin: admin / contrasena: admin123")

if __name__ == "__main__":
    asyncio.run(seed())