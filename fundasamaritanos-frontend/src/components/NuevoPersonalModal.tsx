import React, { useState, useEffect } from 'react';
import { PersonalMember } from '../types';
import { personalApi, direccionesApi } from '../api/endpoints';

interface NuevoPersonalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (staff: PersonalMember) => void;
}

const DEFAULT_CARGOS = [
  { id_cargo: 1, descripcion: 'Coordinador' },
  { id_cargo: 2, descripcion: 'Trabajador Social' },
  { id_cargo: 3, descripcion: 'Administrativo' },
  { id_cargo: 4, descripcion: 'Cocinera' },
  { id_cargo: 5, descripcion: 'Mantenimiento' }
];

export const NuevoPersonalModal: React.FC<NuevoPersonalModalProps> = ({
  isOpen,
  onClose,
  onSave
}) => {
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [cedula, setCedula] = useState('V-');
  const [telefono, setTelefono] = useState('');
  
  // Catálogos de la base de datos
  const [direcciones, setDirecciones] = useState<any[]>([]);
  const [idDireccion, setIdDireccion] = useState<number>(1);
  const [cargos, setCargos] = useState<{ id_cargo: number; descripcion: string }[]>(DEFAULT_CARGOS);
  const [idCargo, setIdCargo] = useState<number>(1);

  // Clasificación y Estado según BD
  const [tipoPersonal, setTipoPersonal] = useState<'Fijo' | 'Voluntario'>('Fijo');
  const [estado, setEstado] = useState<'Activo' | 'Inactivo'>('Activo');

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCatalogs, setIsLoadingCatalogs] = useState(false);
  const [error, setError] = useState('');

  // Cargar direcciones y cargos de la BD al abrir el modal
  useEffect(() => {
    if (!isOpen) return;

    // Resetear formulario
    setNombre('');
    setApellido('');
    setCedula('V-');
    setTelefono('');
    setTipoPersonal('Fijo');
    setEstado('Activo');
    setError('');

    const loadCatalogs = async () => {
      setIsLoadingCatalogs(true);
      try {
        const [dirsList, cargosList] = await Promise.all([
          direccionesApi.list().catch(() => []),
          personalApi.getCargos().catch(() => DEFAULT_CARGOS)
        ]);

        if (Array.isArray(dirsList) && dirsList.length > 0) {
          setDirecciones(dirsList);
          setIdDireccion(dirsList[0].id_direccion);
        }

        if (Array.isArray(cargosList) && cargosList.length > 0) {
          setCargos(cargosList);
          setIdCargo(cargosList[0].id_cargo);
        }
      } catch (e) {
        console.warn('Error cargando catálogos para registrar personal:', e);
      } finally {
        setIsLoadingCatalogs(false);
      }
    };

    loadCatalogs();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !apellido.trim() || !cedula.trim()) {
      setError('Nombre, Apellido y Cédula de Identidad son obligatorios.');
      return;
    }

    if (!idDireccion) {
      setError('Debe seleccionar una dirección para el colaborador.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // POST /personal/ siguiendo estrictamente el esquema de la BD
      const created = await personalApi.create({
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        cedula: cedula.trim(),
        telefono: telefono.trim() || undefined,
        id_direccion: Number(idDireccion),
        id_cargo: Number(idCargo),
        tipo_personal: tipoPersonal,
        estado: estado,
        activo: estado === 'Activo'
      });

      onSave(created);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error al registrar el personal en la base de datos.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-100 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        {/* Cabecera */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#00256F] flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">badge</span>
            </div>
            <div>
              <h3 className="font-bold text-slate-900 font-display">Registrar Personal</h3>
              <p className="text-xs text-slate-500">Ficha del nuevo colaborador</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition cursor-pointer"
            type="button"
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
          {/* Nombre y Apellido */}
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
                placeholder="0412-0000000"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-[#00256F]"
              />
            </div>
          </div>

          {/* Dirección asignada (Desplegable de direcciones disponibles) */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Dirección Asignada <span className="text-rose-500">*</span>
            </label>
            <select
              value={idDireccion}
              onChange={(e) => setIdDireccion(Number(e.target.value))}
              disabled={isLoadingCatalogs}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-[#00256F]"
              required
            >
              {direcciones.length === 0 ? (
                <option value={1}>Cargando direcciones disponibles...</option>
              ) : (
                direcciones.map((d) => (
                  <option key={d.id_direccion} value={d.id_direccion}>
                    {d.ciudad || d.estado} - {d.urbanizacion ? `${d.urbanizacion}, ` : ''}{d.calle_av || 'Sin calle especificada'}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Cargo Institucional (Catálogo de BD) */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Cargo Institucional <span className="text-rose-500">*</span>
            </label>
            <select
              value={idCargo}
              onChange={(e) => setIdCargo(Number(e.target.value))}
              disabled={isLoadingCatalogs}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-[#00256F]"
              required
            >
              {cargos.map((c) => (
                <option key={c.id_cargo} value={c.id_cargo}>
                  {c.descripcion}
                </option>
              ))}
            </select>
          </div>

          {/* Tipo de Personal y Estado */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Tipo de Personal <span className="text-rose-500">*</span>
              </label>
              <select
                value={tipoPersonal}
                onChange={(e) => setTipoPersonal(e.target.value as 'Fijo' | 'Voluntario')}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-[#00256F]"
              >
                <option value="Fijo">Fijo</option>
                <option value="Voluntario">Voluntario</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Estado <span className="text-rose-500">*</span>
              </label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value as 'Activo' | 'Inactivo')}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-[#00256F]"
              >
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </div>
          </div>

          {/* Regla de negocio */}
          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-slate-700 text-[11px] flex items-start gap-2">
            <span className="material-symbols-outlined text-[#00256F] text-[18px] shrink-0 mt-0.5">info</span>
            <span>
              <strong>Regla de negocio:</strong> Solo el personal en estado <strong>"Activo"</strong> podrá recibir credenciales de acceso al sistema (Paso 2).
            </span>
          </div>

          {/* Botones de acción */}
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
              disabled={isLoading || isLoadingCatalogs}
              className="px-5 py-2.5 bg-[#00256F] hover:bg-[#132E70] text-white font-semibold rounded-xl shadow-xs hover:shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isLoading ? (
                <span>Guardando...</span>
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
