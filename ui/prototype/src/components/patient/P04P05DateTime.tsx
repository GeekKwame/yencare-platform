import React, { useEffect, useState } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { Button } from '../common/Button';
import { getArriveBy } from '../../lib/clinicQueue';

const DATES = [
  { day: 'Tue', date: '15 Sep 2026', full: 'Tuesday 15 September 2026' },
  { day: 'Wed', date: '16 Sep 2026', full: 'Wednesday 16 September 2026' },
  { day: 'Thu', date: '17 Sep 2026', full: 'Thursday 17 September 2026' },
  { day: 'Fri', date: '18 Sep 2026', full: 'Friday 18 September 2026' },
];

const TIME_SLOTS = [
  '8:30 AM',
  '9:00 AM',
  '9:30 AM',
  '10:00 AM',
  '10:30 AM',
  '11:00 AM',
  '2:00 PM',
  '2:30 PM',
];

export const P04P05DateTime: React.FC = () => {
  const {
    draftBooking,
    updateDraftBooking,
    setPatientScreen,
    simulateSlotTaken,
    setSimulateSlotTaken,
    isSlotOccupied,
    appointments,
  } = useClinic();
  const [selectedDate, setSelectedDate] = useState(draftBooking.date || 'Tuesday 15 September 2026');
  const [selectedTime, setSelectedTime] = useState(draftBooking.time || '10:30 AM');

  const doctorId = draftBooking.doctor.id;
  const slotTaken = (time: string) => isSlotOccupied(doctorId, selectedDate, time);

  useEffect(() => {
    if (!slotTaken(selectedTime)) return;
    const nextFree = TIME_SLOTS.find((time) => !isSlotOccupied(doctorId, selectedDate, time));
    if (nextFree) setSelectedTime(nextFree);
  }, [selectedDate, doctorId, selectedTime, appointments]);

  const handleContinue = () => {
    updateDraftBooking({
      date: selectedDate,
      time: selectedTime,
    });

    if (simulateSlotTaken || slotTaken(selectedTime)) {
      setPatientScreen('P08_SLOT_TAKEN');
      return;
    }

    setPatientScreen('P06_REVIEW');
  };

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center py-8 md:py-14 px-4">
      <div className="w-full max-w-[680px] bg-white border border-[#D8DCD9] shadow-[0_2px_8px_rgba(0,0,0,0.05)] p-6 md:p-8">
        {/* Step Progress & Back */}
        <div className="flex items-center justify-between border-b border-[#E5E7E6] pb-3.5 mb-6">
          <button
            onClick={() => setPatientScreen('P03_DOCTOR')}
            className="text-xs font-semibold text-[#66706B] hover:text-[#111111] flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Back</span>
          </button>
          <span className="text-[11px] font-semibold tracking-wider text-[#087F6C] bg-[#E7F5F1] px-2.5 py-0.5 uppercase">
            Step 5 of 6
          </span>
        </div>

        <div className="mb-6">
          <div className="text-[11px] font-semibold text-[#66706B] uppercase tracking-wider mb-1">
            {draftBooking.doctor.name} · {draftBooking.doctor.room}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111111] mb-1.5">
            Select Date & Time
          </h1>
          <p className="text-sm text-[#66706B] font-normal leading-relaxed">
            Choose an appointment date and 30-minute consultation slot.
          </p>
        </div>

        {/* Section 1: Choose Date */}
        <div className="mb-6">
          <label className="block text-xs font-semibold text-[#111111] mb-2.5">
            1. Available Dates
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {DATES.map((item) => {
              const isSelected = selectedDate === item.full;
              return (
                <button
                  key={item.full}
                  type="button"
                  onClick={() => setSelectedDate(item.full)}
                  className={`p-3 text-center border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#111111] text-white border-[#111111] shadow-sm'
                      : 'bg-white text-[#111111] border-[#D8DCD9] hover:bg-[#F0F2F1]'
                  }`}
                >
                  <span className="block text-[11px] uppercase tracking-wider opacity-75 font-medium">
                    {item.day}
                  </span>
                  <span className="block text-sm font-semibold mt-0.5">
                    {item.date}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 2: Choose Time Slot */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2.5">
            <label className="block text-xs font-semibold text-[#111111]">
              2. Available Time Slots ({selectedDate.split(' ')[0]})
            </label>
            <span className="text-[11px] text-[#66706B]">30-min window</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {TIME_SLOTS.map((time) => {
              const isSelected = selectedTime === time;
              const isAvailable = !slotTaken(time);
              return (
                <button
                  key={time}
                  type="button"
                  disabled={!isAvailable}
                  onClick={() => setSelectedTime(time)}
                  className={`p-3 text-center border transition-all ${
                    !isAvailable
                      ? 'bg-[#F0F2F1] text-[#8A948F] border-[#E5E7E6] cursor-not-allowed line-through opacity-70'
                      : isSelected
                        ? 'bg-[#087F6C] text-white border-[#087F6C] font-semibold shadow-sm'
                        : 'bg-white text-[#111111] border-[#D8DCD9] hover:border-[#087F6C] hover:bg-[#E7F5F1]/30 font-medium cursor-pointer'
                  }`}
                >
                  <span className="text-sm">{time}</span>
                  {!isAvailable && (
                    <span className="block text-[10px] font-normal text-[#8A948F] no-underline">
                      Taken
                    </span>
                  )}
                  {isSelected && (
                    <span className="block text-[10px] text-white font-normal">
                      Selected
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Summary Pill */}
        <div className="bg-[#F0F2F1] border border-[#D8DCD9] p-3.5 flex items-center justify-between text-xs mb-6">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-[#087F6C]">
              schedule
            </span>
            <span className="text-[#66706B]">Selected:</span>
            <strong className="text-[#111111] font-semibold">
              {selectedDate}, {selectedTime}
            </strong>
          </div>
          <span className="text-[11px] font-medium text-[#087F6C]">
            Arrive by {getArriveBy(selectedTime)}
          </span>
        </div>

        <div className="pt-4 border-t border-[#E5E7E6] flex flex-col sm:flex-row gap-3 items-center justify-between">
          <label className="text-[11px] text-[#66706B] flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={simulateSlotTaken}
              onChange={(e) => setSimulateSlotTaken(e.target.checked)}
              className="accent-[#087F6C]"
            />
            <span>Simulate slot clash (P08)</span>
          </label>

          <Button
            variant="primary"
            size="lg"
            onClick={handleContinue}
            icon="arrow_forward"
          >
            Review Booking
          </Button>
        </div>
      </div>
    </div>
  );
};
