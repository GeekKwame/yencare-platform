import React, { useState } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { Button } from '../common/Button';

export const S09NoShowConfirm: React.FC = () => {
  const {
    appointments,
    selectedStaffAppointmentId,
    markNoShow,
    setStaffScreen,
  } = useClinic();

  const [confirmed, setConfirmed] = useState(false);
  const app = appointments.find((a) => a.id === selectedStaffAppointmentId) || appointments[0];

  const handleConfirm = () => {
    markNoShow(app.id);
    setConfirmed(true);
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 pt-6">
      {confirmed ? (
        <div className="bg-white border border-[#D8DCD9] p-6 md:p-8 text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 bg-[#FFF5F5] text-[#9B2C2C] border border-[#FEB2B2] rounded-full mx-auto flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl">person_cancel</span>
          </div>

          <span className="text-[11px] font-semibold text-[#9B2C2C] uppercase tracking-wider block">
            Record Updated
          </span>

          <h2 className="text-xl font-bold text-[#111111]">
            Marked as No-Show
          </h2>

          <p className="text-xs text-[#66706B] max-w-sm mx-auto">
            Appointment <strong className="text-[#111111]">{app.id}</strong> for <strong className="text-[#111111]">{app.patientName}</strong> has been marked as a No-Show. The slot is now released.
          </p>

          <div className="pt-3">
            <Button
              variant="primary"
              size="md"
              onClick={() => setStaffScreen('S03_APPOINTMENTS')}
              icon="calendar_month"
            >
              Return to Appointments Roster
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-[#D8DCD9] p-6 md:p-8 shadow-xs space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-[#E5E7E6]">
            <div className="w-10 h-10 bg-[#FFF5F5] text-[#9B2C2C] border border-[#FEB2B2] flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">warning</span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-[#9B2C2C] uppercase tracking-wider block">
                Clinical Workflow Action
              </span>
              <h1 className="text-xl font-bold tracking-tight text-[#111111]">
                Mark Patient as No-Show?
              </h1>
            </div>
          </div>

          <p className="text-xs text-[#66706B] leading-relaxed">
            This will mark the student as absent for their scheduled appointment. Their slot will be closed and removed from today's active waiting queue.
          </p>

          {/* Student Info card */}
          <div className="bg-[#F7F8F7] border border-[#D8DCD9] p-4 text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-[#66706B]">Student Name:</span>
              <span className="font-bold text-[#111111]">{app.patientName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#66706B]">Student Index:</span>
              <span className="font-mono text-[#111111]">{app.studentIndex || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#66706B]">Reference:</span>
              <span className="font-reference font-semibold text-[#111111]">{app.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#66706B]">Scheduled Slot:</span>
              <span className="font-medium text-[#111111]">{app.time}</span>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-[#E5E7E6]">
            <button
              type="button"
              onClick={() => setStaffScreen('S04_APPOINTMENT_DETAIL')}
              className="text-xs font-semibold text-[#66706B] hover:text-[#111111] cursor-pointer"
            >
              Cancel
            </button>
            <Button
                  variant="destructive"
              size="lg"
              onClick={handleConfirm}
              icon="person_cancel"
            >
              Yes, Mark as No-Show
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
