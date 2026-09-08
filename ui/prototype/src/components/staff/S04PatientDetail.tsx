import React, { useState } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { Button } from '../common/Button';
import { StatusBadge } from '../common/StatusBadge';
import { ReferenceBlock } from '../common/ReferenceBlock';
import { SmsModal } from '../common/SmsModal';
import { CLINIC_SITE_LABELS, VISIT_TYPE_LABELS } from '../../types/clinic';

export const S04PatientDetail: React.FC = () => {
  const {
    appointments,
    selectedStaffAppointmentId,
    checkInPatient,
    callPatient,
    completeVisit,
    setStaffScreen,
  } = useClinic();

  const [showSmsModal, setShowSmsModal] = useState(false);

  const app = appointments.find((a) => a.id === selectedStaffAppointmentId);

  if (!app) {
    return (
      <div className="max-w-xl space-y-4">
        <p className="text-sm text-[#66706B]">
          Select a student from the roster or desk lookup to open their record.
        </p>
        <Button variant="secondary" size="md" onClick={() => setStaffScreen('S03_APPOINTMENTS')}>
          Open roster
        </Button>
      </div>
    );
  }

  const isBooked = app.status === 'BOOKED';
  const isArrived = app.status === 'CHECKED_IN';
  const canStaffCheckIn = isBooked || isArrived;
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
        <div className="flex items-center gap-2">
          {app.bookingType === 'WALK_IN' && (
            <span className="text-[10px] font-bold px-2 py-0.5 bg-[#EBF8FF] text-[#2B6CB0] border border-[#BEE3F8]">
              WALK-IN
            </span>
          )}
          <StatusBadge status={app.status} token={app.queueToken} />
        </div>
      </div>

      <div className="bg-white border border-[#D8DCD9] p-6 md:p-8 space-y-6 shadow-xs">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#66706B] block mb-1">
            KNUST Student Clinical Record
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-[#111111]">
            {app.patientName}
          </h1>
          <p className="text-xs font-mono text-[#66706B] mt-1">
            Phone: {app.phone} · Ref: {app.id} {app.studentIndex ? `· Student Index: ${app.studentIndex}` : ''}
          </p>
        </div>

        {/* Reference Code display */}
        <ReferenceBlock
          code={app.id}
          subtext="Verify this reference code against the student's SMS confirmation before check-in."
          size="lg"
        />

        {isArrived && (
          <div className="p-3 bg-[#E7F5F1] border border-[#99D5C8] text-xs">
            <div className="font-bold text-[#087F6C] mb-0.5">Student has arrived and is waiting at the desk</div>
            <p className="text-[#066A5A]">
              Verify the reference code against their SMS, then check them into the live queue.
            </p>
          </div>
        )}
        {app.staffChangedTime && (
          <div className="p-3 bg-[#EBF8FF] border border-[#BEE3F8] text-xs">
            <div className="font-bold text-[#2B6CB0] mb-0.5">Appointment rescheduled by clinic staff</div>
            <p className="text-[#2C5282]">
              Reason: {app.staffChangeReason || 'Slot adjustment'}. Student has been notified via SMS.
            </p>
          </div>
        )}

        {/* Consultation details grid */}
        <div className="border border-[#D8DCD9] divide-y divide-[#E5E7E6] text-xs">
          <div className="p-3.5 bg-[#F7F8F7] flex justify-between items-center">
            <span className="text-[#66706B] font-medium">Student Index No.</span>
            <span className="font-mono font-semibold text-[#111111]">{app.studentIndex || 'N/A (Walk-in / General)'}</span>
          </div>
          {app.nhisNumber && (
            <div className="p-3.5 bg-white flex justify-between items-center">
              <span className="text-[#66706B] font-medium">NHIS Number</span>
              <span className="font-mono text-[#111111]">{app.nhisNumber}</span>
            </div>
          )}
          <div className="p-3.5 bg-[#F7F8F7] flex justify-between items-center">
            <span className="text-[#66706B] font-medium">Clinic Site</span>
            <span className="font-semibold text-[#111111]">
              {app.clinicSite ? CLINIC_SITE_LABELS[app.clinicSite].name : "KNUST Students' Clinic"}
            </span>
          </div>
          <div className="p-3.5 bg-white flex justify-between items-center">
            <span className="text-[#66706B] font-medium">Visit Type</span>
            <span className="font-semibold text-[#111111]">
              {app.visitType ? VISIT_TYPE_LABELS[app.visitType] : 'General OPD'}
            </span>
          </div>
          <div className="p-3.5 bg-[#F7F8F7] flex justify-between items-center">
            <span className="text-[#66706B] font-medium">Scheduled Date & Time</span>
            <span className="font-semibold text-[#111111] text-sm">{app.date} at {app.time}</span>
          </div>
          <div className="p-3.5 bg-white flex justify-between items-center">
            <span className="text-[#66706B] font-medium">Doctor / Room</span>
            <span className="font-semibold text-[#111111]">
              {app.doctor.name} ({app.assignedRoom || app.doctor.room})
            </span>
          </div>
          <div className="p-3.5 bg-[#F7F8F7] flex justify-between items-center">
            <span className="text-[#66706B] font-medium">Current Queue State</span>
            <span className="font-semibold text-[#087F6C] uppercase">
              {app.status} {app.queueToken ? `(${app.queueToken})` : ''}
            </span>
          </div>
        </div>

        {/* SMS log button */}
        <div className="flex items-center justify-between p-3 bg-[#F7F8F7] border border-[#D8DCD9]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-[#087F6C]">sms</span>
            <span className="text-xs font-semibold text-[#111111]">Simulated SMS History</span>
          </div>
          <button
            type="button"
            onClick={() => setShowSmsModal(true)}
            className="text-xs font-semibold text-[#087F6C] hover:underline cursor-pointer"
          >
            View SMS Messages &rarr;
          </button>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 space-y-3">
          {canStaffCheckIn && (
            <>
              <Button
                variant="accent"
                size="lg"
                fullWidth
                icon="how_to_reg"
                onClick={() => {
                  checkInPatient(app.id);
                }}
              >
                {isArrived ? `Check In to Live Queue (${app.patientName})` : `Check In Student (${app.patientName})`}
              </Button>

              <div className="grid grid-cols-2 gap-2.5">
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => setStaffScreen('S08_CHANGE_APPOINTMENT')}
                  icon="edit_calendar"
                >
                  Change Time
                </Button>
                <Button
                  variant="destructive"
                  size="md"
                  onClick={() => setStaffScreen('S09_NO_SHOW_CONFIRM')}
                  icon="person_cancel"
                >
                  Mark No-Show
                </Button>
              </div>
            </>
          )}

          {isWaiting && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-[#66706B] uppercase tracking-wider mb-1">
                Call student to consultation:
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <Button
                  variant="primary"
                  size="lg"
                  icon="notifications_active"
                  onClick={() => {
                    callPatient(app.id, 'Room 1');
                    setStaffScreen('S05_LIVE_QUEUE');
                  }}
                >
                  Call &rarr; Room 1
                </Button>
                <Button
                  variant="primary"
                  size="lg"
                  icon="notifications_active"
                  onClick={() => {
                    callPatient(app.id, 'Room 2');
                    setStaffScreen('S05_LIVE_QUEUE');
                  }}
                >
                  Call &rarr; Room 2
                </Button>
              </div>
            </div>
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
              Complete Visit ({app.assignedRoom || 'Consultation'})
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

      <SmsModal
        appointmentId={app.id}
        isOpen={showSmsModal}
        onClose={() => setShowSmsModal(false)}
      />
    </div>
  );
};
