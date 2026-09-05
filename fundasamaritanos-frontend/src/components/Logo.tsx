import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'icon-only' | 'white';
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', variant = 'full', className = '' }) => {
  const getDimensions = () => {
    switch (size) {
      case 'sm':
        return { icon: 32, text: 'text-sm' };
      case 'lg':
        return { icon: 48, text: 'text-xl' };
      case 'xl':
        return { icon: 64, text: 'text-2xl' };
      case 'md':
      default:
        return { icon: 40, text: 'text-base' };
    }
  };

  const { icon, text } = getDimensions();

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div 
        className="relative flex items-center justify-center rounded-full bg-[#00256F] text-white shadow-sm flex-shrink-0"
        style={{ width: icon, height: icon }}
      >
        <svg 
          viewBox="0 0 48 48" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg" 
          className="w-3/5 h-3/5 text-white"
        >
          {/* Stylized caring hands embracing heart */}
          <path 
            d="M24 10C21.5 5 15 5 12 9C9 13 11 19 24 28C37 19 39 13 36 9C33 5 26.5 5 24 10Z" 
            fill="#F4B8C0" 
          />
          <path 
            d="M10 24C10 24 14 27 18 29C21 30.5 24 33 24 35C24 38 18 39 14 36C11 34 8 29 10 24Z" 
            fill="#FFFFFF" 
            fillOpacity="0.9"
          />
          <path 
            d="M38 24C38 24 34 27 30 29C27 30.5 24 33 24 35C24 38 30 39 34 36C37 34 40 29 38 24Z" 
            fill="#FFFFFF" 
            fillOpacity="0.9"
          />
          <circle cx="24" cy="17" r="4" fill="#00256F" />
        </svg>
      </div>

      {variant !== 'icon-only' && (
        <div className="flex flex-col">
          <span className={`font-bold tracking-tight text-[#00256F] font-display ${text}`}>
            Fundasamaritanos
          </span>
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            Gestión Administrativa
          </span>
        </div>
      )}
    </div>
  );
};
