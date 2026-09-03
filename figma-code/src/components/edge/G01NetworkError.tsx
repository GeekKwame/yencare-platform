import React from 'react';
import { useClinic } from '../../context/ClinicContext';
import { Button } from '../common/Button';

export const G01NetworkError: React.FC = () => {
  const { setIsOffline, setPatientScreen } = useClinic();

  const handleRetry = () => {
    setIsOffline(false);
  };

  const handleReturnHome = () => {
    setIsOffline(false);
    setPatientScreen('P01_HOME');
  };

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center py-8 md:py-14 px-4">
      <div className="w-full max-w-[560px] bg-white border border-[#D8DCD9] shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-6 md:p-8 text-center">
        <div className="w-14 h-14 bg-[#FDF2F2] border border-[#F8B4B4] rounded-full mx-auto flex items-center justify-center text-[#C53030] mb-5">
          <span className="material-symbols-outlined text-3xl">wifi_off</span>
        </div>

        <span className="inline-block px-2.5 py-0.5 bg-[#FDF2F2] text-[#C53030] border border-[#F8B4B4] text-[11px] font-semibold uppercase tracking-wider mb-2.5">
          Connectivity Lost
        </span>

        <h1 className="text-2xl font-bold tracking-tight text-[#111111] mb-2">
          Network Connection Lost
        </h1>
        <p className="text-sm text-[#66706B] font-normal mb-6 leading-relaxed max-w-md mx-auto">
          We are unable to reach the YɛnCare clinic servers. Please check your mobile data or Wi-Fi connection and try again.
        </p>

        <div className="bg-[#F0F2F1] border border-[#D8DCD9] p-3.5 mb-6 text-left text-xs text-[#66706B] leading-relaxed">
          <strong className="text-[#111111] font-semibold">Note:</strong> Your appointment reference (YC-4821) and session state have been safely cached.
        </div>

        <div className="space-y-2.5">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            icon="refresh"
            onClick={handleRetry}
          >
            Try again
          </Button>

          <Button
            variant="secondary"
            size="md"
            fullWidth
            onClick={handleReturnHome}
          >
            Return to Home
          </Button>
        </div>
      </div>
    </div>
  );
};
