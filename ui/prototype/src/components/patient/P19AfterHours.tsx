import React from 'react';
import { useClinic } from '../../context/ClinicContext';
import { Button } from '../common/Button';

export const P19AfterHours: React.FC = () => {
  const { setPatientScreen, setIsAfterHours } = useClinic();

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center py-8 md:py-14 px-4">
      <div className="w-full max-w-[560px] bg-white border border-[#D8DCD9] shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-6 md:p-8 text-center">
        {/* Closed Icon */}
        <div className="mb-5 flex justify-center">
          <div className="w-14 h-14 bg-[#F0F2F1] border border-[#D8DCD9] text-[#66706B] rounded-full flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl">schedule</span>
          </div>
        </div>

        <span className="inline-block px-3 py-1 bg-[#F0F2F1] text-[#66706B] border border-[#D8DCD9] text-[11px] font-bold uppercase tracking-wider mb-3">
          Clinic Closed
        </span>

        <h1 className="text-2xl font-bold tracking-tight text-[#111111] mb-3">
          Students' Clinic Is Closed
        </h1>
        <p className="text-sm text-[#66706B] font-normal leading-relaxed mb-6 max-w-md mx-auto">
          Today's appointments are unavailable. The clinic operates Monday to Friday, 8:00 AM – 4:00 PM.
        </p>

        {/* Emergency Notice */}
        <div className="bg-[#FDF2F2] border border-[#F8B4B4] p-4 mb-6 text-left text-xs text-[#C53030] leading-relaxed">
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-[16px] shrink-0 mt-0.5">emergency</span>
            <div>
              <strong className="block mb-1">For urgent or emergency medical needs</strong>
              Please seek immediate medical attention at the appropriate University Health Services facility. Do not wait for a clinic appointment.
            </div>
          </div>
        </div>

        {/* Clinic Hours Info */}
        <div className="border border-[#D8DCD9] p-4 bg-[#F7F8F7] text-left text-xs space-y-2 mb-6">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#111111] pb-2 border-b border-[#E5E7E6]">
            KNUST University Health Services
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#66706B]">Students' Clinic</span>
            <span className="font-semibold text-[#111111]">Mon–Fri: 8:00 AM – 4:00 PM</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#66706B]">Social Science Block GF7</span>
            <span className="font-semibold text-[#111111]">Mon–Fri: 9:00 AM – 3:00 PM</span>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2.5">
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            icon="search"
            onClick={() => setPatientScreen('P09_FIND')}
          >
            Find an existing appointment
          </Button>

          <button
            onClick={() => {
              setIsAfterHours(false);
              setPatientScreen('P01_HOME');
            }}
            className="text-xs font-semibold text-[#087F6C] hover:underline cursor-pointer mx-auto block pt-2"
          >
            Return to Home (Demo: exit after-hours)
          </button>
        </div>
      </div>
    </div>
  );
};
