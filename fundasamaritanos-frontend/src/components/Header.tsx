import React, { useState, useRef, useEffect } from 'react';
import { ViewMode, AppRole } from '../types';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  currentView: ViewMode;
  onNavigate: (view: ViewMode) => void;
  onLogout: () => void;
  onOpenMobileMenu: () => void;
  beneficiariaName?: string;
  // Optional legacy fallback
  user?: { name: string; role: string; email?: string };
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigate,
  onLogout,
  onOpenMobileMenu,
  beneficiariaName
}) => {
  const { user: authUser, role, switchDemoRole } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayName = authUser?.personal 
    ? `${authUser.personal.nombre} ${authUser.personal.apellido}`
    : 'Admin Sistema';
  const displayCargo = authUser?.personal?.cargo || 'Coordinador General';
  const currentRole: AppRole = (role || authUser?.rol || 'Administrador') as AppRole;

  const notifications = [
    {
      id: 1,
      title: 'Próximo Cumpleaños',
      desc: 'Valeria Sofía Martínez cumple 13 años hoy.',
      time: 'Hace 15 min',
      unread: true
    },
    {
      id: 2,
      title: 'Alerta de Expediente',
      desc: 'Isabella Méndez alcanza mayoría de edad en 2 meses.',
      time: 'Hace 2 horas',
      unread: true
    },
    {
      id: 3,
      title: 'Visita Domiciliaria',
      desc: 'Lic. Elena Morales completó el informe socioeconómico.',
      time: 'Ayer',
      unread: false
    }
  ];

  const getRoleBadge = (r: AppRole) => {
    switch (r) {
      case 'Administrador':
        return {
          icon: 'shield',
          text: 'Administrador',
          classes: 'bg-blue-50 text-[#00256F] border-blue-200'
        };
      case 'Editor':
        return {
          icon: 'edit',
          text: 'Editor',
          classes: 'bg-emerald-50 text-emerald-700 border-emerald-200'
        };
      case 'Lector':
        return {
          icon: 'visibility',
          text: 'Lector (Consulta)',
          classes: 'bg-purple-50 text-purple-700 border-purple-200'
        };
    }
  };

  const roleBadge = getRoleBadge(currentRole);

  const getBreadcrumbs = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <div className="flex items-center gap-2 text-slate-800 font-semibold text-lg font-display">
            <span>Panel Principal</span>
          </div>
        );
      case 'beneficiarias':
        return (
          <div className="flex items-center gap-2 text-slate-800 font-semibold text-lg font-display">
            <span>Beneficiarias</span>
          </div>
        );
      case 'nuevo-expediente':
        return (
          <div className="flex items-center gap-2 text-sm text-slate-600 font-medium font-display">
            <button 
              onClick={() => onNavigate('beneficiarias')} 
              className="text-[#00256F] hover:underline cursor-pointer"
            >
              Beneficiarias
            </button>
            <span className="text-slate-400">/</span>
            <span className="text-slate-800 font-semibold text-base">Nuevo Expediente</span>
          </div>
        );
      case 'ficha-beneficiaria':
        return (
          <div className="flex items-center gap-2 text-sm text-slate-600 font-medium font-display">
            <button 
              onClick={() => onNavigate('beneficiarias')} 
              className="text-[#00256F] hover:underline cursor-pointer"
            >
              Beneficiarias
            </button>
            <span className="text-slate-400">/</span>
            <span className="text-slate-800 font-semibold text-base truncate max-w-[240px] sm:max-w-md">
              Ficha de {beneficiariaName || 'Beneficiaria'}
            </span>
          </div>
        );
      case 'personal':
        return (
          <div className="flex items-center gap-2 text-slate-800 font-semibold text-lg font-display">
            <span>Gestión de Personal</span>
            {currentRole !== 'Administrador' && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                Solo Lectura
              </span>
            )}
          </div>
        );
      case 'configuracion':
        return (
          <div className="flex items-center gap-2 text-slate-800 font-semibold text-lg font-display">
            <span>Configuración del Sistema</span>
          </div>
        );
      default:
        return <span>Fundasamaritanos</span>;
    }
  };

  return (
    <header className="h-[72px] bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Left side: Mobile menu toggle + Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg focus:outline-none"
          aria-label="Abrir menú"
        >
          <span className="material-symbols-outlined text-[24px]">menu</span>
        </button>
        <div className="select-none">
          {getBreadcrumbs()}
        </div>
      </div>

      {/* Right side: Actions & User pill */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Role Badge Indicator */}
        <div className="hidden sm:flex items-center">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${roleBadge.classes}`}>
            <span className="material-symbols-outlined text-[16px]">{roleBadge.icon}</span>
            <span>{roleBadge.text}</span>
          </span>
        </div>

        {/* Help icon */}
        <button
          onClick={() => setShowHelpModal(true)}
          className="w-10 h-10 flex items-center justify-center rounded-full text-slate-500 hover:text-[#00256F] hover:bg-slate-100 transition cursor-pointer"
          title="Ayuda y Documentación"
          aria-label="Ayuda"
        >
          <span className="material-symbols-outlined text-[22px]">help_outline</span>
        </button>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-10 h-10 relative flex items-center justify-center rounded-full text-slate-500 hover:text-[#00256F] hover:bg-slate-100 transition cursor-pointer"
            title="Notificaciones"
            aria-label="Notificaciones"
          >
            <span className="material-symbols-outlined text-[22px]">notifications</span>
            <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white" />
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 py-3 z-50 animate-in fade-in zoom-in-95">
              <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                <span className="font-semibold text-sm text-slate-800 font-display">Alertas de Expedientes</span>
                <span className="text-[11px] font-semibold bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">
                  2 pendientes
                </span>
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                {notifications.map((item) => (
                  <div 
                    key={item.id} 
                    className={`p-3.5 hover:bg-slate-50 transition cursor-pointer flex gap-3 ${item.unread ? 'bg-blue-50/40' : ''}`}
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-[#00256F] flex items-center justify-center shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-[18px]">info</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-slate-900 truncate">{item.title}</p>
                        <span className="text-[10px] text-slate-400">{item.time}</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-4 pt-2 border-t border-slate-100 text-center">
                <button 
                  onClick={() => setShowNotifications(false)}
                  className="text-xs font-semibold text-[#00256F] hover:underline cursor-pointer"
                >
                  Marcar todas como atendidas
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Pill (AuthContext) */}
        <div className="relative pl-1 sm:pl-2 border-l border-slate-200" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-100 transition group text-left cursor-pointer"
          >
            <div className="w-9 h-9 rounded-full bg-[#00256F] text-white flex items-center justify-center font-bold text-xs shadow-xs">
              {displayName.split(' ').map((n) => n[0]).slice(0, 2).join('')}
            </div>
            <div className="hidden md:block">
              <p className="text-xs font-bold text-slate-800 leading-tight group-hover:text-[#00256F]">
                {displayName}
              </p>
              <p className="text-[11px] font-medium text-slate-500">
                {displayCargo}
              </p>
            </div>
            <span className="material-symbols-outlined text-slate-400 text-[18px] group-hover:text-slate-600">
              keyboard_arrow_down
            </span>
          </button>

          {/* User dropdown */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in">
              <div className="px-4 py-2.5 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900">{displayName}</p>
                <p className="text-[11px] text-slate-500">{displayCargo}</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${roleBadge.classes}`}>
                    Rol: {currentRole}
                  </span>
                </div>
              </div>

              {/* Demo Role Switcher for reviewers */}
              <div className="p-2 border-b border-slate-100 bg-slate-50/70">
                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 px-2">
                  Cambiar Rol de Sesión (RBAC)
                </span>
                <div className="grid grid-cols-3 gap-1 px-1">
                  <button
                    onClick={() => {
                      switchDemoRole('Administrador');
                      setShowUserMenu(false);
                    }}
                    className={`px-1.5 py-1 text-[10px] font-semibold rounded cursor-pointer ${
                      currentRole === 'Administrador'
                        ? 'bg-[#00256F] text-white'
                        : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    Admin
                  </button>
                  <button
                    onClick={() => {
                      switchDemoRole('Editor');
                      setShowUserMenu(false);
                    }}
                    className={`px-1.5 py-1 text-[10px] font-semibold rounded cursor-pointer ${
                      currentRole === 'Editor'
                        ? 'bg-emerald-700 text-white'
                        : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    Editor
                  </button>
                  <button
                    onClick={() => {
                      switchDemoRole('Lector');
                      setShowUserMenu(false);
                    }}
                    className={`px-1.5 py-1 text-[10px] font-semibold rounded cursor-pointer ${
                      currentRole === 'Lector'
                        ? 'bg-purple-700 text-white'
                        : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    Lector
                  </button>
                </div>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    onNavigate('configuracion');
                  }}
                  className="w-full px-4 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px] text-slate-400">settings</span>
                  <span>Configuración del Sistema</span>
                </button>
              </div>

              <div className="pt-1 border-t border-slate-100">
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    onLogout();
                  }}
                  className="w-full px-4 py-2 text-left text-xs font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">logout</span>
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Help & Documentation Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-blue-100 text-[#00256F] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">menu_book</span>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 font-display">Especificaciones API Fundasamaritanos</h3>
                  <p className="text-xs text-slate-500">Arquitectura y Roles del Sistema</p>
                </div>
              </div>
              <button 
                onClick={() => setShowHelpModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="py-4 space-y-3.5 text-xs text-slate-600">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="font-bold text-[#00256F] mb-1">Control de Acceso Basado en Roles (RBAC):</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li><strong>🛡️ Administrador:</strong> Acceso total, gestión de personal y usuarios, botones de eliminación habilitados.</li>
                  <li><strong>✏️ Editor:</strong> Creación y edición de expedientes y beneficiarias. Personal en solo lectura. Eliminación deshabilitada.</li>
                  <li><strong>👁️ Lector:</strong> Consulta general. Todos los botones de creación, edición y eliminación ocultos.</li>
                </ul>
              </div>

              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 text-slate-700">
                <p className="font-bold text-[#00256F] mb-1">Endpoints Integrados:</p>
                <p className="font-mono text-[11px] text-slate-600">
                  POST /login · GET /me · GET /dashboard · GET /roles · GET /personal · POST /personal · POST /personal/{'{id}'}/usuario
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowHelpModal(false)}
                className="px-4 py-2 bg-[#00256F] text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
