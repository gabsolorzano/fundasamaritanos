import React, { useState, useEffect } from 'react';
import { direccionesApi, institucionesApi } from '../api/endpoints';

interface NuevaInstitucionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (institucion: { id_institucion: number; nombre: string; telefono?: string }) => void;
}

export const NuevaInstitucionModal: React.FC<NuevaInstitucionModalProps> = ({
  isOpen,
  onClose,
  onSave
}) => {
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccionesExistentes, setDireccionesExistentes] = useState<any[]>([]);
  const [direccionMode, setDireccionMode] = useState<'existente' | 'nueva'>('nueva');
  const [selectedDireccionId, setSelectedDireccionId] = useState<number | ''>('');

  // Nueva dirección fields
  const [estado, setEstado] = useState('Miranda');
  const [municipio, setMunicipio] = useState('Sucre');
  const [ciudad, setCiudad] = useState('Caracas');
  const [urbanizacion, setUrbanizacion] = useState('');
  const [calleAv, setCalleAv] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      direccionesApi.list()
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            setDireccionesExistentes(data);
            setSelectedDireccionId(data[0].id_direccion);
            setDireccionMode('existente');
          }
        })
        .catch((e) => console.warn('Error cargando direcciones:', e));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!nombre.trim()) {
      setErrorMsg('El nombre de la institución es obligatorio.');
      return;
    }

    setIsSubmitting(true);
    try {
      let idDireccionToUse: number;

      if (direccionMode === 'existente' && selectedDireccionId) {
        idDireccionToUse = Number(selectedDireccionId);
      } else {
        const newDir = await direccionesApi.create({
          calle_av: calleAv.trim() || 'Principal',
          urbanizacion: urbanizacion.trim() || 'Sector Escolar',
          ciudad: ciudad.trim() || 'Caracas',
          municipio: municipio.trim() || 'Sucre',
          estado: estado.trim() || 'Miranda'
        });
        idDireccionToUse = newDir.id_direccion;
      }

      const createdInst = await institucionesApi.create({
        nombre: nombre.trim(),
        telefono: telefono.trim() || undefined,
        id_direccion: idDireccionToUse
      });

      onSave({
        id_institucion: createdInst.id_institucion,
        nombre: createdInst.nombre,
        telefono: createdInst.telefono
      });
      onClose();
    } catch (err: any) {
      console.error('Error creando institución:', err);
      setErrorMsg(err?.message || 'Error al registrar la institución.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-100 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-blue-100 text-[#00256F] flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">school</span>
            </div>
            <div>
              <h3 className="font-bold text-slate-900 font-display">Registrar Institución Educativa</h3>
              <p className="text-xs text-slate-500">Escuela, liceo o colegio del circuito educativo</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {errorMsg && (
          <div className="mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="py-4 space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Nombre de la Institución <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: U.E. Colegio San Francisco de Asís"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-[#00256F]"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Teléfono Institucional (Opcional)</label>
            <input
              type="text"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="Ej: 0212-2345678"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-[#00256F]"
            />
          </div>

          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <label className="block font-semibold text-slate-700">Dirección de la Institución</label>
              <div className="flex gap-2">
                {direccionesExistentes.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setDireccionMode('existente')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                      direccionMode === 'existente'
                        ? 'bg-[#00256F] text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Usar Existente
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setDireccionMode('nueva')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                    direccionMode === 'nueva'
                      ? 'bg-[#00256F] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Nueva Dirección
                </button>
              </div>
            </div>

            {direccionMode === 'existente' && direccionesExistentes.length > 0 ? (
              <select
                value={selectedDireccionId}
                onChange={(e) => setSelectedDireccionId(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-[#00256F]"
              >
                {direccionesExistentes.map((d) => (
                  <option key={d.id_direccion} value={d.id_direccion}>
                    {d.ciudad || d.estado} - {d.urbanizacion || ''} {d.calle_av || ''}
                  </option>
                ))}
              </select>
            ) : (
              <div className="space-y-2.5 p-3 bg-slate-50/70 border border-slate-200 rounded-xl">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Estado</label>
                    <select
                      value={estado}
                      onChange={(e) => setEstado(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg outline-none text-xs"
                    >
                      <option value="Miranda">Miranda</option>
                      <option value="Distrito Capital">Distrito Capital</option>
                      <option value="La Guaira">La Guaira</option>
                      <option value="Aragua">Aragua</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Municipio</label>
                    <input
                      type="text"
                      value={municipio}
                      onChange={(e) => setMunicipio(e.target.value)}
                      placeholder="Ej: Sucre"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg outline-none text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Ciudad</label>
                    <input
                      type="text"
                      value={ciudad}
                      onChange={(e) => setCiudad(e.target.value)}
                      placeholder="Ej: Caracas"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Sector / Urbanización</label>
                    <input
                      type="text"
                      value={urbanizacion}
                      onChange={(e) => setUrbanizacion(e.target.value)}
                      placeholder="Ej: Petare, Los Ruices"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg outline-none text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Calle / Avenida</label>
                  <input
                    type="text"
                    value={calleAv}
                    onChange={(e) => setCalleAv(e.target.value)}
                    placeholder="Ej: Calle Principal con Av. Francisco de Miranda"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg outline-none text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2.5 pt-4 border-t border-slate-100 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-[#00256F] hover:bg-[#132E70] rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Guardando...' : 'Guardar Institución'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
