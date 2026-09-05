import React, { useState } from 'react';
import { Representante } from '../types';

interface NuevoRepresentanteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (rep: Representante) => void;
  defaultAddress?: string;
}

export const NuevoRepresentanteModal: React.FC<NuevoRepresentanteModalProps> = ({
  isOpen,
  onClose,
  onSave,
  defaultAddress = ''
}) => {
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [cedula, setCedula] = useState('');
  const [parentesco, setParentesco] = useState<Representante['parentesco']>('Madre');
  const [telefono, setTelefono] = useState('');
  const [ocupacion, setOcupacion] = useState('');
  const [estadoCivil, setEstadoCivil] = useState('Soltera');
  const [nivelInstruccion, setNivelInstruccion] = useState('Secundaria');
  const [direccion, setDireccion] = useState(defaultAddress);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newRep: Representante = {
      id: `rep-${Date.now()}`,
      nombres: nombres.trim(),
      apellidos: apellidos.trim(),
      cedula: cedula.trim(),
      parentesco,
      telefono: telefono.trim(),
      ocupacion: ocupacion.trim(),
      estadoCivil,
      nivelInstruccion,
      direccion: direccion.trim() || defaultAddress
    };
    onSave(newRep);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-100 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-blue-100 text-[#00256F] flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">person_add</span>
            </div>
            <div>
              <h3 className="font-bold text-slate-900 font-display">Agregar Representante</h3>
              <p className="text-xs text-slate-500">Nuevo integrante del núcleo familiar</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="py-4 space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nombres</label>
              <input
                type="text"
                value={nombres}
                onChange={(e) => setNombres(e.target.value)}
                placeholder="Ej: José Gregorio"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-[#00256F]"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Apellidos</label>
              <input
                type="text"
                value={apellidos}
                onChange={(e) => setApellidos(e.target.value)}
                placeholder="Ej: Martínez Alvarado"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-[#00256F]"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Cédula</label>
              <input
                type="text"
                value={cedula}
                onChange={(e) => setCedula(e.target.value)}
                placeholder="Ej: V-15.432.876"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-[#00256F]"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Parentesco</label>
              <select
                value={parentesco}
                onChange={(e) => setParentesco(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-[#00256F]"
              >
                <option value="Madre">Madre</option>
                <option value="Padre">Padre</option>
                <option value="Abuela">Abuela</option>
                <option value="Abuelo">Abuelo</option>
                <option value="Tía">Tía</option>
                <option value="Tío">Tío</option>
                <option value="Hermano(a) Mayor">Hermano(a) Mayor</option>
                <option value="Tutor Legal">Tutor Legal</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Teléfono</label>
              <input
                type="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="Ej: +58 (424) 987-6543"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-[#00256F]"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Ocupación</label>
              <input
                type="text"
                value={ocupacion}
                onChange={(e) => setOcupacion(e.target.value)}
                placeholder="Ej: Comerciante, Asistente..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-[#00256F]"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Dirección de Habitación</label>
            <input
              type="text"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              placeholder="Dirección completa de residencia"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-[#00256F]"
            />
          </div>

          <div className="flex gap-2.5 pt-4 border-t border-slate-100 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-[#00256F] hover:bg-[#132E70] rounded-xl shadow-xs"
            >
              Guardar Representante
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
