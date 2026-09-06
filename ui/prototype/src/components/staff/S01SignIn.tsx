import React, { useState } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { Button } from '../common/Button';
import { StaffRole } from '../../types/clinic';

export const S01SignIn: React.FC = () => {
  const { setStaffScreen, setStaffRole, setActiveShell } = useClinic();
  const [email, setEmail] = useState('abena.osei@yencare.gh');
  const [password, setPassword] = useState('••••••••');
  const [loading, setLoading] = useState(false);

  const handleSignIn = (role: StaffRole = 'Receptionist') => {
    setLoading(true);
    setStaffRole(role);
    setTimeout(() => {
      setLoading(false);
      setStaffScreen('S02_TODAY');
    }, 350);
  };

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-[460px] bg-white border border-[#D8DCD9] shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-6 md:p-8 text-left">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#E5E7E6]">
          <div className="w-10 h-10 bg-[#111111] text-white flex items-center justify-center font-bold text-lg">
            Y
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-[#111111] flex items-center gap-1.5">
              <span>YɛnCare Clinical Operations</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#087F6C]"></span>
            </h1>
            <p className="text-xs font-medium text-[#66706B] uppercase tracking-wider">
              KNUST Students' Clinic Staff Workstation
            </p>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSignIn('Receptionist');
          }}
          className="space-y-4 mb-6"
        >
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#111111]">
              Staff ID or Email
            </label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm font-normal text-[#111111] border border-[#C8CDCA] focus:border-[#087F6C] focus:ring-1 focus:ring-[#087F6C] focus:outline-none transition-all"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#111111]">
              Password or PIN
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm font-normal text-[#111111] border border-[#C8CDCA] focus:border-[#087F6C] focus:ring-1 focus:ring-[#087F6C] focus:outline-none transition-all"
              required
            />
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
              icon="login"
            >
              Sign in to Workstation
            </Button>
          </div>
        </form>

        {/* Quick Demo Sign In Roles */}
        <div className="border-t border-[#E5E7E6] pt-4 space-y-2">
          <div className="text-[11px] font-semibold text-[#66706B] uppercase tracking-wider mb-2">
            Instant Demo Sign-In (Select Role):
          </div>
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => handleSignIn('Receptionist')}
              className="w-full text-left px-3 py-2 text-xs border border-[#D8DCD9] hover:border-[#087F6C] hover:bg-[#E7F5F1]/30 flex items-center justify-between font-medium text-[#111111] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#087F6C]"></span>
                <span>Abena Osei (Receptionist)</span>
              </div>
              <span className="text-[10px] text-[#66706B] font-mono">&rarr; Queue Desk</span>
            </button>
            <button
              type="button"
              onClick={() => handleSignIn('Doctor')}
              className="w-full text-left px-3 py-2 text-xs border border-[#D8DCD9] hover:border-[#087F6C] hover:bg-[#E7F5F1]/30 flex items-center justify-between font-medium text-[#111111] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#087F6C]"></span>
                <span>Dr. Kwame Boateng (Doctor)</span>
              </div>
              <span className="text-[10px] text-[#66706B] font-mono">&rarr; Room 3 Consult</span>
            </button>
            <button
              type="button"
              onClick={() => handleSignIn('Admin')}
              className="w-full text-left px-3 py-2 text-xs border border-[#D8DCD9] hover:border-[#087F6C] hover:bg-[#E7F5F1]/30 flex items-center justify-between font-medium text-[#111111] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#087F6C]"></span>
                <span>Kojo Mensah (Admin)</span>
              </div>
              <span className="text-[10px] text-[#66706B] font-mono">&rarr; Operations</span>
            </button>
          </div>
        </div>

        {/* Back to Patient view */}
        <div className="mt-5 pt-3.5 border-t border-[#E5E7E6] text-center">
          <button
            onClick={() => setActiveShell('PATIENT')}
            className="text-xs font-semibold text-[#66706B] hover:text-[#111111] cursor-pointer"
          >
            &larr; Return to Patient Web
          </button>
        </div>
      </div>
    </div>
  );
};
