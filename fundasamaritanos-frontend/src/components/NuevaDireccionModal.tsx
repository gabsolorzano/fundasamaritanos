import React, { useState } from 'react';

interface NuevaDireccionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (fullAddress: string) => void;
}

export const NuevaDireccionModal: React.FC<NuevaDireccionModalProps> = ({
  isOpen,
  onClose,
  onSave
}) => {
  const [estado, setEstado] = useState('Miranda');
  const [municipio, setMunicipio] = useState('Sucre');
  const [parroquia, setParroquia] = useState('Petare');
  const [sector, setSector] = useState('');
  const [calle, setCalle] = useState('');
  const [inmueble, setInmueble] = useState('');
  const [puntoReferencia, setPuntoReferencia] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parts = [
      calle.trim(),
      inmueble.trim(),
      sector.trim() ? `Sector ${sector.trim()}` : '',
      `Parroquia ${parroquia}`,
      `Municipio ${municipio}`,
      `Edo. ${estado}`,
      puntoReferencia.trim() ? `(Punto de Ref: ${puntoReferencia.trim()})` : ''
    ].filter(Boolean);

    const fullAddress = parts.join(', ');
    onSave(fullAddress);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-100 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-blue-100 text-[#00256F] flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">location_on</span>
            </div>
            <div>
              <h3 className="font-bold text-slate-900 font-display">Registrar Nueva Dirección</h3>
              <p className="text-xs text-slate-500">Datos geográficos de residencia familiar</p>
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
              <label className="block font-semibold text-slate-700 mb-1">Estado</label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-[#00256F]"
              >
                <option value="Miranda">Miranda</option>
                <option value="Distrito Capital">Distrito Capital</option>
                <option value="La Guaira">La Guaira</option>
                <option value="Aragua">Aragua</option>
                <option value="Carabobo">Carabobo</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Municipio</label>
              <input
                type="text"
                value={municipio}
                onChange={(e) => setMunicipio(e.target.value)}
                placeholder="Ej: Sucre, Chacao, Baruta"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-[#00256F]"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Parroquia</label>
              <input
                type="text"
                value={parroquia}
                onChange={(e) => setParroquia(e.target.value)}
                placeholder="Ej: Petare, Leoncio Martínez"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-[#00256F]"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Sector o Urbanización</label>
              <input
                type="text"
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                placeholder="Ej: Los Ruices, El Carmen"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-[#00256F]"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Avenida / Calle / Manzana</label>
            <input
              type="text"
              value={calle}
              onChange={(e) => setCalle(e.target.value)}
              placeholder="Ej: Av. Principal de Los Ruices, Calle Bolívar"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-[#00256F]"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Casa / Edificio / Apartamento / Nº</label>
            <input
              type="text"
              value={inmueble}
              onChange={(e) => setInmueble(e.target.value)}
              placeholder="Ej: Edif. Centro, Apto 4-B o Casa Nº 12"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-[#00256F]"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Punto de Referencia (Opcional)</label>
            <input
              type="text"
              value={puntoReferencia}
              onChange={(e) => setPuntoReferencia(e.target.value)}
              placeholder="Ej: A 50 metros del ambulatorio, frente a la panadería"
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
              Guardar Dirección
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
