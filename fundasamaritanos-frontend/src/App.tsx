import React, { useState, useEffect } from 'react';
import { ViewMode, Beneficiaria, PersonalMember, ActividadLog, AppConfig } from './types';
import { INITIAL_ACTIVIDADES, DEFAULT_CONFIG } from './data/mockData';
import { useAuth } from './context/AuthContext';
import { beneficiariasApi, personalApi } from './api/endpoints';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { LoginScreen } from './components/LoginScreen';
import { DashboardView } from './components/DashboardView';
import { BeneficiariasView } from './components/BeneficiariasView';
import { NuevoExpedienteWizard } from './components/NuevoExpedienteWizard';
import { FichaBeneficiariaView } from './components/FichaBeneficiariaView';
import { PersonalView } from './components/PersonalView';
import { ConfiguracionView } from './components/ConfiguracionView';
import { Logo } from './components/Logo';

export default function App() {
  const { user, token, role, isLoading: isAuthLoading, logout } = useAuth();

  // Current view navigation state
  const [currentView, setCurrentView] = useState<ViewMode>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Core API-driven data state
  const [beneficiarias, setBeneficiarias] = useState<Beneficiaria[]>([]);
  const [selectedBeneficiaria, setSelectedBeneficiaria] = useState<Beneficiaria | null>(null);
  const [personal, setPersonal] = useState<PersonalMember[]>([]);
  const [actividades, setActividades] = useState<ActividadLog[]>(INITIAL_ACTIVIDADES);
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [globalToast, setGlobalToast] = useState<string | null>(null);

  const triggerToast = (message: string) => {
    setGlobalToast(message);
    setTimeout(() => setGlobalToast(null), 4000);
  };

const normalizeBeneficiaria = (b: any): Beneficiaria => {
  const estadoMap: Record<number, BeneficiariaStatus> = {
    1: 'Activa',
    2: 'Egresada',
    3: 'Trasladada',
    4: 'Anulada'
  };

  const id = String(b.id_beneficiaria ?? b.id ?? '');
  const expCode = b.codigo_expediente || b.expCode || (b.id_expediente ? `EXP-${String(b.id_expediente).padStart(4, '0')}` : 'S/E');
  const nombres = b.nombres || '';
  const apellidos = b.apellidos || '';
  const cedula = b.cedula_identidad || b.cedula || '';
  const edad = typeof b.edad === 'number' ? b.edad : 0;
  const grado = b.grado_actual || b.grado || '';
  const institucionEducativa = b.institucion_nombre || b.institucion?.nombre || b.institucionEducativa || 'Sin asignar';
  const estado: BeneficiariaStatus = (b.estado && ['Activa', 'Trasladada', 'Egresada', 'Anulada'].includes(b.estado))
    ? (b.estado as BeneficiariaStatus)
    : (b.id_estado_beneficiaria ? (estadoMap[b.id_estado_beneficiaria] || 'Activa') : 'Activa');
  const representantePrincipal = b.representante_principal || b.representantePrincipal || 'Sin representante asignado';
  const fechaNacimiento = b.fecha_nacimiento || b.fechaNacimiento || '';
  const fechaEgreso = b.fecha_egreso || b.fechaEgreso || null;
  const observaciones = b.observaciones || '';
  const lugarNacimiento = b.lugar_nacimiento?.ciudad || b.lugarNacimiento || '';
  const direccion = b.direccion || '';

  return {
    id,
    expCode,
    nombres,
    apellidos,
    cedula,
    lugarNacimiento,
    fechaNacimiento,
    edad,
    direccion,
    institucionEducativa,
    grado,
    estado,
    fechaIngreso: b.fecha_ingreso || b.fechaIngreso || (b.expediente?.fecha_apertura ? String(b.expediente.fecha_apertura) : ''),
    fechaEgreso,
    tipoExpediente: b.tipo_expediente || b.tipoExpediente || 'Protección Integral',
    prioridad: b.prioridad || 'Normal',
    institucionRemite: b.institucion_remite || b.institucionRemite || '',
    observaciones,
    representantePrincipal,
    representantes: b.representantes || [],
    hermanasIds: b.hermanasIds || [],
    avatarBg: b.avatarBg || 'bg-[#00256F] text-white',
    activo: b.activo !== false
  };
};

  // Load initial datasets from API when user is authenticated
  useEffect(() => {
    let isMounted = true;
    if (!token) {
      setIsDataLoading(false);
      return;
    }

    const fetchInitialData = async () => {
      try {
        setIsDataLoading(true);
        const [rawBeneficiarias, personalList] = await Promise.all([
          beneficiariasApi.list({ limit: 100 }),
          personalApi.list()
        ]);

        if (isMounted) {
          const beneficiariasList = Array.isArray(rawBeneficiarias)
            ? rawBeneficiarias.map(normalizeBeneficiaria)
            : [];
          setBeneficiarias(beneficiariasList);
          setPersonal(personalList);
          if (beneficiariasList.length > 0 && !selectedBeneficiaria) {
            setSelectedBeneficiaria(beneficiariasList[0]);
          }
        }
      } catch (err) {
        console.error('Error cargando datos iniciales:', err);
      } finally {
        if (isMounted) {
          setIsDataLoading(false);
        }
      }
    };

    fetchInitialData();
    return () => {
      isMounted = false;
    };
  }, [token]);

  // Generate next sequential correlative code
  const getNextExpCode = () => {
    const year = new Date().getFullYear();
    const count = beneficiarias.length + 1;
    return `EXP-${year}-${String(count).padStart(4, '0')}`;
  };

  // Select Beneficiaria to view/edit Ficha
  const handleSelectBeneficiaria = (ben: Beneficiaria) => {
    setSelectedBeneficiaria(ben);
    setCurrentView('ficha-beneficiaria');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Save new expediente(s) from Wizard (supports 1, 2, 3 or more sisters)
  const handleSaveNuevoExpediente = async (
    expedientesParam: Beneficiaria | Beneficiaria[] | any[],
    hermanaLegacy?: Beneficiaria
  ) => {
    const list: any[] = Array.isArray(expedientesParam)
      ? expedientesParam
      : (hermanaLegacy ? [hermanaLegacy, expedientesParam] : [expedientesParam]);

    if (list.length === 0) return;

    let targetBeneficiaria: Beneficiaria | null = null;

    try {
      // Re-fetch all beneficiarias from API to ensure complete DB integrity and relationships
      const freshRaw = await beneficiariasApi.list({ limit: 100 });
      if (Array.isArray(freshRaw) && freshRaw.length > 0) {
        const freshNormalized = freshRaw.map(normalizeBeneficiaria);
        setBeneficiarias(freshNormalized);

        // Find the newly created girl
        const firstCreatedId = String(list[0]?.id_beneficiaria ?? list[0]?.id ?? '');
        targetBeneficiaria = freshNormalized.find((b) => b.id === firstCreatedId) || freshNormalized[0];
      }
    } catch (err) {
      console.warn('Error refrescando lista de beneficiarias tras guardado:', err);
    }

    // Fallback if network or list didn't load
    if (!targetBeneficiaria) {
      const fallbackList = list.map(normalizeBeneficiaria);
      setBeneficiarias((prev) => [...fallbackList, ...prev]);
      targetBeneficiaria = fallbackList[0];
    }

    // Activity log entry
    const newActs: ActividadLog[] = list.map((ben, idx) => ({
      id: `act-${Date.now() + idx}`,
      usuario: user?.personal ? `${user.personal.nombre} ${user.personal.apellido}` : 'Administrador',
      rol: user?.rol || 'Administrador',
      accion: idx === 0 ? 'Nuevo expediente registrado' : 'Hermana vinculada al núcleo',
      detalle:
        idx === 0
          ? `Ingreso registrado para ${ben.nombres} ${ben.apellidos}.`
          : `Ingreso correlativo para ${ben.nombres} ${ben.apellidos}, hermana vinculada.`,
      expCode: ben.codigo_expediente || ben.expCode || `EXP-${idx + 1}`,
      tiempo: 'Justo ahora',
      tipo: 'create'
    }));

    setActividades((prev) => [...newActs.reverse(), ...prev]);

    if (list.length > 1) {
      triggerToast(
        `Se registraron ${list.length} expedientes vinculados exitosamente.`
      );
    } else {
      triggerToast(`Expediente registrado exitosamente.`);
    }

    setSelectedBeneficiaria(targetBeneficiaria);
    setCurrentView('ficha-beneficiaria');
  };

  // Update Beneficiaria from Ficha
  const handleUpdateBeneficiaria = async (updated: Beneficiaria) => {
    try {
      await beneficiariasApi.update(updated.id, updated);
    } catch (e) {
      console.warn('Actualización de beneficiaria:', e);
    }

    setBeneficiarias((prev) =>
      prev.map((b) => {
        if (b.id === updated.id) return updated;
        // Si pertenece a la misma familia (mismo expCode o hermanasIds), sincronizar dirección, representante y observaciones del núcleo
        if (updated.hermanasIds.includes(b.id) || (updated.expCode && b.expCode === updated.expCode)) {
          return {
            ...b,
            direccion: updated.direccion,
            representantePrincipal: updated.representantePrincipal,
            observacionesExpediente: updated.observacionesExpediente
          };
        }
        return b;
      })
    );

    setSelectedBeneficiaria(updated);
    triggerToast('Ficha de expediente actualizada.');
  };

  // Delete Beneficiaria
  const handleDeleteBeneficiaria = async (id: string) => {
    try {
      await beneficiariasApi.delete(id);
    } catch (e) {
      console.warn('Eliminación de beneficiaria:', e);
    }

    setBeneficiarias((prev) => prev.filter((b) => b.id !== id));
    if (selectedBeneficiaria?.id === id) {
      setSelectedBeneficiaria(null);
      setCurrentView('beneficiarias');
    }
    triggerToast('Expediente eliminado del sistema.');
  };

  // Staff handlers
  const handleAddPersonal = (member: PersonalMember) => {
    setPersonal((prev) => [member, ...prev]);
    triggerToast(`Colaborador ${member.nombre} ${member.apellido} registrado exitosamente.`);
  };

  const handleUpdatePersonal = (member: PersonalMember) => {
    setPersonal((prev) => prev.map((p) => (p.id === member.id ? member : p)));
    triggerToast(`Ficha y credenciales de ${member.nombre} actualizadas.`);
  };

  const handleDeletePersonal = (id: string | number) => {
    setPersonal((prev) => prev.filter((p) => p.id !== id));
    triggerToast('Colaborador retirado del sistema.');
  };

  // Authentication Loading Screen
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white">
        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-300">
          <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center p-2.5 shadow-2xl border border-white/20">
            <span className="material-symbols-outlined text-4xl text-amber-400 animate-spin">
              progress_activity
            </span>
          </div>
          <div className="text-center">
            <h2 className="text-lg font-bold font-display">Fundasamaritanos</h2>
            <p className="text-xs text-slate-400 mt-1">Verificando sesión segura y permisos...</p>
          </div>
        </div>
      </div>
    );
  }

  // Not logged in -> Show LoginScreen
  if (!token) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans antialiased">
      {/* Global notification toast */}
      {globalToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#00256F] text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-blue-400/30 animate-in fade-in slide-in-from-bottom-4">
          <span className="material-symbols-outlined text-emerald-400 text-[20px]">
            verified
          </span>
          <span className="text-xs font-semibold">{globalToast}</span>
        </div>
      )}

      <div className="flex flex-1 min-h-screen">
        {/* Sidebar */}
        <Sidebar
          currentView={currentView}
          onNavigate={(v) => {
            setCurrentView(v);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onLogout={logout}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          personalCount={personal.length}
          beneficiariasCount={beneficiarias.length}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <Header
            currentView={currentView}
            onLogout={logout}
            onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
            onNavigate={(v) => setCurrentView(v)}
            beneficiariaName={selectedBeneficiaria ? `${selectedBeneficiaria.nombres} ${selectedBeneficiaria.apellidos}` : undefined}
          />

          {/* Body Content */}
          <main className="flex-1 px-4 sm:px-8 py-6 max-w-7xl w-full mx-auto">
            {currentView === 'dashboard' && (
              <DashboardView
                beneficiarias={beneficiarias}
                actividades={actividades}
                onNavigate={(v) => setCurrentView(v)}
                onSelectBeneficiaria={handleSelectBeneficiaria}
              />
            )}

            {currentView === 'beneficiarias' && (
              <BeneficiariasView
                beneficiarias={beneficiarias}
                onNavigate={(v) => setCurrentView(v)}
                onSelectBeneficiaria={handleSelectBeneficiaria}
                onDeleteBeneficiaria={handleDeleteBeneficiaria}
              />
            )}

            {currentView === 'nuevo-expediente' && (
              <NuevoExpedienteWizard
                onCancel={() => setCurrentView('beneficiarias')}
                onSaveExpediente={handleSaveNuevoExpediente}
                nextExpCode={getNextExpCode()}
              />
            )}

            {currentView === 'ficha-beneficiaria' && selectedBeneficiaria && (
              <FichaBeneficiariaView
                beneficiaria={selectedBeneficiaria}
                allBeneficiarias={beneficiarias}
                onBack={() => setCurrentView('beneficiarias')}
                onSave={handleUpdateBeneficiaria}
                onSelectSister={handleSelectBeneficiaria}
                onAddSister={(newSister) => {
                  setBeneficiarias((prev) => [newSister, ...prev]);
                  triggerToast(`Hermana ${newSister.nombres} agregada al expediente.`);
                }}
                nextExpCode={getNextExpCode()}
              />
            )}

            {currentView === 'personal' && (
              <PersonalView
                personal={personal}
                onAddPersonal={handleAddPersonal}
                onUpdatePersonal={handleUpdatePersonal}
                onDeletePersonal={handleDeletePersonal}
              />
            )}

            {currentView === 'configuracion' && (
              <ConfiguracionView
                config={config}
                onSaveConfig={(newCfg) => {
                  setConfig(newCfg);
                  triggerToast('Configuración institucional guardada.');
                }}
                beneficiarias={beneficiarias}
                personal={personal}
              />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
