import React, { useState } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { Button } from '../common/Button';
import { VisitType, VISIT_TYPE_LABELS } from '../../types/clinic';

export const P02CVisitType: React.FC = () => {
  const { draftBooking, updateDraftBooking, setPatientScreen } = useClinic();
  const [selected, setSelected] = useState<VisitType>(draftBooking.visitType || 'general-opd');
  const [showEmergency, setShowEmergency] = useState(false);

  const visitOptions: { id: VisitType; icon: string; description: string }[] = [
    { id: 'general-opd', icon: 'stethoscope', description: 'General outpatient consultation' },
    { id: 'follow-up', icon: 'event_repeat', description: 'Return visit or review of previous consultation' },
    { id: 'dressing', icon: 'healing', description: 'Wound dressing or minor procedure' },
    { id: 'other', icon: 'medical_services', description: 'Other clinic service' },
  ];

  const handleContinue = () => {
    updateDraftBooking({ visitType: selected });
    setPatientScreen('P03_DOCTOR');
  };

  // Emergency gate
  if (showEmergency) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center py-8 md:py-14 px-4">
        <div className="w-full max-w-[560px] bg-white border border-[#D8DCD9] shadow-[0_2px_8px_rgba(0,0,0,0.05)] p-6 md:p-8 text-center">
          <div className="mb-5 flex justify-center">
            <div className="w-14 h-14 bg-[#FDF2F2] border border-[#F8B4B4] text-[#C53030] rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl">emergency</span>
            </div>
          </div>

          <span className="inline-block px-3 py-1 bg-[#FDF2F2] text-[#C53030] border border-[#F8B4B4] text-[11px] font-bold uppercase tracking-wider mb-3">
            Emergency Notice
          </span>

          <h1 className="text-2xl font-bold tracking-tight text-[#111111] mb-3">
            This Is Not for Emergencies
          </h1>
          <p className="text-sm text-[#66706B] font-normal leading-relaxed mb-6 max-w-md mx-auto">
            YɛnCare appointments are not intended for emergencies. Please seek immediate medical attention at the appropriate University Health Services facility.
          </p>

          <div className="bg-[#FDF2F2] border border-[#F8B4B4] p-4 mb-6 text-left text-xs text-[#C53030] leading-relaxed">
            <strong className="block mb-1">If you are experiencing a medical emergency:</strong>
            Please go directly to the University Hospital or call for emergency assistance immediately. Do not wait for an appointment.
          </div>

          <div className="space-y-2.5">
            <Button
              variant="secondary"
              size="lg"
              fullWidth
              onClick={() => setShowEmergency(false)}
              icon="arrow_back"
            >
              Go back and choose a visit type
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
  }

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center py-8 md:py-14 px-4">
      <div className="w-full max-w-[560px] bg-white border border-[#D8DCD9] shadow-[0_2px_8px_rgba(0,0,0,0.05)] p-6 md:p-8">
        {/* Step Progress & Back */}
        <div className="flex items-center justify-between border-b border-[#E5E7E6] pb-3.5 mb-6">
          <button
            onClick={() => setPatientScreen('P02B_CLINIC_SITE')}
            className="text-xs font-semibold text-[#66706B] hover:text-[#111111] flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Back</span>
          </button>
          <span className="text-[11px] font-semibold tracking-wider text-[#087F6C] bg-[#E7F5F1] px-2.5 py-0.5 uppercase">
            Step 3 of 6
          </span>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-[#111111] mb-1.5">
            What Brings You In?
          </h1>
          <p className="text-sm text-[#66706B] font-normal leading-relaxed">
            Select the type of clinic visit you need.
          </p>
        </div>

        {/* Visit Type Selection */}
        <div className="space-y-2.5 mb-6">
          {visitOptions.map((option) => {
            const isSelected = selected === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setSelected(option.id)}
                className={`w-full text-left p-4 border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                  isSelected
                    ? 'border-[#087F6C] bg-[#E7F5F1]/30 font-semibold'
                    : 'border-[#D8DCD9] bg-white hover:bg-[#F0F2F1]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`material-symbols-outlined text-xl ${isSelected ? 'text-[#087F6C]' : 'text-[#66706B]'}`}>
                    {option.icon}
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-[#111111]">
                      {VISIT_TYPE_LABELS[option.id]}
                    </div>
                    <div className="text-[11px] text-[#8A948F] font-normal mt-0.5">
                      {option.description}
                    </div>
                  </div>
                </div>
                <span className={`material-symbols-outlined text-base ${isSelected ? 'text-[#087F6C]' : 'text-[#8A948F]'}`}>
                  {isSelected ? 'radio_button_checked' : 'radio_button_unchecked'}
                </span>
              </button>
            );
          })}
        </div>

        {/* Emergency gate link */}
        <div className="bg-[#FDF2F2] border border-[#F8B4B4] p-3.5 mb-6 text-left">
          <button
            onClick={() => setShowEmergency(true)}
            className="text-xs text-[#C53030] font-semibold flex items-center gap-2 cursor-pointer hover:underline w-full text-left"
          >
            <span className="material-symbols-outlined text-[16px]">emergency</span>
            <span>I think this is an emergency</span>
          </button>
        </div>

        <div className="pt-4 border-t border-[#E5E7E6]">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleContinue}
            icon="arrow_forward"
          >
            Continue to Choose Clinician
          </Button>
        </div>
      </div>
    </div>
  );
};
