import React, { useState, useMemo } from 'react';
import { PersonalMember } from '../types';
import { NuevoPersonalModal } from './NuevoPersonalModal';
import { AsignarUsuarioModal } from './AsignarUsuarioModal';
import { useAuth } from '../context/AuthContext';
import { personalApi } from '../api/endpoints';

interface PersonalViewProps {
  personal: PersonalMember[];
  onAddPersonal: (member: PersonalMember) => void;
  onUpdatePersonal: (member: PersonalMember) => void;
  onDeletePersonal?: (id: string | number) => void;
}

export const PersonalView: React.FC<PersonalViewProps> = ({
  personal,
  onAddPersonal,
  onUpdatePersonal,
  onDeletePersonal
}) => {
  const { isAdmin, role } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArea, setSelectedArea] = useState<string>('Todas');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedMemberForUser, setSelectedMemberForUser] = useState<PersonalMember | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<PersonalMember | null>(null);

  const areas = ['Todas', 'Trabajo Social', 'Psicología', 'Educación', 'Salud', 'Dirección', 'Administración'];

  const filteredPersonal = useMemo(() => {
    return personal.filter((p) => {
      const full = `${p.nombre} ${p.apellido}`.toLowerCase();
      const matchesSearch =
        full.includes(searchTerm.toLowerCase()) ||
        p.cargo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.cedula.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.usuario?.nombre_usuario || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesArea = selectedArea === 'Todas' || p.area === selectedArea;

      return matchesSearch && matchesArea;
    });
  }, [personal, searchTerm, selectedArea]);

  const handleOpenUserModal = (member: PersonalMember) => {
    setSelectedMemberForUser(member);
    setIsUserModalOpen(true);
  };

  const handleUserModalSuccess = (updated: PersonalMember) => {
    onUpdatePersonal(updated);
  };

  const handleDeleteConfirm = async () => {
    if (!memberToDelete) return;
    try {
      await personalApi.delete(memberToDelete.id);
      if (onDeletePersonal) {
        onDeletePersonal(memberToDelete.id);
      }
      setMemberToDelete(null);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#00256F] font-display">
              Gestión de Personal y Credenciales
            </h1>
            {!isAdmin && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                Solo Lectura (Rol: {role})
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 font-medium">
            Administración del equipo multidisciplinario, cargos y asignación de usuarios institucionales (RBAC).
          </p>
        </div>

        {/* RBAC: Solo Administrador puede Registrar Personal */}
        {isAdmin && (
          <button
            id="btn-registrar-personal"
            onClick={() => setIsAddModalOpen(true)}
            className="px-5 py-3 bg-[#00256F] hover:bg-[#132E70] text-white font-semibold text-sm rounded-xl shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer self-start sm:self-auto"
          >
            <span className="material-symbols-outlined text-[20px]">person_add</span>
            <span>Registrar Personal (Paso 1)</span>
          </button>
        )}
      </div>

      {/* Banner explicativo RBAC si es Editor o Lector */}
      {!isAdmin && (
        <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl flex items-center gap-3 text-xs text-amber-900">
          <span className="material-symbols-outlined text-amber-700 text-[22px] shrink-0">lock</span>
          <div>
            <span className="font-bold">Acceso de consulta: </span>
            Como usuario con rol <strong>{role}</strong>, puede revisar la nómina y cargos del personal. La creación de colaboradores, asignación de cuentas y reseteo de contraseñas es potestad exclusiva del <strong>Administrador</strong>.
          </div>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total de Personal
          </span>
          <div className="text-3xl font-bold text-slate-900 font-display mt-2">
            {personal.length}
          </div>
          <p className="text-xs text-slate-500 mt-1">Colaboradores registrados</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Usuarios con Acceso
          </span>
          <div className="text-3xl font-bold text-[#00256F] font-display mt-2">
            {personal.filter((p) => p.usuario).length}
          </div>
          <p className="text-xs text-slate-500 mt-1">Cuentas activas en sistema</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Personal Activo
          </span>
          <div className="text-3xl font-bold text-emerald-600 font-display mt-2">
            {personal.filter((p) => p.estado === 'Activo').length}
          </div>
          <p className="text-xs text-slate-500 mt-1">Aptos para asignar usuario</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Personal Fijo vs Voluntario
          </span>
          <div className="text-xl font-bold text-slate-800 font-display mt-2.5">
            {personal.filter((p) => p.tipo_personal === 'Fijo').length} Fijos · {personal.filter((p) => p.tipo_personal === 'Voluntario').length} Vol.
          </div>
          <p className="text-xs text-slate-500 mt-1">Distribución de nómina</p>
        </div>
      </div>

      {/* Search and Area Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <span className="material-symbols-outlined text-[20px]">search</span>
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, cargo, cédula o usuario..."
            className="w-full pl-11 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#00256F] outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {areas.map((area) => (
            <button
              key={area}
              onClick={() => setSelectedArea(area)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                selectedArea === area
                  ? 'bg-[#00256F] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {area}
            </button>
          ))}
        </div>
      </div>

      {/* Staff & Credentials Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <th className="py-4 px-6">Colaborador</th>
                <th className="py-4 px-6">Cargo / Área</th>
                <th className="py-4 px-6">Tipo</th>
                <th className="py-4 px-6">Usuario & Rol (API)</th>
                <th className="py-4 px-6">Estado</th>
                {isAdmin && <th className="py-4 px-6 text-right">Acciones Admin</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredPersonal.map((p) => {
                const getStatusPill = (status: string) => {
                  switch (status) {
                    case 'Activo':
                      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
                    case 'Vacaciones':
                      return 'bg-amber-50 text-amber-700 border-amber-200';
                    case 'Permiso':
                      return 'bg-blue-50 text-blue-700 border-blue-200';
                    default:
                      return 'bg-slate-50 text-slate-700 border-slate-200';
                  }
                };

                const toggleStatus = (current: PersonalMember['estado']): PersonalMember['estado'] => {
                  if (current === 'Activo') return 'Vacaciones';
                  if (current === 'Vacaciones') return 'Permiso';
                  return 'Activo';
                };

                return (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Colaborador */}
                    <td className="py-4 px-6 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-100 text-[#00256F] flex items-center justify-center font-bold text-xs">
                          {p.avatar || `${p.nombre[0]}${p.apellido[0]}`.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{p.nombre} {p.apellido}</p>
                          <p className="text-[11px] text-slate-400 font-mono">{p.cedula} · {p.telefono}</p>
                        </div>
                      </div>
                    </td>

                    {/* Cargo / Área */}
                    <td className="py-4 px-6 whitespace-nowrap">
                      <p className="font-semibold text-slate-700">{p.cargo}</p>
                      <span className="inline-block mt-0.5 px-2 py-0.2 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                        {p.area}
                      </span>
                    </td>

                    {/* Tipo */}
                    <td className="py-4 px-6 whitespace-nowrap">
                      <span className="text-slate-600 font-medium">{p.tipo_personal || 'Fijo'}</span>
                    </td>

                    {/* Usuario & Rol (Paso 2) */}
                    <td className="py-4 px-6 whitespace-nowrap">
                      {p.usuario ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-slate-900 font-bold text-[11px]">
                              @{p.usuario.nombre_usuario}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              p.usuario.rol_nombre === 'Administrador'
                                ? 'bg-blue-50 text-[#00256F] border-blue-200'
                                : p.usuario.rol_nombre === 'Editor'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-purple-50 text-purple-800 border-purple-200'
                            }`}>
                              {p.usuario.rol_nombre || 'Editor'}
                            </span>
                          </div>

                          {/* RBAC: Solo Admin puede editar credenciales */}
                          {isAdmin && (
                            <button
                              onClick={() => handleOpenUserModal(p)}
                              className="text-[11px] text-[#00256F] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[14px]">edit_note</span>
                              <span>Modificar Credenciales</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        <div>
                          {p.estado === 'Activo' ? (
                            isAdmin ? (
                              <button
                                onClick={() => handleOpenUserModal(p)}
                                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#00256F] border border-blue-200 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                              >
                                <span className="material-symbols-outlined text-[16px]">key</span>
                                <span>Asignar Usuario (Paso 2)</span>
                              </button>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">Sin usuario asignado</span>
                            )
                          ) : (
                            <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[10px] font-medium border border-amber-200">
                              Inactivo para acceso
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Estado */}
                    <td className="py-4 px-6 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getStatusPill(p.estado)}`}>
                        {p.estado}
                      </span>
                    </td>

                    {/* Acciones (Solo Admin) */}
                    {isAdmin && (
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              const nextSt = toggleStatus(p.estado);
                              onUpdatePersonal({ ...p, estado: nextSt });
                            }}
                            className="px-2 py-1 text-[11px] font-semibold text-slate-600 hover:text-[#00256F] hover:bg-slate-100 rounded-lg border border-slate-200 transition cursor-pointer"
                            title="Alternar estado"
                          >
                            Estado
                          </button>

                          <button
                            onClick={() => setMemberToDelete(p)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="Eliminar colaborador"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Paso 1: Registrar Personal */}
      <NuevoPersonalModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={onAddPersonal}
      />

      {/* Modal Paso 2 & 3: Asignar o Modificar Credenciales */}
      <AsignarUsuarioModal
        isOpen={isUserModalOpen}
        onClose={() => {
          setIsUserModalOpen(false);
          setSelectedMemberForUser(null);
        }}
        personal={selectedMemberForUser}
        onSuccess={handleUserModalSuccess}
      />

      {/* Modal Confirmar Eliminación (Solo Admin) */}
      {memberToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <span className="material-symbols-outlined text-[24px]">warning</span>
            </div>
            <h3 className="font-bold text-slate-900 text-center text-base font-display">
              ¿Eliminar a {memberToDelete.nombre} {memberToDelete.apellido}?
            </h3>
            <p className="text-xs text-slate-500 text-center mt-1">
              Esta acción invocará <code>DELETE /personal/{memberToDelete.id}</code> y retirará su ficha y credenciales asociadas.
            </p>
            <div className="mt-5 flex gap-2.5">
              <button
                onClick={() => setMemberToDelete(null)}
                className="flex-1 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl cursor-pointer"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
