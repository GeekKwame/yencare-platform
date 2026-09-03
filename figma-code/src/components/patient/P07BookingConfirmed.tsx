import React from 'react';
import { useClinic } from '../../context/ClinicContext';
import { Button } from '../common/Button';
import { ReferenceBlock } from '../common/ReferenceBlock';
import { StatusBadge } from '../common/StatusBadge';

export const P07BookingConfirmed: React.FC = () => {
  const { currentPatientAppointment, setPatientScreen } = useClinic();
  const app = currentPatientAppointment;
  const refCode = app?.id || 'YC-4821';

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center py-8 md:py-14 px-4">
      <div className="w-full max-w-[560px] bg-white border border-[#D8DCD9] shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-6 md:p-8 text-center">
        {/* Reassuring Healthcare Success Icon */}
        <div className="mb-4 flex justify-center">
          <div className="w-14 h-14 bg-[#E7F5F1] text-[#087F6C] border border-[#99D5C8] rounded-full flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl">check</span>
          </div>
        </div>

        <div className="mb-2">
          <StatusBadge status={app?.status || 'BOOKED'} />
        </div>

        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#111111] mb-1.5">
          Appointment confirmed
        </h1>
        <p className="text-sm text-[#66706B] font-normal mb-5 max-w-sm mx-auto">
          Please arrive at [Partner clinic] 15 minutes before your consultation.
        </p>

        {/* Speakable Reference Block YC-4821 */}
        <ReferenceBlock
          code={refCode}
          subtext="Provide this speakable reference code to the receptionist upon your arrival."
        />

        {/* Core Hierarchy Overview Card */}
        <div className="border border-[#D8DCD9] p-4 bg-[#F7F8F7] text-left space-y-2.5 mb-5 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-[#66706B] font-normal">Patient:</span>
            <span className="font-semibold text-[#111111]">{app?.patientName || 'Ama Mensah'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#66706B] font-normal">Doctor:</span>
            <span className="font-semibold text-[#111111]">
              {app?.doctor.name || 'Dr. Kwame Boateng'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#66706B] font-normal">Clinic:</span>
            <span className="font-medium text-[#111111]">
              [Partner clinic] · General Clinic (Room 3)
            </span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-[#E5E7E6]">
            <span className="text-[#66706B] font-normal">Date & Time:</span>
            <span className="font-bold text-[#087F6C]">
              {app?.date || 'Tuesday, 15 September 2026'}, {app?.time || '10:00 AM'}
            </span>
          </div>
        </div>

        {/* SMS Advisory Note */}
        <div className="bg-[#F0F2F1] border border-[#D8DCD9] p-3.5 mb-6 text-left text-xs text-[#66706B] flex items-start gap-2">
          <span className="material-symbols-outlined text-[#087F6C] text-[16px] shrink-0 mt-0.5">
            sms
          </span>
          <p className="leading-relaxed">
            We sent an SMS confirmation to your phone. Booking success does not depend on the SMS arriving.
          </p>
        </div>

        {/* Action Buttons: STITCH LOCK CTA: "View appointment" */}
        <div className="space-y-2.5">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            icon="visibility"
            onClick={() => setPatientScreen('P11_DETAILS')}
          >
            View appointment
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
