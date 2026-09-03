import React from 'react';
import { useClinic } from '../../context/ClinicContext';
import { Button } from '../common/Button';
import { StatusBadge } from '../common/StatusBadge';
import { ReferenceBlock } from '../common/ReferenceBlock';

export const S04PatientDetail: React.FC = () => {
  const {
    appointments,
    selectedStaffAppointmentId,
    checkInPatient,
    callPatient,
    completeVisit,
    setStaffScreen,
  } = useClinic();

  const app = appointments.find((a) => a.id === selectedStaffAppointmentId) || appointments[0];
  const isBooked = app.status === 'BOOKED';
  const isWaiting = app.status === 'WAITING';
  const isCalled = app.status === 'CALLED';

  return (
    <div className="max-w-3xl space-y-6">
      {/* Back navigation */}
      <div className="flex items-center justify-between border-b border-[#D8DCD9] pb-3.5">
        <button
          onClick={() => setStaffScreen('S03_APPOINTMENTS')}
          className="text-xs font-semibold text-[#66706B] hover:text-[#111111] flex items-center gap-1 cursor-pointer transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          <span>Back to Roster</span>
        </button>
        <StatusBadge status={app.status} token={app.queueToken} />
      </div>

      <div className="bg-white border border-[#D8DCD9] p-6 md:p-8 space-y-6 shadow-xs">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#66706B] block mb-1">
            Clinical Check-In Record
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-[#111111]">
            {app.patientName}
          </h1>
          <p className="text-xs font-mono text-[#66706B] mt-1">
            Phone: {app.phone} · Reference: {app.id}
          </p>
        </div>

        {/* Reference Code display */}
        <ReferenceBlock
          code={app.id}
          subtext="Verify this reference code against the patient's SMS confirmation before check-in."
          size="lg"
        />

        {/* Consultation details grid */}
        <div className="border border-[#D8DCD9] divide-y divide-[#E5E7E6] text-xs">
          <div className="p-3.5 bg-[#F7F8F7] flex justify-between items-center">
            <span className="text-[#66706B] font-medium">Scheduled Date</span>
            <span className="font-semibold text-[#111111]">{app.date}</span>
          </div>
          <div className="p-3.5 bg-white flex justify-between items-center">
            <span className="text-[#66706B] font-medium">Appointment Slot</span>
            <span className="font-semibold text-[#111111] text-sm">{app.time} (30 min)</span>
          </div>
          <div className="p-3.5 bg-[#F7F8F7] flex justify-between items-center">
            <span className="text-[#66706B] font-medium">Doctor</span>
            <span className="font-semibold text-[#111111]">{app.doctor.name} ({app.doctor.specialty})</span>
          </div>
          <div className="p-3.5 bg-white flex justify-between items-center">
            <span className="text-[#66706B] font-medium">Room</span>
            <span className="font-semibold text-[#111111]">{app.room || 'Consultation Room 3'}</span>
          </div>
          <div className="p-3.5 bg-[#F7F8F7] flex justify-between items-center">
            <span className="text-[#66706B] font-medium">Current Queue State</span>
            <span className="font-semibold text-[#087F6C] uppercase">
              {app.status} {app.queueToken ? `(${app.queueToken})` : ''}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 space-y-3">
          {isBooked && (
            <Button
              variant="accent"
              size="lg"
              fullWidth
              icon="how_to_reg"
              onClick={() => {
                checkInPatient(app.id);
              }}
            >
              Check in patient ({app.patientName})
            </Button>
          )}

          {isWaiting && (
            <Button
              variant="primary"
              size="lg"
              fullWidth
              icon="notifications_active"
              onClick={() => {
                callPatient(app.id);
                setStaffScreen('S05_LIVE_QUEUE');
              }}
            >
              Call to Consultation Room 3
            </Button>
          )}

          {isCalled && (
            <Button
              variant="accent"
              size="lg"
              fullWidth
              icon="check_circle"
              onClick={() => {
                completeVisit(app.id);
                setStaffScreen('S05_LIVE_QUEUE');
              }}
            >
              Complete Visit
            </Button>
          )}

          <div className="pt-2 flex justify-between items-center text-xs">
            <button
              onClick={() => setStaffScreen('S05_LIVE_QUEUE')}
              className="font-semibold text-[#087F6C] hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>View Live Queue</span>
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </button>
            <button
              onClick={() => setStaffScreen('S03_APPOINTMENTS')}
              className="text-[#66706B] hover:text-[#111111] cursor-pointer"
            >
              Close Record
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
