import React, { useState } from 'react';
import { useClinic } from '../../context/ClinicContext';

export const PatientHeader: React.FC = () => {
  const { patientScreen, setPatientScreen, setActiveShell, setStaffScreen } = useClinic();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: 'Book appointment', screen: 'P02_DETAILS' as const, matchPrefix: ['P02', 'P03', 'P04', 'P05', 'P06', 'P07', 'P08'] },
    { label: 'Find appointment', screen: 'P09_FIND' as const, matchPrefix: ['P09', 'P10', 'P11', 'P12', 'P13', 'P14', 'P15', 'P16', 'P17'] },
    { label: 'Queue status', screen: 'P18_QUEUE' as const, matchPrefix: ['P18'] },
  ];

  return (
    <header className="bg-white border-b border-[#D8DCD9] sticky top-0 z-40 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
        {/* Brand Logo & Clinic Info */}
        <button
          onClick={() => setPatientScreen('P01_HOME')}
          className="flex items-center gap-2.5 text-left cursor-pointer group focus:outline-none"
        >
          <div className="w-8 h-8 bg-[#111111] text-white flex items-center justify-center font-bold text-base border border-[#111111] group-hover:bg-[#087F6C] group-hover:border-[#087F6C] transition-colors">
            Y
          </div>
          <div>
            <div className="text-lg font-bold tracking-tight text-[#111111] flex items-center gap-1.5 leading-tight">
              <span>YɛnCare</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#087F6C]"></span>
            </div>
            <span className="text-[10px] font-semibold text-[#66706B] uppercase tracking-wider block">
              [Partner clinic]
            </span>
          </div>
        </button>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center space-x-1 text-xs font-semibold tracking-wide">
          {navItems.map((item) => {
            const isActive =
              patientScreen === item.screen ||
              item.matchPrefix.some((prefix) => patientScreen.startsWith(prefix));

            return (
              <button
                key={item.screen}
                onClick={() => setPatientScreen(item.screen)}
                className={`px-3 py-2 border-b-2 transition-all cursor-pointer ${
                  isActive
                    ? 'border-[#087F6C] text-[#087F6C] font-bold bg-[#E7F5F1]/40'
                    : 'border-transparent text-[#66706B] hover:text-[#111111] hover:bg-[#F0F2F1]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right Action: Staff Portal link */}
        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={() => {
              setActiveShell('STAFF');
              setStaffScreen('S02_TODAY');
            }}
            className="px-3 py-1.5 text-xs font-semibold text-[#333333] hover:text-[#111111] border border-[#D8DCD9] hover:border-[#111111] hover:bg-[#F0F2F1] transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span>Staff Portal</span>
            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </button>
        </div>

        {/* Mobile menu trigger */}
        <div className="md:hidden flex items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 border border-[#D8DCD9] text-[#111111] hover:bg-[#F0F2F1] cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            <span className="material-symbols-outlined text-[20px]">
              {mobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#D8DCD9] bg-white p-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.screen}
              onClick={() => {
                setPatientScreen(item.screen);
                setMobileMenuOpen(false);
              }}
              className="w-full text-left p-3 font-semibold text-xs border border-[#D8DCD9] hover:border-[#087F6C] hover:bg-[#E7F5F1]/30 block text-[#111111]"
            >
              {item.label}
            </button>
          ))}
          <div className="pt-2 border-t border-[#E5E7E6]">
            <button
              onClick={() => {
                setActiveShell('STAFF');
                setStaffScreen('S02_TODAY');
                setMobileMenuOpen(false);
              }}
              className="w-full text-left p-3 font-semibold text-xs bg-[#F0F2F1] border border-[#D8DCD9] text-[#111111] flex items-center justify-between"
            >
              <span>Staff Portal</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
