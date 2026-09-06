import React from 'react';
import { useClinic } from '../../context/ClinicContext';
import { Button } from '../common/Button';

export const P01Home: React.FC = () => {
  const { setPatientScreen, isAfterHours } = useClinic();

  if (isAfterHours) {
    setPatientScreen('P19_AFTER_HOURS');
    return null;
  }

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center py-10 md:py-16 px-4">
      {/* 600px Balanced Healthcare Card */}
      <div className="w-full max-w-[600px] bg-white border border-[#D8DCD9] shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-6 sm:p-10 text-center">
        {/* Subtle Clinical Badge & Icon Header */}
        <div className="mb-6 flex flex-col items-center">
          <div className="w-13 h-13 bg-[#E7F5F1] border border-[#99D5C8] text-[#087F6C] flex items-center justify-center mb-3">
            <span className="material-symbols-outlined text-3xl">
              health_and_safety
            </span>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-semibold text-[#087F6C] bg-[#E7F5F1] uppercase tracking-wider">
            <span>KNUST Students' Clinic</span>
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111111] mb-2">
          Welcome to YɛnCare
        </h1>
        <p className="text-sm sm:text-base text-[#66706B] font-normal mb-2 max-w-md mx-auto leading-relaxed">
          Book a clinic visit, find an existing appointment, or check your queue.
        </p>
        <p className="text-xs text-[#8A948F] font-medium mb-8">
          KNUST University Health Services
        </p>

        {/* Primary Action Buttons */}
        <div className="space-y-3 mb-8">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            icon="calendar_month"
            onClick={() => setPatientScreen('P02_DETAILS')}
          >
            Book an appointment
          </Button>

          <Button
            variant="secondary"
            size="lg"
            fullWidth
            icon="search"
            onClick={() => setPatientScreen('P09_FIND')}
          >
            Find my appointment
          </Button>
        </div>

        {/* Dedicated Queue Option Card */}
        <div className="bg-[#F0F2F1] border border-[#D8DCD9] p-4 sm:p-5 text-left mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#111111]">
                <span className="material-symbols-outlined text-[16px] text-[#087F6C]">
                  schedule
                </span>
                <span>Already checked in?</span>
              </div>
              <p className="text-xs text-[#66706B] font-normal mt-1">
                Check your current queue position and estimated wait time.
              </p>
            </div>
            <button
              onClick={() => setPatientScreen('P18_QUEUE')}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-[#E7F5F1] text-[#087F6C] border border-[#D8DCD9] hover:border-[#087F6C] text-xs font-semibold tracking-wide transition-colors shrink-0 cursor-pointer"
            >
              <span>Check queue</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>
        </div>

        {/* Carrier SMS Notice */}
        <div className="border-t border-[#E5E7E6] pt-5 text-left flex items-start gap-2.5">
          <span className="material-symbols-outlined text-[#66706B] text-[18px] shrink-0 mt-0.5">
            sms
          </span>
          <p className="text-xs text-[#66706B] font-normal leading-relaxed">
            We send a confirmation text after you book. Standard rates may apply depending on your carrier in Ghana.
          </p>
        </div>
      </div>
    </div>
  );
};
