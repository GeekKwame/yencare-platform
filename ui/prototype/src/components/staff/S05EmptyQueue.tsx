import React from 'react';
import { useClinic } from '../../context/ClinicContext';
import { Button } from '../common/Button';

export const S05EmptyQueue: React.FC = () => {
  const { setStaffScreen } = useClinic();

  return (
    <div className="space-y-6">
      <div className="border-b border-[#D8DCD9] pb-4">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#66706B] block mb-1">
          Clinical Workstation
        </span>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#111111]">
            Live Queue Management
        </h1>
        <p className="text-xs font-normal text-[#66706B] mt-0.5">
          General Clinic · Dr. Kwame Boateng · Consultation Room 3
        </p>
      </div>

      <div className="bg-white border border-[#D8DCD9] shadow-xs p-8 md:p-14 text-center max-w-xl mx-auto my-8">
        <div className="w-14 h-14 bg-[#E7F5F1] text-[#087F6C] border border-[#99D5C8] rounded-full mx-auto flex items-center justify-center mb-5">
          <span className="material-symbols-outlined text-3xl">
            done_all
          </span>
        </div>

        <h2 className="text-2xl font-bold tracking-tight text-[#111111] mb-2">
          No patients in the queue
        </h2>
        <p className="text-sm text-[#66706B] font-normal mb-8 max-w-md mx-auto leading-relaxed">
          The waiting corridor and consultation room are currently clear. Arriving patients can be checked in from today's appointments roster.
        </p>

        {/* STITCH LOCK: Button can go to Appointments, not a new check-in product */}
        <div className="max-w-xs mx-auto">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={() => setStaffScreen('S03_APPOINTMENTS')}
            icon="calendar_month"
          >
            View Appointments
          </Button>
        </div>
      </div>
    </div>
  );
};
