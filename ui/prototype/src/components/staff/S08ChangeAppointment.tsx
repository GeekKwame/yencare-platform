import React, { useState } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { Button } from '../common/Button';

const AVAILABLE_NEW_TIMES = [
  '09:00 AM',
  '09:30 AM',
  '10:00 AM',
  '10:30 AM',
  '11:00 AM',
  '11:30 AM',
  '01:30 PM',
  '02:00 PM',
  '02:30 PM',
];

export const S08ChangeAppointment: React.FC = () => {
  const {
    appointments,
    selectedStaffAppointmentId,
    changeAppointmentTime,
    setStaffScreen,
  } = useClinic();

  const app = appointments.find((a) => a.id === selectedStaffAppointmentId);
  const [newTime, setNewTime] = useState('10:30 AM');
  const [reason, setReason] = useState('Clinic schedule adjustment due to emergency consult');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!app || !reason.trim()) return;

    changeAppointmentTime(app.id, newTime, reason);
    setSubmitted(true);
  };

  if (!app) {
    return (
      <div className="max-w-xl space-y-4">
        <p className="text-sm text-[#66706B]">
          Select a student from the roster first, then change their appointment time.
        </p>
        <Button variant="secondary" size="md" onClick={() => setStaffScreen('S03_APPOINTMENTS')}>
          Open roster
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between border-b border-[#D8DCD9] pb-3.5">
        <button
          onClick={() => setStaffScreen('S04_APPOINTMENT_DETAIL')}
          className="text-xs font-semibold text-[#66706B] hover:text-[#111111] flex items-center gap-1 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          <span>Back to Patient Record</span>
        </button>
        <span className="text-[11px] font-semibold px-2 py-0.5 bg-[#FEF7ED] text-[#B7791F] border border-[#FCD34D]">
          SCHEDULE MODIFICATION
        </span>
      </div>

      {submitted ? (
        <div className="bg-white border-2 border-[#087F6C] p-6 md:p-8 text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 bg-[#E7F5F1] text-[#087F6C] rounded-full mx-auto flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl">check</span>
          </div>

          <h2 className="text-xl font-bold text-[#111111]">
            Appointment Rescheduled
          </h2>

          <p className="text-xs text-[#66706B] max-w-sm mx-auto">
            {app.patientName}'s appointment ({app.id}) has been updated to <strong className="text-[#111111]">{newTime}</strong>.
            A simulated SMS notification has been dispatched to {app.phone}.
          </p>

          <div className="pt-3">
            <Button
              variant="primary"
              size="md"
              onClick={() => setStaffScreen('S04_APPOINTMENT_DETAIL')}
            >
              Return to Patient Record
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-[#D8DCD9] p-6 md:p-8 shadow-xs">
          <div className="mb-6">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#66706B] block mb-1">
              Staff Clinical Action
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-[#111111]">
              Change Appointment Time
            </h1>
            <p className="text-xs text-[#66706B] mt-1">
              Adjust scheduled time for {app.patientName} ({app.id}). The student will receive an SMS alert.
            </p>
          </div>

          {/* Current appointment info */}
          <div className="p-3.5 bg-[#F7F8F7] border border-[#D8DCD9] mb-6 grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[#66706B] block">Current Slot:</span>
              <span className="font-bold text-[#111111]">{app.date} at {app.time}</span>
            </div>
            <div>
              <span className="text-[#66706B] block">Student Index / Phone:</span>
              <span className="font-mono text-[#111111]">{app.studentIndex || app.phone}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* New Time Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#111111]">
                Select New Slot Time <span className="text-[#C53030]">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {AVAILABLE_NEW_TIMES.map((time) => {
                  const isCurrent = time === app.time;
                  const isSelected = time === newTime;
                  return (
                    <button
                      type="button"
                      key={time}
                      disabled={isCurrent}
                      onClick={() => setNewTime(time)}
                      className={`p-2.5 text-xs font-mono font-medium border text-center transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-[#F0F2F1] text-[#A0AEC0] border-[#E2E8F0] cursor-not-allowed'
                          : isSelected
                          ? 'bg-[#087F6C] text-white border-[#087F6C] font-bold shadow-xs'
                          : 'bg-white text-[#111111] border-[#D8DCD9] hover:border-[#087F6C]'
                      }`}
                    >
                      {time}
                      {isCurrent && <span className="block text-[9px] font-sans">Current</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Reason */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#111111]">
                Reason for Change (Included in student notification) <span className="text-[#C53030]">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                required
                className="w-full px-3.5 py-2.5 text-xs font-normal text-[#111111] border border-[#C8CDCA] focus:border-[#087F6C] focus:ring-1 focus:ring-[#087F6C] focus:outline-none"
              />
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-[#E5E7E6]">
              <button
                type="button"
                onClick={() => setStaffScreen('S04_APPOINTMENT_DETAIL')}
                className="text-xs font-semibold text-[#66706B] hover:text-[#111111] cursor-pointer"
              >
                Cancel
              </button>
              <Button
                type="submit"
                variant="accent"
                size="lg"
                icon="schedule_send"
              >
                Confirm Reschedule & Send SMS
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
