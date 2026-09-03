import React from 'react';
import { useClinic } from '../../context/ClinicContext';
import { Button } from '../common/Button';
import { ReferenceBlock } from '../common/ReferenceBlock';
import { StatusBadge } from '../common/StatusBadge';

export const P11AppointmentDetail: React.FC = () => {
  const { currentPatientAppointment, setPatientScreen } = useClinic();
  const app = currentPatientAppointment;
  const refCode = app?.id || 'YC-4821';
  const isCancelled = app?.status === 'CANCELLED';
  const isWaitingOrCalled = app?.status === 'WAITING' || app?.status === 'CALLED';

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center py-8 md:py-14 px-4">
      <div className="w-full max-w-[560px] bg-white border border-[#D8DCD9] shadow-[0_2px_8px_rgba(0,0,0,0.05)] p-6 md:p-8">
        {/* Top bar with back and status */}
        <div className="flex items-center justify-between border-b border-[#E5E7E6] pb-3.5 mb-6">
          <button
            onClick={() => setPatientScreen('P01_HOME')}
            className="text-xs font-semibold text-[#66706B] hover:text-[#111111] flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Home</span>
          </button>
          <StatusBadge status={app?.status || 'BOOKED'} token={app?.queueToken} />
        </div>

        <div className="mb-4">
          <h1 className="text-2xl font-bold tracking-tight text-[#111111] mb-1">
            Appointment Details
          </h1>
          <p className="text-sm text-[#66706B] font-normal">
            Manage your booking, view status, or request a reschedule.
          </p>
        </div>

        {/* Reference Code Block */}
        <ReferenceBlock
          code={refCode}
          subtext="Provide this speakable reference to clinic reception when checking in."
        />

        {/* Summary Card */}
        <div className="border border-[#D8DCD9] divide-y divide-[#E5E7E6] mb-6 text-xs">
          <div className="p-3.5 bg-[#F7F8F7] flex justify-between items-center">
            <span className="font-medium text-[#66706B]">Patient</span>
            <span className="font-semibold text-[#111111] text-sm">{app?.patientName || 'Ama Mensah'}</span>
          </div>
          <div className="p-3.5 bg-white flex justify-between items-center">
            <span className="font-medium text-[#66706B]">Phone</span>
            <span className="font-mono font-semibold text-[#111111]">{app?.phone || '024 123 4567'}</span>
          </div>
          <div className="p-3.5 bg-[#F7F8F7] flex justify-between items-center">
            <span className="font-medium text-[#66706B]">Clinic</span>
            <span className="font-semibold text-[#111111]">[Partner clinic]</span>
          </div>
          <div className="p-3.5 bg-white flex justify-between items-center">
            <span className="font-medium text-[#66706B]">Doctor</span>
            <span className="font-semibold text-[#111111]">{app?.doctor.name || 'Dr. Kwame Boateng'}</span>
          </div>
          <div className="p-3.5 bg-[#F7F8F7] flex justify-between items-center">
            <span className="font-medium text-[#66706B]">Date & Time</span>
            <span className={`font-semibold ${isCancelled ? 'text-[#8A948F] line-through' : 'text-[#087F6C]'}`}>
              {app?.date}, {app?.time}
            </span>
          </div>
          {app?.room && (
            <div className="p-3.5 bg-white flex justify-between items-center">
              <span className="font-medium text-[#66706B]">Location</span>
              <span className="font-semibold text-[#111111]">{app.room}</span>
            </div>
          )}
        </div>

        {/* Dynamic Context Actions based on Status */}
        {isCancelled ? (
          <div className="space-y-3">
            <div className="p-3.5 bg-[#FDF2F2] border border-[#F8B4B4] text-xs text-[#C53030]">
              This appointment has been cancelled. You can book a new consultation anytime.
            </div>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => setPatientScreen('P02_DETAILS')}
              icon="add_circle"
            >
              Book new appointment
            </Button>
          </div>
        ) : isWaitingOrCalled ? (
          <div className="space-y-3">
            <div className="p-3.5 bg-[#E7F5F1] border border-[#99D5C8] text-xs text-[#087F6C] font-medium">
              You are currently checked in at the clinic.
            </div>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              icon="schedule"
              onClick={() => setPatientScreen('P18_QUEUE')}
            >
              Check my queue
            </Button>
          </div>
        ) : (
          /* Booked status: per STITCH LOCK: Reschedule + Cancel are primary management actions */
          <div className="space-y-3">
            <Button
              variant="secondary"
              size="lg"
              fullWidth
              icon="edit_calendar"
              onClick={() => setPatientScreen('P14_RESCHEDULE_DATE')}
            >
              Change appointment time
            </Button>

            <Button
              variant="destructive"
              size="lg"
              fullWidth
              icon="cancel"
              onClick={() => setPatientScreen('P12_CANCEL_CONFIRM')}
            >
              Cancel appointment
            </Button>

            <div className="pt-2 text-center">
              <button
                onClick={() => setPatientScreen('P18_QUEUE')}
                className="text-xs font-semibold text-[#087F6C] hover:underline cursor-pointer inline-flex items-center gap-1"
              >
                <span>Check queue status</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
