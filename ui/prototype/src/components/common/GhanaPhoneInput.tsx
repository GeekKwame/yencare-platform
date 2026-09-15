import React from 'react';

interface GhanaPhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  error?: string;
  required?: boolean;
  helpText?: string;
}

export const GhanaPhoneInput: React.FC<GhanaPhoneInputProps> = ({
  value,
  onChange,
  label = 'Ghana Phone Number',
  error,
  required = true,
  helpText = 'We will send your confirmation and reminder via SMS',
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
  };

  return (
    <div className="w-full text-left space-y-1.5">
      <label className="block text-xs font-semibold text-[#111111]">
        {label} {required && <span className="text-[#C53030]">*</span>}
      </label>
      <div
        className={`flex items-stretch border transition-all ${
          error
            ? 'border-[#C53030] bg-[#FDF2F2]'
            : 'border-[#C8CDCA] bg-white focus-within:border-[#087F6C] focus-within:ring-1 focus-within:ring-[#087F6C]'
        }`}
      >
        <div className="bg-[#F0F2F1] px-3.5 py-2.5 border-r border-[#D8DCD9] flex items-center gap-1.5 text-xs font-semibold text-[#111111] select-none shrink-0">
          <span className="text-sm">🇬🇭</span>
          <span>+233</span>
        </div>
        <input
          type="tel"
          value={value}
          onChange={handleChange}
          placeholder="024 123 4567"
          className="w-full px-3.5 py-2.5 text-sm font-normal text-[#111111] placeholder-[#8A948F] bg-transparent focus:outline-none"
        />
      </div>
      {error ? (
        <p className="text-xs font-medium text-[#C53030] flex items-center gap-1 pt-0.5">
          <span className="material-symbols-outlined text-[14px]">error</span>
          <span>{error}</span>
        </p>
      ) : helpText ? (
        <p className="text-[12px] font-normal text-[#66706B]">
          {helpText}
        </p>
      ) : null}
    </div>
  );
};
