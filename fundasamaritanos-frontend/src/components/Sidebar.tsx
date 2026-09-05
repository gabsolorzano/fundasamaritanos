import React from 'react';
import { ViewMode } from '../types';
import { Logo } from './Logo';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  currentView: ViewMode;
  onNavigate: (view: ViewMode) => void;
  onLogout: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  personalCount?: number;
  beneficiariasCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  onLogout,
  isMobileOpen,
  onCloseMobile,
  personalCount = 18,
  beneficiariasCount = 34
}) => {
  const { role, isAdmin, isLector } = useAuth();

  const navItems = [
    {
      id: 'dashboard' as ViewMode,
      label: 'Dashboard',
      icon: 'dashboard',
      views: ['dashboard']
    },
    {
      id: 'beneficiarias' as ViewMode,
      label: 'Beneficiarias',
      icon: 'group',
      views: ['beneficiarias', 'nuevo-expediente', 'ficha-beneficiaria'],
      badge: beneficiariasCount,
      extraLabel: isLector ? 'Consulta' : undefined
    },
    {
      id: 'personal' as ViewMode,
      label: 'Personal',
      icon: 'badge',
      views: ['personal'],
      badge: personalCount,
      extraLabel: !isAdmin ? 'Lectura' : undefined
    },
    {
      id: 'configuracion' as ViewMode,
      label: 'Configuración',
      icon: 'settings',
      views: ['configuracion']
    }
  ];

  const content = (
    <div className="h-full flex flex-col justify-between bg-white border-r border-slate-200">
      {/* Top Section: Logo & Nav items */}
      <div>
        {/* Logo Container */}
        <div className="h-[72px] px-6 flex items-center border-b border-slate-100">
          <Logo size="md" />
        </div>

        {/* Navigation List */}
        <nav className="p-4 space-y-1.5">
          {navItems.map((item) => {
            const isActive = item.views.includes(currentView);
            return (
              <button
                key={item.id}
                id={`sidebar-nav-${item.id}`}
                onClick={() => {
                  onNavigate(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all group cursor-pointer ${
                  isActive
                    ? 'bg-blue-50 text-[#00256F] font-semibold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <span
                    className={`material-symbols-outlined text-[22px] transition-colors ${
                      isActive ? 'text-[#00256F]' : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {item.extraLabel && (
                    <span className="text-[10px] px-1.5 py-0.2 font-medium bg-slate-100 text-slate-500 rounded">
                      {item.extraLabel}
                    </span>
                  )}
                  {item.badge !== undefined && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        isActive
                          ? 'bg-[#00256F] text-white'
                          : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section: Institutional Badge & Logout */}
      <div className="p-4 border-t border-slate-100 space-y-3">
        {/* Sede Info card */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                Sede Caracas
              </span>
            </div>
            <span className="text-[10px] font-mono font-semibold text-[#00256F] bg-blue-100/70 px-1.5 py-0.5 rounded">
              {role || 'Admin'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5">
            API Fundasamaritanos · Conectado
          </p>
        </div>

        {/* Logout button */}
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer"
        >
          <span className="material-symbols-outlined text-[22px] text-slate-400 group-hover:text-rose-600">
            logout
          </span>
          <span>Cerrar sesión</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 xl:w-72 shrink-0 h-screen sticky top-0 z-20">
        {content}
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            onClick={onCloseMobile}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
          />

          {/* Drawer content */}
          <div className="relative w-72 max-w-[80vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
