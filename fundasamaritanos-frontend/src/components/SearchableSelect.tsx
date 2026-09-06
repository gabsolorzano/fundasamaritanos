import React, { useState, useRef, useEffect, useMemo } from 'react';

export interface OptionItem {
  value: any;
  label: string;
}

interface SearchableSelectProps {
  options: OptionItem[];
  value: any;
  onChange: (value: any) => void;
  placeholder?: string;
  actionButton?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Buscar o seleccionar...',
  actionButton,
  disabled = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Selected option label
  const selectedOption = useMemo(() => {
    return options.find((opt) => String(opt.value) === String(value));
  }, [options, value]);

  // Filtered options based on search query
  const filteredOptions = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return options;
    return options.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [options, searchTerm]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (val: any) => {
    onChange(val);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Trigger button / display box */}
      <div
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            if (!isOpen) setSearchTerm('');
          }
        }}
        className={`w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center justify-between gap-2 transition cursor-pointer select-none ${
          disabled ? 'opacity-50 cursor-not-allowed bg-slate-100' : 'hover:border-slate-300 focus-within:ring-2 focus-within:ring-[#00256F]'
        } ${isOpen ? 'ring-2 ring-[#00256F] bg-white border-transparent' : ''}`}
      >
        <div className="flex-1 truncate">
          {selectedOption ? (
            <span className="font-semibold text-slate-800">{selectedOption.label}</span>
          ) : (
            <span className="text-slate-400">{placeholder}</span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 text-slate-400">
          {selectedOption && !disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange(undefined);
              }}
              className="hover:text-slate-600 p-0.5"
              title="Limpiar selección"
            >
              <span className="material-symbols-outlined text-[14px]">close</span>
            </button>
          )}
          <span className="material-symbols-outlined text-[18px]">
            {isOpen ? 'expand_less' : 'expand_more'}
          </span>
        </div>
      </div>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in duration-150">
          {/* Search input inside dropdown */}
          <div className="relative mb-2">
            <span className="material-symbols-outlined absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400 text-[16px] pointer-events-none">
              search
            </span>
            <input
              type="text"
              autoFocus
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Escribe para filtrar opciones..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-1 focus:ring-[#00256F]"
            />
          </div>

          {/* Options list */}
          <div className="max-h-52 overflow-y-auto space-y-0.5 text-xs">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <div
                    key={String(opt.value)}
                    onClick={() => handleSelect(opt.value)}
                    className={`px-3 py-2 rounded-lg cursor-pointer transition flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-blue-50 text-[#00256F] font-bold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && (
                      <span className="material-symbols-outlined text-[16px] text-[#00256F] shrink-0">
                        check
                      </span>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-3 text-center text-slate-400 text-xs">
                No se encontraron coincidencias para "{searchTerm}".
              </div>
            )}
          </div>

          {/* Action button at bottom if provided */}
          {actionButton && (
            <div className="pt-2 mt-1 border-t border-slate-100 flex justify-end">
              {actionButton}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
