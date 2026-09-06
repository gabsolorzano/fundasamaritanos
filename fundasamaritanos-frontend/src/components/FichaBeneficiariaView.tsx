import React, { useState, useEffect, useMemo } from 'react';
import { Beneficiaria, BeneficiariaStatus } from '../types';
import { NuevaDireccionModal } from './NuevaDireccionModal';
import { NuevaInstitucionModal } from './NuevaInstitucionModal';
import { SearchableSelect } from './SearchableSelect';
import { useAuth } from '../context/AuthContext';
import {
  beneficiariasApi,
  institucionesApi,
  direccionesApi,
  representantesApi,
  expedientesApi
} from '../api/endpoints';

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
}) => {
  const { isLector } = useAuth();

  // Active Tab: personal | expediente | historial
  const [activeTab, setActiveTab] = useState<'personal' | 'expediente' | 'historial'>('personal');

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Modals & Catalogs
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [addressModalTarget, setAddressModalTarget] = useState<'lugarNacimiento' | 'representante'>('lugarNacimiento');
  const [isInstModalOpen, setIsInstModalOpen] = useState(false);

  // Catalogs loaded from backend
  const [direccionesList, setDireccionesList] = useState<any[]>([]);
  const [institucionesList, setInstitucionesList] = useState<any[]>([]);
  const [parentescosList, setParentescosList] = useState<{ id_parentesco: number; descripcion: string }[]>([]);

  // Detailed backend data
  const [backendDetail, setBackendDetail] = useState<any | null>(null);

  // Notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [validationError, setValidationError] = useState<string | null>(null);

  const todayStr = new Date().toISOString().slice(0, 10);

  // Pestaña 1: Datos Personales (Lugar de Residencia REMOVED)
  const [nombres, setNombres] = useState(beneficiaria.nombres || '');
  const [apellidos, setApellidos] = useState(beneficiaria.apellidos || '');
  const [cedula, setCedula] = useState(beneficiaria.cedula || '');
  const [fechaNacimiento, setFechaNacimiento] = useState(beneficiaria.fechaNacimiento || '');
  const [idDireccionLugarNacimiento, setIdDireccionLugarNacimiento] = useState<number | undefined>(undefined);

  // Educación
  const [idInstitucion, setIdInstitucion] = useState<number | undefined>(beneficiaria.id_institucion);
  const [institucionEducativa, setInstitucionEducativa] = useState(beneficiaria.institucionEducativa || '');
  const [grado, setGrado] = useState(beneficiaria.grado || '');

  // Contacto y Observaciones Niña
  const [telefonoPrincipal, setTelefonoPrincipal] = useState(beneficiaria.telefonoPrincipal || '');
  const [telefonoSecundario, setTelefonoSecundario] = useState(beneficiaria.telefonoSecundario || '');
  const [observacionesNina, setObservacionesNina] = useState(beneficiaria.observaciones || '');

  // Pestaña 2: Representante Legal
  const [idRepresentante, setIdRepresentante] = useState<number | undefined>(undefined);
  const [repNombres, setRepNombres] = useState('');
  const [repApellidos, setRepApellidos] = useState('');
  const [repCedula, setRepCedula] = useState('');
  const [repTelefono, setRepTelefono] = useState('');
  const [repOcupacion, setRepOcupacion] = useState('');
  const [repIdDireccion, setRepIdDireccion] = useState<number | undefined>(undefined);
  const [idParentesco, setIdParentesco] = useState<number | undefined>(undefined);
  const [parentescoDescripcion, setParentescoDescripcion] = useState('');

  // Pestaña 2: Observaciones del Expediente Familiar
  const [idExpediente, setIdExpediente] = useState<number | undefined>(undefined);
  const [observacionesExpediente, setObservacionesExpediente] = useState(beneficiaria.observacionesExpediente || '');

  // Pestaña 3: Historial y Estatus
  const [estado, setEstado] = useState<BeneficiariaStatus>(beneficiaria.estado || 'Activa');
  const [fechaEgreso, setFechaEgreso] = useState(beneficiaria.fechaEgreso || '');
  const [motivoEgreso, setMotivoEgreso] = useState('');

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Helper to format addresses for select dropdowns
  const formatAddressOption = (d: any) => {
    if (!d) return 'Sin dirección';
    const ciudad = d.ciudad || d.estado || '';
    const urb = d.urbanizacion ? `, ${d.urbanizacion}` : '';
    const calle = d.calle_av ? `, ${d.calle_av}` : '';
    const casa = d.edificio_casa ? `, ${d.edificio_casa}` : '';
    return `${ciudad}${urb}${calle}${casa}`;
  };

  // Initial Catalogs Loading
  useEffect(() => {
    let isMounted = true;

    direccionesApi.list()
      .then((dirs) => {
        if (isMounted && Array.isArray(dirs)) {
          setDireccionesList(dirs);
        }
      })
      .catch((e) => console.warn('Error cargando direcciones:', e));

    institucionesApi.list()
      .then((insts) => {
        if (isMounted && Array.isArray(insts)) {
          setInstitucionesList(insts);
        }
      })
      .catch((e) => console.warn('Error cargando instituciones:', e));

    representantesApi.listParentescos()
      .then((parents) => {
        if (isMounted && Array.isArray(parents)) {
          setParentescosList(parents);
        }
      })
      .catch((e) => console.warn('Error cargando parentescos:', e));

    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch full Beneficiaria Detail from API on mount or when beneficiaria.id changes
  useEffect(() => {
    let isMounted = true;
    setIsEditing(false);
    setValidationError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Sync basic props
    setNombres(beneficiaria.nombres || '');
    setApellidos(beneficiaria.apellidos || '');
    setCedula(beneficiaria.cedula || '');
    setFechaNacimiento(beneficiaria.fechaNacimiento || '');
    setInstitucionEducativa(beneficiaria.institucionEducativa || '');
    setGrado(beneficiaria.grado || '');
    setEstado(beneficiaria.estado || 'Activa');
    setFechaEgreso(beneficiaria.fechaEgreso || '');
    setObservacionesNina(beneficiaria.observaciones || '');

    beneficiariasApi.get(beneficiaria.id)
      .then((detail) => {
        if (!isMounted || !detail) return;
        setBackendDetail(detail);

        // Expediente
        if (detail.expediente) {
          setIdExpediente(detail.expediente.id_expediente);
          if (detail.expediente.observaciones) {
            setObservacionesExpediente(detail.expediente.observaciones);
          }
        }

        // Lugar de nacimiento
        if (detail.lugar_nacimiento?.id_direccion) {
          setIdDireccionLugarNacimiento(detail.lugar_nacimiento.id_direccion);
        }

        // Institución
        if (detail.institucion) {
          setIdInstitucion(detail.institucion.id_institucion);
          setInstitucionEducativa(detail.institucion.nombre);
        }

        // Representante
        if (detail.representantes && detail.representantes.length > 0) {
          const rep = detail.representantes[0];
          setIdRepresentante(rep.id_representante);
          setRepNombres(rep.nombres || '');
          setRepApellidos(rep.apellidos || '');
          setRepCedula(rep.cedula_identidad || rep.cedula || '');
          setRepTelefono(rep.telefono_contacto || rep.telefono || '');
          setRepOcupacion(rep.ocupacion_laboral || rep.ocupacion || '');
          if (rep.id_direccion) {
            setRepIdDireccion(rep.id_direccion);
          }
          if (rep.parentesco) {
            setParentescoDescripcion(rep.parentesco);
          }
          if (rep.telefono_contacto && !telefonoPrincipal) {
            setTelefonoPrincipal(rep.telefono_contacto);
          }
        }
      })
      .catch((err) => {
        console.warn('Carga de detalle de beneficiaria desde API:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [beneficiaria.id]);

  // Sync parentesco ID when parentescosList or parentescoDescripcion is available
  useEffect(() => {
    if (parentescoDescripcion && parentescosList.length > 0) {
      const match = parentescosList.find(
        (p) => p.descripcion.toLowerCase() === parentescoDescripcion.toLowerCase()
      );
      if (match) {
        setIdParentesco(match.id_parentesco);
      }
    }
  }, [parentescoDescripcion, parentescosList]);

  // Reactive Age Calculation
  const edadCalculada = useMemo(() => {
    if (!fechaNacimiento) return beneficiaria.edad || 0;
    const parts = fechaNacimiento.split('-');
    if (parts.length < 3) return beneficiaria.edad || 0;
    const birthDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= 0 ? age : 0;
  }, [fechaNacimiento, beneficiaria.edad]);

  // Handle status change
  const handleEstadoChange = (newEstado: BeneficiariaStatus) => {
    setEstado(newEstado);
    setValidationError(null);
    if (newEstado === 'Activa') {
      setFechaEgreso('');
      setMotivoEgreso('');
    } else if (!fechaEgreso) {
      setFechaEgreso(todayStr);
    }
  };

  // Find linked sisters from backend or fallback — STRICTLY EXCLUDING CURRENT BENEFICIARIA
  const hermanasVinculadas = useMemo(() => {
    const currentId = String(beneficiaria.id);

    // 1. From backend detail response
    if (backendDetail?.hermanas && Array.isArray(backendDetail.hermanas)) {
      const validHermanas = backendDetail.hermanas.filter(
        (h: any) => String(h.id_beneficiaria ?? h.id) !== currentId
      );
      if (validHermanas.length > 0) {
        return validHermanas.map((h: any) => {
          const hId = String(h.id_beneficiaria ?? h.id);
          const found = allBeneficiarias.find((b) => String(b.id) === hId);
          return {
            id: hId,
            nombres: h.nombres,
            apellidos: h.apellidos,
            expCode: h.codigo_expediente || beneficiaria.expCode,
            estado: (h.estado || 'Activa') as BeneficiariaStatus,
            fullObj: found || null
          };
        });
      }
    }

    // 2. Fallback: match from allBeneficiarias by same expCode or hermanasIds (excluding self!)
    return allBeneficiarias
      .filter((b) => {
        const bId = String(b.id);
        if (bId === currentId) return false;
        const sameExp = Boolean(b.expCode && beneficiaria.expCode && b.expCode === beneficiaria.expCode);
        const inHermanas = Boolean(beneficiaria.hermanasIds?.map(String).includes(bId));
        return sameExp || inHermanas;
      })
      .map((b) => ({
        id: String(b.id),
        nombres: b.nombres,
        apellidos: b.apellidos,
        expCode: b.expCode,
        estado: b.estado,
        fullObj: b
      }));
  }, [backendDetail, allBeneficiarias, beneficiaria]);

  // Navigate to selected sister's full record
  const handleNavigateSister = async (sis: any) => {
    setIsEditing(false);
    setActiveTab('personal');
    if (sis.fullObj) {
      onSelectSister(sis.fullObj);
    } else {
      const found = allBeneficiarias.find((b) => String(b.id) === String(sis.id));
      if (found) {
        onSelectSister(found);
      } else {
        try {
          const detail = await beneficiariasApi.get(sis.id);
          const normalized: Beneficiaria = {
            id: String(detail.id_beneficiaria),
            expCode: detail.expediente?.codigo_expediente || sis.expCode || 'EXP',
            nombres: detail.nombres,
            apellidos: detail.apellidos,
            cedula: detail.cedula_identidad || '',
            fechaNacimiento: String(detail.fecha_nacimiento || ''),
            edad: typeof detail.edad === 'number' ? detail.edad : 0,
            lugarNacimiento: detail.lugar_nacimiento?.ciudad || '',
            direccion: detail.expediente?.direccion ? `${detail.expediente.direccion.ciudad || ''}, ${detail.expediente.direccion.urbanizacion || ''}` : '',
            institucionEducativa: detail.institucion?.nombre || 'Sin asignar',
            grado: detail.grado_actual || '',
            estado: (detail.estado || 'Activa') as BeneficiariaStatus,
            fechaIngreso: detail.expediente?.fecha_apertura ? String(detail.expediente.fecha_apertura) : '',
            fechaEgreso: detail.fecha_egreso ? String(detail.fecha_egreso) : null,
            tipoExpediente: 'Protección Integral',
            prioridad: 'Normal',
            institucionRemite: '',
            observaciones: detail.observaciones || '',
            representantePrincipal: detail.representantes?.[0] ? `${detail.representantes[0].nombres} ${detail.representantes[0].apellidos}` : 'Sin representante asignado',
            representantes: [],
            hermanasIds: []
          };
          onSelectSister(normalized);
        } catch (e) {
          console.error('Error cargando ficha de hermana:', e);
        }
      }
    }
  };

  // Status Badge Helper
  const renderStatusBadge = (st: BeneficiariaStatus) => {
    switch (st) {
      case 'Activa':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Activa
          </span>
        );
      case 'Trasladada':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            Trasladada
          </span>
        );
      case 'Egresada':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            Egresada
          </span>
        );
      case 'Anulada':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
            Anulada
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            {st}
          </span>
        );
    }
  };

  // Cancel edit handler
  const handleCancelEdit = () => {
    setIsEditing(false);
    setValidationError(null);
    setNombres(beneficiaria.nombres || '');
    setApellidos(beneficiaria.apellidos || '');
    setCedula(beneficiaria.cedula || '');
    setFechaNacimiento(beneficiaria.fechaNacimiento || '');
    setInstitucionEducativa(beneficiaria.institucionEducativa || '');
    setGrado(beneficiaria.grado || '');
    setEstado(beneficiaria.estado || 'Activa');
    setFechaEgreso(beneficiaria.fechaEgreso || '');
    setObservacionesNina(beneficiaria.observaciones || '');
  };

  // Address label helper for display
  const lugarNacimientoDisplay = useMemo(() => {
    if (idDireccionLugarNacimiento) {
      const found = direccionesList.find((d) => d.id_direccion === idDireccionLugarNacimiento);
      if (found) return formatAddressOption(found);
    }
    return beneficiaria.lugarNacimiento || 'No especificado';
  }, [idDireccionLugarNacimiento, direccionesList, beneficiaria.lugarNacimiento]);

  const repDireccionDisplay = useMemo(() => {
    if (repIdDireccion) {
      const found = direccionesList.find((d) => d.id_direccion === repIdDireccion);
      if (found) return formatAddressOption(found);
    }
    return 'No especificada';
  }, [repIdDireccion, direccionesList]);

  // Master Save Handler
  const handleSave = async () => {
    setValidationError(null);

    // Validations
    if (!nombres.trim() || !apellidos.trim()) {
      setValidationError('Los nombres y apellidos de la beneficiaria son obligatorios.');
      return;
    }

    if (fechaNacimiento && fechaNacimiento > todayStr) {
      setValidationError('La fecha de nacimiento no puede ser una fecha futura.');
      return;
    }

    if ((estado === 'Egresada' || estado === 'Trasladada' || estado === 'Anulada') && !fechaEgreso) {
      setValidationError(`La fecha de egreso es obligatoria cuando el estado es '${estado}'.`);
      return;
    }

    if (fechaEgreso && fechaEgreso > todayStr) {
      setValidationError('La fecha de egreso no puede ser una fecha futura.');
      return;
    }

    setIsSaving(true);

    const estadoIdMap: Record<BeneficiariaStatus, number> = {
      Activa: 1,
      Egresada: 2,
      Trasladada: 3,
      Anulada: 4
    };

    try {
      // 1. Update Representative if modified
      if (idRepresentante) {
        try {
          await representantesApi.update(idRepresentante, {
            nombres: repNombres.trim() || undefined,
            apellidos: repApellidos.trim() || undefined,
            telefono_contacto: repTelefono.trim() || undefined,
            ocupacion_laboral: repOcupacion.trim() || undefined,
            id_direccion: repIdDireccion || undefined
          });
        } catch (repErr) {
          console.warn('Actualización de representante:', repErr);
        }
      }

      // 2. Update Expediente (observaciones del núcleo familiar)
      if (idExpediente) {
        try {
          await expedientesApi.update(idExpediente, {
            observaciones: observacionesExpediente.trim() || null
          });
        } catch (expErr) {
          console.warn('Actualización de expediente:', expErr);
        }
      }

      // 3. Update Beneficiaria
      // CLEAN OBSERVATIONS: do not duplicate or concatenate repetitively!
      const cleanObservaciones = observacionesNina.trim() || null;

      const beneficiariaPayload: any = {
        nombres: nombres.trim(),
        apellidos: apellidos.trim(),
        cedula_identidad: cedula.trim() ? cedula.trim() : null,
        fecha_nacimiento: fechaNacimiento || null,
        grado_actual: grado.trim() || null,
        id_estado_beneficiaria: estadoIdMap[estado],
        fecha_egreso: estado === 'Activa' ? null : (fechaEgreso || null),
        observaciones: cleanObservaciones,
        id_institucion: idInstitucion || null,
        id_direccion_lugar_nacimiento: idDireccionLugarNacimiento || null
      };

      if (idRepresentante && idParentesco) {
        beneficiariaPayload.id_representante = idRepresentante;
        beneficiariaPayload.id_parentesco = idParentesco;
      }

      await beneficiariasApi.update(beneficiaria.id, beneficiariaPayload);

      // 4. Update frontend state
      const selectedParentesco = parentescosList.find((p) => p.id_parentesco === idParentesco)?.descripcion || parentescoDescripcion || 'Representante';
      const updatedBeneficiaria: Beneficiaria = {
        ...beneficiaria,
        nombres: nombres.trim(),
        apellidos: apellidos.trim(),
        cedula: cedula.trim(),
        fechaNacimiento,
        edad: edadCalculada,
        lugarNacimiento: lugarNacimientoDisplay,
        institucionEducativa: institucionEducativa.trim(),
        id_institucion: idInstitucion,
        grado: grado.trim(),
        estado,
        fechaEgreso: estado === 'Activa' ? null : (fechaEgreso || null),
        observaciones: cleanObservaciones || '',
        observacionesExpediente: observacionesExpediente.trim(),
        representantePrincipal: `${repNombres} ${repApellidos} (${selectedParentesco})`.trim(),
        telefonoPrincipal: telefonoPrincipal.trim() || repTelefono.trim(),
        telefonoSecundario: telefonoSecundario.trim()
      };

      onSave(updatedBeneficiaria);
      setIsEditing(false);
      showToast('Información actualizada y sincronizada exitosamente.', 'success');
    } catch (err: any) {
      console.error('Error al actualizar datos:', err);
      const msg = err?.message || 'Error al guardar cambios en el servidor.';
      setValidationError(msg);
      showToast(msg, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const fechaIngresoFmt = backendDetail?.expediente?.fecha_apertura
    ? String(backendDetail.expediente.fecha_apertura)
    : (beneficiaria.fechaIngreso || 'No registrada');

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 animate-in slide-in-from-top-4 duration-300">
          <div
            className={`px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 border text-sm font-semibold ${
              toastType === 'success'
                ? 'bg-emerald-600 text-white border-emerald-500'
                : 'bg-rose-600 text-white border-rose-500'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">
              {toastType === 'success' ? 'check_circle' : 'error'}
            </span>
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4">
            <button
              onClick={onBack}
              className="p-2.5 rounded-2xl border border-slate-200 text-slate-600 hover:text-[#00256F] hover:bg-slate-50 transition cursor-pointer shrink-0"
              title="Volver a la Lista de Beneficiarias"
            >
              <span className="material-symbols-outlined text-[22px] block">arrow_back</span>
            </button>

            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-[#00256F] to-[#1E4FD9] text-white flex items-center justify-center font-bold text-xl shadow-md shrink-0">
                {nombres.charAt(0)}
                {apellidos.charAt(0)}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2.5 mb-1">
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display">
                    {nombres} {apellidos}
                  </h1>
                  {renderStatusBadge(estado)}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1 font-semibold text-[#00256F]">
                    <span className="material-symbols-outlined text-[15px]">folder</span>
                    {beneficiaria.expCode}
                  </span>
                  <span>•</span>
                  <span>{cedula ? `C.I. ${cedula}` : 'Sin documento de identidad'}</span>
                  <span>•</span>
                  <span>{edadCalculada} años</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons (RBAC) */}
          <div className="flex items-center gap-2.5 self-end md:self-auto">
            {!isEditing ? (
              !isLector ? (
                <button
                  id="btn-editar-beneficiaria"
                  onClick={() => setIsEditing(true)}
                  className="px-5 py-2.5 bg-[#00256F] hover:bg-[#132E70] active:bg-[#00174C] text-white font-semibold text-xs rounded-xl shadow-sm hover:shadow transition flex items-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                  <span>Editar Información</span>
                </button>
              ) : (
                <div className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-200">
                  <span className="material-symbols-outlined text-[16px] text-slate-500">visibility</span>
                  <span>Solo Lectura</span>
                </div>
              )
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">save</span>
                      <span>Guardar Cambios</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Validation Error Banner */}
        {validationError && (
          <div className="mt-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[20px] text-rose-600">error</span>
            <span className="font-medium">{validationError}</span>
          </div>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('personal')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-xs transition cursor-pointer ${
            activeTab === 'personal'
              ? 'border-[#00256F] text-[#00256F]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">person</span>
          <span>1. Información Personal y Contacto</span>
        </button>

        <button
          onClick={() => setActiveTab('expediente')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-xs transition cursor-pointer ${
            activeTab === 'expediente'
              ? 'border-[#00256F] text-[#00256F]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">family_restroom</span>
          <span>2. Expediente y Núcleo Familiar</span>
          {hermanasVinculadas.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-100 text-[#00256F] font-bold">
              {hermanasVinculadas.length} {hermanasVinculadas.length === 1 ? 'hermana' : 'hermanas'}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('historial')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-xs transition cursor-pointer ${
            activeTab === 'historial'
              ? 'border-[#00256F] text-[#00256F]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">history</span>
          <span>3. Historial y Estatus</span>
        </button>
      </div>

      {/* TAB 1: INFORMACIÓN PERSONAL Y CONTACTO (SIN LUGAR DE RESIDENCIA) */}
      {activeTab === 'personal' && (
        <div className="space-y-6">
          {/* Card: Datos Personales */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#00256F] text-[20px]">badge</span>
              <span>Datos Personales y de Identidad</span>
            </h3>

            {!isEditing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
                <div>
                  <span className="block text-slate-400 font-medium mb-1">Nombres Completos</span>
                  <p className="font-bold text-slate-800 text-sm">{nombres}</p>
                </div>
                <div>
                  <span className="block text-slate-400 font-medium mb-1">Apellidos Completos</span>
                  <p className="font-bold text-slate-800 text-sm">{apellidos}</p>
                </div>
                <div>
                  <span className="block text-slate-400 font-medium mb-1">Cédula de Identidad / Documento</span>
                  <p className="font-bold text-slate-800 text-sm">
                    {cedula ? (
                      cedula
                    ) : (
                      <span className="inline-flex items-center gap-1 text-slate-500 italic">
                        <span className="material-symbols-outlined text-[14px]">info</span>
                        No posee documento
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <span className="block text-slate-400 font-medium mb-1">Fecha de Nacimiento y Edad</span>
                  <p className="font-bold text-slate-800 text-sm">
                    {fechaNacimiento || 'No registrada'}{' '}
                    <span className="text-[#00256F] font-semibold text-xs">({edadCalculada} años)</span>
                  </p>
                </div>
                <div>
                  <span className="block text-slate-400 font-medium mb-1">Lugar de Nacimiento</span>
                  <p className="font-bold text-slate-800 text-sm flex items-start gap-1">
                    <span className="material-symbols-outlined text-slate-400 text-[16px] shrink-0 mt-0.5">place</span>
                    <span>{lugarNacimientoDisplay}</span>
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nombres <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={nombres}
                    onChange={(e) => setNombres(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-[#00256F]"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Apellidos <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={apellidos}
                    onChange={(e) => setApellidos(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-[#00256F]"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Cédula de Identidad</label>
                  <input
                    type="text"
                    value={cedula}
                    onChange={(e) => setCedula(e.target.value)}
                    placeholder="Ej: 30142903 (o en blanco si no posee)"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-[#00256F]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Fecha de Nacimiento <span className="text-slate-400 font-normal">({edadCalculada} años calculados)</span>
                  </label>
                  <input
                    type="date"
                    max={todayStr}
                    value={fechaNacimiento}
                    onChange={(e) => setFechaNacimiento(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-[#00256F]"
                  />
                </div>

                {/* Lugar de Nacimiento: Searchable Combobox + Nueva Dirección */}
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-700">Lugar de Nacimiento</label>
                    <button
                      type="button"
                      onClick={() => {
                        setAddressModalTarget('lugarNacimiento');
                        setIsAddressModalOpen(true);
                      }}
                      className="text-[11px] font-bold text-[#00256F] hover:underline cursor-pointer"
                    >
                      + Nueva Dirección
                    </button>
                  </div>
                  <SearchableSelect
                    options={direccionesList.map((d) => ({
                      value: d.id_direccion,
                      label: formatAddressOption(d)
                    }))}
                    value={idDireccionLugarNacimiento}
                    onChange={(val) => setIdDireccionLugarNacimiento(val ? Number(val) : undefined)}
                    placeholder="Buscar por ciudad, estado, sector o calle..."
                  />
                </div>
              </div>
            )}
          </div>

          {/* Card: Educación con SearchableSelect */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <span className="material-symbols-outlined text-[#00256F] text-[20px]">school</span>
                <span>Educación y Escolaridad</span>
              </h3>
              {isEditing && (
                <button
                  type="button"
                  onClick={() => setIsInstModalOpen(true)}
                  className="px-3 py-1.5 bg-blue-50 text-[#00256F] border border-blue-200 rounded-xl text-xs font-bold hover:bg-blue-100 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">add_circle</span>
                  <span>+ Nueva Institución</span>
                </button>
              )}
            </div>

            {!isEditing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
                <div>
                  <span className="block text-slate-400 font-medium mb-1">Institución Educativa Actual</span>
                  <p className="font-bold text-slate-800 text-sm">
                    {institucionEducativa || 'Sin asignar / No escolarizada'}
                  </p>
                </div>
                <div>
                  <span className="block text-slate-400 font-medium mb-1">Grado Cursante</span>
                  <p className="font-bold text-slate-800 text-sm">{grado || 'No especificado'}</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Institución Educativa</label>
                  <SearchableSelect
                    options={institucionesList.map((inst) => ({
                      value: inst.id_institucion,
                      label: inst.nombre
                    }))}
                    value={idInstitucion}
                    onChange={(val) => {
                      const selId = val ? Number(val) : undefined;
                      setIdInstitucion(selId);
                      const match = institucionesList.find((i) => i.id_institucion === selId);
                      if (match) setInstitucionEducativa(match.nombre);
                    }}
                    placeholder="Escribe para buscar colegio, escuela o liceo..."
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Grado o Nivel Cursante</label>
                  <input
                    type="text"
                    value={grado}
                    onChange={(e) => setGrado(e.target.value)}
                    placeholder="Ej: 5to Grado, 2do Año Bachillerato"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-[#00256F]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Card: Contacto y Observaciones Niña */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#00256F] text-[20px]">call</span>
              <span>Contacto y Observaciones Individuales</span>
            </h3>

            {!isEditing ? (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <span className="block text-slate-400 font-medium mb-1">Teléfono Principal de Contacto</span>
                    <p className="font-bold text-slate-800 text-sm">
                      {telefonoPrincipal || repTelefono || 'No registrado'}
                    </p>
                  </div>
                  <div>
                    <span className="block text-slate-400 font-medium mb-1">Teléfono Secundario</span>
                    <p className="font-bold text-slate-800 text-sm">{telefonoSecundario || 'No registrado'}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <span className="block text-slate-400 font-medium mb-1">Observaciones de la Niña</span>
                  <p className="text-slate-700 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 leading-relaxed">
                    {observacionesNina || 'Sin observaciones particulares registradas para esta beneficiaria.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Teléfono Principal de Contacto</label>
                    <input
                      type="text"
                      value={telefonoPrincipal}
                      onChange={(e) => setTelefonoPrincipal(e.target.value)}
                      placeholder="Ej: 0414-1234567"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-[#00256F]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Teléfono Secundario (Opcional)</label>
                    <input
                      type="text"
                      value={telefonoSecundario}
                      onChange={(e) => setTelefonoSecundario(e.target.value)}
                      placeholder="Ej: 0424-9876543"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-[#00256F]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Observaciones de la Niña</label>
                  <textarea
                    rows={3}
                    value={observacionesNina}
                    onChange={(e) => setObservacionesNina(e.target.value)}
                    placeholder="Notas médicas, de conducta, psicológicas o requerimientos especiales..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-[#00256F]"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: EXPEDIENTE Y NÚCLEO FAMILIAR */}
      {activeTab === 'expediente' && (
        <div className="space-y-6">
          {/* Card: Expediente Familiar (Protegido) */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Número de Expediente Asignado</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-3 py-1 bg-blue-50 text-[#00256F] border border-blue-200 font-mono font-bold text-sm rounded-xl">
                    {beneficiaria.expCode}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    (Vínculo estructural con la base de datos familiar)
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 text-slate-600 rounded-xl text-xs font-semibold border border-slate-200">
                <span className="material-symbols-outlined text-[16px] text-slate-400">lock</span>
                <span>Código de expediente protegido</span>
              </div>
            </div>

            <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
              <div>
                <span className="block text-slate-400 font-medium mb-1">Tipo de Expediente</span>
                <p className="font-bold text-slate-800 text-sm">
                  {beneficiaria.tipoExpediente || 'Protección Integral Familiar'}
                </p>
              </div>
              <div>
                <span className="block text-slate-400 font-medium mb-1">Fecha de Apertura del Expediente</span>
                <p className="font-bold text-slate-800 text-sm">{fechaIngresoFmt}</p>
              </div>
            </div>
          </div>

          {/* Card: Representante Legal de la Beneficiaria con SearchableSelect para parentesco y dirección */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <span className="material-symbols-outlined text-[#00256F] text-[20px]">supervised_user_circle</span>
                <span>Representante Legal de la Beneficiaria</span>
              </h3>
              {isEditing && (
                <span className="text-[11px] font-semibold text-[#00256F] bg-blue-50 px-2.5 py-1 rounded-lg">
                  Los cambios se sincronizan para todas las beneficiarias asociadas
                </span>
              )}
            </div>

            {!isEditing ? (
              <div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-xs">
                  <div>
                    <span className="block text-slate-400 font-medium mb-1">Nombre Completo</span>
                    <p className="font-bold text-slate-800 text-sm">
                      {`${repNombres} ${repApellidos}`.trim() || 'Sin representante asignado'}
                    </p>
                  </div>
                  <div>
                    <span className="block text-slate-400 font-medium mb-1">Parentesco con la Niña</span>
                    <p className="font-bold text-[#00256F] text-sm">
                      {parentescosList.find((p) => p.id_parentesco === idParentesco)?.descripcion || parentescoDescripcion || 'No asignado'}
                    </p>
                  </div>
                  <div>
                    <span className="block text-slate-400 font-medium mb-1">Cédula de Identidad</span>
                    <p className="font-bold text-slate-800 text-sm">{repCedula || 'No registrada'}</p>
                  </div>
                  <div>
                    <span className="block text-slate-400 font-medium mb-1">Teléfono de Contacto</span>
                    <p className="font-bold text-slate-800 text-sm">{repTelefono || 'No registrado'}</p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="block text-slate-400 font-medium mb-1">Ocupación Laboral</span>
                    <p className="text-slate-700 font-medium">{repOcupacion || 'No especificada'}</p>
                  </div>
                  <div>
                    <span className="block text-slate-400 font-medium mb-1">Dirección del Representante</span>
                    <p className="text-slate-700 font-medium">{repDireccionDisplay}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Nombres del Representante</label>
                    <input
                      type="text"
                      value={repNombres}
                      onChange={(e) => setRepNombres(e.target.value)}
                      placeholder="Ej: Gregoria"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-[#00256F]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Apellidos del Representante</label>
                    <input
                      type="text"
                      value={repApellidos}
                      onChange={(e) => setRepApellidos(e.target.value)}
                      placeholder="Ej: Ochoa"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-[#00256F]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Parentesco con la Niña</label>
                    <SearchableSelect
                      options={parentescosList.map((p) => ({
                        value: p.id_parentesco,
                        label: p.descripcion
                      }))}
                      value={idParentesco}
                      onChange={(val) => {
                        const selId = val ? Number(val) : undefined;
                        setIdParentesco(selId);
                        const match = parentescosList.find((p) => p.id_parentesco === selId);
                        if (match) setParentescoDescripcion(match.descripcion);
                      }}
                      placeholder="Buscar parentesco..."
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Teléfono de Contacto</label>
                    <input
                      type="text"
                      value={repTelefono}
                      onChange={(e) => setRepTelefono(e.target.value)}
                      placeholder="Ej: 0424 1982189"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-[#00256F]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Ocupación Laboral</label>
                    <input
                      type="text"
                      value={repOcupacion}
                      onChange={(e) => setRepOcupacion(e.target.value)}
                      placeholder="Ej: Obrera de mantenimiento en U.E.N.B. Cacique Tiuna"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-[#00256F]"
                    />
                  </div>

                  {/* Dirección del Representante: SearchableSelect + Nueva Dirección */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold text-slate-700">Dirección del Representante</label>
                      <button
                        type="button"
                        onClick={() => {
                          setAddressModalTarget('representante');
                          setIsAddressModalOpen(true);
                        }}
                        className="text-[11px] font-bold text-[#00256F] hover:underline cursor-pointer"
                      >
                        + Nueva Dirección
                      </button>
                    </div>
                    <SearchableSelect
                      options={direccionesList.map((d) => ({
                        value: d.id_direccion,
                        label: formatAddressOption(d)
                      }))}
                      value={repIdDireccion}
                      onChange={(val) => setRepIdDireccion(val ? Number(val) : undefined)}
                      placeholder="Buscar por sector o calle..."
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Card: Tabla de Hermanas / Familiares (NUNCA INCLUYE A LA BENEFICIARIA ACTUAL) */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#00256F] text-[20px]">diversity_1</span>
              <span>Hermanas o Familiares Registradas en la Fundación</span>
            </h3>

            {hermanasVinculadas.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="pb-3">Nombre Completo</th>
                      <th className="pb-3">Código EXP</th>
                      <th className="pb-3">Estado</th>
                      <th className="pb-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {hermanasVinculadas.map((sis) => (
                      <tr key={sis.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 font-bold text-slate-800">
                          {sis.nombres} {sis.apellidos}
                        </td>
                        <td className="py-3 font-mono text-slate-600 font-semibold">{sis.expCode}</td>
                        <td className="py-3">{renderStatusBadge(sis.estado)}</td>
                        <td className="py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleNavigateSister(sis)}
                            className="px-3 py-1.5 bg-blue-50 text-[#00256F] hover:bg-[#00256F] hover:text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 ml-auto cursor-pointer shadow-2xs"
                          >
                            <span>Ver Ficha</span>
                            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
                <span className="material-symbols-outlined text-slate-300 text-[40px] mb-2 block">
                  group_off
                </span>
                <p className="text-xs font-semibold text-slate-600">
                  No hay otras hermanas o familiares registradas en este mismo núcleo familiar.
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Las hermanas se vinculan automáticamente al compartir el mismo expediente familiar.
                </p>
              </div>
            )}
          </div>

          {/* Card: Observaciones del Expediente Familiar (Editable y sincronizado) */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <span className="material-symbols-outlined text-[#00256F] text-[20px]">notes</span>
                <span>Observaciones del Expediente Familiar (Núcleo)</span>
              </h3>
              {isEditing && (
                <span className="text-[11px] font-semibold text-[#00256F] bg-blue-50 px-2.5 py-1 rounded-lg">
                  Se reflejará en todas las beneficiarias del expediente
                </span>
              )}
            </div>

            {!isEditing ? (
              <p className="text-xs text-slate-700 bg-slate-50 p-4 rounded-2xl border border-slate-100 leading-relaxed">
                {observacionesExpediente ||
                  'No hay notas u observaciones adicionales registradas para este expediente familiar.'}
              </p>
            ) : (
              <div>
                <textarea
                  rows={3}
                  value={observacionesExpediente}
                  onChange={(e) => setObservacionesExpediente(e.target.value)}
                  placeholder="Escriba aquí las notas, seguimiento social o antecedentes que aplican al núcleo familiar..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-[#00256F] text-xs"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: HISTORIAL Y ESTATUS */}
      {activeTab === 'historial' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#00256F] text-[20px]">manage_history</span>
              <span>Estatus Actual y Trayectoria Institucional</span>
            </h3>

            {!isEditing ? (
              <div className="space-y-6 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div>
                    <span className="block text-slate-400 font-medium mb-1">Fecha de Ingreso a la Fundación</span>
                    <p className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-emerald-600 text-[18px]">login</span>
                      <span>{fechaIngresoFmt}</span>
                    </p>
                  </div>

                  <div>
                    <span className="block text-slate-400 font-medium mb-1">Estado de Permanencia</span>
                    <div className="mt-1">{renderStatusBadge(estado)}</div>
                  </div>

                  {estado !== 'Activa' && (
                    <div>
                      <span className="block text-slate-400 font-medium mb-1">Fecha de Egreso / Cierre</span>
                      <p className="font-bold text-rose-700 text-sm flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-rose-600 text-[18px]">logout</span>
                        <span>{fechaEgreso || 'No especificada'}</span>
                      </p>
                    </div>
                  )}
                </div>

                {estado === 'Activa' ? (
                  <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[24px]">verified</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-emerald-900 text-xs">Beneficiaria Activa en el Programa</h4>
                      <p className="text-[11px] text-emerald-700 mt-0.5">
                        La niña cuenta con expediente abierto y recibe los beneficios del programa de atención y acompañamiento.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                    <h4 className="font-bold text-slate-800 text-xs flex items-center gap-2">
                      <span className="material-symbols-outlined text-slate-500 text-[18px]">info</span>
                      <span>Historial de Salida</span>
                    </h4>
                    <p className="text-slate-600 text-xs">
                      {motivoEgreso || `El expediente de la beneficiaria se encuentra en estatus '${estado}'. Se preservan los registros históricos de acuerdo con los protocolos administrativos.`}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-5 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Estado Actual <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={estado}
                      onChange={(e) => handleEstadoChange(e.target.value as BeneficiariaStatus)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-[#00256F] font-semibold"
                    >
                      <option value="Activa">🟢 Activa (Permanece en el programa)</option>
                      <option value="Trasladada">🟠 Trasladada (Reubicada a otra institución)</option>
                      <option value="Egresada">🔴 Egresada (Culminación o desvinculación)</option>
                      <option value="Anulada">⚪ Anulada (Registro cancelado/inválido)</option>
                    </select>
                  </div>

                  {estado !== 'Activa' ? (
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Fecha de Egreso <span className="text-rose-500">* (Obligatoria para {estado})</span>
                      </label>
                      <input
                        type="date"
                        max={todayStr}
                        value={fechaEgreso}
                        onChange={(e) => setFechaEgreso(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-rose-300 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-rose-500"
                        required
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block font-semibold text-slate-400 mb-1">Fecha de Egreso</label>
                      <input
                        type="text"
                        disabled
                        value="No aplica para beneficiarias activas (se limpia automáticamente)"
                        className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-400 italic text-[11px]"
                      />
                    </div>
                  )}
                </div>

                {estado !== 'Activa' && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Motivo de Salida / Observaciones de Egreso
                    </label>
                    <textarea
                      rows={3}
                      value={motivoEgreso}
                      onChange={(e) => setMotivoEgreso(e.target.value)}
                      placeholder="Indique los motivos del egreso, traslado o anulación del caso..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-[#00256F]"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Save Toolbar when in Edit Mode */}
      {isEditing && (
        <div className="fixed bottom-6 right-6 z-40 bg-white/95 backdrop-blur-md px-6 py-3.5 rounded-3xl shadow-2xl border border-slate-200 flex items-center gap-3 animate-in slide-in-from-bottom-6 duration-300">
          <span className="text-xs text-slate-500 font-medium mr-2 hidden sm:inline">
            Modo Edición activo
          </span>
          <button
            type="button"
            onClick={handleCancelEdit}
            disabled={isSaving}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200 transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-xs rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">save</span>
                <span>Guardar Cambios</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Modal: Registrar Nueva Dirección */}
      <NuevaDireccionModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        onSave={(_, createdObj) => {
          if (createdObj?.id_direccion) {
            setDireccionesList((prev) => [createdObj, ...prev]);
            if (addressModalTarget === 'lugarNacimiento') {
              setIdDireccionLugarNacimiento(createdObj.id_direccion);
            } else if (addressModalTarget === 'representante') {
              setRepIdDireccion(createdObj.id_direccion);
            }
          }
          showToast('Dirección creada y seleccionada en el formulario.', 'success');
        }}
      />

      {/* Modal: Registrar Nueva Institución */}
      <NuevaInstitucionModal
        isOpen={isInstModalOpen}
        onClose={() => setIsInstModalOpen(false)}
        onSave={(newInst) => {
          setIdInstitucion(newInst.id_institucion);
          setInstitucionEducativa(newInst.nombre);
          setInstitucionesList((prev) => [newInst, ...prev]);
          showToast(`Institución "${newInst.nombre}" registrada y asignada.`, 'success');
        }}
      />
    </div>
  );
};
