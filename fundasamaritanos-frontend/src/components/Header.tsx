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
  const { role, user: authUser } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
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
        return null;
      case 'beneficiarias':
        return (
          <span className="text-sm font-semibold text-slate-700">
            Beneficiarias
          </span>
        );
      case 'nuevo-expediente':
        return (
          <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
            <button 
              onClick={() => onNavigate('beneficiarias')} 
              className="text-[#00256F] hover:underline cursor-pointer"
            >
              Beneficiarias
            </button>
            <span className="text-slate-300">/</span>
            <span className="text-slate-800 font-semibold">Nuevo Expediente</span>
          </div>
        );
      case 'ficha-beneficiaria':
        return (
          <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
            <button 
              onClick={() => onNavigate('beneficiarias')} 
              className="text-[#00256F] hover:underline cursor-pointer"
            >
              Beneficiarias
            </button>
            <span className="text-slate-300">/</span>
            <span className="text-slate-800 font-semibold truncate max-w-[200px] sm:max-w-xs">
              Ficha de {beneficiariaName || 'Beneficiaria'}
            </span>
          </div>
        );
      case 'personal':
        return (
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <span>Gestión de Personal</span>
            {currentRole !== 'Administrador' && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                Solo Lectura
              </span>
            )}
          </div>
        );
      case 'configuracion':
        return (
          <span className="text-sm font-semibold text-slate-700">
            Configuración del Sistema
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <header className="h-[72px] bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Left side: Mobile menu toggle + Header Title / Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg focus:outline-none cursor-pointer"
          aria-label="Abrir menú"
        >
          <span className="material-symbols-outlined text-[24px]">menu</span>
        </button>
        <div className="select-none flex items-center gap-2.5 sm:gap-3">
          <span className="text-lg sm:text-xl font-bold text-[#00256F] font-display tracking-tight">
            Fundasamaritanos
          </span>
          {getBreadcrumbs() && (
            <>
              <span className="text-slate-300 font-light">/</span>
              {getBreadcrumbs()}
            </>
          )}
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
                  <h3 className="font-bold text-slate-900 font-display">Roles y Permisos del Sistema</h3>
                  <p className="text-xs text-slate-500">Control de Acceso Institucional (RBAC)</p>
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
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <p className="font-bold text-[#00256F] mb-2 text-sm">Niveles de Acceso y Funcionalidades:</p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-base">🛡️</span>
                    <div>
                      <strong className="text-slate-800">Administrador:</strong> Acceso total al sistema, gestión completa de personal y asignación de usuarios institucionales, creación, edición y eliminación de beneficiarias y expedientes.
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-base">✏️</span>
                    <div>
                      <strong className="text-slate-800">Editor:</strong> Creación y edición integral de beneficiarias, expedientes y representantes. Módulo de personal en modo solo lectura. Eliminaciones deshabilitadas.
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-base">👁️</span>
                    <div>
                      <strong className="text-slate-800">Lector:</strong> Consulta y visualización general de información. Botones y formularios de creación, edición o eliminación deshabilitados.
                    </div>
                  </li>
                </ul>
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
