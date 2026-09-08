import React, { useState } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { Button } from '../common/Button';
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

export const P06ReviewBooking: React.FC = () => {
  const { draftBooking, confirmBooking, setPatientScreen } = useClinic();
  const [submitting, setSubmitting] = useState(false);

  const siteName = CLINIC_SITE_LABELS[draftBooking.clinicSite]?.name || "Students' Clinic";
  const visitLabel = VISIT_TYPE_LABELS[draftBooking.visitType] || 'General OPD';

  const handleConfirm = () => {
    setSubmitting(true);
    setTimeout(() => {
      confirmBooking();
      setSubmitting(false);
    }, 450);
  };

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center py-8 md:py-14 px-4">
      <div className="w-full max-w-[560px] bg-white border border-[#D8DCD9] shadow-[0_2px_8px_rgba(0,0,0,0.05)] p-6 md:p-8">
        {/* Step Progress & Back */}
        <div className="flex items-center justify-between border-b border-[#E5E7E6] pb-3.5 mb-6">
          <button
            onClick={() => setPatientScreen('P04_05_DATE_TIME')}
            className="text-xs font-semibold text-[#66706B] hover:text-[#111111] flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Back</span>
          </button>
          <span className="text-[11px] font-semibold tracking-wider text-[#087F6C] bg-[#E7F5F1] px-2.5 py-0.5 uppercase">
            Step 6 of 6
          </span>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-[#111111] mb-1.5">
            Review Booking
          </h1>
          <p className="text-sm text-[#66706B] font-normal leading-relaxed">
            Please verify your consultation details before confirming.
          </p>
        </div>

        {/* Structured Summary Table */}
        <div className="border border-[#D8DCD9] divide-y divide-[#E5E7E6] mb-6 text-sm">
          <div className="p-3.5 bg-[#F7F8F7] flex justify-between items-center">
            <span className="text-xs font-medium text-[#66706B]">Patient Name</span>
            <span className="font-semibold text-[#111111]">{draftBooking.patientName}</span>
          </div>

          <div className="p-3.5 bg-white flex justify-between items-center">
            <span className="text-xs font-medium text-[#66706B]">Student Index</span>
            <span className="font-mono font-semibold text-[#111111]">{draftBooking.studentIndex}</span>
          </div>

          <div className="p-3.5 bg-[#F7F8F7] flex justify-between items-center">
            <span className="text-xs font-medium text-[#66706B]">Phone Number</span>
            <span className="font-mono font-semibold text-[#111111]">{draftBooking.phone}</span>
          </div>

          <div className="p-3.5 bg-white flex justify-between items-center">
            <span className="text-xs font-medium text-[#66706B]">Clinic</span>
            <span className="font-semibold text-[#111111]">KNUST {siteName}</span>
          </div>

          <div className="p-3.5 bg-[#F7F8F7] flex justify-between items-center">
            <span className="text-xs font-medium text-[#66706B]">Visit Type</span>
            <span className="font-semibold text-[#111111]">{visitLabel}</span>
          </div>

          <div className="p-3.5 bg-white flex justify-between items-center">
            <span className="text-xs font-medium text-[#66706B]">Clinician</span>
            <span className="font-semibold text-[#111111]">
              {draftBooking.doctor.name} ({draftBooking.doctor.room})
            </span>
          </div>

          <div className="p-3.5 bg-[#F7F8F7] flex justify-between items-center">
            <span className="text-xs font-medium text-[#66706B]">Date</span>
            <span className="font-semibold text-[#111111]">{draftBooking.date}</span>
          </div>

          <div className="p-3.5 bg-white flex justify-between items-center">
            <span className="text-xs font-medium text-[#66706B]">Time</span>
            <span className="font-bold text-[#087F6C]">{draftBooking.time}</span>
          </div>

          <div className="p-3.5 bg-[#E7F5F1]/30 flex justify-between items-center">
            <span className="text-xs font-medium text-[#087F6C]">Arrive By</span>
            <span className="font-bold text-[#087F6C]">{getArriveBy(draftBooking.time)}</span>
          </div>
        </div>

        {/* SMS Notice */}
        <div className="bg-[#F0F2F1] border border-[#D8DCD9] p-4 mb-6 flex items-start gap-3 text-left">
          <span className="material-symbols-outlined text-[#087F6C] text-xl shrink-0 mt-0.5">
            sms
          </span>
          <p className="text-xs text-[#66706B] font-normal leading-relaxed">
            A confirmation SMS with your reference code will be sent to <strong className="text-[#111111] font-semibold">{draftBooking.phone}</strong>. Booking success does not depend on SMS delivery.
          </p>
        </div>

        {/* CTA */}
        <div className="pt-2">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            loading={submitting}
            onClick={handleConfirm}
            icon="check_circle"
          >
            Confirm booking
          </Button>
        </div>
      </div>
    </div>
  );
};
