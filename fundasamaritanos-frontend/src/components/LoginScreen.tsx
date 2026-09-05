import React, { useState } from 'react';
import { Logo } from './Logo';
import { useAuth } from '../context/AuthContext';

interface LoginScreenProps {
  onLoginSuccess?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Por favor ingrese su usuario institucional.');
      return;
    }
    if (!password) {
      setError('Por favor ingrese su contraseña.');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      await login(username.trim(), password);
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (err: any) {
      console.error('Error al iniciar sesión:', err);
      const msg = err?.message || err?.detail || 'Usuario o contraseña incorrectos.';
      setError(typeof msg === 'string' ? msg : 'Usuario o contraseña incorrectos.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="h-screen w-screen flex items-center justify-center p-4 relative overflow-hidden select-none"
      style={{
        background: 'linear-gradient(135deg, #001B54 0%, #00256F 28%, #36225B 58%, #8E2E67 82%, #E87A90 96%, #F4B8C0 100%)'
      }}
    >
      {/* Luces de fondo decorativas suaves */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-[#00256F]/40 blur-3xl" />
        <div className="absolute -bottom-28 -right-28 w-96 h-96 rounded-full bg-[#E87A90]/35 blur-3xl" />
        <div className="absolute top-1/4 right-1/4 w-72 h-72 rounded-full bg-[#F4B8C0]/20 blur-3xl" />
      </div>

      {/* Tarjeta de Inicio de Sesión */}
      <div className="relative w-full max-w-sm bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,37,111,0.35)] p-7 sm:p-8 border border-white/80">
        {/* Franja superior institucional */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#00256F] via-[#8E2E67] to-[#E87A90] rounded-t-2xl" />

        <div className="flex flex-col items-center text-center mb-5 pt-1">
          {/* Logo */}
          <div className="mb-3 relative">
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
        </div>

        {/* Banner de error visible */}
        {error && (
          <div 
            id="login-error-banner"
            className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2.5"
          >
            <span className="material-symbols-outlined text-red-500 text-[18px] shrink-0">error</span>
            <span className="font-semibold">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Campo Usuario */}
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
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Ingrese su usuario"
                className="block w-full pl-11 pr-4 py-2.5 text-sm text-slate-900 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#00256F] focus:border-[#E87A90] transition outline-none bg-slate-50/50 hover:bg-white focus:bg-white"
                required
                autoComplete="username"
              />
            </div>
          </div>

          {/* Campo Contraseña */}
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
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Ingrese su contraseña"
                className="block w-full pl-11 pr-11 py-2.5 text-sm text-slate-900 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#00256F] focus:border-[#E87A90] transition outline-none bg-slate-50/50 hover:bg-white focus:bg-white"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                aria-label="Alternar visibilidad de contraseña"
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          {/* Botón de Ingreso */}
          <button
            id="login-submit-btn"
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 bg-gradient-to-r from-[#00256F] via-[#332560] to-[#C24A75] hover:from-[#001B54] hover:via-[#271C4D] hover:to-[#A83860] active:scale-[0.99] text-white font-semibold text-sm rounded-xl shadow-md hover:shadow-lg hover:shadow-pink-900/20 transition-all flex items-center justify-center gap-2 disabled:opacity-75 cursor-pointer mt-2"
          >
            {isSubmitting ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Autenticando...</span>
              </>
            ) : (
              <>
                <span>Ingresar al Sistema</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </>
            )}
          </button>
        </form>

        {/* Pie de página institucional */}
        <div className="mt-5 text-center">
          <p className="text-[11px] text-slate-400">
            © {new Date().getFullYear()} Fundasamaritanos · Hogar de Protección
          </p>
        </div>
      </div>
    </div>
  );
};
