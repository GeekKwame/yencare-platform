import React from 'react';
import lockupSrc from '../../assets/yencare-logo.png';
import markSrc from '../../assets/yencare-mark.png';

type YenCareLogoProps = {
  variant?: 'nav' | 'hero' | 'auth' | 'sidebar';
  className?: string;
};

const LOCKUP: Record<'hero' | 'auth' | 'sidebar', string> = {
  hero: 'h-[7.5rem] sm:h-36 w-auto max-w-[260px]',
  auth: 'h-[5.5rem] w-auto max-w-[200px]',
  sidebar: 'h-[5.75rem] w-auto max-w-[176px]',
};

export const YenCareLogo: React.FC<YenCareLogoProps> = ({ variant = 'nav', className = '' }) => {
  if (variant === 'nav') {
    return (
      <span
        className={`inline-flex items-center gap-2 ${className}`}
        role="img"
        aria-label="YɛnCare"
      >
        <img src={markSrc} alt="" className="h-8 w-8 object-contain object-center select-none" />
        <span className="text-[1.125rem] font-bold tracking-tight leading-none" aria-hidden="true">
          <span className="text-[#005090]">Yɛn</span>
          <span className="text-[#00B0A0]">Care</span>
        </span>
      </span>
    );
  }

  return (
    <img
      src={lockupSrc}
      alt="YɛnCare — Your Care. Your Time."
      className={`${LOCKUP[variant]} object-contain object-center select-none ${className}`}
    />
  );
};
