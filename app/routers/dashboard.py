# app/routers/dashboard.py
"""
Dashboard — Métricas, distribuciones, alertas y calidad de datos.
Fundación Fundasamaritanos · Sistema de Gestión de Beneficiarias

Fases implementadas:
  Fase 1: Distribución por estado, alertas con detalle, calidad de datos
  Fase 2: Distribución por institución y rango etario, evolución mensual, familias
  Fase 3: Actividad del sistema, último ingreso registrado
"""
from datetime import date, timedelta
from typing import List, Optional
from collections import defaultdict

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel
from sqlalchemy import func, select, and_, not_, exists, or_, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.deps import get_current_user
from app.models.beneficiaria import Beneficiaria
from app.models.beneficiaria_representante import BeneficiariaRepresentante
from app.models.expediente import Expediente
from app.models.estado_beneficiaria import EstadoBeneficiaria
from app.models.institucion import Institucion
from app.models.representante import Representante
from app.models.direccion import Direccion


# ── Constantes de negocio ─────────────────────────────────────────────────────
ESTADO_ACTIVA_ID     = 1
ESTADO_EGRESADA_ID   = 2
ESTADO_TRASLADADA_ID = 3
ESTADO_ANULADA_ID    = 4

EDAD_PROXIMA_EGRESO  = 17
DIAS_CUMPLEANIOS     = 7
DIAS_INGRESO_RECIENTE = 30
MESES_EVOLUCION      = 6


# ══════════════════════════════════════════════════════════════════════════════
# ESQUEMAS DE RESPUESTA
# ══════════════════════════════════════════════════════════════════════════════

# ── Métricas generales ────────────────────────────────────────────────────────
class MetricasGenerales(BaseModel):
    beneficiarias_activas: int
    total_expedientes: int
    ingresos_recientes: int
    promedio_beneficiarias_por_familia: float


# ── Distribuciones ────────────────────────────────────────────────────────────
class ItemDistribucion(BaseModel):
    nombre: str
    cantidad: int

class RangoEtario(BaseModel):
    rango: str
    cantidad: int

class Distribucion(BaseModel):
    por_estado: List[ItemDistribucion]
    por_institucion: List[ItemDistribucion]
    por_rango_etario: List[RangoEtario]


# ── Evolución mensual ─────────────────────────────────────────────────────────
class MesEvolucion(BaseModel):
    mes: str          # formato "YYYY-MM"
    ingresos: int
    egresos: int


# ── Cumpleaños próximos ───────────────────────────────────────────────────────
class CumpleanioProximo(BaseModel):
    id_beneficiaria: int
    nombres: str
    apellidos: str
    fecha_nacimiento: date
    dias_para_cumpleanios: int


# ── Alertas accionables ───────────────────────────────────────────────────────
class BeneficiariaAlerta(BaseModel):
    id_beneficiaria: int
    nombres: str
    apellidos: str
    detalle: Optional[str] = None   # edad, institución, etc.

class Alertas(BaseModel):
    sin_representante: List[BeneficiariaAlerta]
    proximas_a_egresar: List[BeneficiariaAlerta]
    egresadas_sin_fecha_egreso: List[BeneficiariaAlerta]
    sin_grado_escolar: List[BeneficiariaAlerta]
    expedientes_inactivos_con_activa: List[BeneficiariaAlerta]
    # Conteos rápidos para el frontend
    total_sin_representante: int
    total_proximas_a_egresar: int
    total_egresadas_sin_fecha: int
    total_sin_grado: int
    total_exp_inactivos: int


# ── Métricas de familias ──────────────────────────────────────────────────────
class MetricasFamilias(BaseModel):
    total_familias: int
    promedio_beneficiarias_por_familia: float
    familias_sin_representante: int


# ── Calidad de datos ──────────────────────────────────────────────────────────
class CalidadDatos(BaseModel):
    beneficiarias_sin_cedula: int
    beneficiarias_sin_grado: int
    representantes_sin_fecha_nacimiento: int
    direcciones_incompletas: int


# ── Actividad del sistema ─────────────────────────────────────────────────────
class UltimoIngreso(BaseModel):
    id_beneficiaria: int
    nombres: str
    apellidos: str
    codigo_expediente: str

class ActividadSistema(BaseModel):
    ultimo_ingreso: Optional[UltimoIngreso]
    ultimo_expediente_abierto: Optional[str]   # código del expediente


# ── Respuesta completa ────────────────────────────────────────────────────────
class DashboardResponse(BaseModel):
    generado_en: date
    metricas: MetricasGenerales
    distribucion: Distribucion
    evolucion_mensual: List[MesEvolucion]
    cumpleanios_proximos: List[CumpleanioProximo]
    alertas: Alertas
    familias: MetricasFamilias
    calidad_de_datos: CalidadDatos
    actividad: ActividadSistema


# ══════════════════════════════════════════════════════════════════════════════
# ROUTER
# ══════════════════════════════════════════════════════════════════════════════
router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"],
    dependencies=[Depends(get_current_user)]
)


@router.get("/", response_model=DashboardResponse, status_code=status.HTTP_200_OK)
async def obtener_dashboard(db: AsyncSession = Depends(get_db)):
    """
    Retorna el dashboard completo: métricas, distribuciones, evolución mensual,
    alertas accionables, calidad de datos y actividad reciente del sistema.
    """
    hoy = date.today()
    limite_recientes = hoy - timedelta(days=DIAS_INGRESO_RECIENTE)

    # ══════════════════════════════════════════════════════════════════════════
    # BLOQUE 1 — MÉTRICAS GENERALES
    # ══════════════════════════════════════════════════════════════════════════

    # 1a. Beneficiarias activas
    total_activas: int = (await db.execute(
        select(func.count(Beneficiaria.id_beneficiaria))
        .where(Beneficiaria.id_estado_beneficiaria == ESTADO_ACTIVA_ID)
    )).scalar_one()

    # 1b. Total expedientes
    total_expedientes: int = (await db.execute(
        select(func.count(Expediente.id_expediente))
    )).scalar_one()

    # 1c. Ingresos recientes (beneficiarias en expedientes abiertos en los últimos 30 días)
    total_recientes: int = (await db.execute(
        select(func.count(Beneficiaria.id_beneficiaria))
        .join(Expediente, Beneficiaria.id_expediente == Expediente.id_expediente)
        .where(Expediente.fecha_apertura >= limite_recientes)
    )).scalar_one()

    # 1d. Promedio beneficiarias por expediente (familia)
    prom_por_familia = round(total_activas / total_expedientes, 2) if total_expedientes > 0 else 0.0

    # ══════════════════════════════════════════════════════════════════════════
    # BLOQUE 2 — DISTRIBUCIONES
    # ══════════════════════════════════════════════════════════════════════════

    # 2a. Por estado — JOIN con catálogo para obtener nombre legible
    res_estados = await db.execute(
        select(EstadoBeneficiaria.descripcion, func.count(Beneficiaria.id_beneficiaria))
        .join(Beneficiaria, Beneficiaria.id_estado_beneficiaria == EstadoBeneficiaria.id_estado_beneficiaria)
        .group_by(EstadoBeneficiaria.descripcion)
        .order_by(func.count(Beneficiaria.id_beneficiaria).desc())
    )
    dist_estado = [
        ItemDistribucion(nombre=nombre, cantidad=cnt)
        for nombre, cnt in res_estados.all()
    ]

    # 2b. Por institución (solo activas)
    res_inst = await db.execute(
        select(Institucion.nombre, func.count(Beneficiaria.id_beneficiaria))
        .join(Beneficiaria, Beneficiaria.id_institucion == Institucion.id_institucion)
        .where(Beneficiaria.id_estado_beneficiaria == ESTADO_ACTIVA_ID)
        .group_by(Institucion.nombre)
        .order_by(func.count(Beneficiaria.id_beneficiaria).desc())
    )
    dist_inst = [
        ItemDistribucion(nombre=nombre, cantidad=cnt)
        for nombre, cnt in res_inst.all()
    ]

    # 2c. Rangos etarios (solo activas) — calculado en Python sobre fechas de nacimiento
    res_fechas = await db.execute(
        select(Beneficiaria.fecha_nacimiento)
        .where(Beneficiaria.id_estado_beneficiaria == ESTADO_ACTIVA_ID)
    )
    fechas_nac = [f[0] for f in res_fechas.all()]

    rangos = {"0-5": 0, "6-10": 0, "11-14": 0, "15-17": 0, "18+": 0}
    for fn in fechas_nac:
        edad = hoy.year - fn.year - ((hoy.month, hoy.day) < (fn.month, fn.day))
        if edad <= 5:
            rangos["0-5"] += 1
        elif edad <= 10:
            rangos["6-10"] += 1
        elif edad <= 14:
            rangos["11-14"] += 1
        elif edad <= 17:
            rangos["15-17"] += 1
        else:
            rangos["18+"] += 1

    dist_etaria = [RangoEtario(rango=r, cantidad=c) for r, c in rangos.items()]

    # ══════════════════════════════════════════════════════════════════════════
    # BLOQUE 3 — EVOLUCIÓN MENSUAL (últimos 6 meses)
    # ══════════════════════════════════════════════════════════════════════════

    # Ingresos por mes: fecha_apertura del expediente asociado
    res_ingresos_mes = await db.execute(
        select(
            func.to_char(Expediente.fecha_apertura, "YYYY-MM").label("mes"),
            func.count(Beneficiaria.id_beneficiaria).label("cantidad")
        )
        .join(Beneficiaria, Beneficiaria.id_expediente == Expediente.id_expediente)
        .where(
            Expediente.fecha_apertura >= (hoy - timedelta(days=MESES_EVOLUCION * 31))
        )
        .group_by(text("mes"))
        .order_by(text("mes"))
    )
    ingresos_por_mes = {row.mes: row.cantidad for row in res_ingresos_mes.all()}

    # Egresos por mes: fecha_egreso de beneficiaria
    res_egresos_mes = await db.execute(
        select(
            func.to_char(Beneficiaria.fecha_egreso, "YYYY-MM").label("mes"),
            func.count(Beneficiaria.id_beneficiaria).label("cantidad")
        )
        .where(
            and_(
                Beneficiaria.fecha_egreso.is_not(None),
                Beneficiaria.fecha_egreso >= (hoy - timedelta(days=MESES_EVOLUCION * 31))
            )
        )
        .group_by(text("mes"))
        .order_by(text("mes"))
    )
    egresos_por_mes = {row.mes: row.cantidad for row in res_egresos_mes.all()}

    # Construir serie de los últimos N meses aunque no haya datos
    meses_serie = []
    for i in range(MESES_EVOLUCION - 1, -1, -1):
        primer_dia = (hoy.replace(day=1) - timedelta(days=i * 28)).replace(day=1)
        clave = primer_dia.strftime("%Y-%m")
        meses_serie.append(MesEvolucion(
            mes=clave,
            ingresos=ingresos_por_mes.get(clave, 0),
            egresos=egresos_por_mes.get(clave, 0)
        ))

    # ══════════════════════════════════════════════════════════════════════════
    # BLOQUE 4 — CUMPLEAÑOS PRÓXIMOS (próximos 7 días, ignora el año)
    # ══════════════════════════════════════════════════════════════════════════

    res_todas = await db.execute(
        select(
            Beneficiaria.id_beneficiaria,
            Beneficiaria.nombres,
            Beneficiaria.apellidos,
            Beneficiaria.fecha_nacimiento,
        ).where(Beneficiaria.id_estado_beneficiaria == ESTADO_ACTIVA_ID)
    )

    cumpleanios: List[CumpleanioProximo] = []
    for fila in res_todas.all():
        fn: date = fila.fecha_nacimiento
        try:
            cumple = fn.replace(year=hoy.year)
        except ValueError:
            cumple = fn.replace(year=hoy.year, day=28)
        if cumple < hoy:
            try:
                cumple = fn.replace(year=hoy.year + 1)
            except ValueError:
                cumple = fn.replace(year=hoy.year + 1, day=28)

        delta = (cumple - hoy).days
        if 0 <= delta <= DIAS_CUMPLEANIOS:
            cumpleanios.append(CumpleanioProximo(
                id_beneficiaria=fila.id_beneficiaria,
                nombres=fila.nombres,
                apellidos=fila.apellidos,
                fecha_nacimiento=fila.fecha_nacimiento,
                dias_para_cumpleanios=delta
            ))
    cumpleanios.sort(key=lambda x: x.dias_para_cumpleanios)

    # ══════════════════════════════════════════════════════════════════════════
    # BLOQUE 5 — ALERTAS ACCIONABLES
    # ══════════════════════════════════════════════════════════════════════════

    subq_rep = (
        select(BeneficiariaRepresentante.id_beneficiaria)
        .where(BeneficiariaRepresentante.id_beneficiaria == Beneficiaria.id_beneficiaria)
        .correlate(Beneficiaria)
    )

    # 5a. Activas sin representante
    res_sin_rep = await db.execute(
        select(Beneficiaria.id_beneficiaria, Beneficiaria.nombres, Beneficiaria.apellidos)
        .where(
            and_(
                Beneficiaria.id_estado_beneficiaria == ESTADO_ACTIVA_ID,
                not_(exists(subq_rep))
            )
        ).order_by(Beneficiaria.apellidos)
    )
    lista_sin_rep = [
        BeneficiariaAlerta(id_beneficiaria=r.id_beneficiaria, nombres=r.nombres, apellidos=r.apellidos)
        for r in res_sin_rep.all()
    ]

    # 5b. Próximas a egresar (>17 años, activas)
    res_mayores = await db.execute(
        select(
            Beneficiaria.id_beneficiaria,
            Beneficiaria.nombres,
            Beneficiaria.apellidos,
            Beneficiaria.fecha_nacimiento,
        ).where(
            and_(
                Beneficiaria.id_estado_beneficiaria == ESTADO_ACTIVA_ID,
                func.extract("year", func.age(Beneficiaria.fecha_nacimiento)) > EDAD_PROXIMA_EGRESO
            )
        ).order_by(Beneficiaria.fecha_nacimiento)
    )
    lista_proximas = []
    for r in res_mayores.all():
        edad = hoy.year - r.fecha_nacimiento.year - (
            (hoy.month, hoy.day) < (r.fecha_nacimiento.month, r.fecha_nacimiento.day)
        )
        lista_proximas.append(BeneficiariaAlerta(
            id_beneficiaria=r.id_beneficiaria,
            nombres=r.nombres,
            apellidos=r.apellidos,
            detalle=f"{edad} años"
        ))

    # 5c. Egresadas/Trasladadas sin fecha de egreso registrada
    res_sin_fecha = await db.execute(
        select(Beneficiaria.id_beneficiaria, Beneficiaria.nombres, Beneficiaria.apellidos)
        .where(
            and_(
                Beneficiaria.id_estado_beneficiaria.in_([ESTADO_EGRESADA_ID, ESTADO_TRASLADADA_ID]),
                Beneficiaria.fecha_egreso.is_(None)
            )
        ).order_by(Beneficiaria.apellidos)
    )
    lista_sin_fecha = [
        BeneficiariaAlerta(id_beneficiaria=r.id_beneficiaria, nombres=r.nombres, apellidos=r.apellidos)
        for r in res_sin_fecha.all()
    ]

    # 5d. Activas sin grado escolar
    res_sin_grado = await db.execute(
        select(Beneficiaria.id_beneficiaria, Beneficiaria.nombres, Beneficiaria.apellidos)
        .where(
            and_(
                Beneficiaria.id_estado_beneficiaria == ESTADO_ACTIVA_ID,
                or_(
                    Beneficiaria.grado_actual.is_(None),
                    Beneficiaria.grado_actual == ""
                )
            )
        ).order_by(Beneficiaria.apellidos)
    )
    lista_sin_grado = [
        BeneficiariaAlerta(id_beneficiaria=r.id_beneficiaria, nombres=r.nombres, apellidos=r.apellidos)
        for r in res_sin_grado.all()
    ]

    # 5e. Activas vinculadas a un expediente inactivo (inconsistencia crítica)
    res_exp_inactivo = await db.execute(
        select(Beneficiaria.id_beneficiaria, Beneficiaria.nombres, Beneficiaria.apellidos)
        .join(Expediente, Beneficiaria.id_expediente == Expediente.id_expediente)
        .where(
            and_(
                Beneficiaria.id_estado_beneficiaria == ESTADO_ACTIVA_ID,
                Expediente.activo == False
            )
        ).order_by(Beneficiaria.apellidos)
    )
    lista_exp_inactivo = [
        BeneficiariaAlerta(id_beneficiaria=r.id_beneficiaria, nombres=r.nombres, apellidos=r.apellidos)
        for r in res_exp_inactivo.all()
    ]

    # ══════════════════════════════════════════════════════════════════════════
    # BLOQUE 6 — MÉTRICAS DE FAMILIAS
    # ══════════════════════════════════════════════════════════════════════════

    # Expedientes con al menos 1 beneficiaria activa = "familias activas"
    res_familias_activas = await db.execute(
        select(func.count(func.distinct(Beneficiaria.id_expediente)))
        .where(Beneficiaria.id_estado_beneficiaria == ESTADO_ACTIVA_ID)
    )
    total_familias = res_familias_activas.scalar_one() or 0
    prom_familia = round(total_activas / total_familias, 2) if total_familias > 0 else 0.0

    # Familias sin ningún representante registrado
    res_fam_sin_rep = await db.execute(
        select(func.count(func.distinct(Beneficiaria.id_expediente)))
        .where(
            and_(
                Beneficiaria.id_estado_beneficiaria == ESTADO_ACTIVA_ID,
                not_(exists(subq_rep))
            )
        )
    )
    familias_sin_rep = res_fam_sin_rep.scalar_one() or 0

    # ══════════════════════════════════════════════════════════════════════════
    # BLOQUE 7 — CALIDAD DE DATOS
    # ══════════════════════════════════════════════════════════════════════════

    sin_cedula: int = (await db.execute(
        select(func.count(Beneficiaria.id_beneficiaria))
        .where(
            and_(
                Beneficiaria.id_estado_beneficiaria == ESTADO_ACTIVA_ID,
                Beneficiaria.cedula_identidad.is_(None)
            )
        )
    )).scalar_one()

    sin_grado_calidad: int = (await db.execute(
        select(func.count(Beneficiaria.id_beneficiaria))
        .where(
            and_(
                Beneficiaria.id_estado_beneficiaria == ESTADO_ACTIVA_ID,
                or_(Beneficiaria.grado_actual.is_(None), Beneficiaria.grado_actual == "")
            )
        )
    )).scalar_one()

    rep_sin_fecha: int = (await db.execute(
        select(func.count(Representante.id_representante))
        .where(Representante.fecha_nacimiento.is_(None))
    )).scalar_one()

    # Direcciones incompletas: calle_av vacía o 'Sin especificar'
    dir_incompletas: int = (await db.execute(
        select(func.count(Direccion.id_direccion))
        .where(
            or_(
                Direccion.calle_av.is_(None),
                Direccion.calle_av == "",
                Direccion.calle_av.ilike("Sin especificar")
            )
        )
    )).scalar_one()

    # ══════════════════════════════════════════════════════════════════════════
    # BLOQUE 8 — ACTIVIDAD DEL SISTEMA
    # ══════════════════════════════════════════════════════════════════════════

    # Última beneficiaria registrada (ID más alto = más reciente)
    res_ultimo = await db.execute(
        select(
            Beneficiaria.id_beneficiaria,
            Beneficiaria.nombres,
            Beneficiaria.apellidos,
            Expediente.codigo_expediente
        )
        .join(Expediente, Beneficiaria.id_expediente == Expediente.id_expediente)
        .order_by(Beneficiaria.id_beneficiaria.desc())
        .limit(1)
    )
    fila_ultima = res_ultimo.first()
    ultimo_ingreso = UltimoIngreso(
        id_beneficiaria=fila_ultima.id_beneficiaria,
        nombres=fila_ultima.nombres,
        apellidos=fila_ultima.apellidos,
        codigo_expediente=fila_ultima.codigo_expediente
    ) if fila_ultima else None

    # Último expediente abierto
    res_ultimo_exp = await db.execute(
        select(Expediente.codigo_expediente)
        .order_by(Expediente.fecha_apertura.desc(), Expediente.id_expediente.desc())
        .limit(1)
    )
    ultimo_exp_row = res_ultimo_exp.first()
    ultimo_exp_codigo = ultimo_exp_row[0] if ultimo_exp_row else None

    # ══════════════════════════════════════════════════════════════════════════
    # ENSAMBLAR RESPUESTA
    # ══════════════════════════════════════════════════════════════════════════
    return DashboardResponse(
        generado_en=hoy,

        metricas=MetricasGenerales(
            beneficiarias_activas=total_activas,
            total_expedientes=total_expedientes,
            ingresos_recientes=total_recientes,
            promedio_beneficiarias_por_familia=prom_por_familia,
        ),

        distribucion=Distribucion(
            por_estado=dist_estado,
            por_institucion=dist_inst,
            por_rango_etario=dist_etaria,
        ),

        evolucion_mensual=meses_serie,

        cumpleanios_proximos=cumpleanios,

        alertas=Alertas(
            sin_representante=lista_sin_rep,
            proximas_a_egresar=lista_proximas,
            egresadas_sin_fecha_egreso=lista_sin_fecha,
            sin_grado_escolar=lista_sin_grado,
            expedientes_inactivos_con_activa=lista_exp_inactivo,
            total_sin_representante=len(lista_sin_rep),
            total_proximas_a_egresar=len(lista_proximas),
            total_egresadas_sin_fecha=len(lista_sin_fecha),
            total_sin_grado=len(lista_sin_grado),
            total_exp_inactivos=len(lista_exp_inactivo),
        ),

        familias=MetricasFamilias(
            total_familias=total_familias,
            promedio_beneficiarias_por_familia=prom_familia,
            familias_sin_representante=familias_sin_rep,
        ),

        calidad_de_datos=CalidadDatos(
            beneficiarias_sin_cedula=sin_cedula,
            beneficiarias_sin_grado=sin_grado_calidad,
            representantes_sin_fecha_nacimiento=rep_sin_fecha,
            direcciones_incompletas=dir_incompletas,
        ),

        actividad=ActividadSistema(
            ultimo_ingreso=ultimo_ingreso,
            ultimo_expediente_abierto=ultimo_exp_codigo,
        ),
    )
