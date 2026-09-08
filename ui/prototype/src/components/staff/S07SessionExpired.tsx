import React from 'react';
import { useClinic } from '../../context/ClinicContext';
import { Button } from '../common/Button';

export const S07SessionExpired: React.FC = () => {
  const { setStaffScreen, setIsSessionExpired } = useClinic();

  const handleSignInAgain = () => {
    setIsSessionExpired(false);
    setStaffScreen('S01_SIGN_IN');
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-[460px] bg-white border border-[#D8DCD9] shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-6 md:p-8 text-center">
        <div className="w-14 h-14 bg-[#F7F8F7] border border-[#D8DCD9] rounded-full mx-auto flex items-center justify-center mb-5 text-[#66706B]">
          <span className="material-symbols-outlined text-3xl">
            lock_clock
          </span>
        </div>

        <span className="inline-block px-2.5 py-0.5 bg-[#F0F2F1] text-[#66706B] border border-[#D8DCD9] text-[11px] font-semibold uppercase tracking-wider mb-2.5">
          Security Timeout
        </span>

        <h1 className="text-2xl font-bold tracking-tight text-[#111111] mb-2">
          Session Expired
        </h1>
        <p className="text-sm text-[#66706B] font-normal mb-8 leading-relaxed max-w-sm mx-auto">
          For clinical confidentiality and data security at KNUST Students' Clinic, your YɛnCare workstation session has timed out. Please authenticate again to continue.
        </p>

        <div>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleSignInAgain}
            icon="login"
          >
            Sign in again
          </Button>
        </div>
      </div>
    </div>
  );
};
