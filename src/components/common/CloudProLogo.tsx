import React from 'react';

interface CloudProLogoProps {
  variant?: 'full' | 'icon' | 'compact';
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  subtitleText?: string;
  cloudTextColor?: string; // Khusus kustomisasi warna teks 'Cloud'
  brandPrefix?: string; // Opsional awalan merk (misal: 'Platform')
  brandSuffix?: string; // Opsional akhiran merk (misal: 'Enterprise')
}

export const CloudProLogo: React.FC<CloudProLogoProps> = ({
  variant = 'full',
  className = '',
  size = 'md',
  showSubtitle = true,
  subtitleText,
  cloudTextColor,
  brandPrefix,
  brandSuffix,
}) => {
  const gradId = React.useId().replace(/:/g, '');
  const iconPixelSizes = {
    sm: 'w-7 h-7 min-w-7 max-w-7 min-h-7 max-h-7',
    md: 'w-9 h-9 min-w-9 max-w-9 min-h-9 max-h-9',
    lg: 'w-11 h-11 min-w-11 max-w-11 min-h-11 max-h-11',
    xl: 'w-14 h-14 min-w-14 max-w-14 min-h-14 max-h-14',
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl',
  };

  const subSizes = {
    sm: 'text-[7.5px] sm:text-[8px] tracking-[0.08em] sm:tracking-[0.16em]',
    md: 'text-[8px] sm:text-[9.5px] tracking-[0.06em] sm:tracking-[0.18em]',
    lg: 'text-[9.5px] sm:text-[11px] tracking-[0.12em] sm:tracking-[0.22em]',
    xl: 'text-xs tracking-[0.25em]',
  };

  return (
    <div className={`inline-flex items-center gap-2 sm:gap-2.5 select-none min-w-0 max-w-full ${className}`}>
      {/* Cloud PRO Custom Vector Emblem */}
      <div 
        className={`relative shrink-0 ${iconPixelSizes[size]} transition-transform duration-200 group-hover:scale-105 overflow-hidden flex items-center justify-center`}
        style={{
          width: size === 'sm' ? 28 : size === 'md' ? 34 : size === 'lg' ? 44 : 56,
          height: size === 'sm' ? 28 : size === 'md' ? 34 : size === 'lg' ? 44 : 56,
        }}
      >
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: '100%', height: '100%', display: 'block' }}
        >
          <defs>
            <linearGradient id={`cloudGrad_${gradId}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0066cc" />
              <stop offset="100%" stopColor="#003e82" />
            </linearGradient>
          </defs>
          <path
            d="M 28 80 C 16 80 8 71 8 60 C 8 50 15 42 24 40 C 26 26 38 16 52 16 C 65 16 75 23 79 34 C 89 35 98 44 98 55 C 98 67 89 77 78 79 C 75 80 32 80 28 80 Z"
            fill={`url(#cloudGrad_${gradId})`}
          />
          <path
            d="M 18 80 C 22 69 28 60 36 57 C 40 55.5 44 55.5 47 57 C 51 59.5 52.5 64.5 51 69 C 49 74 43 76 38 73 C 34.5 71 33 66.5 34.5 62 C 36 55 43 49 52 46 L 74 35"
            stroke="#ffffff"
            strokeWidth="5.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <polygon points="72,25 88,30 78,44 76,38 68,42" fill="#ffffff" />
          <path
            d="M 24 80 C 28 71 34 64 41 61"
            stroke="#ffffff"
            strokeWidth="4.5"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </div>

      {variant !== 'icon' && (
        <div className="flex flex-col leading-none min-w-0">
          <div className={`font-extrabold tracking-tight truncate ${textSizes[size]}`}>
            {brandPrefix && (
              <>
                <span className={cloudTextColor ? cloudTextColor : "text-slate-900 dark:text-white"}>
                  {brandPrefix}
                </span>{' '}
              </>
            )}
            <span className={cloudTextColor ? cloudTextColor : "text-slate-900 dark:text-white"}>
              Cloud
            </span>{' '}
            <span className="text-[#005dbd] dark:text-[#38bdf8]">PRO</span>
            {brandSuffix && (
              <>
                {' '}
                <span className={cloudTextColor ? cloudTextColor : "text-slate-900 dark:text-white"}>
                  {brandSuffix}
                </span>
              </>
            )}
          </div>
          {showSubtitle && (
            <div
              className={`font-bold uppercase text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1 ${subSizes[size]}`}
            >
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-sky-500 shrink-0" />
              <span className="truncate">
                {subtitleText || (variant === 'compact' ? 'ENTERPRISE CLOUD PANEL' : 'ENTERPRISE CLOUD INFRASTRUCTURE')}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
