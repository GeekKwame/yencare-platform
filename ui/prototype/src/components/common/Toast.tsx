import React from 'react';

interface ToastProps {
  message: string | null;
  onClose?: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, onClose }) => {
  if (!message) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-md w-[90%] md:w-auto transition-all animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="bg-[#111111] text-white px-4 py-3 border border-[#333333] shadow-xl flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 text-xs font-medium tracking-wide">
          <span className="w-2 h-2 rounded-full bg-[#087F6C] shrink-0"></span>
          <span>{message}</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-[#8A948F] hover:text-white p-1 cursor-pointer"
            aria-label="Close notification"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        )}
      </div>
    </div>
  );
};
