import React from 'react';
import { useClinic } from '../../context/ClinicContext';

export const PatientHeader: React.FC = () => {
  const { setPatientScreen, setActiveShell } = useClinic();

  return (
    <header className="bg-white border-b border-[#D8DCD9] px-4 py-3 flex items-center justify-between sticky top-0 z-20">
      <button
        onClick={() => setPatientScreen('P01_HOME')}
        className="flex items-center gap-2.5 cursor-pointer"
      >
        <div className="w-7 h-7 bg-[#111111] text-white flex items-center justify-center font-bold text-xs">
          Y
        </div>
        <div className="leading-tight">
          <span className="font-bold text-sm tracking-tight text-[#111111]">YɛnCare</span>
          <span className="text-[10px] font-semibold text-[#66706B] uppercase ml-1.5 tracking-wide">
            KNUST Students' Clinic
          </span>
        </div>
      </button>

      <button
        onClick={() => setActiveShell('STAFF')}
        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#66706B] hover:text-[#111111] px-2 py-1.5 border border-[#D8DCD9] hover:border-[#111111] transition-colors cursor-pointer"
      >
        <span className="material-symbols-outlined text-[14px]">admin_panel_settings</span>
        <span>Staff</span>
      </button>
    </header>
  );
};
