import React, { useState } from 'react';
import { Beneficiaria, Representante, BeneficiariaStatus } from '../types';
import { NuevoRepresentanteModal } from './NuevoRepresentanteModal';
import { NuevaDireccionModal } from './NuevaDireccionModal';
import { NuevaHermanaModal } from './NuevaHermanaModal';
import { useAuth } from '../context/AuthContext';

interface FichaBeneficiariaViewProps {
  beneficiaria: Beneficiaria;
  allBeneficiarias: Beneficiaria[];
  onBack: () => void;
  onSave: (updated: Beneficiaria) => void;
  onSelectSister: (sister: Beneficiaria) => void;
  onAddSister?: (nuevaHermana: Beneficiaria) => void;
  nextExpCode?: string;
}

export const FichaBeneficiariaView: React.FC<FichaBeneficiariaViewProps> = ({
  beneficiaria,
  allBeneficiarias,
  onBack,
  onSave,
  onSelectSister,
  onAddSister,
  nextExpCode = 'EXP-2026-0035'
}) => {
  const { isLector, role } = useAuth();
  const [activeTab, setActiveTab] = useState<'personales' | 'familia'>('personales');
  const [isRepModalOpen, setIsRepModalOpen] = useState(false);
  const [isSisterModalOpen, setIsSisterModalOpen] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const todayStr = new Date().toISOString().slice(0, 10);

  // Form State
  const [nombres, setNombres] = useState(beneficiaria.nombres);
  const [apellidos, setApellidos] = useState(beneficiaria.apellidos);
  const [cedula, setCedula] = useState(beneficiaria.cedula);
  const [fechaNacimiento, setFechaNacimiento] = useState(beneficiaria.fechaNacimiento);
  const [lugarNacimiento, setLugarNacimiento] = useState(beneficiaria.lugarNacimiento);
  const [direccion, setDireccion] = useState(beneficiaria.direccion);
  const [institucionEducativa, setInstitucionEducativa] = useState(beneficiaria.institucionEducativa);
  const [grado, setGrado] = useState(beneficiaria.grado);
  const [estado, setEstado] = useState<BeneficiariaStatus>(beneficiaria.estado);
  const [fechaEgreso, setFechaEgreso] = useState(beneficiaria.fechaEgreso || '');
  const [representantes, setRepresentantes] = useState<Representante[]>(beneficiaria.representantes);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Coherencia Estado vs Fecha de Egreso:
  // Si cambia a Activa, limpiar/bloquear fecha_egreso
  const handleEstadoChange = (newEstado: BeneficiariaStatus) => {
    setEstado(newEstado);
    setValidationError(null);
    if (newEstado === 'Activa') {
      setFechaEgreso('');
    } else if (!fechaEgreso) {
      setFechaEgreso(todayStr);
    }
  };

  // Find registered sisters from allBeneficiarias
  const hermanas = allBeneficiarias.filter((b) =>
    beneficiaria.hermanasIds.includes(b.id)
  );

  const handleSaveChanges = () => {
    setValidationError(null);

    // Regla de Negocio 4: Coherencia Estado vs Fecha de Egreso
    if ((estado === 'Egresada' || estado === 'Trasladada') && !fechaEgreso) {
      setValidationError(
        `El campo 'Fecha de Egreso' es obligatorio cuando el estado del expediente es '${estado}'.`
      );
      return;
    }

    // Regla de Negocio 4: Validación de Fechas sin fechas futuras
    if (fechaNacimiento && fechaNacimiento > todayStr) {
      setValidationError('La fecha de nacimiento no puede ser una fecha futura.');
      return;
    }

    const updated: Beneficiaria = {
      ...beneficiaria,
      nombres: nombres.trim(),
      apellidos: apellidos.trim(),
      cedula: cedula.trim(),
      fechaNacimiento,
      lugarNacimiento: lugarNacimiento.trim(),
      direccion: direccion.trim(),
      institucionEducativa: institucionEducativa.trim(),
      grado: grado.trim(),
      estado,
      fechaEgreso: estado === 'Activa' ? undefined : (fechaEgreso || todayStr),
      representantes,
      representantePrincipal: representantes[0]
        ? `${representantes[0].nombres} ${representantes[0].apellidos}`
        : beneficiaria.representantePrincipal
    };

    onSave(updated);
    showToast('Ficha de beneficiaria actualizada y validada exitosamente.');
  };

  const handleAddRepresentative = (newRep: Representante) => {
    setRepresentantes([...representantes, newRep]);
    showToast('Representante incorporado al núcleo familiar.');
  };

  const handleRemoveRepresentative = (repId: string) => {
    if (representantes.length <= 1) {
      alert('El expediente debe mantener al menos un representante principal.');
      return;
    }
    setRepresentantes(representantes.filter((r) => r.id !== repId));
    showToast('Representante retirado del expediente.');
  };

  const handleSaveSister = (nuevaHermana: Beneficiaria) => {
    if (onAddSister) {
      onAddSister(nuevaHermana);
    }
    showToast(`Hermana ${nuevaHermana.nombres} vinculada con código ${nuevaHermana.expCode}.`);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#00256F] text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4">
          <span className="material-symbols-outlined text-emerald-400">check_circle</span>
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Top Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <button onClick={onBack} className="hover:underline text-[#00256F] cursor-pointer">
              Beneficiarias
            </button>
            <span>/</span>
            <span className="text-slate-800">Ficha Técnica</span>
            {isLector && (
              <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                Solo Lectura ({role})
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-[#00256F] font-display mt-1">
            Ficha de {beneficiaria.nombres} {beneficiaria.apellidos}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl border border-slate-200 transition flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            <span>Volver a la lista</span>
          </button>

          {/* RBAC: Solo Editor y Admin pueden guardar cambios */}
          {!isLector && (
            <button
              onClick={handleSaveChanges}
              className="px-5 py-2.5 bg-[#00256F] hover:bg-[#132E70] text-white text-xs font-semibold rounded-xl shadow-md hover:shadow-lg transition flex items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">save</span>
              <span>Guardar Cambios (PUT)</span>
            </button>
          )}
        </div>
      </div>

      {/* Validation Banner if business rule violated */}
      {validationError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-3 animate-in fade-in">
          <span className="material-symbols-outlined text-rose-600 text-[22px] shrink-0">error</span>
          <div className="flex-1 font-medium">{validationError}</div>
          <button
            onClick={() => setValidationError(null)}
            className="text-rose-600 hover:text-rose-900 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('personales')}
          className={`pb-3 px-4 text-sm font-semibold transition border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'personales'
              ? 'border-[#00256F] text-[#00256F]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">person</span>
          <span>Datos Personales & Estatus</span>
        </button>
        <button
          onClick={() => setActiveTab('familia')}
          className={`pb-3 px-4 text-sm font-semibold transition border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'familia'
              ? 'border-[#00256F] text-[#00256F]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">family_restroom</span>
          <span>Núcleo Familiar & Hermanas</span>
          <span className="text-[11px] bg-blue-100 text-[#00256F] px-2 py-0.5 rounded-full font-bold">
            {hermanas.length + representantes.length}
          </span>
        </button>
      </div>

      {/* TAB CONTENT: DATOS PERSONALES */}
      {activeTab === 'personales' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 sm:p-8 space-y-6">
          {/* Código de Expediente & Notice */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Código de Expediente
              </span>
              <p className="text-xl font-bold text-[#00256F] font-display">
                {beneficiaria.expCode}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Ingresó el:</span>
              <span className="text-xs font-semibold text-slate-800 bg-slate-100 px-3 py-1 rounded-lg">
                {beneficiaria.fechaIngreso}
              </span>
              <span className="text-xs font-bold text-[#00256F] bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                Edad: {beneficiaria.edad} años
              </span>
            </div>
          </div>

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Nombres
              </label>
              <input
                type="text"
                value={nombres}
                disabled={isLector}
                onChange={(e) => setNombres(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#00256F] outline-none disabled:opacity-75"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Apellidos
              </label>
              <input
                type="text"
                value={apellidos}
                disabled={isLector}
                onChange={(e) => setApellidos(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#00256F] outline-none disabled:opacity-75"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Identificación (ID / Cédula)
              </label>
              <input
                type="text"
                value={cedula}
                disabled={isLector}
                onChange={(e) => setCedula(e.target.value)}
                placeholder="V-32.456.789 o Sin Cédula"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#00256F] outline-none disabled:opacity-75"
              />
            </div>

            {/* Fecha de Nacimiento con max={today} */}
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Fecha de Nacimiento (max: hoy)
              </label>
              <input
                type="date"
                max={todayStr}
                value={fechaNacimiento}
                disabled={isLector}
                onChange={(e) => setFechaNacimiento(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#00256F] outline-none disabled:opacity-75"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Lugar de Nacimiento
              </label>
              <input
                type="text"
                value={lugarNacimiento}
                disabled={isLector}
                onChange={(e) => setLugarNacimiento(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#00256F] outline-none disabled:opacity-75"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Institución Educativa
              </label>
              <input
                type="text"
                value={institucionEducativa}
                disabled={isLector}
                onChange={(e) => setInstitucionEducativa(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#00256F] outline-none disabled:opacity-75"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Grado / Año Actual
              </label>
              <input
                type="text"
                value={grado}
                disabled={isLector}
                onChange={(e) => setGrado(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#00256F] outline-none disabled:opacity-75"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block font-bold text-slate-700 uppercase tracking-wider">
                  Dirección de Habitación
                </label>
                {!isLector && (
                  <button
                    type="button"
                    onClick={() => setIsAddressModalOpen(true)}
                    className="text-xs font-semibold text-[#00256F] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">edit_location</span>
                    <span>Estructurar dirección</span>
                  </button>
                )}
              </div>
              <input
                type="text"
                value={direccion}
                disabled={isLector}
                onChange={(e) => setDireccion(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#00256F] outline-none disabled:opacity-75"
              />
            </div>

            {/* Estatus del Expediente (Regla de Coherencia) */}
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Estatus del Expediente
              </label>
              <select
                value={estado}
                disabled={isLector}
                onChange={(e) => handleEstadoChange(e.target.value as BeneficiariaStatus)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#00256F] outline-none font-bold disabled:opacity-75"
              >
                <option value="Activa">ACTIVA (En programa continuo)</option>
                <option value="Trasladada">TRASLADADA (Requiere fecha de egreso)</option>
                <option value="Egresada">EGRESADA (Requiere fecha de egreso)</option>
              </select>
            </div>

            {/* Fecha de Egreso: Bloqueada en Activa, Obligatoria en Egresada o Trasladada */}
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Fecha de Egreso {estado !== 'Activa' && <span className="text-rose-500">* (Obligatorio)</span>}
              </label>
              <input
                type="date"
                max={todayStr}
                value={fechaEgreso}
                disabled={isLector || estado === 'Activa'}
                onChange={(e) => setFechaEgreso(e.target.value)}
                placeholder={estado === 'Activa' ? 'Bloqueado (Estado Activa)' : ''}
                className={`w-full px-3.5 py-2.5 text-sm border rounded-xl outline-none transition ${
                  estado === 'Activa'
                    ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-white border-amber-300 focus:ring-2 focus:ring-amber-500 text-slate-900 font-semibold'
                }`}
              />
              {estado === 'Activa' ? (
                <span className="text-[10px] text-slate-400 mt-1 block">
                  El expediente está activo: la fecha de egreso se limpia y bloquea automáticamente.
                </span>
              ) : (
                <span className="text-[10px] text-amber-700 font-medium mt-1 block">
                  Regla API: Al marcar como {estado}, debe registrar la fecha de egreso efectiva.
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: NÚCLEO FAMILIAR */}
      {activeTab === 'familia' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Card: Hermanas registradas */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#00256F]">diversity_1</span>
                  <h3 className="font-bold text-slate-900 font-display text-base">
                    Hermanas Vinculadas ({hermanas.length})
                  </h3>
                </div>

                {!isLector && (
                  <button
                    onClick={() => setIsSisterModalOpen(true)}
                    className="px-3 py-1.5 bg-blue-50 text-[#00256F] hover:bg-blue-100 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    <span>Vincular Hermana</span>
                  </button>
                )}
              </div>

              {hermanas.length === 0 ? (
                <div className="py-10 text-center text-slate-400">
                  <span className="material-symbols-outlined text-3xl mb-1">person_outline</span>
                  <p className="text-xs font-semibold">No tiene hermanas vinculadas a este expediente.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {hermanas.map((h) => (
                    <div
                      key={h.id}
                      onClick={() => onSelectSister(h)}
                      className="p-3 bg-slate-50 hover:bg-blue-50/50 rounded-xl border border-slate-100 transition cursor-pointer flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#00256F] text-white flex items-center justify-center text-xs font-bold">
                          {h.nombres[0]}
                        </div>
                        <div>
                          <p className="font-bold text-xs text-slate-900">{h.nombres} {h.apellidos}</p>
                          <p className="text-[10px] text-slate-500 font-mono">{h.expCode} · {h.edad} años</p>
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-slate-400 text-[18px]">chevron_right</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Card: Representantes Legales */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-purple-700">supervisor_account</span>
                  <h3 className="font-bold text-slate-900 font-display text-base">
                    Representantes / Tutores ({representantes.length})
                  </h3>
                </div>

                {!isLector && (
                  <button
                    onClick={() => setIsRepModalOpen(true)}
                    className="px-3 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    <span>Agregar Tutor</span>
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {representantes.map((rep) => (
                  <div
                    key={rep.id}
                    className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex items-start justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">{rep.nombres} {rep.apellidos}</span>
                        <span className="px-2 py-0.2 bg-purple-100 text-purple-800 rounded text-[10px] font-bold">
                          {rep.parentesco}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">{rep.cedula} · {rep.telefono}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{rep.ocupacion || 'Sin ocupación indicada'}</p>
                    </div>

                    {!isLector && representantes.length > 1 && (
                      <button
                        onClick={() => handleRemoveRepresentative(rep.id)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                        title="Retirar tutor"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Address Modal */}
      <NuevaDireccionModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        onSaveAddress={(structured) => {
          setDireccion(structured);
          showToast('Dirección estructurada guardada.');
        }}
      />

      {/* Representative Modal */}
      <NuevoRepresentanteModal
        isOpen={isRepModalOpen}
        onClose={() => setIsRepModalOpen(false)}
        onSaveRepresentative={handleAddRepresentative}
      />

      {/* Sister Modal */}
      <NuevaHermanaModal
        isOpen={isSisterModalOpen}
        onClose={() => setIsSisterModalOpen(false)}
        onSaveSister={handleSaveSister}
        familiaApellidos={beneficiaria.apellidos}
        nextExpCode={nextExpCode}
        direccionFamilia={direccion}
      />
    </div>
  );
};
