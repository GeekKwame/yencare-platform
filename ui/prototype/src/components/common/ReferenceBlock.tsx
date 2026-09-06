import React, { useState } from 'react';

interface ReferenceBlockProps {
  code: string;
  subtext?: string;
  size?: 'lg' | 'xl';
}

export const ReferenceBlock: React.FC<ReferenceBlockProps> = ({ 
  code, 
  subtext = 'Show this reference code when you arrive at the reception desk',
  size = 'xl' 
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full bg-[#F0F2F1] border border-[#D8DCD9] p-5 md:p-6 text-center my-4">
      <div className="text-[11px] font-semibold uppercase tracking-widest text-[#66706B] mb-2 flex items-center justify-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-[#087F6C]"></span>
        <span>Appointment Reference Code</span>
      </div>
      <div className="flex items-center justify-center gap-3">
        <span
          className={`font-reference text-[#111111] select-all tracking-wider ${
            size === 'xl' ? 'text-3xl md:text-4xl' : 'text-2xl'
          }`}
        >
          {code}
        </span>
        <button
          onClick={handleCopy}
          className="p-2 bg-white border border-[#D8DCD9] hover:border-[#111111] hover:bg-[#F7F8F7] transition-all text-[#111111] active:scale-95 cursor-pointer"
          title="Copy reference code"
          aria-label="Copy reference code"
        >
          <span className="material-symbols-outlined text-[18px]">
            {copied ? 'check' : 'content_copy'}
          </span>
        </button>
      </div>
      {subtext && (
        <p className="text-xs text-[#66706B] font-normal mt-2.5 max-w-sm mx-auto">
          {subtext}
        </p>
      )}
    </div>
  );
};
