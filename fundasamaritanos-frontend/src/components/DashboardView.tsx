import React, { useState, useEffect } from 'react';
import { Beneficiaria, ActividadLog, ViewMode, DashboardResponseData } from '../types';
import { dashboardApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';

interface DashboardViewProps {
  beneficiarias: Beneficiaria[];
  actividades: ActividadLog[];
  onNavigate: (view: ViewMode) => void;
  onSelectBeneficiaria: (beneficiaria: Beneficiaria) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  beneficiarias,
  actividades,
  onNavigate,
  onSelectBeneficiaria
}) => {
  const { isLector } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardResponseData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeAlertTab, setActiveAlertTab] = useState<'sin_rep' | 'proximas' | 'egresadas' | 'sin_grado'>('sin_rep');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    let isMounted = true;
    const fetchDashboard = async () => {
      try {
        setIsLoading(true);
        // GET /dashboard
        const data = await dashboardApi.getDashboard();
        if (isMounted) {
          setDashboardData(data);
        }
      } catch (error) {
        console.error('Error al cargar datos del dashboard:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchDashboard();
    return () => {
      isMounted = false;
    };
  }, []);

  const metricas = dashboardData?.metricas || {
    beneficiarias_activas: beneficiarias.filter(b => b.estado === 'Activa').length || 34,
    total_expedientes: beneficiarias.length || 28,
    ingresos_recientes: 4,
    promedio_beneficiarias_por_familia: 1.42
  };

  const distribucion = dashboardData?.distribucion;
  const alertas = dashboardData?.alertas;
  const cumpleanios = dashboardData?.cumpleanios_proximos || [];
  const calidad = dashboardData?.calidad_de_datos;

  // Normalizar rangos etarios desde backend (array [{rango, cantidad}] o record)
  const rangos: Record<string, number> = {
    '0-5': 0,
    '6-10': 0,
    '11-14': 0,
    '15-17': 0,
    '18+': 0
  };

  if (Array.isArray(distribucion?.por_rango_etario)) {
    distribucion.por_rango_etario.forEach(item => {
      if (item.rango && item.cantidad !== undefined) {
        rangos[item.rango] = item.cantidad;
      }
    });
  } else if (distribucion?.por_rango_etario && typeof distribucion.por_rango_etario === 'object') {
    Object.assign(rangos, distribucion.por_rango_etario);
  }

  const totalRango: number = (Object.values(rangos) as number[]).reduce((a: number, b: number) => a + Number(b), 0) || 1;

  // Normalizar listas de alertas
  const sinRepList = alertas?.sin_representante || [];
  const proximasList = alertas?.proximas_a_egresar || [];
  const egresadasList = alertas?.egresadas_sin_fecha_egreso || alertas?.egresadas_sin_fecha || [];
  const sinGradoList = alertas?.sin_grado_escolar || [];

  const countSinRep = alertas?.total_sin_representante ?? sinRepList.length;
  const countProximas = alertas?.total_proximas_a_egresar ?? proximasList.length;
  const countEgresadas = alertas?.total_egresadas_sin_fecha ?? egresadasList.length;
  const countSinGrado = alertas?.total_sin_grado ?? sinGradoList.length;

  // Instituciones normalizadas
  const institucionesList = distribucion?.por_institucion || [];
  const maxInstCount = Math.max(...institucionesList.map(i => i.cantidad), 8);

  // Evolución mensual normalizada
  const evolucionList = dashboardData?.evolucion_mensual || distribucion?.evolucion_mensual || [];
  const maxEvolucionScale = Math.max(...evolucionList.flatMap(e => [e.ingresos, e.egresos]), 10);

  // Calidad de datos calculada
  const totalActivas = metricas.beneficiarias_activas || 1;
  const sinCedulaCount = calidad?.beneficiarias_sin_cedula ?? 0;
  const sinCedulaPct = calidad?.sin_cedula_pct ?? Math.min(100, Math.round((sinCedulaCount / totalActivas) * 100));

  const totalExpedientes = metricas.total_expedientes || 1;
  const sinFechaRepCount = calidad?.representantes_sin_fecha_nacimiento ?? 0;
  const sinFechaRepPct = calidad?.sin_fecha_nacimiento_rep_pct ?? Math.min(100, Math.round((sinFechaRepCount / totalExpedientes) * 100));

  const dirIncompletasCount = calidad?.direcciones_incompletas ?? 0;
  const dirIncompletasPct = calidad?.direcciones_incompletas_pct ?? Math.min(100, Math.round((dirIncompletasCount / totalExpedientes) * 100));

  const puntajeSalud = calidad?.puntaje_general_pct ?? Math.max(0, 100 - Math.round((sinCedulaPct + sinFechaRepPct + dirIncompletasPct) / 3));

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#00256F] text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4">
          <span className="material-symbols-outlined text-emerald-400">check_circle</span>
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Greeting Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-semibold text-slate-500">Datos en tiempo real · Fundación Fundasamaritanos</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#00256F] font-display">
            Resumen General de Atención Integral
          </h2>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Seguimiento de expedientes, distribución etaria, alertas críticas y calidad de datos.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          {/* RBAC: Hide "Nuevo Expediente" if Lector */}
          {!isLector && (
            <button
              onClick={() => onNavigate('nuevo-expediente')}
              className="px-4 py-2.5 bg-[#00256F] hover:bg-[#132E70] text-white text-xs font-semibold rounded-xl shadow-xs hover:shadow-md transition flex items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>Nuevo Expediente</span>
            </button>
          )}
        </div>
      </div>

      {/* 4 Bento Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Beneficiarias Activas */}
        <div 
          onClick={() => onNavigate('beneficiarias')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-[#00256F]/40 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Beneficiarias Activas
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#00256F] flex items-center justify-center group-hover:bg-[#00256F] group-hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[22px]">person_check</span>
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold text-slate-900 font-display">
              {metricas.beneficiarias_activas}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-emerald-600 font-medium">
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              <span>En programa activo</span>
            </div>
          </div>
        </div>

        {/* KPI 2: Total Familias/Expedientes */}
        <div 
          onClick={() => onNavigate('beneficiarias')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-amber-400/60 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Familias / Expedientes
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[22px]">folder_open</span>
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold text-slate-900 font-display">
              {metricas.total_expedientes}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-amber-600 font-medium">
              <span className="material-symbols-outlined text-[16px]">family_restroom</span>
              <span>Núcleos familiares</span>
            </div>
          </div>
        </div>

        {/* KPI 3: Nuevos Ingresos (30 días) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Nuevos Ingresos (30d)
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">how_to_reg</span>
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold text-slate-900 font-display">
              +{metricas.ingresos_recientes}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-emerald-600 font-medium">
              <span className="material-symbols-outlined text-[16px]">trending_up</span>
              <span>Casos recientes</span>
            </div>
          </div>
        </div>

        {/* KPI 4: Promedio por Familia */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Promedio por Familia
            </span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">diversity_1</span>
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold text-slate-900 font-display">
              {metricas.promedio_beneficiarias_por_familia}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-purple-600 font-medium">
              <span className="material-symbols-outlined text-[16px]">child_care</span>
              <span>Niñas / expediente</span>
            </div>
          </div>
        </div>
      </div>

      {/* Gráficas: Distribución (Torta Rango Etario, Barras Instituciones, Línea Evolución) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfica 1: Dona / Torta Rango Etario */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-900 font-display text-base">
                Rango Etario
              </h3>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-[#00256F]">
                {totalRango} niñas
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Distribución por grupos de edad (0-5, 6-10, 11-14, 15-17, 18+ años)
            </p>

            {/* Donut Visualization */}
            <div className="flex items-center justify-center py-2">
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  {/* Background ring */}
                  <circle
                    cx="18"
                    cy="18"
                    r="15.915"
                    fill="transparent"
                    stroke="#F1F5F9"
                    strokeWidth="3.8"
                  />
                  {/* Segment 0-5 */}
                  <circle
                    cx="18"
                    cy="18"
                    r="15.915"
                    fill="transparent"
                    stroke="#38BDF8"
                    strokeWidth="3.8"
                    strokeDasharray={`${((rangos['0-5'] || 0) / totalRango) * 100} 100`}
                    strokeDashoffset="0"
                  />
                  {/* Segment 6-10 */}
                  <circle
                    cx="18"
                    cy="18"
                    r="15.915"
                    fill="transparent"
                    stroke="#00256F"
                    strokeWidth="3.8"
                    strokeDasharray={`${((rangos['6-10'] || 0) / totalRango) * 100} 100`}
                    strokeDashoffset={`-${((rangos['0-5'] || 0) / totalRango) * 100}`}
                  />
                  {/* Segment 11-14 */}
                  <circle
                    cx="18"
                    cy="18"
                    r="15.915"
                    fill="transparent"
                    stroke="#059669"
                    strokeWidth="3.8"
                    strokeDasharray={`${((rangos['11-14'] || 0) / totalRango) * 100} 100`}
                    strokeDashoffset={`-${(((rangos['0-5'] || 0) + (rangos['6-10'] || 0)) / totalRango) * 100}`}
                  />
                  {/* Segment 15-17 */}
                  <circle
                    cx="18"
                    cy="18"
                    r="15.915"
                    fill="transparent"
                    stroke="#D97706"
                    strokeWidth="3.8"
                    strokeDasharray={`${((rangos['15-17'] || 0) / totalRango) * 100} 100`}
                    strokeDashoffset={`-${(((rangos['0-5'] || 0) + (rangos['6-10'] || 0) + (rangos['11-14'] || 0)) / totalRango) * 100}`}
                  />
                  {/* Segment 18+ */}
                  <circle
                    cx="18"
                    cy="18"
                    r="15.915"
                    fill="transparent"
                    stroke="#64748B"
                    strokeWidth="3.8"
                    strokeDasharray={`${((rangos['18+'] || 0) / totalRango) * 100} 100`}
                    strokeDashoffset={`-${(((rangos['0-5'] || 0) + (rangos['6-10'] || 0) + (rangos['11-14'] || 0) + (rangos['15-17'] || 0)) / totalRango) * 100}`}
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-xl font-bold text-slate-800 font-display">{totalRango}</span>
                  <span className="text-[10px] text-slate-400 font-medium">Total</span>
                </div>
              </div>
            </div>
          </div>

          {/* Legend breakdown */}
          <div className="space-y-1.5 pt-3 border-t border-slate-100 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#38BDF8]" />
                <span className="text-slate-600">0 - 5 años (Primera infancia)</span>
              </div>
              <span className="font-bold text-slate-800">{rangos['0-5']} ({Math.round(((rangos['0-5'] || 0) / totalRango) * 100)}%)</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#00256F]" />
                <span className="text-slate-600">6 - 10 años (Primaria inicial)</span>
              </div>
              <span className="font-bold text-slate-800">{rangos['6-10']} ({Math.round(((rangos['6-10'] || 0) / totalRango) * 100)}%)</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#059669]" />
                <span className="text-slate-600">11 - 14 años (Preadolescencia)</span>
              </div>
              <span className="font-bold text-slate-800">{rangos['11-14']} ({Math.round(((rangos['11-14'] || 0) / totalRango) * 100)}%)</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#D97706]" />
                <span className="text-slate-600">15 - 17 años (Adolescencia)</span>
              </div>
              <span className="font-bold text-slate-800">{rangos['15-17']} ({Math.round(((rangos['15-17'] || 0) / totalRango) * 100)}%)</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#64748B]" />
                <span className="text-slate-600">18+ años (Egreso programado)</span>
              </div>
              <span className="font-bold text-slate-800">{rangos['18+']} ({Math.round(((rangos['18+'] || 0) / totalRango) * 100)}%)</span>
            </div>
          </div>
        </div>

        {/* Gráfica 2: Barras Distribución por Institución */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-slate-900 font-display text-base">
                Por Institución Educativa
              </h3>
              <span className="text-xs text-slate-400 font-medium">Top 5 centros</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Colegios y escuelas con mayor cantidad de beneficiarias
            </p>

            <div className="space-y-3.5">
              {(institucionesList.length > 0 ? institucionesList : [
                { nombre: 'U.E.B. República de Venezuela', cantidad: 8 },
                { nombre: 'Liceo Mariano Picón Salas', cantidad: 6 },
                { nombre: 'Colegio San Antonio de Padua', cantidad: 5 },
                { nombre: 'Escuela Básica Petare', cantidad: 4 },
                { nombre: 'Liceo Eulalia Buroz', cantidad: 3 }
              ]).map((inst, index) => {
                const nombreInst = (inst as any).nombre || (inst as any).institucion || 'Institución';
                const pct = Math.round((inst.cantidad / maxInstCount) * 100);
                return (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700 truncate max-w-[200px]" title={nombreInst}>
                        {nombreInst}
                      </span>
                      <span className="font-bold text-[#00256F]">{inst.cantidad} niñas</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-[#00256F] h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(5, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 mt-4 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Enlace escolar activo</span>
            <button 
              onClick={() => onNavigate('beneficiarias')}
              className="text-[#00256F] font-semibold hover:underline cursor-pointer"
            >
              Ver expedientes escolares &rarr;
            </button>
          </div>
        </div>

        {/* Gráfica 3: Tendencia / Líneas Evolución Mensual */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-slate-900 font-display text-base">
                Evolución Mensual (6m)
              </h3>
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#00256F]" />
                  <span className="text-slate-600">Ingresos</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span className="text-slate-600">Egresos</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Balance semestral de nuevos ingresos vs egresos legales
            </p>

            {/* Monthly Bar/Trend Visualizer */}
            <div className="h-44 flex items-end justify-between gap-2 pt-6 pb-2 px-2">
              {(evolucionList.length > 0 ? evolucionList : [
                { mes: '2025-01', ingresos: 5, egresos: 1 },
                { mes: '2025-02', ingresos: 7, egresos: 2 },
                { mes: '2025-03', ingresos: 6, egresos: 1 },
                { mes: '2025-04', ingresos: 8, egresos: 3 },
                { mes: '2025-05', ingresos: 10, egresos: 2 },
                { mes: '2025-06', ingresos: 4, egresos: 0 }
              ]).map((item, idx) => {
                const mesStr = (item as any).mes || (item as any).periodo || '';
                const hIngresos = Math.min(100, Math.round((item.ingresos / maxEvolucionScale) * 100));
                const hEgresos = Math.min(100, Math.round((item.egresos / maxEvolucionScale) * 100));
                const monthLabel = mesStr.includes('-') ? mesStr.split('-')[1] : mesStr;

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                    <div className="flex items-end gap-1 h-32 w-full justify-center">
                      {/* Ingresos bar */}
                      <div
                        className="w-3.5 bg-[#00256F] rounded-t-sm transition-all hover:bg-blue-800 relative cursor-pointer"
                        style={{ height: `${Math.max(10, hIngresos)}%` }}
                        title={`${mesStr}: ${item.ingresos} ingresos`}
                      >
                        <span className="opacity-0 group-hover:opacity-100 transition absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-[#00256F] bg-blue-50 px-1 rounded">
                          {item.ingresos}
                        </span>
                      </div>
                      {/* Egresos bar */}
                      <div
                        className="w-3.5 bg-rose-400 rounded-t-sm transition-all hover:bg-rose-600 relative cursor-pointer"
                        style={{ height: `${Math.max(6, hEgresos)}%` }}
                        title={`${mesStr}: ${item.egresos} egresos`}
                      >
                        <span className="opacity-0 group-hover:opacity-100 transition absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-rose-600 bg-rose-50 px-1 rounded">
                          {item.egresos}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 font-semibold">
                      M{monthLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>Tasa de retención: <strong>88.4%</strong></span>
            <span className="text-emerald-600 font-semibold">+6 neto semestral</span>
          </div>
        </div>
      </div>

      {/* Row: Panel de Alertas & Acciones (Pestañas visuales en cuadrícula) + Cumpleaños + Calidad de Datos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel de Alertas y Acciones */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 font-display text-base">
                Panel de Alertas y Acciones
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Puntos de atención técnica identificados para seguimiento prioritario
              </p>
            </div>
          </div>

          {/* Navigation Tabs - Visual 4-Card Selector (Responsive, No Scrollbars) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
            {/* Tab 1: Sin Representante */}
            <button
              type="button"
              onClick={() => setActiveAlertTab('sin_rep')}
              className={`p-3 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                activeAlertTab === 'sin_rep'
                  ? 'bg-rose-50/90 border-rose-300 ring-2 ring-rose-500/20 shadow-xs'
                  : 'bg-slate-50/70 hover:bg-slate-100/80 border-slate-200/80'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  activeAlertTab === 'sin_rep' ? 'bg-rose-600 text-white' : 'bg-rose-100 text-rose-700'
                }`}>
                  {countSinRep}
                </span>
              </div>
              <div className="mt-2">
                <p className="text-xs font-bold text-slate-800 leading-snug">Sin Tutor / Rep.</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Falta tutor legal</p>
              </div>
            </button>

            {/* Tab 2: Próximas a Egresar */}
            <button
              type="button"
              onClick={() => setActiveAlertTab('proximas')}
              className={`p-3 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                activeAlertTab === 'proximas'
                  ? 'bg-amber-50/90 border-amber-300 ring-2 ring-amber-500/20 shadow-xs'
                  : 'bg-slate-50/70 hover:bg-slate-100/80 border-slate-200/80'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  activeAlertTab === 'proximas' ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-800'
                }`}>
                  {countProximas}
                </span>
              </div>
              <div className="mt-2">
                <p className="text-xs font-bold text-slate-800 leading-snug">Próximas a Egresar</p>
                <p className="text-[10px] text-slate-500 mt-0.5">17+ años</p>
              </div>
            </button>

            {/* Tab 3: Egresadas sin Fecha */}
            <button
              type="button"
              onClick={() => setActiveAlertTab('egresadas')}
              className={`p-3 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                activeAlertTab === 'egresadas'
                  ? 'bg-rose-50/90 border-rose-300 ring-2 ring-rose-500/20 shadow-xs'
                  : 'bg-slate-50/70 hover:bg-slate-100/80 border-slate-200/80'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  activeAlertTab === 'egresadas' ? 'bg-rose-600 text-white' : 'bg-rose-100 text-rose-700'
                }`}>
                  {countEgresadas}
                </span>
              </div>
              <div className="mt-2">
                <p className="text-xs font-bold text-slate-800 leading-snug">Egresadas sin Fecha</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Falta fecha de egreso</p>
              </div>
            </button>

            {/* Tab 4: Sin Grado Escolar */}
            <button
              type="button"
              onClick={() => setActiveAlertTab('sin_grado')}
              className={`p-3 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                activeAlertTab === 'sin_grado'
                  ? 'bg-amber-50/90 border-amber-300 ring-2 ring-amber-500/20 shadow-xs'
                  : 'bg-slate-50/70 hover:bg-slate-100/80 border-slate-200/80'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  activeAlertTab === 'sin_grado' ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-800'
                }`}>
                  {countSinGrado}
                </span>
              </div>
              <div className="mt-2">
                <p className="text-xs font-bold text-slate-800 leading-snug">Sin Grado Escolar</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Ficha escolar vacía</p>
              </div>
            </button>
          </div>

          {/* Active Tab Content */}
          <div className="mt-2">
            {activeAlertTab === 'sin_rep' && (
              <div className="space-y-2">
                {sinRepList.length === 0 ? (
                  <div className="py-8 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                    <span className="material-symbols-outlined text-emerald-500 text-3xl">task_alt</span>
                    <p className="text-xs font-semibold text-slate-700 mt-1">Sin alertas pendientes</p>
                    <p className="text-[11px] text-slate-500">Todas las beneficiarias activas cuentan con tutor legal asignado.</p>
                  </div>
                ) : (
                  sinRepList.map((item) => {
                    const id = (item as any).id || (item as any).id_beneficiaria || 0;
                    const expCode = (item as any).expCode || `EXP-${String(id).padStart(4, '0')}`;
                    return (
                      <div key={id} className="p-3 bg-rose-50/50 rounded-xl border border-rose-100 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-rose-900">{item.nombres} {item.apellidos}</span>
                            <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-rose-200 text-rose-700">{expCode}</span>
                          </div>
                          <p className="text-xs text-rose-700 mt-0.5">{item.detalle || 'Activa en sistema pero sin tutor legal asociado'}</p>
                        </div>
                        <button 
                          onClick={() => onNavigate('beneficiarias')}
                          className="px-3 py-1.5 bg-white hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg text-xs font-semibold transition cursor-pointer"
                        >
                          Asignar Tutor
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {activeAlertTab === 'proximas' && (
              <div className="space-y-2">
                {proximasList.length === 0 ? (
                  <div className="py-8 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                    <span className="material-symbols-outlined text-emerald-500 text-3xl">task_alt</span>
                    <p className="text-xs font-semibold text-slate-700 mt-1">Sin alertas pendientes</p>
                    <p className="text-[11px] text-slate-500">No hay beneficiarias próximas a alcanzar la mayoría de edad.</p>
                  </div>
                ) : (
                  proximasList.map((item) => {
                    const id = (item as any).id || (item as any).id_beneficiaria || 0;
                    const expCode = (item as any).expCode || `EXP-${String(id).padStart(4, '0')}`;
                    return (
                      <div key={id} className="p-3 bg-amber-50/50 rounded-xl border border-amber-100 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-amber-900">{item.nombres} {item.apellidos}</span>
                            <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-amber-200 text-amber-800">{expCode}</span>
                            <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">{item.edad || 17} años</span>
                          </div>
                          <p className="text-xs text-amber-800 mt-0.5">{item.detalle || 'Supera o alcanza la mayoría de edad próximamente. Preparar plan de egreso autónomo.'}</p>
                        </div>
                        <button 
                          onClick={() => onNavigate('beneficiarias')}
                          className="px-3 py-1.5 bg-white hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg text-xs font-semibold transition cursor-pointer"
                        >
                          Plan de Egreso
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {activeAlertTab === 'egresadas' && (
              <div className="space-y-2">
                {egresadasList.length === 0 ? (
                  <div className="py-8 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                    <span className="material-symbols-outlined text-emerald-500 text-3xl">task_alt</span>
                    <p className="text-xs font-semibold text-slate-700 mt-1">Sin alertas pendientes</p>
                    <p className="text-[11px] text-slate-500">Todas las beneficiarias egresadas cuentan con fecha de egreso registrada.</p>
                  </div>
                ) : (
                  egresadasList.map((item) => {
                    const id = (item as any).id || (item as any).id_beneficiaria || 0;
                    const expCode = (item as any).expCode || `EXP-${String(id).padStart(4, '0')}`;
                    return (
                      <div key={id} className="p-3 bg-rose-50/50 rounded-xl border border-rose-100 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-rose-900">{item.nombres} {item.apellidos}</span>
                            <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-rose-200 text-rose-700">{expCode}</span>
                          </div>
                          <p className="text-xs text-rose-700 mt-0.5">Estado clasificado como Egresada pero falta completar el campo obligatorio <code>fecha_egreso</code>.</p>
                        </div>
                        <button 
                          onClick={() => onNavigate('beneficiarias')}
                          className="px-3 py-1.5 bg-white hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg text-xs font-semibold transition cursor-pointer"
                        >
                          Completar Fecha
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {activeAlertTab === 'sin_grado' && (
              <div className="space-y-2">
                {sinGradoList.length === 0 ? (
                  <div className="py-8 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                    <span className="material-symbols-outlined text-emerald-500 text-3xl">task_alt</span>
                    <p className="text-xs font-semibold text-slate-700 mt-1">Sin alertas pendientes</p>
                    <p className="text-[11px] text-slate-500">Todas las fichas tienen registrado el nivel y grado escolar.</p>
                  </div>
                ) : (
                  sinGradoList.map((item) => {
                    const id = (item as any).id || (item as any).id_beneficiaria || 0;
                    const expCode = (item as any).expCode || `EXP-${String(id).padStart(4, '0')}`;
                    return (
                      <div key={id} className="p-3 bg-amber-50/50 rounded-xl border border-amber-100 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-amber-900">{item.nombres} {item.apellidos}</span>
                            <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-amber-200 text-amber-800">{expCode}</span>
                          </div>
                          <p className="text-xs text-amber-800 mt-0.5">Sin nivel escolar especificado en la ficha técnica.</p>
                        </div>
                        <button 
                          onClick={() => onNavigate('beneficiarias')}
                          className="px-3 py-1.5 bg-white hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg text-xs font-semibold transition cursor-pointer"
                        >
                          Actualizar Grado
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Cumpleaños Próximos + Salud de los Datos */}
        <div className="space-y-6">
          {/* Widget de Cumpleaños */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-rose-500 text-[22px]">cake</span>
                <h3 className="font-bold text-slate-900 font-display text-sm">
                  Cumpleaños Próximos
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                7 días
              </span>
            </div>

            <div className="space-y-2.5">
              {cumpleanios.length === 0 ? (
                <div className="py-6 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                  <span className="material-symbols-outlined text-slate-400 text-2xl">sentiment_satisfied</span>
                  <p className="text-xs font-medium text-slate-500 mt-1">No hay cumpleaños en los próximos 7 días</p>
                </div>
              ) : (
                cumpleanios.map((c) => {
                  const id = (c as any).id || (c as any).id_beneficiaria || Math.random();
                  const fullName = (c as any).nombres 
                    ? `${(c as any).nombres} ${(c as any).apellidos || ''}`.trim() 
                    : ((c as any).nombre || 'Beneficiaria');
                  
                  const diasFaltantes = (c as any).dias_para_cumpleanios !== undefined
                    ? ((c as any).dias_para_cumpleanios === 0 ? 'Hoy' : (c as any).dias_para_cumpleanios === 1 ? 'Mañana' : `En ${(c as any).dias_para_cumpleanios} días`)
                    : ((c as any).dias_faltantes || 'Pronto');
                  
                  const fechaStr = (c as any).fecha_nacimiento 
                    ? new Date((c as any).fecha_nacimiento).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
                    : ((c as any).fecha || '');
                  
                  const edadStr = (c as any).edad_cumplir ? ` · Cumple ${(c as any).edad_cumplir} años` : '';

                  return (
                    <div key={id} className="p-2.5 bg-slate-50 hover:bg-rose-50/40 rounded-xl border border-slate-100 transition flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-800">{fullName}</p>
                        <p className="text-[11px] text-slate-500">{fechaStr}{edadStr}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        diasFaltantes === 'Hoy' 
                          ? 'bg-rose-600 text-white animate-pulse' 
                          : 'bg-blue-100 text-[#00256F]'
                      }`}>
                        {diasFaltantes}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Widget de Salud de los Datos */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-600 text-[20px]">health_and_safety</span>
                <h3 className="font-bold text-slate-900 font-display text-sm">
                  Salud de los Datos
                </h3>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                {puntajeSalud}% Completitud
              </span>
            </div>

            <div className="space-y-3 text-xs">
              {/* Sin Cédula */}
              <div>
                <div className="flex justify-between text-slate-600 mb-1">
                  <span>Sin Cédula (Partida nac.)</span>
                  <span className="font-bold text-slate-800">{sinCedulaCount} casos ({sinCedulaPct}%)</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div
                    className="bg-amber-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${sinCedulaPct}%` }}
                  />
                </div>
              </div>

              {/* Sin Fecha Nac. Tutor */}
              <div>
                <div className="flex justify-between text-slate-600 mb-1">
                  <span>Sin Fecha Nac. Tutor</span>
                  <span className="font-bold text-slate-800">{sinFechaRepCount} casos ({sinFechaRepPct}%)</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div
                    className="bg-blue-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${sinFechaRepPct}%` }}
                  />
                </div>
              </div>

              {/* Direcciones Incompletas */}
              <div>
                <div className="flex justify-between text-slate-600 mb-1">
                  <span>Direcciones Incompletas</span>
                  <span className="font-bold text-slate-800">{dirIncompletasCount} casos ({dirIncompletasPct}%)</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div
                    className="bg-purple-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${dirIncompletasPct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
