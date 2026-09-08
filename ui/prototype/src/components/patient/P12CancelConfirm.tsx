import React from 'react';
import { useClinic } from '../../context/ClinicContext';
import { Button } from '../common/Button';
import { CLINIC_SITE_LABELS } from '../../types/clinic';

export const P12CancelConfirm: React.FC = () => {
  const { currentPatientAppointment, cancelAppointment, setPatientScreen } = useClinic();
  const app = currentPatientAppointment;

  if (!app) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center py-8 px-4">
        <div className="text-center">
          <p className="text-sm text-[#66706B]">No appointment in this session to cancel.</p>
          <Button variant="secondary" size="md" onClick={() => setPatientScreen('P01_HOME')} className="mt-4">
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  const siteName = CLINIC_SITE_LABELS[app.clinicSite]?.name || "Students' Clinic";
  const refCode = app.id;

  const handleCancel = () => {
    cancelAppointment(refCode);
    setPatientScreen('P13_CANCELLED');
  };

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center py-8 md:py-14 px-4">
      <div className="w-full max-w-[560px] bg-white border border-[#D8DCD9] shadow-[0_2px_8px_rgba(0,0,0,0.05)] p-6 md:p-8 text-center">
        {/* Warning Icon */}
        <div className="mb-4 flex justify-center">
          <div className="w-14 h-14 bg-[#FDF2F2] border border-[#F8B4B4] rounded-full flex items-center justify-center text-[#C53030]">
            <span className="material-symbols-outlined text-3xl">warning</span>
          </div>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-[#111111] mb-2">
          Cancel Appointment?
        </h1>
        <p className="text-sm text-[#66706B] font-normal mb-6">
          Are you sure you want to cancel your consultation for <strong className="text-[#111111] font-reference">{refCode}</strong>?
        </p>

        {/* Appointment to cancel */}
        <div className="border border-[#D8DCD9] p-4 bg-[#F7F8F7] text-left text-xs mb-6 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[#66706B] font-normal">Doctor:</span>
            <span className="font-semibold text-[#111111]">{app?.doctor.name || 'Dr. Kwame Boateng'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#66706B] font-normal">Date & Time:</span>
            <span className="font-semibold text-[#111111]">{app?.date}, {app?.time}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#66706B] font-normal">Clinic:</span>
            <span className="font-medium text-[#111111]">KNUST {siteName}</span>
          </div>
        </div>

        <div className="bg-[#F0F2F1] border border-[#D8DCD9] p-3.5 mb-6 text-left text-xs text-[#66706B] leading-relaxed">
          Releasing your appointment helps another patient in need of care at KNUST Students' Clinic.
        </div>

        {/* Action Buttons: STITCH COPY LOCK: "Yes, cancel appointment" & "Keep appointment" */}
        <div className="space-y-2.5">
          <Button
            variant="destructive"
            size="lg"
            fullWidth
            onClick={handleCancel}
            icon="cancel"
          >
            Yes, cancel appointment
          </Button>

          <Button
            variant="secondary"
            size="md"
            fullWidth
            onClick={() => setPatientScreen('P11_DETAILS')}
          >
            Keep appointment
          </Button>
        </div>
      </div>
    </div>
  );
};
