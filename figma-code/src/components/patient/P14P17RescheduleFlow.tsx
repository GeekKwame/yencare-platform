import React, { useState } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { Button } from '../common/Button';
import { ReferenceBlock } from '../common/ReferenceBlock';

const RESCHEDULE_DATES = [
  { day: 'Wed', date: '16 Sep 2026', full: 'Wednesday 16 September 2026' },
  { day: 'Thu', date: '17 Sep 2026', full: 'Thursday 17 September 2026' },
  { day: 'Fri', date: '18 Sep 2026', full: 'Friday 18 September 2026' },
  { day: 'Mon', date: '21 Sep 2026', full: 'Monday 21 September 2026' },
];

const RESCHEDULE_TIMES = [
  '09:00 AM',
  '10:30 AM',
  '11:00 AM',
  '02:00 PM',
  '03:00 PM',
];

export const P14P17RescheduleFlow: React.FC = () => {
  const {
    currentPatientAppointment,
    rescheduleDraft,
    updateRescheduleDraft,
    confirmReschedule,
    setPatientScreen,
    patientScreen,
  } = useClinic();

  const app = currentPatientAppointment;
  const refCode = app?.id || 'YC-4821';

  // Sub-step inside rescheduling flow: 1 (Date), 2 (Time), 3 (Review), 4 (Confirmed)
  const currentStep = 
    patientScreen === 'P14_RESCHEDULE_DATE' ? 1 :
    patientScreen === 'P15_RESCHEDULE_TIME' ? 2 :
    patientScreen === 'P16_RESCHEDULE_REVIEW' ? 3 : 4;

  const [selectedDate, setSelectedDate] = useState(rescheduleDraft.newDate || 'Wednesday 16 September 2026');
  const [selectedTime, setSelectedTime] = useState(rescheduleDraft.newTime || '11:00 AM');

  // STEP 1: P14 Reschedule Date
  if (currentStep === 1) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center py-8 md:py-14 px-4">
        <div className="w-full max-w-[560px] bg-white border border-[#D8DCD9] shadow-[0_2px_8px_rgba(0,0,0,0.05)] p-6 md:p-8">
          <div className="flex items-center justify-between border-b border-[#E5E7E6] pb-3.5 mb-6">
            <button
              onClick={() => setPatientScreen('P11_DETAILS')}
              className="text-xs font-semibold text-[#66706B] hover:text-[#111111] flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              <span>Back</span>
            </button>
            <span className="text-[11px] font-semibold tracking-wider text-[#087F6C] bg-[#E7F5F1] px-2.5 py-0.5 uppercase">
              Reschedule: Step 1 of 3
            </span>
          </div>

          <div className="mb-6">
            <span className="text-[11px] font-reference text-[#66706B] uppercase tracking-wider block mb-1">
              Ref: {refCode}
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-[#111111] mb-1.5">
              Choose New Date
            </h1>
            <p className="text-sm text-[#66706B] font-normal leading-relaxed">
              Select a new day for your consultation with {app?.doctor.name || 'Dr. Kwame Boateng'}.
            </p>
          </div>

          <div className="p-3 bg-[#F7F8F7] border border-[#D8DCD9] text-xs mb-6 flex justify-between items-center">
            <span className="text-[#66706B]">Current Booking:</span>
            <span className="font-semibold text-[#111111]">{app?.date}, {app?.time}</span>
          </div>

          <div className="space-y-2 mb-6">
            {RESCHEDULE_DATES.map((item) => {
              const isSelected = selectedDate === item.full;
              return (
                <button
                  key={item.full}
                  type="button"
                  onClick={() => setSelectedDate(item.full)}
                  className={`w-full p-3.5 text-left border flex items-center justify-between transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#E7F5F1]/40 border-[#087F6C] text-[#111111] font-semibold'
                      : 'bg-white text-[#111111] border-[#D8DCD9] hover:bg-[#F0F2F1]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs uppercase font-bold text-[#66706B]">{item.day}</span>
                    <span className="text-sm">{item.date}</span>
                  </div>
                  <span className={`material-symbols-outlined text-base ${isSelected ? 'text-[#087F6C]' : 'text-[#8A948F]'}`}>
                    {isSelected ? 'radio_button_checked' : 'radio_button_unchecked'}
                  </span>
                </button>
              );
            })}
          </div>

          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={() => {
              updateRescheduleDraft({ newDate: selectedDate });
              setPatientScreen('P15_RESCHEDULE_TIME');
            }}
            icon="arrow_forward"
          >
            Continue to Choose Time
          </Button>
        </div>
      </div>
    );
  }

  // STEP 2: P15 Reschedule Time
  if (currentStep === 2) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center py-8 md:py-14 px-4">
        <div className="w-full max-w-[560px] bg-white border border-[#D8DCD9] shadow-[0_2px_8px_rgba(0,0,0,0.05)] p-6 md:p-8">
          <div className="flex items-center justify-between border-b border-[#E5E7E6] pb-3.5 mb-6">
            <button
              onClick={() => setPatientScreen('P14_RESCHEDULE_DATE')}
              className="text-xs font-semibold text-[#66706B] hover:text-[#111111] flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              <span>Back</span>
            </button>
            <span className="text-[11px] font-semibold tracking-wider text-[#087F6C] bg-[#E7F5F1] px-2.5 py-0.5 uppercase">
              Reschedule: Step 2 of 3
            </span>
          </div>

          <div className="mb-6">
            <span className="text-[11px] font-medium text-[#66706B] uppercase tracking-wider block mb-1">
              Date: {selectedDate}
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-[#111111] mb-1.5">
              Choose New Time
            </h1>
            <p className="text-sm text-[#66706B] font-normal leading-relaxed">
              Select an available time slot for your new consultation date.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5 mb-6">
            {RESCHEDULE_TIMES.map((time) => {
              const isSelected = selectedTime === time;
              return (
                <button
                  key={time}
                  type="button"
                  onClick={() => setSelectedTime(time)}
                  className={`p-3.5 text-center border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#087F6C] text-white border-[#087F6C] font-semibold shadow-sm'
                      : 'bg-white text-[#111111] border-[#D8DCD9] hover:bg-[#F0F2F1]'
                  }`}
                >
                  <span className="text-sm font-semibold block">{time}</span>
                  <span className={`text-[10px] uppercase tracking-wider block mt-0.5 ${isSelected ? 'text-white/80' : 'text-[#66706B]'}`}>
                    {isSelected ? 'Selected' : 'Available'}
                  </span>
                </button>
              );
            })}
          </div>

          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={() => {
              updateRescheduleDraft({ newDate: selectedDate, newTime: selectedTime });
              setPatientScreen('P16_RESCHEDULE_REVIEW');
            }}
            icon="arrow_forward"
          >
            Review New Time
          </Button>
        </div>
      </div>
    );
  }

  // STEP 3: P16 Reschedule Review
  if (currentStep === 3) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center py-8 md:py-14 px-4">
        <div className="w-full max-w-[560px] bg-white border border-[#D8DCD9] shadow-[0_2px_8px_rgba(0,0,0,0.05)] p-6 md:p-8">
          <div className="flex items-center justify-between border-b border-[#E5E7E6] pb-3.5 mb-6">
            <button
              onClick={() => setPatientScreen('P15_RESCHEDULE_TIME')}
              className="text-xs font-semibold text-[#66706B] hover:text-[#111111] flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              <span>Back</span>
            </button>
            <span className="text-[11px] font-semibold tracking-wider text-[#087F6C] bg-[#E7F5F1] px-2.5 py-0.5 uppercase">
              Review: Step 3 of 3
            </span>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-[#111111] mb-1.5">
              Confirm New Time
            </h1>
            <p className="text-sm text-[#66706B] font-normal leading-relaxed">
              Review the difference between your previous appointment and the new requested time.
            </p>
          </div>

          {/* Comparison Table: Previous vs New */}
          <div className="border border-[#D8DCD9] divide-y divide-[#E5E7E6] mb-6 text-xs">
            <div className="p-3.5 bg-[#F7F8F7] flex items-center justify-between">
              <span className="text-[#66706B] font-normal">Previous Time</span>
              <span className="font-medium text-[#8A948F] line-through">
                {app?.date}, {app?.time}
              </span>
            </div>
            <div className="p-3.5 bg-[#E7F5F1]/30 flex items-center justify-between">
              <span className="font-semibold text-[#087F6C]">New Time</span>
              <span className="font-bold text-[#087F6C] text-sm">
                {rescheduleDraft.newDate}, {rescheduleDraft.newTime}
              </span>
            </div>
            <div className="p-3.5 bg-white flex items-center justify-between">
              <span className="text-[#66706B] font-normal">Doctor</span>
              <span className="font-semibold text-[#111111]">{app?.doctor.name || 'Dr. Kwame Boateng'}</span>
            </div>
            <div className="p-3.5 bg-[#F7F8F7] flex items-center justify-between">
              <span className="text-[#66706B] font-normal">Reference</span>
              <span className="font-reference font-semibold text-[#111111]">{refCode} (Retained)</span>
            </div>
          </div>

          <div className="bg-[#F0F2F1] border border-[#D8DCD9] p-3.5 mb-6 text-left text-xs text-[#66706B] leading-relaxed">
            Your appointment reference code remains <strong className="text-[#111111] font-reference">{refCode}</strong>.
          </div>

          {/* Locked CTA: Confirm new time (Do not claim free of charge) */}
          <div className="space-y-2.5">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={confirmReschedule}
              icon="check_circle"
            >
              Confirm new time
            </Button>

            <Button
              variant="secondary"
              size="md"
              fullWidth
              onClick={() => setPatientScreen('P11_DETAILS')}
            >
              Keep current appointment
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // STEP 4: P17 Reschedule Confirmed (Appointment Updated)
  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center py-8 md:py-14 px-4">
      <div className="w-full max-w-[560px] bg-white border border-[#D8DCD9] shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-6 md:p-8 text-center">
        <div className="mb-4 flex justify-center">
          <div className="w-14 h-14 bg-[#E7F5F1] text-[#087F6C] border border-[#99D5C8] rounded-full flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl">done_all</span>
          </div>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#111111] mb-1.5">
          Appointment Updated
        </h1>
        <p className="text-sm text-[#66706B] font-normal mb-5">
          Your new consultation time has been successfully confirmed.
        </p>

        {/* Retained Reference Code Block */}
        <ReferenceBlock
          code={refCode}
          subtext="Your reference code remains the same. Present this code upon arrival."
        />

        {/* Updated details */}
        <div className="border border-[#D8DCD9] p-4 bg-[#F7F8F7] text-left text-xs mb-5 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[#66706B] font-normal">New Date & Time:</span>
            <span className="font-bold text-[#087F6C]">{app?.date}, {app?.time}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#66706B] font-normal">Doctor:</span>
            <span className="font-semibold text-[#111111]">{app?.doctor.name || 'Dr. Kwame Boateng'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#66706B] font-normal">Clinic:</span>
            <span className="font-medium text-[#111111]">[Partner clinic]</span>
          </div>
        </div>

        {/* STITCH LOCK: Show the phone number in the SMS line */}
        <div className="bg-[#F0F2F1] border border-[#D8DCD9] p-3.5 mb-6 text-left text-xs text-[#66706B] leading-relaxed flex items-start gap-2">
          <span className="material-symbols-outlined text-[#087F6C] text-[16px] shrink-0 mt-0.5">
            sms
          </span>
          <p>
            An updated confirmation text has been sent to <strong className="text-[#111111]">{app?.phone || '024 123 4567'}</strong>.
          </p>
        </div>

        <div className="space-y-2.5">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={() => setPatientScreen('P11_DETAILS')}
            icon="visibility"
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
