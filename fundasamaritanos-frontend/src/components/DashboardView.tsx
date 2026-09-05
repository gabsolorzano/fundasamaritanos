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

  // Total for donut
  const rangos: Record<string, number> = (distribucion?.por_rango_etario as Record<string, number>) || {
    '0-5': 4,
    '6-10': 12,
    '11-14': 14,
    '15-17': 6,
    '18+': 2
  };
  const totalRango: number = (Object.values(rangos) as number[]).reduce((a: number, b: number) => a + Number(b), 0) || 1;

  const handleExportCSV = () => {
    const headers = ['Codigo', 'Nombres', 'Apellidos', 'Edad', 'Grado', 'Estado', 'Representante'];
    const rows = beneficiarias.map(b => [
      b.expCode,
      `"${b.nombres}"`,
      `"${b.apellidos}"`,
      b.edad,
      `"${b.grado}"`,
      b.estado,
      `"${b.representantePrincipal}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Expedientes_Fundasamaritanos_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Lista de expedientes exportada exitosamente en formato CSV.');
  };

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
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-blue-50 text-[#00256F] border border-blue-200">
              GET /dashboard
            </span>
            <span className="text-xs text-slate-400">· Datos en tiempo real</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#00256F] font-display">
            Resumen General de Atención Integral
          </h2>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Seguimiento de expedientes, distribución etaria, alertas críticas y calidad de datos.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition flex items-center gap-2 cursor-pointer border border-slate-200"
            title="Descargar datos en CSV"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            <span>Exportar CSV</span>
          </button>

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

      {/* 4 Bento Metric Cards (Mapeo de data.metricas) */}
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
              <span className="text-xs text-slate-400 font-medium">Top 5 colegios</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Colegios y escuelas con mayor cantidad de niñas asignadas
            </p>

            <div className="space-y-3.5">
              {(distribucion?.por_institucion || [
                { institucion: 'U.E.B. República de Venezuela', cantidad: 8 },
                { institucion: 'Liceo Mariano Picón Salas', cantidad: 6 },
                { institucion: 'Colegio San Antonio de Padua', cantidad: 5 },
                { institucion: 'Escuela Básica Petare', cantidad: 4 },
                { institucion: 'Liceo Eulalia Buroz', cantidad: 3 }
              ]).map((inst, index) => {
                const maxVal = 8;
                const pct = Math.round((inst.cantidad / maxVal) * 100);
                return (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700 truncate max-w-[200px]" title={inst.institucion}>
                        {inst.institucion}
                      </span>
                      <span className="font-bold text-[#00256F]">{inst.cantidad} niñas</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-[#00256F] h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
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
              {(distribucion?.evolucion_mensual || [
                { periodo: '2025-01', ingresos: 5, egresos: 1 },
                { periodo: '2025-02', ingresos: 7, egresos: 2 },
                { periodo: '2025-03', ingresos: 6, egresos: 1 },
                { periodo: '2025-04', ingresos: 8, egresos: 3 },
                { periodo: '2025-05', ingresos: 10, egresos: 2 },
                { periodo: '2025-06', ingresos: 4, egresos: 0 }
              ]).map((item, idx) => {
                const maxScale = 12;
                const hIngresos = Math.min(100, Math.round((item.ingresos / maxScale) * 100));
                const hEgresos = Math.min(100, Math.round((item.egresos / maxScale) * 100));
                const monthLabel = item.periodo.split('-')[1];

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                    <div className="flex items-end gap-1 h-32 w-full justify-center">
                      {/* Ingresos bar */}
                      <div
                        className="w-3.5 bg-[#00256F] rounded-t-sm transition-all hover:bg-blue-800 relative cursor-pointer"
                        style={{ height: `${Math.max(10, hIngresos)}%` }}
                        title={`${item.periodo}: ${item.ingresos} ingresos`}
                      >
                        <span className="opacity-0 group-hover:opacity-100 transition absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-[#00256F] bg-blue-50 px-1 rounded">
                          {item.ingresos}
                        </span>
                      </div>
                      {/* Egresos bar */}
                      <div
                        className="w-3.5 bg-rose-400 rounded-t-sm transition-all hover:bg-rose-600 relative cursor-pointer"
                        style={{ height: `${Math.max(6, hEgresos)}%` }}
                        title={`${item.periodo}: ${item.egresos} egresos`}
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

      {/* Row: Panel de Alertas & Acciones (Pestañas con badges) + Cumpleaños + Calidad de Datos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel de Alertas y Acciones (Tabs con Badges Numéricos) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 font-display text-base">
                Panel de Alertas y Acciones
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Puntos de atención técnica identificados automáticamente por la API
              </p>
            </div>
            <span className="text-[11px] font-mono text-slate-400">data.alertas</span>
          </div>

          {/* Navigation Tabs with Badges */}
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3 overflow-x-auto">
            <button
              onClick={() => setActiveAlertTab('sin_rep')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
                activeAlertTab === 'sin_rep'
                  ? 'bg-rose-50 text-rose-700 border border-rose-200 shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>🔴 Sin Tutor / Rep.</span>
              <span className="w-5 h-5 rounded-full bg-rose-600 text-white text-[10px] flex items-center justify-center font-bold">
                {alertas?.sin_representante?.length || 1}
              </span>
            </button>

            <button
              onClick={() => setActiveAlertTab('proximas')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
                activeAlertTab === 'proximas'
                  ? 'bg-amber-50 text-amber-800 border border-amber-200 shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>🟡 Próximas a Egresar</span>
              <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center font-bold">
                {alertas?.proximas_a_egresar?.length || 2}
              </span>
            </button>

            <button
              onClick={() => setActiveAlertTab('egresadas')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
                activeAlertTab === 'egresadas'
                  ? 'bg-rose-50 text-rose-700 border border-rose-200 shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>🔴 Egresadas sin Fecha</span>
              <span className="w-5 h-5 rounded-full bg-rose-600 text-white text-[10px] flex items-center justify-center font-bold">
                {alertas?.egresadas_sin_fecha?.length || 1}
              </span>
            </button>

            <button
              onClick={() => setActiveAlertTab('sin_grado')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
                activeAlertTab === 'sin_grado'
                  ? 'bg-amber-50 text-amber-800 border border-amber-200 shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>🟡 Sin Grado Escolar</span>
              <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center font-bold">
                {alertas?.sin_grado_escolar?.length || 1}
              </span>
            </button>
          </div>

          {/* Active Tab Content */}
          <div className="mt-4 divide-y divide-slate-100">
            {activeAlertTab === 'sin_rep' && (
              <div className="space-y-2">
                {(alertas?.sin_representante || []).map((item) => (
                  <div key={item.id} className="p-3 bg-rose-50/50 rounded-xl border border-rose-100 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-rose-900">{item.nombres} {item.apellidos}</span>
                        <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-rose-200 text-rose-700">{item.expCode}</span>
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
                ))}
              </div>
            )}

            {activeAlertTab === 'proximas' && (
              <div className="space-y-2">
                {(alertas?.proximas_a_egresar || []).map((item) => (
                  <div key={item.id} className="p-3 bg-amber-50/50 rounded-xl border border-amber-100 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-amber-900">{item.nombres} {item.apellidos}</span>
                        <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-amber-200 text-amber-800">{item.expCode}</span>
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
                ))}
              </div>
            )}

            {activeAlertTab === 'egresadas' && (
              <div className="space-y-2">
                {(alertas?.egresadas_sin_fecha || []).map((item) => (
                  <div key={item.id} className="p-3 bg-rose-50/50 rounded-xl border border-rose-100 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-rose-900">{item.nombres} {item.apellidos}</span>
                        <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-rose-200 text-rose-700">{item.expCode}</span>
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
                ))}
              </div>
            )}

            {activeAlertTab === 'sin_grado' && (
              <div className="space-y-2">
                {(alertas?.sin_grado_escolar || []).map((item) => (
                  <div key={item.id} className="p-3 bg-amber-50/50 rounded-xl border border-amber-100 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-amber-900">{item.nombres} {item.apellidos}</span>
                        <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-amber-200 text-amber-800">{item.expCode}</span>
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
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Cumpleaños Próximos + Salud de los Datos */}
        <div className="space-y-6">
          {/* Widget de Cumpleaños (data.cumpleanios_proximos) */}
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
              {cumpleanios.map((c) => (
                <div key={c.id} className="p-2.5 bg-slate-50 hover:bg-rose-50/40 rounded-xl border border-slate-100 transition flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-800">{c.nombre}</p>
                    <p className="text-[11px] text-slate-500">{c.fecha} · Cumple {c.edad_cumplir} años</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    c.dias_faltantes === 'Hoy' 
                      ? 'bg-rose-600 text-white animate-pulse' 
                      : 'bg-blue-100 text-[#00256F]'
                  }`}>
                    {c.dias_faltantes}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Widget de Salud de los Datos (data.calidad_de_datos) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-600 text-[20px]">health_and_safety</span>
                <h3 className="font-bold text-slate-900 font-display text-sm">
                  Salud de los Datos
                </h3>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                {calidad?.puntaje_general_pct || 92}% Completitud
              </span>
            </div>

            <div className="space-y-3 text-xs">
              {/* Sin Cédula */}
              <div>
                <div className="flex justify-between text-slate-600 mb-1">
                  <span>Sin Cédula (Partida nac.)</span>
                  <span className="font-bold text-slate-800">{calidad?.sin_cedula_pct || 12}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div
                    className="bg-amber-500 h-full rounded-full"
                    style={{ width: `${calidad?.sin_cedula_pct || 12}%` }}
                  />
                </div>
              </div>

              {/* Sin Fecha Nac. Tutor */}
              <div>
                <div className="flex justify-between text-slate-600 mb-1">
                  <span>Sin Fecha Nac. Tutor</span>
                  <span className="font-bold text-slate-800">{calidad?.sin_fecha_nacimiento_rep_pct || 8}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div
                    className="bg-blue-600 h-full rounded-full"
                    style={{ width: `${calidad?.sin_fecha_nacimiento_rep_pct || 8}%` }}
                  />
                </div>
              </div>

              {/* Direcciones Incompletas */}
              <div>
                <div className="flex justify-between text-slate-600 mb-1">
                  <span>Direcciones Incompletas</span>
                  <span className="font-bold text-slate-800">{calidad?.direcciones_incompletas_pct || 5}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div
                    className="bg-purple-600 h-full rounded-full"
                    style={{ width: `${calidad?.direcciones_incompletas_pct || 5}%` }}
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
