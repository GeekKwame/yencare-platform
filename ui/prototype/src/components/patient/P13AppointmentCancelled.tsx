import React from 'react';
import { useClinic } from '../../context/ClinicContext';
import { Button } from '../common/Button';
import { StatusBadge } from '../common/StatusBadge';

export const P13AppointmentCancelled: React.FC = () => {
  const { currentPatientAppointment, setPatientScreen } = useClinic();
  const refCode = currentPatientAppointment?.id || 'YC-4821';

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center py-8 md:py-14 px-4">
      <div className="w-full max-w-[560px] bg-white border border-[#D8DCD9] shadow-[0_2px_8px_rgba(0,0,0,0.05)] p-6 md:p-8 text-center">
        {/* Cancelled Icon */}
        <div className="mb-4 flex justify-center">
          <div className="w-14 h-14 bg-[#F0F2F1] border border-[#D8DCD9] rounded-full flex items-center justify-center text-[#66706B]">
            <span className="material-symbols-outlined text-3xl">event_busy</span>
          </div>
        </div>

        <div className="mb-2.5">
          <StatusBadge status="CANCELLED" />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-[#111111] mb-2">
          Appointment Cancelled
        </h1>
        <p className="text-sm text-[#66706B] font-normal mb-6">
          Your appointment reference <strong className="text-[#111111] font-reference">{refCode}</strong> has been cancelled and the slot was released.
        </p>

        <div className="bg-[#F0F2F1] border border-[#D8DCD9] p-4 mb-6 text-left text-xs text-[#66706B] leading-relaxed">
          A cancellation confirmation message has been sent to your phone. If you need medical attention, you may schedule a new consultation at any time.
        </div>

        {/* Actions */}
        <div className="space-y-2.5">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={() => setPatientScreen('P02_DETAILS')}
            icon="add_circle"
          >
            Book new appointment
          </Button>

          <Button
            variant="secondary"
            size="md"
            fullWidth
            onClick={() => setPatientScreen('P01_HOME')}
          >
            Return to Home
          </Button>
        </div>
      </div>
    </div>
  );
};
