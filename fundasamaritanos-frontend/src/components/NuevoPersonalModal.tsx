import React, { useState } from 'react';
import { PersonalMember } from '../types';
import { personalApi } from '../api/endpoints';

interface NuevoPersonalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (staff: PersonalMember) => void;
}

export const NuevoPersonalModal: React.FC<NuevoPersonalModalProps> = ({
  isOpen,
  onClose,
  onSave
}) => {
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [cedula, setCedula] = useState('V-');
  const [telefono, setTelefono] = useState('+58 ');
  const [idCargo, setIdCargo] = useState<number>(1);
  const [cargoText, setCargoText] = useState('Trabajadora Social');
  const [area, setArea] = useState<PersonalMember['area']>('Trabajo Social');
  const [idDireccion, setIdDireccion] = useState<number>(1);
  const [tipoPersonal, setTipoPersonal] = useState<'Fijo' | 'Voluntario'>('Fijo');
  const [estado, setEstado] = useState<PersonalMember['estado']>('Activo');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !apellido.trim() || !cedula.trim()) {
      setError('Nombre, Apellido y Cédula son obligatorios.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // POST /personal/
      const created = await personalApi.create({
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        cedula: cedula.trim(),
        telefono: telefono.trim(),
        id_direccion: Number(idDireccion),
        id_cargo: Number(idCargo),
        cargo: cargoText.trim(),
        area,
        tipo_personal: tipoPersonal,
        estado
      });

      onSave(created);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error al registrar personal en la API.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-100 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#00256F] flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">badge</span>
            </div>
            <div>
              <h3 className="font-bold text-slate-900 font-display">Registrar Personal</h3>
              <p className="text-xs text-slate-500">Paso 1: Ficha institucional (POST /personal/)</p>
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

        <form onSubmit={handleSubmit} className="py-4 space-y-3.5 text-xs">
          {/* Nombres y Apellidos */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Nombre <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="ej: María"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-[#00256F]"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Apellido <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
                placeholder="ej: Rodríguez"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-[#00256F]"
                required
              />
            </div>
          </div>

          {/* Cédula y Teléfono */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Cédula de Identidad <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={cedula}
                onChange={(e) => setCedula(e.target.value)}
                placeholder="V-12.345.678"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-[#00256F]"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Teléfono
              </label>
              <input
                type="text"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="+58 (414) 000-0000"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-[#00256F]"
              />
            </div>
          </div>

          {/* Cargo y Área */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Cargo Funcional
              </label>
              <input
                type="text"
                value={cargoText}
                onChange={(e) => setCargoText(e.target.value)}
                placeholder="ej: Trabajadora Social de Campo"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-[#00256F]"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Área Institucional
              </label>
              <select
                value={area}
                onChange={(e) => setArea(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-[#00256F]"
              >
                <option value="Trabajo Social">Trabajo Social</option>
                <option value="Psicología">Psicología</option>
                <option value="Educación">Educación</option>
                <option value="Salud">Salud</option>
                <option value="Dirección">Dirección</option>
                <option value="Administración">Administración</option>
              </select>
            </div>
          </div>

          {/* Tipo Personal y Estado */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Tipo de Personal
              </label>
              <select
                value={tipoPersonal}
                onChange={(e) => setTipoPersonal(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-[#00256F]"
              >
                <option value="Fijo">Fijo (Nómina institucional)</option>
                <option value="Voluntario">Voluntario / Pasante</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Estado Operativo <span className="text-rose-500">*</span>
              </label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-[#00256F]"
              >
                <option value="Activo">Activo (Habilita asignación de usuario)</option>
                <option value="Inactivo">Inactivo</option>
                <option value="Vacaciones">Vacaciones</option>
                <option value="Permiso">Permiso</option>
              </select>
            </div>
          </div>

          {/* Nota de regla de negocio */}
          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-slate-700 text-[11px] flex items-start gap-2">
            <span className="material-symbols-outlined text-blue-700 text-[18px] shrink-0 mt-0.5">info</span>
            <span>
              <strong>Regla de negocio:</strong> Solo el personal en estado <strong>"Activo"</strong> podrá recibir credenciales de acceso al sistema (Paso 2).
            </span>
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
                  <span className="material-symbols-outlined text-[18px]">save</span>
                  <span>Registrar en Personal</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
