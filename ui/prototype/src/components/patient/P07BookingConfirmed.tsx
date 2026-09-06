import React, { useState } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { Button } from '../common/Button';
import { ReferenceBlock } from '../common/ReferenceBlock';
import { StatusBadge } from '../common/StatusBadge';
import { SmsModal } from '../common/SmsModal';
import { CLINIC_SITE_LABELS, VISIT_TYPE_LABELS } from '../../types/clinic';

function getArriveBy(time: string): string {
  const match = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return time;
  let h = parseInt(match[1]);
  let m = parseInt(match[2]);
  const period = match[3].toUpperCase();
  m -= 15;
  if (m < 0) { m += 60; h -= 1; }
  if (h <= 0) h = 12;
  return `${h}:${String(m).padStart(2, '0')} ${period}`;
}

export const P07BookingConfirmed: React.FC = () => {
  const { currentPatientAppointment, setPatientScreen } = useClinic();
  const app = currentPatientAppointment;
  const refCode = app?.id || 'YC-4821';
  const [smsOpen, setSmsOpen] = useState(false);

  const siteName = CLINIC_SITE_LABELS[app?.clinicSite || 'students-clinic']?.name || "Students' Clinic";
  const visitLabel = VISIT_TYPE_LABELS[app?.visitType || 'general-opd'] || 'General OPD';

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center py-8 md:py-14 px-4">
      <div className="w-full max-w-[560px] bg-white border border-[#D8DCD9] shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-6 md:p-8 text-center">
        {/* Success Icon */}
        <div className="mb-4 flex justify-center">
          <div className="w-14 h-14 bg-[#E7F5F1] text-[#087F6C] border border-[#99D5C8] rounded-full flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl">check</span>
          </div>
        </div>

        <div className="mb-2">
          <StatusBadge status={app?.status || 'BOOKED'} />
        </div>

        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#111111] mb-1.5">
          Appointment Confirmed
        </h1>
        <p className="text-sm text-[#66706B] font-normal mb-1 max-w-sm mx-auto">
          KNUST {siteName}
        </p>
        <p className="text-sm text-[#66706B] font-normal mb-5 max-w-sm mx-auto">
          {visitLabel}
        </p>

        {/* Speakable Reference Block */}
        <ReferenceBlock
          code={refCode}
          subtext="Provide this speakable reference code to the receptionist upon your arrival."
        />

        {/* Core Appointment Details */}
        <div className="border border-[#D8DCD9] p-4 bg-[#F7F8F7] text-left space-y-2.5 mb-3 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-[#66706B] font-normal">Patient:</span>
            <span className="font-semibold text-[#111111]">{app?.patientName || 'Akosua Boateng'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#66706B] font-normal">Clinician:</span>
            <span className="font-semibold text-[#111111]">
              {app?.doctor.name || 'Dr. Kwame Boateng'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#66706B] font-normal">Clinic:</span>
            <span className="font-medium text-[#111111]">
              {siteName} · {app?.doctor.room || 'Room 1'}
            </span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-[#E5E7E6]">
            <span className="text-[#66706B] font-normal">Date & Time:</span>
            <span className="font-bold text-[#087F6C]">
              {app?.date || 'Tuesday, 15 September 2026'}, {app?.time || '9:30 AM'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#087F6C] font-semibold">Arrive By:</span>
            <span className="font-bold text-[#087F6C]">
              {getArriveBy(app?.time || '9:30 AM')}
            </span>
          </div>
        </div>

        {/* SMS Simulation */}
        <div className="bg-[#E7F5F1] border border-[#99D5C8] p-3.5 mb-5 text-left text-xs flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#087F6C]">
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
            <span className="font-semibold">Confirmation sent to {app?.phone || '024 XXX XXXX'}</span>
          </div>
          <button
            onClick={() => setSmsOpen(true)}
            className="text-[11px] font-semibold text-[#087F6C] hover:underline cursor-pointer flex items-center gap-1"
          >
            <span>View message</span>
            <span className="material-symbols-outlined text-[14px]">open_in_new</span>
          </button>
        </div>

        {/* Action Buttons */}
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

      {/* SMS Modal */}
      <SmsModal
        appointmentId={refCode}
        isOpen={smsOpen}
        onClose={() => setSmsOpen(false)}
      />
    </div>
  );
};
