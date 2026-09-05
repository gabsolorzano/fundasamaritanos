import React, { useState } from 'react';
import { Logo } from './Logo';
import { useAuth } from '../context/AuthContext';
import { AppRole } from '../types';

interface LoginScreenProps {
  onLoginSuccess?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const { login, switchDemoRole, isLoading } = useAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Por favor ingrese su usuario institucional.');
      return;
    }
    setError('');
    try {
      // POST /login (application/x-www-form-urlencoded) + GET /me
      await login(username.trim(), password);
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (err: any) {
      setError(err?.message || 'Credenciales inválidas. Verifique su usuario y contraseña.');
    }
  };

  const handleQuickDemo = async (role: AppRole) => {
    setError('');
    try {
      await switchDemoRole(role);
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (err: any) {
      setError('Error al ingresar con rol de demostración.');
    }
  };

  return (
    <div 
      className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #001B54 0%, #00256F 28%, #36225B 58%, #8E2E67 82%, #E87A90 96%, #F4B8C0 100%)'
      }}
    >
      {/* Decorative ambient backdrop shapes for a soft, pleasant glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
        {/* Deep royal blue ambient orb */}
        <div className="absolute -top-24 -left-24 w-[32rem] h-[32rem] rounded-full bg-[#00256F]/40 blur-3xl" />
        {/* Warm rose ambient orb */}
        <div className="absolute -bottom-28 -right-28 w-[34rem] h-[34rem] rounded-full bg-[#E87A90]/35 blur-3xl" />
        {/* Soft center-top magenta/pink aura */}
        <div className="absolute top-1/4 right-1/4 w-80 h-80 rounded-full bg-[#F4B8C0]/20 blur-3xl" />
        {/* Subtle decorative ring overlay */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full border border-white/5 pointer-events-none" />
      </div>

      {/* Main Login Card */}
      <div className="relative w-full max-w-md bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,37,111,0.35)] p-8 sm:p-10 border border-white/80 overflow-hidden">
        {/* Top gradient highlight strip (Azul institucional a Rosado Fundasamaritanos) */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#00256F] via-[#8E2E67] to-[#E87A90]" />

        <div className="flex flex-col items-center text-center mb-6 pt-1">
          {/* Logo with soft gradient aura */}
          <div className="mb-4 relative">
            <div className="absolute -inset-1.5 rounded-full bg-gradient-to-tr from-[#00256F]/20 via-[#E87A90]/25 to-[#F4B8C0]/30 blur-xs" />
            <div className="relative">
              <Logo size="lg" variant="icon-only" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-[#00256F] font-display tracking-tight">
            Iniciar Sesión
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Fundasamaritanos · Sistema de Protección Integral
          </p>

          <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-blue-50/90 via-purple-50/60 to-pink-50/90 border border-pink-200/60 text-[11px] font-mono text-[#00256F] shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E87A90] animate-pulse" />
            <span className="font-semibold">POST /login</span>
            <span className="text-slate-300">·</span>
            <span className="text-slate-600">Bearer JWT</span>
          </div>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5 animate-in fade-in">
            <span className="material-symbols-outlined text-rose-500 text-[18px]">error</span>
            <span className="font-medium">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* User field */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Usuario Institucional
            </label>
            <div className="relative rounded-xl shadow-xs">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <span className="material-symbols-outlined text-[20px]">person</span>
              </div>
              <input
                id="login-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ej: admin, e.morales, lector"
                className="block w-full pl-11 pr-4 py-3 text-sm text-slate-900 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#00256F] focus:border-[#E87A90] transition outline-none bg-slate-50/50 hover:bg-white focus:bg-white"
                required
              />
            </div>
          </div>

          {/* Password field */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Contraseña
            </label>
            <div className="relative rounded-xl shadow-xs">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <span className="material-symbols-outlined text-[20px]">lock</span>
              </div>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="block w-full pl-11 pr-11 py-3 text-sm text-slate-900 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#00256F] focus:border-[#E87A90] transition outline-none bg-slate-50/50 hover:bg-white focus:bg-white"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                aria-label="Toggle password visibility"
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          {/* Remember me & Forgot password */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-[#00256F] border-slate-300 rounded focus:ring-[#00256F] accent-[#00256F]"
              />
              <span className="text-xs text-slate-600 font-medium">Recordar sesión</span>
            </label>
            <button
              type="button"
              onClick={() => {
                setForgotEmail(username);
                setShowForgotModal(true);
                setForgotSent(false);
              }}
              className="text-xs font-semibold text-[#00256F] hover:text-[#C24A75] hover:underline transition cursor-pointer"
            >
              ¿Olvidó su contraseña?
            </button>
          </div>

          {/* Submit Button with institutional blue to pink gradient */}
          <button
            id="login-submit-btn"
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-[#00256F] via-[#332560] to-[#C24A75] hover:from-[#001B54] hover:via-[#271C4D] hover:to-[#A83860] active:scale-[0.99] text-white font-semibold text-sm rounded-xl shadow-md hover:shadow-lg hover:shadow-pink-900/20 transition-all flex items-center justify-center gap-2 disabled:opacity-75 cursor-pointer mt-2"
          >
            {isLoading ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Autenticando credenciales...</span>
              </>
            ) : (
              <>
                <span>Ingresar al Sistema</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </>
            )}
          </button>
        </form>

        {/* Demo Roles Quick Access — Muestra los 3 roles del RBAC con toques armónicos */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Acceso Rápido por Rol (RBAC)
            </span>
            <span className="text-[10px] text-slate-400">Prueba instantánea</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickDemo('Administrador')}
              disabled={isLoading}
              className="p-2 text-center rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100 transition cursor-pointer group"
              title="Acceso total, gestión de personal y eliminación"
            >
              <span className="text-sm block">🛡️</span>
              <span className="text-[11px] font-bold text-[#00256F] block mt-0.5">Admin</span>
              <span className="text-[9px] text-slate-500 block">Total</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemo('Editor')}
              disabled={isLoading}
              className="p-2 text-center rounded-xl border border-pink-200 bg-pink-50/70 hover:bg-pink-100 transition cursor-pointer group"
              title="Creación y edición de expedientes; personal solo lectura"
            >
              <span className="text-sm block">✏️</span>
              <span className="text-[11px] font-bold text-[#A83860] block mt-0.5">Editor</span>
              <span className="text-[9px] text-slate-500 block">Edición</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemo('Lector')}
              disabled={isLoading}
              className="p-2 text-center rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 transition cursor-pointer group"
              title="Solo consulta; formularios deshabilitados"
            >
              <span className="text-sm block">👁️</span>
              <span className="text-[11px] font-bold text-[#3B4B96] block mt-0.5">Lector</span>
              <span className="text-[9px] text-slate-500 block">Consulta</span>
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-5 text-center">
          <p className="text-[11px] text-slate-400">
            © {new Date().getFullYear()} Fundasamaritanos · Hogar de Protección
          </p>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 font-display">Recuperar Acceso</h3>
              <button 
                onClick={() => setShowForgotModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {forgotSent ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="material-symbols-outlined text-2xl">check_circle</span>
                </div>
                <p className="text-sm font-semibold text-slate-900">Instrucciones enviadas</p>
                <p className="text-xs text-slate-500 mt-1">
                  Se ha enviado el enlace de restablecimiento para el usuario <strong>{forgotEmail}</strong>.
                </p>
                <button
                  onClick={() => setShowForgotModal(false)}
                  className="mt-5 w-full py-2 bg-[#00256F] text-white rounded-xl text-xs font-semibold"
                >
                  Entendido
                </button>
              </div>
            ) : (
              <div>
                <p className="text-xs text-slate-600 mb-4">
                  El Administrador del sistema también puede resetear su contraseña directamente desde el módulo de Personal.
                </p>
                <input
                  type="text"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="Usuario o correo"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs mb-4 outline-none focus:ring-2 focus:ring-[#00256F]"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowForgotModal(false)}
                    className="flex-1 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => setForgotSent(true)}
                    className="flex-1 py-2 text-xs font-semibold text-white bg-gradient-to-r from-[#00256F] to-[#C24A75] hover:opacity-95 rounded-xl shadow-xs"
                  >
                    Solicitar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
