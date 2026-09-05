import React, { useState, useEffect } from 'react';
import { PersonalMember, RoleItem } from '../types';
import { rolesApi, personalApi } from '../api/endpoints';

interface AsignarUsuarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  personal: PersonalMember | null;
  onSuccess: (updated: PersonalMember) => void;
}

export const AsignarUsuarioModal: React.FC<AsignarUsuarioModalProps> = ({
  isOpen,
  onClose,
  personal,
  onSuccess
}) => {
  const isEditing = Boolean(personal?.usuario);
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [idRol, setIdRol] = useState<number>(2); // Editor por defecto
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    // Cargar lista oficial de roles desde GET /roles/
    const loadRoles = async () => {
      try {
        const rolesList = await rolesApi.list();
        setRoles(rolesList);
      } catch {
        // Fallback default
        setRoles([
          { id: 1, nombre: 'Administrador', descripcion: 'Acceso Total' },
          { id: 2, nombre: 'Editor', descripcion: 'Creación y Edición' },
          { id: 3, nombre: 'Lector', descripcion: 'Solo Lectura' }
        ]);
      }
    };
    loadRoles();

    if (personal) {
      if (personal.usuario) {
        setNombreUsuario(personal.usuario.nombre_usuario);
        setIdRol(personal.usuario.id_rol || 2);
        setPassword('');
      } else {
        // Generar sugerencia de nombre_usuario: nombre.apellido
        const cleanNom = personal.nombre.toLowerCase().replace(/[^a-z]/g, '');
        const cleanApe = personal.apellido.toLowerCase().replace(/[^a-z]/g, '');
        setNombreUsuario(`${cleanNom}.${cleanApe}`);
        setIdRol(2);
        setPassword('');
      }
    }
    setError('');
  }, [isOpen, personal]);

  if (!isOpen || !personal) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditing && !password.trim()) {
      setError('Por favor ingrese una contraseña para el nuevo usuario.');
      return;
    }
    if (!nombreUsuario.trim()) {
      setError('El nombre de usuario es obligatorio.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      if (isEditing) {
        // PUT /personal/{personal_id}/usuario
        const resp = await personalApi.updateUsuario(personal.id, {
          password: password.trim() ? password.trim() : undefined,
          id_rol: Number(idRol)
        });

        const selectedRoleName = roles.find((r) => r.id === Number(idRol))?.nombre || personal.usuario?.rol_nombre || 'Editor';

        const updatedMember: PersonalMember = {
          ...personal,
          usuario: {
            ...personal.usuario!,
            id_rol: Number(idRol),
            rol_nombre: selectedRoleName
          }
        };

        onSuccess(updatedMember);
        onClose();
      } else {
        // POST /personal/{personal_id}/usuario
        const resp = await personalApi.assignUsuario(personal.id, {
          nombre_usuario: nombreUsuario.trim(),
          password: password.trim(),
          personal_id: Number(personal.id),
          id_rol: Number(idRol)
        });

        const selectedRoleName = roles.find((r) => r.id === Number(idRol))?.nombre || 'Editor';

        const updatedMember: PersonalMember = {
          ...personal,
          usuario: {
            id: Date.now(),
            nombre_usuario: nombreUsuario.trim(),
            id_rol: Number(idRol),
            rol_nombre: selectedRoleName,
            ultimo_acceso: 'Pendiente de primer ingreso'
          }
        };

        onSuccess(updatedMember);
        onClose();
      }
    } catch (err: any) {
      setError(err?.message || 'Error al procesar las credenciales en la API.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-100 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#00256F] flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">key</span>
            </div>
            <div>
              <h3 className="font-bold text-slate-900 font-display">
                {isEditing ? 'Modificar Credenciales' : 'Asignar Credenciales de Usuario'}
              </h3>
              <p className="text-xs text-slate-500">
                Paso 2: Acceso para {personal.nombre} {personal.apellido}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="py-4 space-y-4 text-xs">
          {/* Endpoint Banner */}
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between font-mono text-[11px] text-slate-600">
            <span>{isEditing ? 'PUT' : 'POST'} /personal/{personal.id}/usuario</span>
            <span className="font-sans font-semibold text-slate-500 text-[10px]">
              {personal.estado === 'Activo' ? '🟢 Personal Activo' : '🔴 Inactivo'}
            </span>
          </div>

          {/* Username input */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Nombre de Usuario <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-mono text-xs">
                @
              </span>
              <input
                type="text"
                value={nombreUsuario}
                onChange={(e) => setNombreUsuario(e.target.value)}
                disabled={isEditing}
                placeholder="ej: nombre.apellido"
                className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-[#00256F] disabled:opacity-60"
                required
              />
            </div>
            {isEditing && (
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                El nombre de usuario es un identificador único y no puede cambiarse.
              </span>
            )}
          </div>

          {/* Password input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-slate-700">
                {isEditing ? 'Nueva Contraseña (Dejar en blanco para no cambiar)' : 'Contraseña de Acceso'}
                {!isEditing && <span className="text-rose-500"> *</span>}
              </label>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isEditing ? '•••••••• (Sin cambios)' : 'Mínimo 6 caracteres'}
                className="w-full px-3 py-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-[#00256F]"
                required={!isEditing}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          {/* Role selector from GET /roles/ */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Rol Asignado (GET /roles/) <span className="text-rose-500">*</span>
            </label>
            <div className="space-y-2">
              {roles.map((r) => (
                <label
                  key={r.id}
                  className={`flex items-start gap-3 p-2.5 rounded-xl border cursor-pointer transition ${
                    Number(idRol) === r.id
                      ? 'bg-blue-50/60 border-[#00256F] text-[#00256F]'
                      : 'bg-slate-50/50 border-slate-200 text-slate-700 hover:bg-slate-100/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="rol_selector"
                    value={r.id}
                    checked={Number(idRol) === r.id}
                    onChange={() => setIdRol(r.id)}
                    className="mt-0.5 accent-[#00256F]"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs">
                        {r.nombre === 'Administrador' ? '🛡️ Administrador (ID: 1)' : r.nombre === 'Editor' ? '✏️ Editor (ID: 2)' : '👁️ Lector (ID: 3)'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{r.descripcion}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Footer buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-semibold rounded-xl transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 bg-[#00256F] hover:bg-[#132E70] text-white font-semibold rounded-xl shadow-xs hover:shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isLoading ? (
                <span>Guardando en API...</span>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">check</span>
                  <span>{isEditing ? 'Actualizar Credenciales' : 'Crear Acceso'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
