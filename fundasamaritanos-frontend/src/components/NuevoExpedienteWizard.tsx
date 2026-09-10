import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Beneficiaria } from '../types';
import { NuevaDireccionModal } from './NuevaDireccionModal';
import { NuevaInstitucionModal } from './NuevaInstitucionModal';
import { SearchableSelect } from './SearchableSelect';
import {
  direccionesApi,
  institucionesApi,
  representantesApi,
  expedientesApi,
  beneficiariasApi
} from '../api/endpoints';

interface NuevoExpedienteWizardProps {
  onCancel: () => void;
  onSaveExpediente: (nuevo: Beneficiaria | Beneficiaria[] | any[], hermana?: Beneficiaria) => void;
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
  idDireccionLugarNacimiento?: number;
  institucionEducativa: string;
  idInstitucion?: number;
  gradoEscolar: string;
  observaciones?: string;
}

export const NuevoExpedienteWizard: React.FC<NuevoExpedienteWizardProps> = ({
  onCancel,
  onSaveExpediente,
  nextExpCode
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Modals & Catalogs
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [addressModalTarget, setAddressModalTarget] = useState<'caso' | 'lugarNacimiento' | 'representante'>('caso');
  const [isInstModalOpen, setIsInstModalOpen] = useState(false);

  // Catalogs loaded from backend
  const [direccionesList, setDireccionesList] = useState<any[]>([]);
  const [institucionesList, setInstitucionesList] = useState<any[]>([]);
  const [representantesList, setRepresentantesList] = useState<any[]>([]);
  const [parentescosList, setParentescosList] = useState<{ id_parentesco: number; descripcion: string }[]>([]);
  const [isLoadingCatalogs, setIsLoadingCatalogs] = useState(true);

  // Status & Feedback
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const [submitStatusText, setSubmitStatusText] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const todayStr = new Date().toISOString().slice(0, 10);

  // Helper to format addresses for select dropdowns
  const formatAddressOption = (d: any) => {
    if (!d) return 'Sin dirección';
    const ciudad = d.ciudad || d.estado || '';
    const urb = d.urbanizacion ? `, ${d.urbanizacion}` : '';
    const calle = d.calle_av ? `, ${d.calle_av}` : '';
    const casa = d.edificio_casa ? `, ${d.edificio_casa}` : '';
    return `${ciudad}${urb}${calle}${casa}`.trim();
  };

  // Calculate age from birthdate
  const calculateAge = (birthdateStr: string) => {
    if (!birthdateStr) return 0;
    const birth = new Date(birthdateStr);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age >= 0 ? age : 0;
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

  // Step 1 State: Caso / Expediente
  const [codigoExpediente, setCodigoExpediente] = useState(nextExpCode);
  const [fechaIngreso, setFechaIngreso] = useState(todayStr);
  const [idDireccionCaso, setIdDireccionCaso] = useState<number | undefined>(undefined);
  const [direccionCaso, setDireccionCaso] = useState('');
  const [observaciones, setObservaciones] = useState('');

  // Step 2 State: Multi-sister array stored reactively
  const [girls, setGirls] = useState<SisterDraft[]>([
    {
      id: `ben-${Date.now()}-0`,
      expCode: nextExpCode,
      nombres: '',
      apellidos: '',
      cedula: '',
      fechaNacimiento: '2014-05-15',
      edad: calculateAge('2014-05-15'),
      lugarNacimiento: '',
      idDireccionLugarNacimiento: undefined,
      institucionEducativa: '',
      idInstitucion: undefined,
      gradoEscolar: '6to Grado',
      observaciones: ''
    }
  ]);
  const [activeGirlIndex, setActiveGirlIndex] = useState<number>(0);

  // Step 3 State: Representante
  const [modoRep, setModoRep] = useState<'nuevo' | 'existente' | 'ninguno'>('nuevo');
  const [idRepresentanteExistente, setIdRepresentanteExistente] = useState<number | undefined>(undefined);

  // Nuevo Representante
  const [nombresRep, setNombresRep] = useState('');
  const [apellidosRep, setApellidosRep] = useState('');
  const [telefonoRep, setTelefonoRep] = useState('');
  const [cedulaRep, setCedulaRep] = useState('');
  const [ocupacionRep, setOcupacionRep] = useState('');
  const [usarMismaDireccion, setUsarMismaDireccion] = useState(true);
  const [idDireccionRep, setIdDireccionRep] = useState<number | undefined>(undefined);
  const [direccionRep, setDireccionRep] = useState('');

  // Parentesco
  const [idParentesco, setIdParentesco] = useState<number | undefined>(undefined);
  const [parentescoDescripcion, setParentescoDescripcion] = useState('Madre');

  const [catalogError, setCatalogError] = useState<string | null>(null);

  // Load backend catalogs on mount
  const loadCatalogs = async (isMounted: { current: boolean }) => {
    try {
      setCatalogError(null);
      setIsLoadingCatalogs(true);
      const [dirsRes, instsRes, repsRes, parsRes] = await Promise.allSettled([
        direccionesApi.list(),
        institucionesApi.list(),
        representantesApi.list(),
        representantesApi.listParentescos()
      ]);

      if (!isMounted.current) return;

      let errors: string[] = [];

      if (dirsRes.status === 'fulfilled' && Array.isArray(dirsRes.value)) {
        const dirs = dirsRes.value;
        setDireccionesList(dirs);
        if (dirs.length > 0) {
          setIdDireccionCaso((prev) => prev || dirs[0].id_direccion);
          setDireccionCaso((prev) => prev || formatAddressOption(dirs[0]));
          setGirls((prev) =>
            prev.map((g, idx) =>
              idx === 0
                ? {
                    ...g,
                    idDireccionLugarNacimiento: g.idDireccionLugarNacimiento || dirs[0].id_direccion,
                    lugarNacimiento: g.lugarNacimiento || formatAddressOption(dirs[0])
                  }
                : g
            )
          );
        }
      } else if (dirsRes.status === 'rejected') {
        errors.push(`Direcciones: ${dirsRes.reason?.message || 'Error al cargar'}`);
      }

      if (instsRes.status === 'fulfilled' && Array.isArray(instsRes.value)) {
        const insts = instsRes.value;
        setInstitucionesList(insts);
        if (insts.length > 0) {
          setGirls((prev) =>
            prev.map((g, idx) =>
              idx === 0
                ? {
                    ...g,
                    idInstitucion: g.idInstitucion || insts[0].id_institucion,
                    institucionEducativa: g.institucionEducativa || insts[0].nombre
                  }
                : g
            )
          );
        }
      } else if (instsRes.status === 'rejected') {
        errors.push(`Instituciones: ${instsRes.reason?.message || 'Error al cargar'}`);
      }

      if (repsRes.status === 'fulfilled' && Array.isArray(repsRes.value)) {
        setRepresentantesList(repsRes.value);
      } else if (repsRes.status === 'rejected') {
        errors.push(`Representantes: ${repsRes.reason?.message || 'Error al cargar'}`);
      }

      if (parsRes.status === 'fulfilled' && Array.isArray(parsRes.value)) {
        const pars = parsRes.value;
        setParentescosList(pars);
        if (pars.length > 0) {
          setIdParentesco((prev) => prev || pars[0].id_parentesco);
          setParentescoDescripcion((prev) => prev || pars[0].descripcion);
        }
      } else if (parsRes.status === 'rejected') {
        errors.push(`Parentescos: ${parsRes.reason?.message || 'Error al cargar'}`);
      }

      if (errors.length > 0) {
        setCatalogError(errors.join(' | '));
      }
    } catch (err: any) {
      if (!isMounted.current) return;
      console.error('Error cargando catálogos para el asistente:', err);
      setCatalogError(err?.message || 'No se pudieron cargar los datos del servidor. Verifique que el backend esté activo.');
    } finally {
      if (isMounted.current) setIsLoadingCatalogs(false);
    }
  };

  useEffect(() => {
    const isMounted = { current: true };
    loadCatalogs(isMounted);
    return () => {
      isMounted.current = false;
    };
  }, []);


  // Update correlative codes if base code changes
  useEffect(() => {
    setGirls((prev) =>
      prev.map((g, idx) => ({
        ...g,
        expCode: getExpCodeForIndex(codigoExpediente, idx)
      }))
    );
  }, [codigoExpediente]);

  // Options for SearchableSelect
  const direccionOptions = useMemo(() => {
    return direccionesList.map((d) => ({
      value: d.id_direccion,
      label: formatAddressOption(d)
    }));
  }, [direccionesList]);

  const institucionOptions = useMemo(() => {
    return institucionesList.map((inst) => ({
      value: inst.id_institucion,
      label: inst.nombre
    }));
  }, [institucionesList]);

  const representanteOptions = useMemo(() => {
    return representantesList.map((rep) => ({
      value: rep.id_representante,
      label: `${rep.nombres} ${rep.apellidos} (${rep.telefono_contacto || 'Sin tlf'})`
    }));
  }, [representantesList]);

  const parentescoOptions = useMemo(() => {
    return parentescosList.map((p) => ({
      value: p.id_parentesco,
      label: p.descripcion
    }));
  }, [parentescosList]);

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
      setStepError('Por favor complete los nombres de la niña actual antes de registrar a otra hermana.');
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setStepError(null);

    const newIndex = girls.length;
    const newCode = getExpCodeForIndex(codigoExpediente, newIndex);

    const newSister: SisterDraft = {
      id: `ben-${Date.now()}-${newIndex}`,
      expCode: newCode,
      nombres: '',
      apellidos: currentGirl.apellidos || '',
      cedula: '',
      fechaNacimiento: '2016-08-20',
      edad: calculateAge('2016-08-20'),
      lugarNacimiento: currentGirl.lugarNacimiento || (direccionesList[0] ? formatAddressOption(direccionesList[0]) : ''),
      idDireccionLugarNacimiento: currentGirl.idDireccionLugarNacimiento || direccionesList[0]?.id_direccion,
      institucionEducativa: currentGirl.institucionEducativa || (institucionesList[0]?.nombre || ''),
      idInstitucion: currentGirl.idInstitucion || institucionesList[0]?.id_institucion,
      gradoEscolar: '4to Grado',
      observaciones: ''
    };

    setGirls((prev) => [...prev, newSister]);
    setActiveGirlIndex(newIndex);
    setBannerNotice(
      `✓ Se agregó la Hermana #${newIndex + 1} (${newCode}) al grupo familiar.`
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
      expCode: getExpCodeForIndex(codigoExpediente, i)
    }));
    setGirls(reindexed);

    if (activeGirlIndex >= reindexed.length) {
      setActiveGirlIndex(reindexed.length - 1);
    } else if (activeGirlIndex === idxToRemove && activeGirlIndex > 0) {
      setActiveGirlIndex(activeGirlIndex - 1);
    }
    setBannerNotice(`✓ Se retiró a ${targetName} del registro.`);
  };

  // Modal handlers
  const handleOpenAddressModal = (target: 'caso' | 'lugarNacimiento' | 'representante') => {
    setAddressModalTarget(target);
    setIsAddressModalOpen(true);
  };

  const handleSaveNewAddress = (fullAddress: string, direccionData?: any) => {
    if (direccionData && direccionData.id_direccion) {
      setDireccionesList((prev) => {
        if (prev.some((d) => d.id_direccion === direccionData.id_direccion)) return prev;
        return [direccionData, ...prev];
      });

      if (addressModalTarget === 'caso') {
        setIdDireccionCaso(direccionData.id_direccion);
        setDireccionCaso(fullAddress);
      } else if (addressModalTarget === 'lugarNacimiento') {
        updateCurrentGirl({
          idDireccionLugarNacimiento: direccionData.id_direccion,
          lugarNacimiento: fullAddress
        });
      } else if (addressModalTarget === 'representante') {
        setIdDireccionRep(direccionData.id_direccion);
        setDireccionRep(fullAddress);
      }
    } else {
      if (addressModalTarget === 'caso') {
        setDireccionCaso(fullAddress);
      } else if (addressModalTarget === 'lugarNacimiento') {
        updateCurrentGirl({ lugarNacimiento: fullAddress });
      } else if (addressModalTarget === 'representante') {
        setDireccionRep(fullAddress);
      }
    }
  };

  const handleSaveNewInstitucion = (inst: { id_institucion: number; nombre: string; telefono?: string }) => {
    setInstitucionesList((prev) => {
      if (prev.some((i) => i.id_institucion === inst.id_institucion)) return prev;
      return [inst, ...prev];
    });
    updateCurrentGirl({
      idInstitucion: inst.id_institucion,
      institucionEducativa: inst.nombre
    });
  };

  // Step advancement validations
  const validateStep = (step: number): boolean => {
    setStepError(null);

    if (step === 1) {
      if (!codigoExpediente.trim()) {
        setStepError('Debe ingresar un código de expediente válido.');
        return false;
      }
      if (!fechaIngreso) {
        setStepError('Debe seleccionar la fecha de ingreso o apertura del expediente.');
        return false;
      }
      if (fechaIngreso > todayStr) {
        setStepError('La fecha de apertura del expediente no puede ser una fecha futura.');
        return false;
      }
      if (!idDireccionCaso) {
        setStepError('Debe seleccionar o crear una dirección de residencia familiar para el expediente.');
        return false;
      }
      return true;
    }

    if (step === 2) {
      for (let i = 0; i < girls.length; i++) {
        const g = girls[i];
        if (!g.nombres.trim()) {
          setActiveGirlIndex(i);
          setStepError(`Por favor ingrese el nombre de la Hermana #${i + 1}.`);
          return false;
        }
        if (!g.apellidos.trim()) {
          setActiveGirlIndex(i);
          setStepError(`Por favor ingrese los apellidos de la Hermana #${i + 1}.`);
          return false;
        }
        if (!g.fechaNacimiento) {
          setActiveGirlIndex(i);
          setStepError(`Por favor ingrese la fecha de nacimiento de la Hermana #${i + 1}.`);
          return false;
        }
        if (g.fechaNacimiento > todayStr) {
          setActiveGirlIndex(i);
          setStepError(`La fecha de nacimiento de la Hermana #${i + 1} no puede ser futura.`);
          return false;
        }
        if (!g.idDireccionLugarNacimiento) {
          setActiveGirlIndex(i);
          setStepError(`Por favor seleccione o cree el lugar de nacimiento para la Hermana #${i + 1}.`);
          return false;
        }
        if (!g.idInstitucion) {
          setActiveGirlIndex(i);
          setStepError(`Por favor seleccione o cree la institución educativa para la Hermana #${i + 1}.`);
          return false;
        }
      }
      return true;
    }

    if (step === 3) {
      if (modoRep === 'nuevo') {
        if (!nombresRep.trim()) {
          setStepError('Debe ingresar los nombres del representante legal.');
          return false;
        }
        if (!apellidosRep.trim()) {
          setStepError('Debe ingresar los apellidos del representante legal.');
          return false;
        }
        if (!telefonoRep.trim() || telefonoRep.trim().length < 7) {
          setStepError('Debe ingresar un teléfono de contacto válido (mínimo 7 dígitos).');
          return false;
        }
        const dirRepToUse = usarMismaDireccion ? idDireccionCaso : idDireccionRep;
        if (!dirRepToUse) {
          setStepError('Debe seleccionar o registrar una dirección de residencia para el representante.');
          return false;
        }
        if (!idParentesco) {
          setStepError('Debe seleccionar el parentesco del representante con las beneficiarias.');
          return false;
        }
      } else if (modoRep === 'existente') {
        if (!idRepresentanteExistente) {
          setStepError('Debe seleccionar un representante legal registrado de la lista.');
          return false;
        }
        if (!idParentesco) {
          setStepError('Debe seleccionar el parentesco del representante con las beneficiarias.');
          return false;
        }
      }
      return true;
    }

    return true;
  };

  const handleNextStep = () => {
    if (!validateStep(currentStep)) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setStepError(null);
    setCurrentStep((s) => (s + 1) as any);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Final submit & real database persistence
  const handleFinish = async () => {
    if (isSubmittingRef.current || isSubmitting) {
      return;
    }

    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitStatusText('Iniciando registro...');

    try {
      // 1. Determine or create representante
      let finalIdRepresentante: number | undefined = undefined;

      if (modoRep === 'nuevo') {
        setSubmitStatusText('Registrando representante legal en la base de datos...');
        const dirRepId = usarMismaDireccion ? idDireccionCaso : idDireccionRep;
        if (!dirRepId) {
          throw new Error('Falta la dirección de residencia del representante.');
        }

        const newRep = await representantesApi.create({
          nombres: nombresRep.trim(),
          apellidos: apellidosRep.trim(),
          telefono_contacto: telefonoRep.trim(),
          id_direccion: dirRepId,
          ocupacion_laboral: ocupacionRep.trim() || undefined,
          fecha_nacimiento: undefined
        });

        finalIdRepresentante = newRep.id_representante || newRep.id;
      } else if (modoRep === 'existente' && idRepresentanteExistente) {
        finalIdRepresentante = idRepresentanteExistente;
      }

      // 2. Create Expediente
      setSubmitStatusText('Creando expediente familiar en la base de datos...');
      const newExp = await expedientesApi.create({
        codigo_expediente: codigoExpediente.trim(),
        id_direccion: idDireccionCaso!,
        fecha_apertura: fechaIngreso,
        observaciones: observaciones.trim() || undefined,
        activo: true
      });

      const finalIdExpediente = newExp.id_expediente || newExp.id;

      // 3. Create each girl
      const createdBeneficiariasList: any[] = [];
      for (let i = 0; i < girls.length; i++) {
        const g = girls[i];
        setSubmitStatusText(
          `Registrando beneficiaria (${i + 1} de ${girls.length}): ${g.nombres}...`
        );

        const payload: any = {
          nombres: g.nombres.trim(),
          apellidos: g.apellidos.trim(),
          cedula_identidad: g.cedula.trim() || undefined,
          fecha_nacimiento: g.fechaNacimiento,
          grado_actual: g.gradoEscolar || undefined,
          id_expediente: finalIdExpediente,
          id_institucion: g.idInstitucion!,
          id_direccion_lugar_nacimiento: g.idDireccionLugarNacimiento!,
          id_estado_beneficiaria: 1, // Activa
          id_representante: finalIdRepresentante || undefined,
          id_parentesco: finalIdRepresentante ? idParentesco : undefined,
          observaciones: g.observaciones?.trim() || undefined
        };

        const createdGirl = await beneficiariasApi.create(payload);
        createdBeneficiariasList.push(createdGirl);
      }

      // 4. Finalize and notify parent view
      setSubmitStatusText('Sincronizando estado general...');
      onSaveExpediente(createdBeneficiariasList);
    } catch (err: any) {
      console.error('Error al registrar expediente y beneficiarias:', err);
      const detail =
        err?.response?.data?.detail ||
        err?.message ||
        'Error de conexión con el servidor al procesar el registro.';

      const displayMsg =
        typeof detail === 'string'
          ? detail
          : Array.isArray(detail)
          ? detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ')
          : JSON.stringify(detail);

      setSubmitError(`No se pudo completar el registro: ${displayMsg}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
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
                : codigoExpediente}
            </span>
          </div>
        </div>

        {/* Stepper Tabs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 pt-5">
          {[
            { step: 1, label: 'CASO', icon: 'folder_open' },
            {
              step: 2,
              label: girls.length > 1 ? `NIÑAS (${girls.length})` : 'NIÑA',
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
        {/* Catalog loading indicator */}
        {isLoadingCatalogs && (
          <div className="p-3.5 mb-6 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-800 flex items-center gap-2.5 animate-in fade-in">
            <svg className="animate-spin h-4 w-4 text-[#00256F] flex-shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            <span className="font-semibold">Cargando listas de direcciones, instituciones y parentescos desde el servidor...</span>
          </div>
        )}

        {/* Catalog error with retry */}
        {!isLoadingCatalogs && catalogError && (
          <div className="p-3.5 mb-6 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-900 animate-in fade-in">
            <div className="flex items-start gap-2.5">
              <span className="material-symbols-outlined text-[20px] text-amber-600 flex-shrink-0">wifi_off</span>
              <div className="flex-1">
                <p className="font-bold">No se pudieron cargar los catálogos desde el servidor.</p>
                <p className="mt-0.5 text-amber-700">{catalogError}</p>
                <p className="mt-1 text-amber-600">Asegúrese de que el backend esté corriendo en <strong>http://127.0.0.1:8000</strong> e intente de nuevo.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const isMounted = { current: true };
                  loadCatalogs(isMounted);
                }}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition flex-shrink-0 cursor-pointer"
              >
                Reintentar
              </button>
            </div>
          </div>
        )}

        {/* Validation error banner */}
        {stepError && (
          <div className="p-3.5 mb-6 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2.5 animate-in fade-in">
            <span className="material-symbols-outlined text-[20px] text-red-600 flex-shrink-0">
              error
            </span>
            <span className="font-semibold">{stepError}</span>
          </div>
        )}

        {/* Notice banner */}
        {bannerNotice && (
          <div className="p-3.5 mb-6 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-emerald-600">
                check_circle
              </span>
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
              {/* Código de Expediente */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Código de Expediente
                </label>
                <input
                  type="text"
                  value={codigoExpediente}
                  onChange={(e) => setCodigoExpediente(e.target.value)}
                  placeholder="Ej: EXP-2026-0001"
                  className="w-full px-3.5 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#00256F] outline-none font-mono font-bold text-[#00256F]"
                  required
                />
              </div>

              {/* Fecha de Ingreso / Apertura */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Fecha de Apertura
                </label>
                <input
                  type="date"
                  max={todayStr}
                  value={fechaIngreso}
                  onChange={(e) => setFechaIngreso(e.target.value)}
                  className="w-full px-3.5 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#00256F] outline-none"
                  required
                />
              </div>
            </div>

            {/* Dirección de Residencia with SearchableSelect & + Crear Nueva */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Dirección de Residencia Familiar
                </label>
                <button
                  type="button"
                  onClick={() => handleOpenAddressModal('caso')}
                  className="text-xs font-semibold text-[#00256F] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">add_location</span>
                  <span>+ Crear nueva dirección</span>
                </button>
              </div>

              <SearchableSelect
                options={direccionOptions}
                value={idDireccionCaso}
                onChange={(val) => {
                  setIdDireccionCaso(val);
                  const sel = direccionesList.find((d) => d.id_direccion === val);
                  if (sel) setDireccionCaso(formatAddressOption(sel));
                }}
                placeholder="Buscar o seleccionar dirección de residencia..."
                className="w-full"
              />

              <p className="text-[11px] text-slate-400 mt-1.5">
                Esta dirección se vinculará de manera automática a todas las hermanas del núcleo familiar.
              </p>
            </div>

            {/* Observaciones Iniciales */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Observaciones Iniciales del Expediente
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

        {/* ================= STEP 2: NIÑAS O HERMANAS ================= */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-in fade-in">
            {/* If 2 or more sisters, show the clean horizontal tabs bar */}
            {girls.length > 1 ? (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px] text-[#00256F]">
                      diversity_1
                    </span>
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
                          setStepError(null);
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
              /* If only 1 girl, clean single-girl header */
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
              {/* Nombres */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Nombres <span className="text-red-500">*</span>
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

              {/* Apellidos */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Apellidos <span className="text-red-500">*</span>
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

              {/* Cédula de Identidad */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Cédula de Identidad (Opcional)
                </label>
                <input
                  type="text"
                  value={currentGirl.cedula}
                  onChange={(e) => updateCurrentGirl({ cedula: e.target.value })}
                  placeholder="Ej: V-32.456.789 o dejar en blanco"
                  className="w-full px-3.5 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#00256F] outline-none"
                />
              </div>

              {/* Fecha de Nacimiento */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Fecha de Nacimiento <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  max={todayStr}
                  value={currentGirl.fechaNacimiento}
                  onChange={(e) => updateCurrentGirl({ fechaNacimiento: e.target.value })}
                  className="w-full px-3.5 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#00256F] outline-none"
                  required
                />
                <span className="inline-block mt-1.5 text-xs font-semibold text-[#00256F]">
                  Edad calculada: {currentGirl.edad} años
                </span>
              </div>

              {/* Lugar de Nacimiento with SearchableSelect */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Lugar de Nacimiento <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => handleOpenAddressModal('lugarNacimiento')}
                    className="text-xs font-semibold text-[#00256F] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">add_location</span>
                    <span>+ Nueva dirección</span>
                  </button>
                </div>

                <SearchableSelect
                  options={direccionOptions}
                  value={currentGirl.idDireccionLugarNacimiento}
                  onChange={(val) => {
                    const sel = direccionesList.find((d) => d.id_direccion === val);
                    updateCurrentGirl({
                      idDireccionLugarNacimiento: val,
                      lugarNacimiento: sel ? formatAddressOption(sel) : ''
                    });
                  }}
                  placeholder="Buscar ciudad o lugar de nacimiento..."
                  className="w-full"
                />
              </div>

              {/* Institución Educativa with SearchableSelect */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Institución Educativa / Escuela <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsInstModalOpen(true)}
                    className="text-xs font-semibold text-[#00256F] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">school</span>
                    <span>+ Nueva institución</span>
                  </button>
                </div>

                <SearchableSelect
                  options={institucionOptions}
                  value={currentGirl.idInstitucion}
                  onChange={(val) => {
                    const sel = institucionesList.find((i) => i.id_institucion === val);
                    updateCurrentGirl({
                      idInstitucion: val,
                      institucionEducativa: sel ? sel.nombre : ''
                    });
                  }}
                  placeholder="Buscar institución educativa..."
                  className="w-full"
                />
              </div>

              {/* Grado Escolar */}
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

              {/* Observaciones Específicas */}
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

            {/* Step 2 Footer quick actions */}
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
                    if (validateStep(2)) {
                      setCurrentStep(4);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
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
                <span className="material-symbols-outlined text-[20px] text-[#00256F]">
                  family_restroom
                </span>
                <span>
                  <strong>Representante Legal Común:</strong> Se vinculará de forma compartida a las{' '}
                  <strong>{girls.length} hermanas</strong> registradas en este caso (
                  {girls.map((g) => g.nombres.trim() || g.expCode).join(', ')}).
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

            {/* Mode Toggle: Nuevo | Existente | Sin Representante */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Modalidad de Asignación
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    id: 'nuevo' as const,
                    title: 'Registrar Nuevo',
                    desc: 'Crear un nuevo representante en la base de datos'
                  },
                  {
                    id: 'existente' as const,
                    title: 'Seleccionar Existente',
                    desc: 'Elegir un representante ya registrado previamente'
                  },
                  {
                    id: 'ninguno' as const,
                    title: 'Sin Representante por Ahora',
                    desc: 'Omitir asignación por el momento'
                  }
                ].map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => {
                      setModoRep(mode.id);
                      setStepError(null);
                    }}
                    className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                      modoRep === mode.id
                        ? 'bg-[#00256F] text-white border-[#00256F] shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span className="block text-xs font-bold">{mode.title}</span>
                    <span
                      className={`block text-[11px] mt-1 ${
                        modoRep === mode.id ? 'text-blue-100' : 'text-slate-400'
                      }`}
                    >
                      {mode.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Mode 1: Registrar Nuevo Representante */}
            {modoRep === 'nuevo' && (
              <div className="space-y-5 animate-in fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Nombres <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={nombresRep}
                      onChange={(e) => setNombresRep(e.target.value)}
                      placeholder="Ej: Carmen Elena"
                      className="w-full px-3.5 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#00256F] outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Apellidos <span className="text-red-500">*</span>
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
                      Teléfono de Contacto <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={telefonoRep}
                      onChange={(e) => setTelefonoRep(e.target.value)}
                      placeholder="Ej: 0414-1234567"
                      className="w-full px-3.5 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#00256F] outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Cédula de Identidad (Opcional)
                    </label>
                    <input
                      type="text"
                      value={cedulaRep}
                      onChange={(e) => setCedulaRep(e.target.value)}
                      placeholder="Ej: V-16.890.123"
                      className="w-full px-3.5 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#00256F] outline-none"
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
                </div>

                {/* Dirección del Representante */}
                <div className="pt-3 border-t border-slate-100">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
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
                      <span className="material-symbols-outlined text-[18px] text-[#00256F]">
                        home
                      </span>
                      <span>{direccionCaso || 'Dirección del caso seleccionada en el Paso 1'}</span>
                    </div>
                  ) : (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Dirección de Habitación del Representante
                        </label>
                        <button
                          type="button"
                          onClick={() => handleOpenAddressModal('representante')}
                          className="text-xs font-semibold text-[#00256F] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">add_location</span>
                          <span>+ Nueva dirección</span>
                        </button>
                      </div>
                      <SearchableSelect
                        options={direccionOptions}
                        value={idDireccionRep}
                        onChange={(val) => {
                          setIdDireccionRep(val);
                          const sel = direccionesList.find((d) => d.id_direccion === val);
                          if (sel) setDireccionRep(formatAddressOption(sel));
                        }}
                        placeholder="Buscar dirección para el representante..."
                        className="w-full"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Mode 2: Seleccionar Representante Existente */}
            {modoRep === 'existente' && (
              <div className="space-y-4 animate-in fade-in">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Buscar Representante Registrado
                  </label>
                  <SearchableSelect
                    options={representanteOptions}
                    value={idRepresentanteExistente}
                    onChange={(val) => setIdRepresentanteExistente(val)}
                    placeholder="Escriba para buscar por nombre o apellido..."
                    className="w-full"
                  />
                </div>

                {idRepresentanteExistente && (
                  <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200 flex items-start gap-3">
                    <span className="w-9 h-9 rounded-lg bg-[#00256F] text-white flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-[20px]">person</span>
                    </span>
                    <div className="text-xs">
                      {(() => {
                        const rep = representantesList.find(
                          (r) => r.id_representante === idRepresentanteExistente
                        );
                        if (!rep) return <span>Cargando datos...</span>;
                        return (
                          <>
                            <h4 className="font-bold text-slate-900 text-sm">
                              {rep.nombres} {rep.apellidos}
                            </h4>
                            <p className="text-slate-600 mt-0.5">
                              Teléfono: {rep.telefono_contacto || 'No registrado'} · Ocupación: {rep.ocupacion_laboral || 'No registrada'}
                            </p>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Parentesco: Selector de BD para nuevo y existente */}
            {modoRep !== 'ninguno' && (
              <div className="pt-4 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Parentesco con las Beneficiarias <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  options={parentescoOptions}
                  value={idParentesco}
                  onChange={(val) => {
                    setIdParentesco(val);
                    const sel = parentescosList.find((p) => p.id_parentesco === val);
                    if (sel) setParentescoDescripcion(sel.descripcion);
                  }}
                  placeholder="Seleccione el parentesco..."
                  className="w-full max-w-md"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Este parentesco quedará vinculado a todas las hermanas registradas en este núcleo.
                </p>
              </div>
            )}
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

            {/* Submission in-progress state */}
            {isSubmitting && (
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center gap-3 animate-in fade-in">
                <span className="material-symbols-outlined text-[24px] text-[#00256F] animate-spin">
                  progress_activity
                </span>
                <div>
                  <span className="font-bold block text-sm">Guardando en la base de datos...</span>
                  <span className="text-blue-700">{submitStatusText}</span>
                </div>
              </div>
            )}

            {/* Submission error alert */}
            {submitError && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-3 animate-in fade-in">
                <span className="material-symbols-outlined text-[22px] text-red-600 flex-shrink-0">
                  error
                </span>
                <div className="space-y-1">
                  <span className="font-bold block text-sm">Error al registrar</span>
                  <p>{submitError}</p>
                  <p className="text-[11px] text-red-500">
                    Sus datos no se han perdido. Puede regresar a los pasos anteriores para corregir la información y reintentar.
                  </p>
                </div>
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
                          {girl.edad} años · {girl.gradoEscolar} · {girl.institucionEducativa || 'Sin institución'} · Lugar Nac: {girl.lugarNacimiento || 'Sin asignar'}
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

            {/* If only 1 girl, subtle prompt to add sister */}
            {girls.length === 1 && (
              <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 text-slate-700">
                  <span className="material-symbols-outlined text-[20px] text-[#00256F]">
                    info
                  </span>
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
                  <span className="text-slate-400 block font-medium">Representante Legal Asignado</span>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">
                    {modoRep === 'nuevo' && `${nombresRep} ${apellidosRep} (${parentescoDescripcion})`}
                    {modoRep === 'existente' && (() => {
                      const rep = representantesList.find((r) => r.id_representante === idRepresentanteExistente);
                      return rep ? `${rep.nombres} ${rep.apellidos} (${parentescoDescripcion})` : 'Representante seleccionado';
                    })()}
                    {modoRep === 'ninguno' && 'Sin representante asignado'}
                  </p>
                  {modoRep === 'nuevo' && (
                    <p className="text-slate-500 mt-0.5">{telefonoRep} · Cédula: {cedulaRep || 'S/C'}</p>
                  )}
                </div>

                <div>
                  <span className="text-slate-400 block font-medium">Dirección de Residencia Familiar</span>
                  <p className="text-slate-700 mt-0.5 truncate">{direccionCaso}</p>
                </div>

                <div className="sm:col-span-2 pt-2 border-t border-slate-200 text-slate-600 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-emerald-600">
                    check_circle
                  </span>
                  <span>
                    Al confirmar se registrarán simultáneamente en la base de datos relacional los expedientes{' '}
                    <strong>
                      {girls
                        .map((g) => `${g.nombres.trim() || '(Sin nombre)'} (${g.expCode})`)
                        .join(', ')}
                    </strong>.
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
              disabled={isSubmitting}
              onClick={() => setCurrentStep((s) => (s - 1) as any)}
              className="px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl border border-slate-200 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              <span>Anterior</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onCancel}
              className="px-5 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200 transition cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
          )}

          <div className="flex items-center gap-2.5">
            {currentStep < 4 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="px-6 py-2.5 bg-[#00256F] hover:bg-[#132E70] text-white text-xs font-semibold rounded-xl shadow-md hover:shadow-lg transition flex items-center gap-2 cursor-pointer"
              >
                <span>Siguiente</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleFinish}
                className="px-6 py-2.5 bg-[#00256F] hover:bg-[#132E70] text-white text-xs font-bold rounded-xl shadow-md hover:shadow-lg transition flex items-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <span className="material-symbols-outlined text-[18px] animate-spin">
                      progress_activity
                    </span>
                    <span>Guardando en BD...</span>
                  </>
                ) : (
                  <>
                    <span>
                      {girls.length > 1
                        ? `Guardar y Registrar Expedientes (${girls.length} Hermanas)`
                        : 'Finalizar y Guardar Expediente'}
                    </span>
                    <span className="material-symbols-outlined text-[18px]">check</span>
                  </>
                )}
              </button>
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

      {/* Address creation modal */}
      <NuevaDireccionModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        onSave={handleSaveNewAddress}
      />

      {/* Institution creation modal */}
      <NuevaInstitucionModal
        isOpen={isInstModalOpen}
        onClose={() => setIsInstModalOpen(false)}
        onSave={handleSaveNewInstitucion}
      />
    </div>
  );
};
