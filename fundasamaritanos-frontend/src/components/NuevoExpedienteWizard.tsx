import React, { useState } from 'react';
import { Beneficiaria, Representante, ExpedientePriority, ExpedienteType, ViewMode } from '../types';
import { NuevaDireccionModal } from './NuevaDireccionModal';

interface NuevoExpedienteWizardProps {
  onCancel: () => void;
  onSaveExpediente: (nuevo: Beneficiaria | Beneficiaria[], hermana?: Beneficiaria) => void;
  nextExpCode: string;
}

export interface SisterDraft {
  id: string;
  expCode: string;
  nombres: string;
  apellidos: string;
  cedula: string;
  fechaNacimiento: string;
  edad: number;
  lugarNacimiento: string;
  institucionEducativa: string;
  gradoEscolar: string;
  observaciones?: string;
}

export const NuevoExpedienteWizard: React.FC<NuevoExpedienteWizardProps> = ({
  onCancel,
  onSaveExpediente,
  nextExpCode
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);
  const [step2Error, setStep2Error] = useState<string | null>(null);

  // Step 1 State: Caso
  const [tipoExpediente, setTipoExpediente] = useState<ExpedienteType>('Protección Integral');
  const [fechaIngreso, setFechaIngreso] = useState(new Date().toISOString().slice(0, 10));
  const [direccionCaso, setDireccionCaso] = useState(
    'Av. Principal de Los Ruices, Edif. Centro, Apto 4-B, Municipio Sucre, Edo. Miranda'
  );
  const [institucionRemite, setInstitucionRemite] = useState(
    'Consejo Municipal de Derechos del Niño, Niña y Adolescente (CMDNNA)'
  );
  const [prioridadCaso, setPrioridadCaso] = useState<ExpedientePriority>('Normal');
  const [observaciones, setObservaciones] = useState(
    'Caso remitido para evaluación socioeducativa y acompañamiento psicosocial preventivo.'
  );

  // Step 2 State: Multi-sister array stored reactively
  const [girls, setGirls] = useState<SisterDraft[]>([
    {
      id: `ben-${Date.now()}-0`,
      expCode: nextExpCode,
      nombres: 'Valeria Sofía',
      apellidos: 'Martínez López',
      cedula: 'V-32.456.789',
      fechaNacimiento: '2013-05-14',
      edad: 12,
      lugarNacimiento: 'Caracas, Dto. Capital',
      institucionEducativa: 'U.E.B. República de Venezuela',
      gradoEscolar: '6to Grado',
      observaciones: ''
    }
  ]);
  const [activeGirlIndex, setActiveGirlIndex] = useState<number>(0);

  // Step 3 State: Representante
  const [nombresRep, setNombresRep] = useState('Carmen');
  const [apellidosRep, setApellidosRep] = useState('López de Martínez');
  const [cedulaRep, setCedulaRep] = useState('V-16.890.123');
  const [parentescoRep, setParentescoRep] = useState<Representante['parentesco']>('Madre');
  const [telefonoRep, setTelefonoRep] = useState('+58 (414) 123-4567');
  const [ocupacionRep, setOcupacionRep] = useState('Docente de Educación Inicial');
  const [estadoCivilRep, setEstadoCivilRep] = useState('Casada');
  const [nivelInstruccionRep, setNivelInstruccionRep] = useState('Universitario');
  const [usarMismaDireccion, setUsarMismaDireccion] = useState(true);
  const [direccionRep, setDireccionRep] = useState('');

  // Calculate age from birthdate
  const calculateAge = (birthdateStr: string) => {
    if (!birthdateStr) return 10;
    const birth = new Date(birthdateStr);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age > 0 ? age : 0;
  };

  // Helper to calculate sequential correlative code
  const getExpCodeForIndex = (baseCode: string, index: number) => {
    const parts = baseCode.split('-');
    if (parts.length === 3) {
      const num = parseInt(parts[2], 10);
      if (!isNaN(num)) {
        return `${parts[0]}-${parts[1]}-${String(num + index).padStart(4, '0')}`;
      }
    }
    return `${baseCode}-${index + 1}`;
  };

  const currentGirl: SisterDraft = girls[activeGirlIndex] || girls[0];

  // Update fields of the currently selected girl
  const updateCurrentGirl = (updates: Partial<SisterDraft>) => {
    setGirls((prev) =>
      prev.map((g, idx) => {
        if (idx !== activeGirlIndex) return g;
        const merged = { ...g, ...updates };
        if (updates.fechaNacimiento) {
          merged.edad = calculateAge(updates.fechaNacimiento);
        }
        return merged;
      })
    );
  };

  // Add another sister to the group
  const handleAddSister = () => {
    if (!currentGirl.nombres.trim()) {
      setStep2Error('Por favor complete los nombres de la niña actual antes de registrar a otra hermana.');
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setStep2Error(null);

    const newIndex = girls.length;
    const newCode = getExpCodeForIndex(nextExpCode, newIndex);

    const newSister: SisterDraft = {
      id: `ben-${Date.now()}-${newIndex}`,
      expCode: newCode,
      nombres: '',
      apellidos: currentGirl.apellidos || '',
      cedula: 'Sin Cédula',
      fechaNacimiento: '2015-08-20',
      edad: calculateAge('2015-08-20'),
      lugarNacimiento: currentGirl.lugarNacimiento || 'Caracas, Dto. Capital',
      institucionEducativa: currentGirl.institucionEducativa || '',
      gradoEscolar: '4to Grado',
      observaciones: ''
    };

    setGirls((prev) => [...prev, newSister]);
    setActiveGirlIndex(newIndex);
    setBannerNotice(
      `✓ Se agregó la Hermana #${newIndex + 1} (${newCode}) al grupo. Todos los datos se están almacenando en tiempo real.`
    );
    setCurrentStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Remove a sister from the family
  const handleRemoveSister = (idxToRemove: number) => {
    if (girls.length <= 1) return;
    const targetName = girls[idxToRemove].nombres.trim() || `Hermana #${idxToRemove + 1}`;
    const filtered = girls.filter((_, i) => i !== idxToRemove);
    const reindexed = filtered.map((g, i) => ({
      ...g,
      expCode: getExpCodeForIndex(nextExpCode, i)
    }));
    setGirls(reindexed);

    if (activeGirlIndex >= reindexed.length) {
      setActiveGirlIndex(reindexed.length - 1);
    } else if (activeGirlIndex === idxToRemove && activeGirlIndex > 0) {
      setActiveGirlIndex(activeGirlIndex - 1);
    }
    setBannerNotice(`✓ Se retiró a ${targetName} del registro.`);
  };

  // Advance step with validation
  const handleNextStep = () => {
    if (currentStep === 2) {
      const emptyIdx = girls.findIndex((g) => !g.nombres.trim());
      if (emptyIdx !== -1) {
        setActiveGirlIndex(emptyIdx);
        setStep2Error(`Por favor ingrese el nombre de la Hermana #${emptyIdx + 1} antes de continuar.`);
        return;
      }
      setStep2Error(null);
    }
    setCurrentStep((s) => (s + 1) as any);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFinish = () => {
    const primaryRep: Representante = {
      id: `rep-${Date.now()}`,
      nombres: nombresRep.trim(),
      apellidos: apellidosRep.trim(),
      cedula: cedulaRep.trim(),
      parentesco: parentescoRep,
      telefono: telefonoRep.trim(),
      ocupacion: ocupacionRep.trim(),
      estadoCivil: estadoCivilRep,
      nivelInstruccion: nivelInstruccionRep,
      direccion: usarMismaDireccion ? direccionCaso : direccionRep.trim() || direccionCaso
    };

    // Validate that every girl has a name
    const emptyIdx = girls.findIndex((g) => !g.nombres.trim());
    if (emptyIdx !== -1) {
      setCurrentStep(2);
      setActiveGirlIndex(emptyIdx);
      setStep2Error(`Por favor complete los datos de la Hermana #${emptyIdx + 1} antes de finalizar.`);
      return;
    }

    const allIds = girls.map((d) => d.id);
    const colors = [
      'bg-[#00256F] text-white',
      'bg-emerald-700 text-white',
      'bg-indigo-700 text-white',
      'bg-teal-700 text-white',
      'bg-purple-700 text-white'
    ];

    const fullBeneficiarias: Beneficiaria[] = girls.map((draft, idx) => ({
      id: draft.id,
      expCode: draft.expCode,
      nombres: draft.nombres.trim(),
      apellidos: draft.apellidos.trim(),
      cedula: draft.cedula.trim(),
      lugarNacimiento: draft.lugarNacimiento.trim(),
      fechaNacimiento: draft.fechaNacimiento,
      edad: draft.edad,
      direccion: direccionCaso,
      institucionEducativa: draft.institucionEducativa.trim(),
      grado: draft.gradoEscolar,
      estado: 'Activa',
      fechaIngreso,
      tipoExpediente,
      prioridad: prioridadCaso,
      institucionRemite: institucionRemite.trim(),
      observaciones: draft.observaciones?.trim() || observaciones.trim(),
      representantePrincipal: `${primaryRep.nombres} ${primaryRep.apellidos}`,
      representantes: [primaryRep],
      hermanasIds: allIds.filter((id) => id !== draft.id),
      avatarBg: colors[idx % colors.length]
    }));

    onSaveExpediente(fullBeneficiarias);
  };

  return (
    <div className="space-y-6 pb-16 max-w-5xl mx-auto">
      {/* Header Breadcrumb & Step counter */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <span>Beneficiarias</span>
              <span>/</span>
              <span className="text-[#00256F]">Nuevo Expediente</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#00256F] font-display mt-1">
              Paso {currentStep} de 4:{' '}
              {currentStep === 1 && 'Datos Generales del Caso'}
              {currentStep === 2 &&
                (girls.length > 1
                  ? `Datos de las Niñas Beneficiarias (${girls.length} Hermanas)`
                  : 'Datos Personales de la Niña')}
              {currentStep === 3 && 'Datos del Representante Legal'}
              {currentStep === 4 && 'Cierre y Vínculo Familiar'}
            </h1>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {girls.length > 1 && (
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                {girls.length} hermanas en este grupo
              </span>
            )}
            <span className="text-xs font-bold text-[#00256F] bg-blue-50 px-3 py-1.5 rounded-full border border-blue-200/60">
              {currentStep === 2
                ? `${currentGirl.expCode} (${activeGirlIndex + 1} de ${girls.length})`
                : girls.length > 1
                ? `${girls[0].expCode} a ${girls[girls.length - 1].expCode} (${girls.length} expedientes)`
                : nextExpCode}
            </span>
          </div>
        </div>

        {/* Stepper Tabs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 pt-5">
          {[
            { step: 1, label: 'CASO', icon: 'folder_open' },
            {
              step: 2,
              label:
                girls.length > 1
                  ? `NIÑAS (${girls.length})`
                  : 'NIÑA',
              icon: 'face_3'
            },
            { step: 3, label: 'REPRESENTANTE', icon: 'supervisor_account' },
            { step: 4, label: 'CIERRE', icon: 'check_circle' }
          ].map((item) => {
            const isDone = currentStep > item.step;
            const isCurrent = currentStep === item.step;
            return (
              <button
                key={item.step}
                type="button"
                onClick={() => {
                  if (isDone) setCurrentStep(item.step as any);
                }}
                className={`p-3 rounded-xl border text-left transition-all flex items-center gap-3 cursor-pointer ${
                  isCurrent
                    ? 'bg-[#00256F] text-white border-[#00256F] shadow-sm'
                    : isDone
                    ? 'bg-blue-50/60 text-[#00256F] border-blue-200 hover:bg-blue-50'
                    : 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                    isCurrent
                      ? 'bg-white text-[#00256F]'
                      : isDone
                      ? 'bg-[#00256F] text-white'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {isDone ? (
                    <span className="material-symbols-outlined text-[16px]">check</span>
                  ) : (
                    item.step
                  )}
                </div>
                <div className="min-w-0">
                  <span className="block text-[10px] uppercase tracking-wider font-semibold opacity-80">
                    Paso {item.step}
                  </span>
                  <span className="block text-xs font-bold truncate">
                    {item.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Step Form Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 sm:p-8">
        {/* ================= STEP 1: CASO ================= */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-in fade-in">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900 font-display">
                Datos Generales del Caso
              </h2>
              <p className="text-xs text-slate-500">
                Información de radicación institucional y categorización del expediente.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Tipo de Expediente */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Tipo de Expediente
                </label>
                <select
                  value={tipoExpediente}
                  onChange={(e) => setTipoExpediente(e.target.value as ExpedienteType)}
                  className="w-full px-3.5 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#00256F] outline-none"
                >
                  <option value="Protección Integral">Protección Integral</option>
                  <option value="Apoyo Educativo">Apoyo Educativo</option>
                  <option value="Salud y Nutrición">Salud y Nutrición</option>
                  <option value="Emergencia Social">Emergencia Social</option>
                </select>
              </div>

              {/* Fecha de Ingreso */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Fecha de Ingreso
                </label>
                <input
                  type="date"
                  value={fechaIngreso}
                  onChange={(e) => setFechaIngreso(e.target.value)}
                  className="w-full px-3.5 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#00256F] outline-none"
                  required
                />
              </div>
            </div>

            {/* Dirección de Residencia with + Crear Nueva */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Dirección de Residencia Familiar
                </label>
                <button
                  type="button"
                  onClick={() => setIsAddressModalOpen(true)}
                  className="text-xs font-semibold text-[#00256F] hover:underline flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">add_location</span>
                  <span>+ Crear nueva dirección</span>
                </button>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={direccionCaso}
                  onChange={(e) => setDireccionCaso(e.target.value)}
                  placeholder="Ingrese o seleccione la dirección formal..."
                  className="w-full pl-10 pr-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#00256F] outline-none"
                  required
                />
                <span className="material-symbols-outlined absolute left-3 top-3.5 text-slate-400 text-[20px]">
                  home
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Esta dirección se vinculará de manera automática a todas las hermanas del núcleo familiar.
              </p>
            </div>

            {/* Institución que Remite */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Institución que Remite o Canal de Ingreso
              </label>
              <input
                type="text"
                value={institucionRemite}
                onChange={(e) => setInstitucionRemite(e.target.value)}
                placeholder="Ej: Consejo Municipal de Derechos (CMDNNA), Hospital J.M. de los Ríos, etc."
                className="w-full px-3.5 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#00256F] outline-none"
                required
              />
            </div>

            {/* Prioridad del Caso (Radio Cards) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Prioridad del Caso
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    value: 'Normal' as ExpedientePriority,
                    desc: 'Seguimiento ordinario programado',
                    border: 'peer-checked:border-[#00256F] peer-checked:bg-blue-50/50'
                  },
                  {
                    value: 'Media' as ExpedientePriority,
                    desc: 'Requiere atención en las próximas 48h',
                    border: 'peer-checked:border-amber-500 peer-checked:bg-amber-50/50'
                  },
                  {
                    value: 'Urgente' as ExpedientePriority,
                    desc: 'Vulnerabilidad crítica inmediata',
                    border: 'peer-checked:border-red-500 peer-checked:bg-red-50/50'
                  }
                ].map((p) => (
                  <label
                    key={p.value}
                    className="relative block cursor-pointer select-none"
                  >
                    <input
                      type="radio"
                      name="prioridad"
                      value={p.value}
                      checked={prioridadCaso === p.value}
                      onChange={() => setPrioridadCaso(p.value)}
                      className="sr-only peer"
                    />
                    <div
                      className={`p-3.5 rounded-xl border border-slate-200 transition-all ${p.border}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900">
                          {p.value}
                        </span>
                        <span
                          className={`w-3.5 h-3.5 rounded-full border-2 ${
                            prioridadCaso === p.value
                              ? 'border-[#00256F] bg-[#00256F]'
                              : 'border-slate-300'
                          }`}
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                        {p.desc}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Observaciones Iniciales */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Observaciones Iniciales
              </label>
              <textarea
                rows={3}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Describa brevemente la situación psicosocial inicial..."
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#00256F] outline-none leading-relaxed"
              />
            </div>
          </div>
        )}

        {/* ================= STEP 2: NIÑA O HERMANAS ================= */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-in fade-in">
            {/* Banner notice */}
            {bannerNotice && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between gap-3 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-emerald-600">check_circle</span>
                  <span className="font-semibold">{bannerNotice}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setBannerNotice(null)}
                  className="text-emerald-600 hover:text-emerald-900 cursor-pointer text-sm font-bold"
                >
                  ✕
                </button>
              </div>
            )}

            {step2Error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span>
                <span>{step2Error}</span>
              </div>
            )}

            {/* If 2 or more sisters, show the clean horizontal tabs bar */}
            {girls.length > 1 ? (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px] text-[#00256F]">diversity_1</span>
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Hermanas en este Núcleo Familiar ({girls.length})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddSister}
                    className="px-3 py-1.5 bg-[#00256F] hover:bg-[#132E70] text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">person_add</span>
                    <span>+ Agregar otra hermana</span>
                  </button>
                </div>

                {/* Sister Tabs */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {girls.map((g, idx) => {
                    const isSelected = idx === activeGirlIndex;
                    const displayName = g.nombres.trim()
                      ? `${g.nombres} ${g.apellidos}`.trim()
                      : `Hermana #${idx + 1} (Sin nombre)`;
                    return (
                      <div
                        key={g.id || idx}
                        onClick={() => {
                          setActiveGirlIndex(idx);
                          setStep2Error(null);
                        }}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer flex-shrink-0 border ${
                          isSelected
                            ? 'bg-[#00256F] text-white border-[#00256F] shadow-sm'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-100/70'
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            isSelected ? 'bg-white text-[#00256F]' : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <span className="max-w-[140px] truncate">{displayName}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-blue-50 text-[#00256F]'
                          }`}
                        >
                          {g.expCode}
                        </span>
                        {girls.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveSister(idx);
                            }}
                            className={`ml-1 hover:text-red-500 rounded p-0.5 ${
                              isSelected ? 'text-white/80 hover:text-white' : 'text-slate-400'
                            }`}
                            title="Eliminar esta hermana del grupo"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                  <span>
                    ✓ Todos los datos se almacenan de forma independiente para cada hermana.
                  </span>
                  <span className="font-semibold text-[#00256F]">
                    Editando: Hermana #{activeGirlIndex + 1} de {girls.length} ({currentGirl.expCode})
                  </span>
                </div>
              </div>
            ) : (
              /* If only 1 girl, clean single-girl header with an intuitive + Registrar hermana button */
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 font-display">
                    Datos de la Niña Beneficiaria
                  </h2>
                  <p className="text-xs text-slate-500">
                    Información biográfica, identidad y datos educativos de la menor.
                  </p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="text-xs font-bold text-[#00256F] bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200">
                    Expediente: {currentGirl.expCode}
                  </span>
                  <button
                    type="button"
                    onClick={handleAddSister}
                    className="px-3 py-1.5 bg-[#00256F] hover:bg-[#132E70] text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                    title="Registrar una hermana vinculada que comparte dirección y representante"
                  >
                    <span className="material-symbols-outlined text-[16px]">person_add</span>
                    <span>+ Registrar una hermana</span>
                  </button>
                </div>
              </div>
            )}

            {/* Subheader when multiple sisters are present */}
            {girls.length > 1 && (
              <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-slate-900 font-display">
                    Datos de la Hermana #{activeGirlIndex + 1} ({currentGirl.expCode})
                  </h2>
                  <p className="text-xs text-slate-500">
                    {currentGirl.nombres.trim()
                      ? `Editando expediente de ${currentGirl.nombres} ${currentGirl.apellidos}.`
                      : 'Ingrese los nombres y datos particulares de esta hermana.'}
                  </p>
                </div>
                <span className="text-xs font-bold text-[#00256F] bg-blue-50 px-3 py-1 rounded-xl border border-blue-200 self-start sm:self-auto">
                  {currentGirl.expCode}
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Nombres
                </label>
                <input
                  type="text"
                  value={currentGirl.nombres}
                  onChange={(e) => updateCurrentGirl({ nombres: e.target.value })}
                  placeholder="Ej: Valeria Sofía"
                  className="w-full px-3.5 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#00256F] outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Lugar de Nacimiento
                </label>
                <input
                  type="text"
                  value={currentGirl.lugarNacimiento}
                  onChange={(e) => updateCurrentGirl({ lugarNacimiento: e.target.value })}
                  placeholder="Ej: Caracas, Dto. Capital"
                  className="w-full px-3.5 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#00256F] outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Apellidos
                </label>
                <input
                  type="text"
                  value={currentGirl.apellidos}
                  onChange={(e) => updateCurrentGirl({ apellidos: e.target.value })}
                  placeholder="Ej: Martínez López"
                  className="w-full px-3.5 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#00256F] outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Institución Educativa
                </label>
                <input
                  type="text"
                  value={currentGirl.institucionEducativa}
                  onChange={(e) => updateCurrentGirl({ institucionEducativa: e.target.value })}
                  placeholder="Ej: U.E.B. República de Venezuela"
                  className="w-full px-3.5 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#00256F] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Cédula de Identidad (Opcional)
                </label>
                <input
                  type="text"
                  value={currentGirl.cedula}
                  onChange={(e) => updateCurrentGirl({ cedula: e.target.value })}
                  placeholder="Ej: V-32.456.789 o Sin Cédula"
                  className="w-full px-3.5 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#00256F] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Grado Escolar Actual
                </label>
                <select
                  value={currentGirl.gradoEscolar}
                  onChange={(e) => updateCurrentGirl({ gradoEscolar: e.target.value })}
                  className="w-full px-3.5 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#00256F] outline-none"
                >
                  <option value="Educación Inicial">Educación Inicial (Preescolar)</option>
                  <option value="1er Grado">1er Grado de Primaria</option>
                  <option value="2do Grado">2do Grado de Primaria</option>
                  <option value="3er Grado">3er Grado de Primaria</option>
                  <option value="4to Grado">4to Grado de Primaria</option>
                  <option value="5to Grado">5to Grado de Primaria</option>
                  <option value="6to Grado">6to Grado de Primaria</option>
                  <option value="1er Año">1er Año de Media General</option>
                  <option value="2do Año">2do Año de Media General</option>
                  <option value="3er Año">3er Año de Media General</option>
                  <option value="4to Año">4to Año de Media General</option>
                  <option value="5to Año">5to Año de Media General</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Fecha de Nacimiento
                </label>
                <input
                  type="date"
                  value={currentGirl.fechaNacimiento}
                  onChange={(e) => updateCurrentGirl({ fechaNacimiento: e.target.value })}
                  className="w-full px-3.5 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#00256F] outline-none"
                  required
                />
                <span className="inline-block mt-1.5 text-xs font-semibold text-[#00256F]">
                  Edad calculada: {currentGirl.edad} años
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Observaciones Específicas de esta Niña
                </label>
                <input
                  type="text"
                  value={currentGirl.observaciones || ''}
                  onChange={(e) => updateCurrentGirl({ observaciones: e.target.value })}
                  placeholder="Detalles particulares de salud, pedagógicos o conductuales..."
                  className="w-full px-3.5 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#00256F] outline-none"
                />
              </div>
            </div>

            {/* Quick Actions in Step 2: Clear & Functional */}
            {girls.length > 1 && (
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleAddSister}
                  className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-[#00256F] border border-blue-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">person_add</span>
                  <span>+ Agregar otra hermana</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const emptyIdx = girls.findIndex((g) => !g.nombres.trim());
                    if (emptyIdx !== -1) {
                      setActiveGirlIndex(emptyIdx);
                      setStep2Error(`Por favor complete el nombre de la Hermana #${emptyIdx + 1} antes de ir al cierre.`);
                      return;
                    }
                    setStep2Error(null);
                    setCurrentStep(4);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                >
                  <span>Ir directo al Cierre (Paso 4)</span>
                  <span className="material-symbols-outlined text-[14px]">fast_forward</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ================= STEP 3: REPRESENTANTE ================= */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-in fade-in">
            {/* If multiple sisters, show shared representative note */}
            {girls.length > 1 && (
              <div className="p-3.5 bg-blue-50/80 border border-blue-200 text-xs text-[#00256F] rounded-xl flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[20px] text-[#00256F]">family_restroom</span>
                <span>
                  <strong>Representante Legal Común:</strong> Se vinculará de forma compartida a las <strong>{girls.length} hermanas</strong> registradas en este caso ({girls.map((g) => g.nombres.trim() || g.expCode).join(', ')}).
                </span>
              </div>
            )}

            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900 font-display">
                Datos del Representante Legal
              </h2>
              <p className="text-xs text-slate-500">
                Identificación, parentesco y datos de contacto de quien ejerce la patria potestad o tutela.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Nombres
                </label>
                <input
                  type="text"
                  value={nombresRep}
                  onChange={(e) => setNombresRep(e.target.value)}
                  placeholder="Ej: Carmen"
                  className="w-full px-3.5 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#00256F] outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Teléfono de Contacto
                </label>
                <input
                  type="tel"
                  value={telefonoRep}
                  onChange={(e) => setTelefonoRep(e.target.value)}
                  placeholder="Ej: +58 (414) 123-4567"
                  className="w-full px-3.5 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#00256F] outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Apellidos
                </label>
                <input
                  type="text"
                  value={apellidosRep}
                  onChange={(e) => setApellidosRep(e.target.value)}
                  placeholder="Ej: López de Martínez"
                  className="w-full px-3.5 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#00256F] outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Ocupación u Oficio
                </label>
                <input
                  type="text"
                  value={ocupacionRep}
                  onChange={(e) => setOcupacionRep(e.target.value)}
                  placeholder="Ej: Docente, Comerciante, etc."
                  className="w-full px-3.5 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#00256F] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Cédula de Identidad
                </label>
                <input
                  type="text"
                  value={cedulaRep}
                  onChange={(e) => setCedulaRep(e.target.value)}
                  placeholder="Ej: V-16.890.123"
                  className="w-full px-3.5 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#00256F] outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Estado Civil
                </label>
                <select
                  value={estadoCivilRep}
                  onChange={(e) => setEstadoCivilRep(e.target.value)}
                  className="w-full px-3.5 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#00256F] outline-none"
                >
                  <option value="Soltera">Soltera(o)</option>
                  <option value="Casada">Casada(o)</option>
                  <option value="Concubinato">Concubinato / Unión de Hecho</option>
                  <option value="Divorciada">Divorciada(o)</option>
                  <option value="Viuda">Viuda(o)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Parentesco con la Niña
                </label>
                <select
                  value={parentescoRep}
                  onChange={(e) => setParentescoRep(e.target.value as Representante['parentesco'])}
                  className="w-full px-3.5 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#00256F] outline-none"
                >
                  <option value="Madre">Madre</option>
                  <option value="Padre">Padre</option>
                  <option value="Abuela">Abuela</option>
                  <option value="Abuelo">Abuelo</option>
                  <option value="Tía">Tía</option>
                  <option value="Tío">Tío</option>
                  <option value="Hermano(a) Mayor">Hermano(a) Mayor</option>
                  <option value="Tutor Legal">Tutor Legal</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Nivel de Instrucción
                </label>
                <select
                  value={nivelInstruccionRep}
                  onChange={(e) => setNivelInstruccionRep(e.target.value)}
                  className="w-full px-3.5 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#00256F] outline-none"
                >
                  <option value="Primaria Incompleta">Primaria Incompleta</option>
                  <option value="Primaria Completa">Primaria Completa</option>
                  <option value="Secundaria">Secundaria (Bachillerato)</option>
                  <option value="Técnico Medio">Técnico Medio</option>
                  <option value="Técnico Superior">Técnico Superior Universitario (TSU)</option>
                  <option value="Universitario">Universitario Completo</option>
                  <option value="Postgrado">Postgrado / Especialización</option>
                </select>
              </div>
            </div>

            {/* Address option checkbox */}
            <div className="pt-2 border-t border-slate-100">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={usarMismaDireccion}
                  onChange={(e) => setUsarMismaDireccion(e.target.checked)}
                  className="w-4 h-4 text-[#00256F] border-slate-300 rounded focus:ring-[#00256F] accent-[#00256F]"
                />
                <span className="text-xs font-semibold text-slate-800">
                  Usar la misma dirección de residencia cargada en el expediente
                </span>
              </label>

              {usarMismaDireccion ? (
                <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-[#00256F]">home</span>
                  <span>{direccionCaso}</span>
                </div>
              ) : (
                <div className="mt-3">
                  <input
                    type="text"
                    value={direccionRep}
                    onChange={(e) => setDireccionRep(e.target.value)}
                    placeholder="Ingrese la dirección de habitación del representante..."
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#00256F] outline-none"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= STEP 4: CIERRE Y RESUMEN ================= */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-in fade-in">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900 font-display">
                Cierre del Expediente y Vínculo Familiar
              </h2>
              <p className="text-xs text-slate-500">
                Verifique las beneficiarias del núcleo familiar y confirme el registro de los expedientes.
              </p>
            </div>

            {/* Banner if there's any notice */}
            {bannerNotice && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-emerald-600">check_circle</span>
                  <span>{bannerNotice}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setBannerNotice(null)}
                  className="text-emerald-700 hover:text-emerald-900 font-bold"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Registered Sisters Section */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-[#00256F] text-white flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px]">family_restroom</span>
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Hermanas del Núcleo Familiar ({girls.length}{' '}
                      {girls.length === 1 ? 'Niña' : 'Hermanas'})
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Cada una tendrá su propio expediente oficial enlazado con sus hermanas.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAddSister}
                    className="px-3.5 py-1.5 bg-[#00256F] hover:bg-[#132E70] text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">person_add</span>
                    <span>+ Registrar otra hermana</span>
                  </button>
                </div>
              </div>

              {/* List of Sister Cards */}
              <div className="grid grid-cols-1 gap-3">
                {girls.map((girl, idx) => (
                  <div
                    key={girl.id || idx}
                    className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs hover:border-blue-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#00256F] text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                        #{idx + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-sm text-slate-900">
                            {girl.nombres || '(Sin nombre)'} {girl.apellidos}
                          </h4>
                          <span className="text-xs font-bold text-[#00256F] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                            {girl.expCode}
                          </span>
                          {idx === 0 ? (
                            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                              Registro Inicial
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              Hermana Vinculada #{idx + 1}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {girl.edad} años · {girl.gradoEscolar} · {girl.institucionEducativa || 'Sin institución asignada'} · Cédula: {girl.cedula || 'Sin Cédula'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveGirlIndex(idx);
                          setCurrentStep(2);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition flex items-center gap-1 cursor-pointer"
                        title="Editar datos de esta niña en el Paso 2"
                      >
                        <span className="material-symbols-outlined text-[15px]">edit</span>
                        <span>Editar datos</span>
                      </button>
                      {girls.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSister(idx)}
                          className="px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition flex items-center gap-1 cursor-pointer"
                          title="Eliminar de este núcleo"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                          <span>Quitar</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* If only 1 girl, subtle prompt to add sister if applicable */}
            {girls.length === 1 && (
              <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 text-slate-700">
                  <span className="material-symbols-outlined text-[20px] text-[#00256F]">info</span>
                  <span>¿Desea registrar a otra hermana en este mismo caso familiar?</span>
                </div>
                <button
                  type="button"
                  onClick={handleAddSister}
                  className="px-3 py-1.5 bg-white hover:bg-blue-50 text-[#00256F] border border-blue-200 rounded-lg font-semibold transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px]">person_add</span>
                  <span>+ Agregar hermana</span>
                </button>
              </div>
            )}

            {/* Summary Card */}
            <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50/50 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Resumen del Registro Familiar
                  </span>
                  <span className="text-xs font-bold bg-[#00256F] text-white px-2.5 py-0.5 rounded-full">
                    {girls.length} {girls.length === 1 ? 'Expediente' : 'Expedientes'}
                  </span>
                </div>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                  {girls.length > 1
                    ? `${girls.length} Expedientes Vinculados Listos`
                    : 'Listo para Archivar'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Representante Legal Común</span>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">
                    {nombresRep} {apellidosRep} ({parentescoRep})
                  </p>
                  <p className="text-slate-500 mt-0.5">
                    {telefonoRep} · Cédula: {cedulaRep}
                  </p>
                </div>

                <div>
                  <span className="text-slate-400 block font-medium">Dirección de Residencia Familiar</span>
                  <p className="text-slate-700 mt-0.5 truncate">{direccionCaso}</p>
                </div>

                <div>
                  <span className="text-slate-400 block font-medium">Institución Remitente</span>
                  <p className="text-slate-700 mt-0.5">{institucionRemite}</p>
                </div>

                <div>
                  <span className="text-slate-400 block font-medium">Tipo y Prioridad</span>
                  <p className="text-slate-700 mt-0.5">
                    {tipoExpediente} · Prioridad {prioridadCaso}
                  </p>
                </div>

                <div className="sm:col-span-2 pt-2 border-t border-slate-200 text-slate-600 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-emerald-600">check_circle</span>
                  <span>
                    Al finalizar se registrarán simultáneamente los expedientes{' '}
                    <strong>{girls.map((g) => `${g.nombres.trim() || '(Sin nombre)'} (${g.expCode})`).join(', ')}</strong>{' '}
                    con vínculos familiares cruzados en el sistema.
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Wizard Controls Footer */}
        <div className="flex items-center justify-between pt-6 mt-6 border-t border-slate-100">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((s) => (s - 1) as any)}
              className="px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl border border-slate-200 transition flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              <span>Anterior</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200 transition cursor-pointer"
            >
              Cancelar
            </button>
          )}

          <div className="flex items-center gap-2.5">
            {currentStep < 4 ? (
              <button
                type="button"
                onClick={() => {
                  if (currentStep === 2) {
                    const emptyIdx = girls.findIndex((g) => !g.nombres.trim());
                    if (emptyIdx !== -1) {
                      setActiveGirlIndex(emptyIdx);
                      setStep2Error(`Por favor ingrese el nombre de la Hermana #${emptyIdx + 1}.`);
                      return;
                    }
                  }
                  setStep2Error(null);
                  setCurrentStep((s) => (s + 1) as any);
                }}
                className="px-6 py-2.5 bg-[#00256F] hover:bg-[#132E70] text-white text-xs font-semibold rounded-xl shadow-md hover:shadow-lg transition flex items-center gap-2 cursor-pointer"
              >
                <span>Siguiente</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleFinish}
                  className="px-6 py-2.5 bg-[#00256F] hover:bg-[#132E70] text-white text-xs font-bold rounded-xl shadow-md hover:shadow-lg transition flex items-center gap-2 cursor-pointer"
                >
                  <span>
                    {girls.length > 1
                      ? `Guardar y Registrar Expedientes (${girls.length} Hermanas)`
                      : 'Finalizar Expediente (1 Niña)'}
                  </span>
                  <span className="material-symbols-outlined text-[18px]">check</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Sequence Preview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {currentStep === 1 && (
          <>
            <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs opacity-80">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Próximo</span>
              <p className="font-semibold text-slate-700 mt-0.5">Paso 2: Datos de la Niña</p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs opacity-60">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Próximo</span>
              <p className="font-semibold text-slate-700 mt-0.5">Paso 3: Representante Legal</p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs opacity-40">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Próximo</span>
              <p className="font-semibold text-slate-700 mt-0.5">Paso 4: Cierre y Resumen</p>
            </div>
          </>
        )}
        {currentStep === 2 && (
          <>
            <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Completado</span>
              <p className="font-semibold text-emerald-600 mt-0.5">✓ Paso 1: Datos del Caso</p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs opacity-80">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Actual</span>
              <p className="font-semibold text-[#00256F] mt-0.5">
                {girls.length > 1
                  ? `Editando Hermana #${activeGirlIndex + 1} de ${girls.length} (${currentGirl.expCode})`
                  : 'Paso 2: Datos de la Niña'}
              </p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs opacity-60">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Próximo</span>
              <p className="font-semibold text-slate-700 mt-0.5">Paso 3: Representante Legal</p>
            </div>
          </>
        )}
        {currentStep === 3 && (
          <>
            <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Completado</span>
              <p className="font-semibold text-emerald-600 mt-0.5">
                ✓ {girls.length} {girls.length === 1 ? 'Niña configurada' : 'Hermanas configuradas'}
              </p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Actual</span>
              <p className="font-semibold text-[#00256F] mt-0.5">Paso 3: Representante Legal</p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs opacity-80">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Próximo</span>
              <p className="font-semibold text-slate-700 mt-0.5">Paso 4: Cierre y Resumen</p>
            </div>
          </>
        )}
        {currentStep === 4 && (
          <>
            <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Completado</span>
              <p className="font-semibold text-emerald-600 mt-0.5">✓ Caso y Familia Verificados</p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Estado</span>
              <p className="font-semibold text-slate-700 mt-0.5">Listo para Guardar</p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Hermanas</span>
              <p className="font-semibold text-[#00256F] mt-0.5">
                {girls.length > 1
                  ? `${girls.length} Hermanas en Núcleo Familiar`
                  : 'Expediente Único'}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Address modal */}
      <NuevaDireccionModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        onSave={(fullAddr) => setDireccionCaso(fullAddr)}
      />
    </div>
  );
};
