import React, { useState } from 'react';
import { AppConfig, Beneficiaria, PersonalMember } from '../types';

interface ConfiguracionViewProps {
  config: AppConfig;
  onSaveConfig: (updated: AppConfig) => void;
  beneficiarias: Beneficiaria[];
  personal: PersonalMember[];
}

export const ConfiguracionView: React.FC<ConfiguracionViewProps> = ({
  config,
  onSaveConfig,
  beneficiarias,
  personal
}) => {
  const [activeTab, setActiveTab] = useState('institucion');
  const [organizacion, setOrganizacion] = useState(config.organizacion);
  const [rif, setRif] = useState(config.rif);
  const [email, setEmail] = useState(config.email);
  const [telefono, setTelefono] = useState(config.telefono);
  const [direccion, setDireccion] = useState(config.direccion);
  const [prefijoExp, setPrefijoExp] = useState(config.prefijoExp);
  const [vincularHermanasAuto, setVincularHermanasAuto] = useState(config.vincularHermanasAuto);
  const [alertaCumpleanos, setAlertaCumpleanos] = useState(config.alertaCumpleanos);
  const [tiempoInactividad, setTiempoInactividad] = useState(config.tiempoInactividad);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSave = () => {
    const updated: AppConfig = {
      organizacion: organizacion.trim(),
      rif: rif.trim(),
      email: email.trim(),
      telefono: telefono.trim(),
      direccion: direccion.trim(),
      prefijoExp: prefijoExp.trim(),
      vincularHermanasAuto,
      alertaCumpleanos,
      tiempoInactividad
    };
    onSaveConfig(updated);
    showToast('Ajustes de configuración guardados correctamente.');
  };

  const handleDiscard = () => {
    setOrganizacion(config.organizacion);
    setRif(config.rif);
    setEmail(config.email);
    setTelefono(config.telefono);
    setDireccion(config.direccion);
    setPrefijoExp(config.prefijoExp);
    setVincularHermanasAuto(config.vincularHermanasAuto);
    setAlertaCumpleanos(config.alertaCumpleanos);
    setTiempoInactividad(config.tiempoInactividad);
    showToast('Cambios descartados.');
  };

  const handleDownloadBackup = () => {
    const backupData = {
      timestamp: new Date().toISOString(),
      version: '2.4.1',
      institucion: organizacion,
      config: {
        organizacion,
        rif,
        email,
        telefono,
        direccion,
        prefijoExp
      },
      beneficiariasCount: beneficiarias.length,
      personalCount: personal.length,
      beneficiarias,
      personal
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `Respaldo_Fundasamaritanos_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Respaldo institucional descargado en formato JSON.');
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#00256F] text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4">
          <span className="material-symbols-outlined text-emerald-400">check_circle</span>
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold text-[#00256F] font-display">
            Configuración del Sistema
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Administración general de la sede, prefijos de expedientes, seguridad y políticas.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleDiscard}
            className="px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl border border-slate-200 transition cursor-pointer"
          >
            Descartar cambios
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2.5 bg-[#00256F] hover:bg-[#132E70] text-white text-xs font-semibold rounded-xl shadow-md hover:shadow-lg transition flex items-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">save</span>
            <span>Guardar Cambios</span>
          </button>
        </div>
      </div>

      {/* Main Layout: Sub-Nav Sidebar + Tab Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sub-Nav List */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-3 space-y-1 self-start">
          {[
            { id: 'institucion', label: 'Institución y Sede', icon: 'domain' },
            { id: 'expedientes', label: 'Parámetros de Expedientes', icon: 'folder_managed' },
            { id: 'seguridad', label: 'Seguridad y Acceso', icon: 'lock' },
            { id: 'notificaciones', label: 'Notificaciones y Alertas', icon: 'notifications' },
            { id: 'backup', label: 'Copia de Seguridad (Backup)', icon: 'cloud_sync' },
            { id: 'auditoria', label: 'Auditoría de Acciones', icon: 'history' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold transition text-left cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-blue-50 text-[#00256F] shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span className={`material-symbols-outlined text-[20px] ${activeTab === tab.id ? 'text-[#00256F]' : 'text-slate-400'}`}>
                {tab.icon}
              </span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Form Body (3 cols on lg) */}
        <div className="lg:col-span-3 space-y-6">
          {/* Section 1: Identidad Institucional */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 font-display text-base">
                  Identidad Institucional
                </h3>
                <p className="text-xs text-slate-500">
                  Datos legales y de contacto reflejados en los informes oficiales.
                </p>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                <span className="material-symbols-outlined text-[16px]">verified</span>
                <span>Verificado</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nombre Oficial de la Organización
                </label>
                <input
                  type="text"
                  value={organizacion}
                  onChange={(e) => setOrganizacion(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#00256F] outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Registro de Información Fiscal (RIF)
                </label>
                <input
                  type="text"
                  value={rif}
                  onChange={(e) => setRif(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#00256F] outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Correo Electrónico Institucional
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#00256F] outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Teléfono de Contacto Principal
                </label>
                <input
                  type="tel"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#00256F] outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Sede y Ubicación
                </label>
                <input
                  type="text"
                  value="Sede Principal Caracas"
                  disabled
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Dirección Física de la Sede
                </label>
                <input
                  type="text"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#00256F] outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Reglas de Expedientes y Beneficiarias */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 sm:p-8 space-y-5">
            <div className="pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 font-display text-base">
                Reglas de Expedientes y Beneficiarias
              </h3>
              <p className="text-xs text-slate-500">
                Comportamiento de la lógica de negocio y automatizaciones en el registro.
              </p>
            </div>

            {/* Prefijo */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  Prefijo de Código de Expediente
                </span>
                <p className="text-xs text-slate-500 mt-0.5">
                  Estructura alfanumérica asignada correlativamente: <strong>{prefijoExp}</strong>
                </p>
              </div>
              <button
                onClick={() => {
                  const val = prompt('Ingrese el nuevo formato de prefijo:', prefijoExp);
                  if (val) setPrefijoExp(val);
                }}
                className="px-3 py-1.5 text-xs font-semibold text-[#00256F] bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition"
              >
                Modificar
              </button>
            </div>

            {/* Switch 1: Auto-link sisters */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="pr-4">
                <span className="text-xs font-bold text-slate-800 block">
                  Sugerir vinculación de hermanas automáticamente
                </span>
                <p className="text-xs text-slate-500 mt-0.5">
                  Al registrar una niña con apellidos y dirección coincidentes, el sistema propondrá enlazarlas en el núcleo.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={vincularHermanasAuto}
                  onChange={(e) => setVincularHermanasAuto(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00256F]" />
              </label>
            </div>

            {/* Switch 2: Birthday alert */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="pr-4">
                <span className="text-xs font-bold text-slate-800 block">
                  Alerta anticipada de cumpleaños en Dashboard
                </span>
                <p className="text-xs text-slate-500 mt-0.5">
                  Notificar en el panel principal los cumpleaños de las niñas en un rango de 15 días.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={alertaCumpleanos}
                  onChange={(e) => setAlertaCumpleanos(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00256F]" />
              </label>
            </div>
          </div>

          {/* Section 3: Copia de Seguridad & Sesión */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Backup card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#00256F] flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-[24px]">cloud_download</span>
                </div>
                <h4 className="font-bold text-slate-900 font-display text-sm">
                  Copia de Seguridad de la Base de Datos
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Último respaldo automático: Hoy a las 03:00 AM · Estado: Íntegro
                </p>
              </div>
              <button
                onClick={handleDownloadBackup}
                className="mt-5 w-full py-2.5 px-4 bg-[#00256F] hover:bg-[#132E70] text-white font-semibold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
                <span>Descargar Respaldo JSON</span>
              </button>
            </div>

            {/* Session timeout card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-[24px]">timer</span>
                </div>
                <h4 className="font-bold text-slate-900 font-display text-sm">
                  Cierre Automático de Sesión
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Protección de privacidad ante inactividad del navegador.
                </p>
              </div>
              <div className="mt-5">
                <select
                  value={tiempoInactividad}
                  onChange={(e) => setTiempoInactividad(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#00256F] outline-none font-semibold"
                >
                  <option value="15 minutos">15 minutos de inactividad</option>
                  <option value="30 minutos">30 minutos de inactividad (Recomendado)</option>
                  <option value="1 hora">1 hora de inactividad</option>
                  <option value="2 horas">2 horas de inactividad</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
