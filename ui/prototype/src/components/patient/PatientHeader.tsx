import React from 'react';
import { useClinic } from '../../context/ClinicContext';
import { useAccraClock } from '../../lib/accraTime';
import { YenCareLogo } from '../common/YenCareLogo';

export const PatientHeader: React.FC = () => {
  const { setPatientScreen, setActiveShell } = useClinic();
  const { time, isOpen } = useAccraClock();

  return (
    <header className="bg-white border-b border-[#D8DCD9] px-4 py-3 flex items-center justify-between sticky top-0 z-20">
      <button
        onClick={() => setPatientScreen('P01_HOME')}
        className="flex items-center cursor-pointer"
        aria-label="YɛnCare home"
      >
        <YenCareLogo variant="nav" />
      </button>

      <div className="flex items-center gap-2">
        <span className="hidden sm:flex items-center gap-1.5 text-[11px] font-medium text-[#66706B]">
          <span className={`w-1.5 h-1.5 rounded-full ${isOpen ? 'bg-[#087F6C]' : 'bg-[#C53030]'}`}></span>
          <span className={isOpen ? 'text-[#087F6C] font-semibold' : 'text-[#C53030] font-semibold'}>
            {isOpen ? 'Open' : 'Closed'}
          </span>
          <span className="font-mono tabular-nums text-[#66706B]">{time} Accra</span>
        </span>
        <button
          onClick={() => setActiveShell('STAFF')}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#66706B] hover:text-[#111111] px-2 py-1.5 border border-[#D8DCD9] hover:border-[#111111] transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[14px]">admin_panel_settings</span>
          <span>Staff</span>
        </button>
      </div>
    </header>
  );
};
