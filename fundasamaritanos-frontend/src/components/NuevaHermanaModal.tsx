import React, { useState } from 'react';
import { Beneficiaria, Representante } from '../types';

interface NuevaHermanaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (nuevaHermana: Beneficiaria) => void;
  beneficiariaPrincipal: Beneficiaria;
  nextExpCode: string;
}

export const NuevaHermanaModal: React.FC<NuevaHermanaModalProps> = ({
  isOpen,
  onClose,
  onSave,
  beneficiariaPrincipal,
  nextExpCode
}) => {
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState(beneficiariaPrincipal.apellidos);
  const [cedula, setCedula] = useState('Sin Cédula');
  const [fechaNacimiento, setFechaNacimiento] = useState('2015-06-12');
  const [lugarNacimiento, setLugarNacimiento] = useState(
    beneficiariaPrincipal.lugarNacimiento || 'Caracas, Dto. Capital'
  );
  const [institucionEducativa, setInstitucionEducativa] = useState(
    beneficiariaPrincipal.institucionEducativa || 'U.E.B. República de Venezuela'
  );
  const [grado, setGrado] = useState('4to Grado');
  const [observaciones, setObservaciones] = useState(
    'Ingresa al núcleo familiar vinculada a su hermana ' +
      beneficiariaPrincipal.nombres +
      ' ' +
      beneficiariaPrincipal.apellidos +
      '.'
  );

  if (!isOpen) return null;

  // Calculate age from birthdate
  const calculateAge = (birthdateStr: string) => {
    if (!birthdateStr) return 9;
    const birth = new Date(birthdateStr);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age > 0 ? age : 0;
  };

  const currentAge = calculateAge(fechaNacimiento);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombres.trim()) {
      alert('Por favor ingrese el nombre de la hermana.');
      return;
    }

    const nuevaHermana: Beneficiaria = {
      id: `ben-${Date.now()}`,
      expCode: nextExpCode,
      nombres: nombres.trim(),
      apellidos: apellidos.trim() || beneficiariaPrincipal.apellidos,
      cedula: cedula.trim() || 'Sin Cédula',
      lugarNacimiento: lugarNacimiento.trim(),
      fechaNacimiento,
      edad: currentAge,
      direccion: beneficiariaPrincipal.direccion,
      institucionEducativa: institucionEducativa.trim(),
      grado: grado.trim(),
      estado: 'Activa',
      fechaIngreso: new Date().toISOString().slice(0, 10),
      tipoExpediente: beneficiariaPrincipal.tipoExpediente,
      prioridad: beneficiariaPrincipal.prioridad,
      institucionRemite: beneficiariaPrincipal.institucionRemite,
      observaciones: observaciones.trim(),
      representantePrincipal: beneficiariaPrincipal.representantePrincipal,
      representantes: [...beneficiariaPrincipal.representantes],
      hermanasIds: [beneficiariaPrincipal.id, ...beneficiariaPrincipal.hermanasIds],
      avatarBg: 'bg-[#00256F] text-white'
    };

    onSave(nuevaHermana);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-slate-100 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-blue-100 text-[#00256F] flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">family_restroom</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 font-display text-base">
                  Registrar Hermana
                </h3>
                <span className="text-[11px] font-bold bg-[#00256F] text-white px-2 py-0.5 rounded-full">
                  {nextExpCode}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Nuevo expediente vinculado al núcleo familiar de{' '}
                <strong className="text-[#00256F]">
                  {beneficiariaPrincipal.nombres} {beneficiariaPrincipal.apellidos}
                </strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition p-1"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Inherited Family Data Banner */}
        <div className="mt-4 p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-xl text-xs text-[#00256F] space-y-1">
          <div className="flex items-center gap-1.5 font-bold">
            <span className="material-symbols-outlined text-[18px]">sync</span>
            <span>Datos heredados automáticamente del núcleo familiar</span>
          </div>
          <p className="text-slate-600 text-[11px] leading-relaxed">
            • <strong>Dirección de residencia:</strong> {beneficiariaPrincipal.direccion}
            <br />
            • <strong>Representante asignado:</strong> {beneficiariaPrincipal.representantePrincipal} (
            {beneficiariaPrincipal.representantes.length} representante(s) registrado(s))
          </p>
        </div>

        <form onSubmit={handleSubmit} className="py-4 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Nombres de la Hermana <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={nombres}
                onChange={(e) => setNombres(e.target.value)}
                placeholder="Ej: Mariana Valentina"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-[#00256F]"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Apellidos
              </label>
              <input
                type="text"
                value={apellidos}
                onChange={(e) => setApellidos(e.target.value)}
                placeholder="Ej: Martínez López"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-[#00256F]"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Cédula / Identificación
              </label>
              <input
                type="text"
                value={cedula}
                onChange={(e) => setCedula(e.target.value)}
                placeholder="Ej: V-34.567.890 o Sin Cédula"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-[#00256F]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-semibold text-slate-700">
                  Fecha de Nacimiento
                </label>
                <span className="text-[11px] font-bold text-[#00256F] bg-blue-50 px-2 py-0.5 rounded-md">
                  Edad: {currentAge} años
                </span>
              </div>
              <input
                type="date"
                value={fechaNacimiento}
                onChange={(e) => setFechaNacimiento(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-[#00256F]"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Lugar de Nacimiento
              </label>
              <input
                type="text"
                value={lugarNacimiento}
                onChange={(e) => setLugarNacimiento(e.target.value)}
                placeholder="Ej: Caracas, Dto. Capital"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-[#00256F]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Grado / Nivel Escolar
              </label>
              <select
                value={grado}
                onChange={(e) => setGrado(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-[#00256F]"
              >
                <option value="Educación Inicial / Preescolar">Educación Inicial / Preescolar</option>
                <option value="1er Grado">1er Grado</option>
                <option value="2do Grado">2do Grado</option>
                <option value="3er Grado">3er Grado</option>
                <option value="4to Grado">4to Grado</option>
                <option value="5to Grado">5to Grado</option>
                <option value="6to Grado">6to Grado</option>
                <option value="1er Año (Secundaria)">1er Año (Secundaria)</option>
                <option value="2do Año (Secundaria)">2do Año (Secundaria)</option>
                <option value="3er Año (Secundaria)">3er Año (Secundaria)</option>
                <option value="4to Año (Secundaria)">4to Año (Secundaria)</option>
                <option value="5to Año (Secundaria)">5to Año (Secundaria)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                Institución Educativa
              </label>
              <input
                type="text"
                value={institucionEducativa}
                onChange={(e) => setInstitucionEducativa(e.target.value)}
                placeholder="Nombre del plantel escolar o colegio"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-[#00256F]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                Observaciones Particulares
              </label>
              <textarea
                rows={2}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Observaciones de salud, necesidades educativas o motivos de atención..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-[#00256F] resize-none"
              />
            </div>
          </div>

          <div className="flex gap-2.5 pt-4 border-t border-slate-100 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-[#00256F] hover:bg-[#132E70] rounded-xl shadow-xs transition flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">save</span>
              <span>Guardar Hermana y Crear Expediente</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
