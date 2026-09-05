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
        const [beneficiariasList, personalList] = await Promise.all([
          beneficiariasApi.list(),
          personalApi.list()
        ]);

        if (isMounted) {
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
    expedientesParam: Beneficiaria | Beneficiaria[],
    hermanaLegacy?: Beneficiaria
  ) => {
    const list: Beneficiaria[] = Array.isArray(expedientesParam)
      ? expedientesParam
      : (hermanaLegacy ? [hermanaLegacy, expedientesParam] : [expedientesParam]);

    if (list.length === 0) return;

    // Cross-link all sisters' IDs
    const allIds = list.map((b) => b.id);
    const fullyLinkedSisters = list.map((b) => ({
      ...b,
      hermanasIds: Array.from(new Set([...b.hermanasIds, ...allIds.filter((id) => id !== b.id)]))
    }));

    // Create via API
    for (const item of fullyLinkedSisters) {
      try {
        await beneficiariasApi.create(item);
      } catch (e) {
        console.warn('Registro local de expediente:', e);
      }
    }

    setBeneficiarias((prev) => [...fullyLinkedSisters, ...prev]);

    // Activity log entry
    const newActs: ActividadLog[] = fullyLinkedSisters.map((ben, idx) => ({
      id: `act-${Date.now() + idx}`,
      usuario: user?.personal ? `${user.personal.nombre} ${user.personal.apellido}` : 'Administrador',
      rol: user?.rol || 'Administrador',
      accion: idx === 0 ? 'Nuevo expediente registrado' : 'Hermana vinculada al núcleo',
      detalle:
        idx === 0
          ? `Ingreso registrado para ${ben.nombres} ${ben.apellidos}.`
          : `Ingreso correlativo para ${ben.nombres} ${ben.apellidos}, hermana vinculada.`,
      expCode: ben.expCode,
      tiempo: 'Justo ahora',
      tipo: 'create'
    }));

    setActividades((prev) => [...newActs.reverse(), ...prev]);

    if (fullyLinkedSisters.length > 1) {
      triggerToast(
        `Se registraron ${fullyLinkedSisters.length} expedientes vinculados: ${fullyLinkedSisters
          .map((b) => b.expCode)
          .join(', ')}.`
      );
    } else {
      triggerToast(`Expediente ${fullyLinkedSisters[0].expCode} creado exitosamente.`);
    }

    setSelectedBeneficiaria(fullyLinkedSisters[0]);
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
        // Si pertenece a la misma familia, sincronizar dirección
        if (updated.hermanasIds.includes(b.id)) {
          return { ...b, direccion: updated.direccion };
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
            onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
            onNavigate={(v) => setCurrentView(v)}
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
