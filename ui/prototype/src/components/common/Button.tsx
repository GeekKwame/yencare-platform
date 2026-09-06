import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'destructive' | 'outline' | 'tertiary';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  icon?: string;
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  icon,
  loading = false,
  disabled,
  className = '',
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium transition-all duration-150 select-none disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer focus:outline-none';

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs font-semibold gap-1.5 min-h-[34px]',
    md: 'px-4 py-2.5 text-sm font-semibold gap-2 min-h-[42px]',
    lg: 'px-6 py-3.5 text-sm md:text-base font-semibold gap-2.5 min-h-[48px]',
  };

  const variantStyles = {
    primary:
      'bg-[#111111] text-white border border-[#111111] hover:bg-[#262626] active:bg-black shadow-[0_1px_2px_rgba(0,0,0,0.08)] focus-visible:ring-2 focus-visible:ring-[#087F6C] focus-visible:ring-offset-2',
    secondary:
      'bg-white text-[#111111] border border-[#D8DCD9] hover:bg-[#F0F2F1] hover:border-[#B5BBB7] active:bg-[#E5E8E6] shadow-[0_1px_2px_rgba(0,0,0,0.04)] focus-visible:ring-2 focus-visible:ring-[#087F6C] focus-visible:ring-offset-2',
    accent:
      'bg-[#087F6C] text-white border border-[#087F6C] hover:bg-[#066A5A] active:bg-[#05584A] shadow-[0_1px_2px_rgba(8,127,108,0.2)] focus-visible:ring-2 focus-visible:ring-[#087F6C] focus-visible:ring-offset-2',
    destructive:
      'bg-white text-[#C53030] border border-[#E5C4C4] hover:bg-[#FDF2F2] hover:border-[#C53030] active:bg-[#FCE8E8] focus-visible:ring-2 focus-visible:ring-[#C53030] focus-visible:ring-offset-2',
    outline:
      'bg-transparent text-[#111111] border border-[#D8DCD9] hover:bg-[#F0F2F1] hover:border-[#111111] focus-visible:ring-2 focus-visible:ring-[#087F6C]',
    tertiary:
      'bg-transparent text-[#111111] hover:text-[#087F6C] hover:underline underline-offset-4 border-0 p-0 shadow-none min-h-0',
  };

  const widthStyle = fullWidth ? 'w-full' : '';

  return (
    <button
      disabled={disabled || loading}
      className={`${baseStyles} ${variant === 'tertiary' ? '' : sizeStyles[size]} ${variantStyles[variant]} ${widthStyle} ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent animate-spin mr-1"></span>
          <span>Please wait...</span>
        </>
      ) : (
        <>
          {icon && (
            <span className="material-symbols-outlined text-[18px] leading-none shrink-0" aria-hidden="true">
              {icon}
            </span>
          )}
          <span>{children}</span>
        </>
      )}
    </button>
  );
};
