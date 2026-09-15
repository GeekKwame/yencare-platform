import React, { useState } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { Button } from '../common/Button';
import { Doctor } from '../../types/clinic';
import { CLINIC_SITE_LABELS } from '../../types/clinic';

export const P03ChooseDoctor: React.FC = () => {
  const { draftBooking, updateDraftBooking, setPatientScreen, allDoctors } = useClinic();
  const [selectedId, setSelectedId] = useState(draftBooking.doctor?.id || allDoctors[0].id);

  const handleContinue = () => {
    const doc = allDoctors.find((d) => d.id === selectedId) || allDoctors[0];
    updateDraftBooking({ doctor: doc });
    setPatientScreen('P04_05_DATE_TIME');
  };

  const siteName = CLINIC_SITE_LABELS[draftBooking.clinicSite]?.name || "Students' Clinic";

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center py-8 md:py-14 px-4">
      <div className="w-full max-w-[560px] bg-white border border-[#D8DCD9] shadow-[0_2px_8px_rgba(0,0,0,0.05)] p-6 md:p-8">
        {/* Step Progress & Back */}
        <div className="flex items-center justify-between border-b border-[#E5E7E6] pb-3.5 mb-6">
          <button
            onClick={() => setPatientScreen('P02C_VISIT_TYPE')}
            className="text-xs font-semibold text-[#66706B] hover:text-[#111111] flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Back</span>
          </button>
          <span className="text-[11px] font-semibold tracking-wider text-[#087F6C] bg-[#E7F5F1] px-2.5 py-0.5 uppercase">
            Step 4 of 6
          </span>
        </div>

        <div className="mb-6">
          <div className="text-[11px] font-semibold text-[#66706B] uppercase tracking-wider mb-1">
            {siteName} · General Outpatient
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111111] mb-1.5">
            Choose Clinician
          </h1>
          <p className="text-sm text-[#66706B] font-normal leading-relaxed">
            Select the attending clinician for your consultation.
          </p>
        </div>

        {/* Doctor Selection Cards */}
        <div className="space-y-3 mb-8">
          {allDoctors.map((doc) => {
            const isSelected = selectedId === doc.id;
            const initials = doc.name.split(' ').filter((_, i) => i > 0).map((n) => n[0]).join('').slice(0, 2);
            return (
              <div
                key={doc.id}
                onClick={() => setSelectedId(doc.id)}
                className={`p-5 border-2 transition-colors cursor-pointer relative ${
                  isSelected
                    ? 'border-[#087F6C] bg-[#E7F5F1]/30'
                    : 'border-[#D8DCD9] bg-white hover:bg-[#F0F2F1]/50'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 bg-[#111111] text-white flex items-center justify-center font-bold text-base shrink-0 border border-[#111111]">
                      {initials}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[#111111]">
                        {doc.name}
                      </h3>
                      <p className="text-xs font-medium text-[#66706B] mt-0.5">
                        {doc.specialty} · {doc.room}
                      </p>
                      <p className="text-xs text-[#8A948F] mt-1 font-normal">
                        {doc.title}
                      </p>
                    </div>
                  </div>
                  <div className={`w-6 h-6 flex items-center justify-center shrink-0 ${
                    isSelected ? 'bg-[#087F6C] text-white' : 'bg-[#F0F2F1] text-[#8A948F]'
                  }`}>
                    <span className="material-symbols-outlined text-[16px]">
                      {isSelected ? 'check' : 'radio_button_unchecked'}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#E5E7E6]/50 flex items-center justify-between text-xs">
                  <span className={`font-semibold flex items-center gap-1.5 ${doc.available ? 'text-[#087F6C]' : 'text-[#8A948F]'}`}>
                    <span className={`w-2 h-2 rounded-full ${doc.available ? 'bg-[#087F6C]' : 'bg-[#8A948F]'}`}></span>
                    {doc.available ? 'Available for bookings' : 'Not available'}
                  </span>
                  <span className="text-[#66706B] font-normal">30 min slots</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-4 border-t border-[#E5E7E6]">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleContinue}
            icon="arrow_forward"
          >
            Continue to Date & Time
          </Button>
        </div>
      </div>
    </div>
  );
};
