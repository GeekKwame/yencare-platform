import React from 'react';
import { useClinic } from '../../context/ClinicContext';
import { Button } from '../common/Button';

export const P08SlotTaken: React.FC = () => {
  const { setPatientScreen, setSimulateSlotTaken } = useClinic();

  const handleChooseAnother = () => {
    setSimulateSlotTaken(false);
    setPatientScreen('P04_05_DATE_TIME');
  };

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center py-8 md:py-14 px-4">
      <div className="w-full max-w-[560px] bg-white border border-[#D8DCD9] shadow-[0_2px_8px_rgba(0,0,0,0.05)] p-6 md:p-8 text-center">
        {/* Warning Icon */}
        <div className="mb-4 flex justify-center">
          <div className="w-14 h-14 bg-[#FEF7ED] border border-[#FCD34D] text-[#B7791F] rounded-full flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl">event_busy</span>
          </div>
        </div>

        <span className="inline-block px-2.5 py-0.5 bg-[#FEF7ED] text-[#B7791F] border border-[#FCD34D] text-[11px] font-semibold uppercase tracking-wider mb-2.5">
          Slot Unavailable
        </span>

        <h1 className="text-2xl font-bold tracking-tight text-[#111111] mb-2">
          This time slot was just taken
        </h1>
        <p className="text-sm text-[#66706B] font-normal mb-6 leading-relaxed max-w-md mx-auto">
          Another patient just confirmed the 10:00 AM slot while you were completing your booking. Please choose another available consultation time.
        </p>

        {/* Selected Slot Information */}
        <div className="border border-[#D8DCD9] p-4 bg-[#F7F8F7] text-left mb-6 text-xs space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[#66706B] font-normal">Doctor:</span>
            <span className="font-semibold text-[#111111]">Dr. Kwame Boateng</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#66706B] font-normal">Attempted Slot:</span>
            <span className="font-semibold text-[#C53030] line-through">Tue 15 Sep 2026, 10:00 AM</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#66706B] font-normal">Status:</span>
            <span className="font-medium text-[#B7791F]">Taken by another patient</span>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2.5">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleChooseAnother}
            icon="schedule"
          >
            Choose another time
          </Button>

          <Button
            variant="secondary"
            size="md"
            fullWidth
            onClick={() => {
              setSimulateSlotTaken(false);
              setPatientScreen('P01_HOME');
            }}
          >
            Return to Home
          </Button>
        </div>
      </div>
    </div>
  );
};
