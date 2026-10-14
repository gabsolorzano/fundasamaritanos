import React from 'react';
import { AppConfig, Beneficiaria, PersonalMember } from '../types';

interface ConfiguracionViewProps {
  config?: AppConfig;
  onSaveConfig?: (updated: AppConfig) => void;
  beneficiarias?: Beneficiaria[];
  personal?: PersonalMember[];
}

export const ConfiguracionView: React.FC<ConfiguracionViewProps> = ({
  config,
  beneficiarias = [],
  personal = []
}) => {
  return (
    <div className="space-y-6 pb-16 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#00256F] font-display">
              Información de la Fundación
            </h1>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-0.5 rounded-full">
              <span className="material-symbols-outlined text-[15px]">verified</span>
              <span>Institución Verificada</span>
            </span>
          </div>
          <p className="text-sm text-slate-500 font-medium">
            Datos legales, sede y contacto oficial de Fundasamaritanos.
          </p>
        </div>
      </div>

      {/* Main Info Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 sm:p-8 space-y-6">
        {/* Identidad Institucional */}
        <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 text-[#00256F] flex items-center justify-center font-bold text-2xl shadow-xs">
            <span className="material-symbols-outlined text-[36px]">domain</span>
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 font-display">
              {config?.organizacion || 'Fundación Social Niñas de la Providencia (Fundasamaritanos)'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-mono mt-0.5">
              RIF: {config?.rif || 'J-31456789-0'}
            </p>
          </div>
        </div>

        {/* Datos de Contacto y Ubicación */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
          <div className="p-4 bg-slate-50/70 border border-slate-100 rounded-xl space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Correo Electrónico Institucional
            </span>
            <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
              <span className="material-symbols-outlined text-slate-400 text-[18px]">mail</span>
              <span>{config?.email || 'contacto@fundasamaritanos.org'}</span>
            </div>
          </div>

          <div className="p-4 bg-slate-50/70 border border-slate-100 rounded-xl space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Teléfono de Contacto Principal
            </span>
            <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
              <span className="material-symbols-outlined text-slate-400 text-[18px]">phone</span>
              <span>{config?.telefono || '+58 (212) 555-8900'}</span>
            </div>
          </div>

          <div className="p-4 bg-slate-50/70 border border-slate-100 rounded-xl space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Sede y Ubicación
            </span>
            <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
              <span className="material-symbols-outlined text-slate-400 text-[18px]">location_on</span>
              <span>Sede Principal Caracas, Distrito Capital</span>
            </div>
          </div>

          <div className="p-4 bg-slate-50/70 border border-slate-100 rounded-xl space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Estado Operativo
            </span>
            <div className="flex items-center gap-2 text-emerald-700 font-semibold text-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>En Operación y Registro Activo</span>
            </div>
          </div>

          <div className="sm:col-span-2 p-4 bg-slate-50/70 border border-slate-100 rounded-xl space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Dirección Física de la Sede
            </span>
            <div className="flex items-center gap-2 text-slate-800 font-medium text-sm">
              <span className="material-symbols-outlined text-slate-400 text-[18px]">home_pin</span>
              <span>{config?.direccion || 'Av. Andrés Bello, Casa Nº 45, Sector Los Samaritanos, Caracas, Venezuela'}</span>
            </div>
          </div>
        </div>

        {/* Misión y Propósito */}
        <div className="p-5 bg-blue-50/50 border border-blue-100 rounded-2xl space-y-1.5">
          <div className="flex items-center gap-2 text-[#00256F] font-bold text-xs">
            <span className="material-symbols-outlined text-[18px]">volunteer_activism</span>
            <span>Misión y Objeto Social</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Brindar atención integral, protección social y acompañamiento formativo y educativo a niñas y adolescentes, fortaleciendo sus vínculos familiares y comunitarios mediante expedientes documentados y seguimiento riguroso.
          </p>
        </div>

        {/* Ficha técnica del sistema */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
          <span>Sistema Integral de Gestión de Expedientes (SIGE)</span>
          <span>Versión 2.4.0 · Base de datos PostgreSQL</span>
        </div>
      </div>
    </div>
  );
};
