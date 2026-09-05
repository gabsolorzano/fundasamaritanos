import React, { useState, useMemo, useEffect } from 'react';
import { Beneficiaria, ViewMode, BeneficiariaStatus } from '../types';
import { useAuth } from '../context/AuthContext';

interface BeneficiariasViewProps {
  beneficiarias: Beneficiaria[];
  onNavigate: (view: ViewMode) => void;
  onSelectBeneficiaria: (beneficiaria: Beneficiaria) => void;
  onDeleteBeneficiaria?: (id: string) => void;
}

export const BeneficiariasView: React.FC<BeneficiariasViewProps> = ({
  beneficiarias,
  onNavigate,
  onSelectBeneficiaria,
  onDeleteBeneficiaria
}) => {
  const { isAdmin, isLector, role } = useAuth();

  // Search and debounce (350ms)
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState<'Todos' | BeneficiariaStatus>('Todos');
  const [gradoFilter, setGradoFilter] = useState<string>('Todos');
  const [institucionFilter, setInstitucionFilter] = useState<string>('Todas');
  const [edadRange, setEdadRange] = useState<'Todas' | '0-5' | '6-10' | '11-14' | '15+'>('Todas');
  const [showFiltersPopover, setShowFiltersPopover] = useState(false);

  // Pagination & Sorting (API Standard params: skip, limit, order_by, order_dir)
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(8);
  const [orderBy, setOrderBy] = useState<'expCode' | 'nombres' | 'edad' | 'estado'>('expCode');
  const [orderDir, setOrderDir] = useState<'asc' | 'desc'>('asc');

  const [beneficiariaToDelete, setBeneficiariaToDelete] = useState<Beneficiaria | null>(null);

  // Debounce effect (350ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Unique institutions for filter dropdown
  const uniqueInstitutions = useMemo(() => {
    const insts = new Set<string>();
    beneficiarias.forEach((b) => {
      if (b.institucionEducativa && b.institucionEducativa.trim()) {
        insts.add(b.institucionEducativa.trim());
      }
    });
    return Array.from(insts);
  }, [beneficiarias]);

  // Unique grados
  const uniqueGrados = useMemo(() => {
    const gr = new Set<string>();
    beneficiarias.forEach((b) => {
      if (b.grado && b.grado.trim()) gr.add(b.grado.trim());
    });
    return Array.from(gr);
  }, [beneficiarias]);

  // Filtered & Sorted list
  const filteredBeneficiarias = useMemo(() => {
    return beneficiarias
      .filter((item) => {
        // Debounced text matching nombre, apellido, codigo_expediente, institucion, representante
        const s = debouncedSearch.toLowerCase().trim();
        const matchesSearch =
          !s ||
          item.nombres.toLowerCase().includes(s) ||
          item.apellidos.toLowerCase().includes(s) ||
          item.expCode.toLowerCase().includes(s) ||
          (item.institucionEducativa && item.institucionEducativa.toLowerCase().includes(s)) ||
          item.representantePrincipal.toLowerCase().includes(s) ||
          item.cedula.toLowerCase().includes(s);

        // Status filter
        const matchesStatus = statusFilter === 'Todos' || item.estado === statusFilter;

        // Grado filter
        const matchesGrado = gradoFilter === 'Todos' || item.grado === gradoFilter;

        // Institucion filter
        const matchesInstitucion = institucionFilter === 'Todas' || item.institucionEducativa === institucionFilter;

        // Age filter
        let matchesAge = true;
        if (edadRange === '0-5') matchesAge = item.edad <= 5;
        else if (edadRange === '6-10') matchesAge = item.edad >= 6 && item.edad <= 10;
        else if (edadRange === '11-14') matchesAge = item.edad >= 11 && item.edad <= 14;
        else if (edadRange === '15+') matchesAge = item.edad >= 15;

        return matchesSearch && matchesStatus && matchesGrado && matchesInstitucion && matchesAge;
      })
      .sort((a, b) => {
        let valA: any = a[orderBy];
        let valB: any = b[orderBy];

        if (typeof valA === 'string') {
          valA = valA.toLowerCase();
          valB = valB.toLowerCase();
        }

        if (valA < valB) return orderDir === 'asc' ? -1 : 1;
        if (valA > valB) return orderDir === 'asc' ? 1 : -1;
        return 0;
      });
  }, [
    beneficiarias,
    debouncedSearch,
    statusFilter,
    gradoFilter,
    institucionFilter,
    edadRange,
    orderBy,
    orderDir
  ]);

  const totalItems = filteredBeneficiarias.length;
  const totalPages = Math.ceil(totalItems / limit) || 1;
  const skip = (currentPage - 1) * limit;
  const paginatedItems = filteredBeneficiarias.slice(skip, skip + limit);

  const toggleSort = (field: 'expCode' | 'nombres' | 'edad' | 'estado') => {
    if (orderBy === field) {
      setOrderDir(orderDir === 'asc' ? 'desc' : 'asc');
    } else {
      setOrderBy(field);
      setOrderDir('asc');
    }
  };

  const getStatusBadge = (status: BeneficiariaStatus) => {
    switch (status) {
      case 'Activa':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Trasladada':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Egresada':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  const handleDeleteConfirm = () => {
    if (beneficiariaToDelete && onDeleteBeneficiaria) {
      onDeleteBeneficiaria(beneficiariaToDelete.id);
      setBeneficiariaToDelete(null);
    }
  };

  const activeFiltersCount =
    (statusFilter !== 'Todos' ? 1 : 0) +
    (gradoFilter !== 'Todos' ? 1 : 0) +
    (institucionFilter !== 'Todas' ? 1 : 0) +
    (edadRange !== 'Todas' ? 1 : 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Header section with Title & "+ Nuevo Expediente" */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#00256F] font-display">
              Beneficiarias y Expedientes
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-50 text-[#00256F] border border-blue-200">
              GET /beneficiarias/
            </span>
          </div>
          <p className="text-sm text-slate-500 font-medium">
            Listado reactivo con debounce de búsqueda, ordenamiento dinámico y control de acceso según rol.
          </p>
        </div>

        {/* RBAC: Solo Administrador y Editor pueden crear nuevo expediente */}
        {!isLector ? (
          <button
            id="btn-nuevo-expediente"
            onClick={() => onNavigate('nuevo-expediente')}
            className="px-5 py-3 bg-[#00256F] hover:bg-[#132E70] active:bg-[#00174C] text-white font-semibold text-sm rounded-xl shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer self-start sm:self-auto"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            <span>Nuevo Expediente</span>
          </button>
        ) : (
          <div className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-200 self-start sm:self-auto">
            <span className="material-symbols-outlined text-[16px] text-slate-500">visibility</span>
            <span>Modo Lectura ({role})</span>
          </div>
        )}
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        {/* Search input with debounce */}
        <div className="relative flex-1 w-full">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <span className="material-symbols-outlined text-[20px]">search</span>
          </div>
          <input
            id="search-beneficiarias"
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por nombre, código EXP, institución o representante (debounce 350ms)..."
            className="w-full pl-11 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#00256F] focus:border-[#00256F] transition outline-none"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">cancel</span>
            </button>
          )}
        </div>

        {/* Filter dropdown button & popover */}
        <div className="relative w-full sm:w-auto">
          <button
            onClick={() => setShowFiltersPopover(!showFiltersPopover)}
            className={`w-full sm:w-auto px-4 py-2.5 border rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2 cursor-pointer ${
              activeFiltersCount > 0
                ? 'bg-blue-50 border-blue-300 text-[#00256F]'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">tune</span>
            <span>Filtros Avanzados</span>
            {activeFiltersCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-[#00256F] text-white text-[10px] flex items-center justify-center font-bold">
                {activeFiltersCount}
              </span>
            )}
            <span className="material-symbols-outlined text-[18px]">expand_more</span>
          </button>

          {showFiltersPopover && (
            <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 z-40 animate-in fade-in space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Filtros de Búsqueda
                </span>
                {activeFiltersCount > 0 && (
                  <button
                    onClick={() => {
                      setStatusFilter('Todos');
                      setGradoFilter('Todos');
                      setInstitucionFilter('Todas');
                      setEdadRange('Todas');
                    }}
                    className="text-[11px] font-semibold text-[#00256F] hover:underline"
                  >
                    Restablecer
                  </button>
                )}
              </div>

              {/* Filter: Estado */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Estado
                </label>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  {(['Todos', 'Activa', 'Trasladada', 'Egresada'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      className={`px-2.5 py-1.5 rounded-lg font-medium text-left text-xs transition ${
                        statusFilter === st
                          ? 'bg-[#00256F] text-white font-bold'
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filter: Rango Etario */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Rango de Edad
                </label>
                <select
                  value={edadRange}
                  onChange={(e) => setEdadRange(e.target.value as any)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none"
                >
                  <option value="Todas">Todas las edades</option>
                  <option value="0-5">0 a 5 años (Infancia)</option>
                  <option value="6-10">6 a 10 años (Primaria)</option>
                  <option value="11-14">11 a 14 años (Preadolescencia)</option>
                  <option value="15+">15+ años (Adolescencia/Egreso)</option>
                </select>
              </div>

              {/* Filter: Institución */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Institución Educativa
                </label>
                <select
                  value={institucionFilter}
                  onChange={(e) => setInstitucionFilter(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none truncate"
                >
                  <option value="Todas">Todas las instituciones</option>
                  {uniqueInstitutions.map((inst) => (
                    <option key={inst} value={inst}>
                      {inst}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter: Grado */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Grado Escolar
                </label>
                <select
                  value={gradoFilter}
                  onChange={(e) => setGradoFilter(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none"
                >
                  <option value="Todos">Todos los grados</option>
                  {uniqueGrados.map((gr) => (
                    <option key={gr} value={gr}>
                      {gr}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => setShowFiltersPopover(false)}
                className="w-full py-2 bg-[#00256F] text-white text-xs font-semibold rounded-xl"
              >
                Aplicar Filtros
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 select-none">
                <th
                  onClick={() => toggleSort('expCode')}
                  className="py-4 px-6 cursor-pointer hover:text-[#00256F] transition"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Código EXP</span>
                    <span className="material-symbols-outlined text-[16px]">
                      {orderBy === 'expCode' ? (orderDir === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
                    </span>
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('nombres')}
                  className="py-4 px-6 cursor-pointer hover:text-[#00256F] transition"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Nombres y Apellidos</span>
                    <span className="material-symbols-outlined text-[16px]">
                      {orderBy === 'nombres' ? (orderDir === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
                    </span>
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('edad')}
                  className="py-4 px-6 cursor-pointer hover:text-[#00256F] transition"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Edad (API)</span>
                    <span className="material-symbols-outlined text-[16px]">
                      {orderBy === 'edad' ? (orderDir === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
                    </span>
                  </div>
                </th>
                <th className="py-4 px-6">Representante Principal</th>
                <th className="py-4 px-6">Institución / Grado</th>
                <th
                  onClick={() => toggleSort('estado')}
                  className="py-4 px-6 cursor-pointer hover:text-[#00256F] transition"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Estado</span>
                    <span className="material-symbols-outlined text-[16px]">
                      {orderBy === 'estado' ? (orderDir === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
                    </span>
                  </div>
                </th>
                <th className="py-4 px-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <span className="material-symbols-outlined text-4xl mb-2 text-slate-300">folder_off</span>
                    <p className="font-medium text-sm text-slate-600">No se encontraron expedientes</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Intente ajustar los términos de búsqueda o los filtros aplicados.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedItems.map((ben) => (
                  <tr
                    key={ben.id}
                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                    onClick={() => onSelectBeneficiaria(ben)}
                  >
                    {/* Código EXP */}
                    <td className="py-4 px-6 font-bold text-[#00256F] font-mono whitespace-nowrap">
                      {ben.expCode}
                    </td>

                    {/* Nombres & Avatar */}
                    <td className="py-4 px-6 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[11px] shadow-xs ${
                            ben.avatarBg || 'bg-[#00256F] text-white'
                          }`}
                        >
                          {ben.nombres.charAt(0)}{ben.apellidos.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 group-hover:text-[#00256F] transition-colors">
                            {ben.nombres} {ben.apellidos}
                          </p>
                          {ben.cedula && (
                            <p className="text-[11px] text-slate-400">{ben.cedula}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Edad computada directamente desde la API */}
                    <td className="py-4 px-6 text-slate-700 whitespace-nowrap">
                      <span className="font-bold text-slate-900">{ben.edad}</span> años
                    </td>

                    {/* Representante Principal */}
                    <td className="py-4 px-6 text-slate-700 whitespace-nowrap">
                      {ben.representantePrincipal}
                    </td>

                    {/* Institución / Grado */}
                    <td className="py-4 px-6 text-slate-700 whitespace-nowrap">
                      <p className="font-medium text-slate-800 truncate max-w-[180px]" title={ben.institucionEducativa}>
                        {ben.institucionEducativa || 'Sin asignar'}
                      </p>
                      <p className="text-[11px] text-slate-400">{ben.grado}</p>
                    </td>

                    {/* Estado */}
                    <td className="py-4 px-6 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getStatusBadge(
                          ben.estado
                        )}`}
                      >
                        {ben.estado}
                      </span>
                    </td>

                    {/* Acciones por Rol */}
                    <td className="py-4 px-6 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        {/* Ver / Editar Ficha */}
                        <button
                          onClick={() => onSelectBeneficiaria(ben)}
                          className="p-1.5 text-slate-400 hover:text-[#00256F] hover:bg-blue-50 rounded-lg transition"
                          title={isLector ? 'Ver Ficha (Solo Lectura)' : 'Editar Ficha'}
                        >
                          <span className="material-symbols-outlined text-[20px]">
                            {isLector ? 'visibility' : 'edit_square'}
                          </span>
                        </button>

                        {/* RBAC: Solo Administrador puede eliminar expediente (DELETE /beneficiarias/{id}) */}
                        {isAdmin && (
                          <button
                            onClick={() => setBeneficiariaToDelete(ben)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Eliminar Expediente (DELETE /beneficiarias/{id})"
                          >
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Standard Pagination Footer (skip & limit) */}
        <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <span>
              Mostrando <strong>{totalItems === 0 ? 0 : skip + 1}</strong> a <strong>{Math.min(skip + limit, totalItems)}</strong> de <strong>{totalItems}</strong> beneficiarias
            </span>
            <div className="flex items-center gap-1.5">
              <span>Filas:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs outline-none"
              >
                <option value={5}>5</option>
                <option value={8}>8</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>

            <span className="px-3 font-semibold text-slate-700">
              Página {currentPage} de {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal (Solo Admin) */}
      {beneficiariaToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <span className="material-symbols-outlined text-[24px]">warning</span>
            </div>
            <h3 className="font-bold text-slate-900 text-center text-base font-display">
              ¿Eliminar expediente {beneficiariaToDelete.expCode}?
            </h3>
            <p className="text-xs text-slate-500 text-center mt-1">
              Esta acción invocará <code>DELETE /beneficiarias/{beneficiariaToDelete.id}</code> y retirará a {beneficiariaToDelete.nombres} {beneficiariaToDelete.apellidos} del sistema.
            </p>
            <div className="mt-5 flex gap-2.5">
              <button
                onClick={() => setBeneficiariaToDelete(null)}
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
