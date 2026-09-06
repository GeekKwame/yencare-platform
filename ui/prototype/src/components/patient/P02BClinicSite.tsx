import React from 'react';
import { useClinic } from '../../context/ClinicContext';
import { Button } from '../common/Button';
import { ClinicSite, CLINIC_SITE_LABELS } from '../../types/clinic';

export const P02BClinicSite: React.FC = () => {
  const { draftBooking, updateDraftBooking, setPatientScreen } = useClinic();
  const selected = draftBooking.clinicSite;

  const sites: { id: ClinicSite; icon: string; hours: string }[] = [
    { id: 'students-clinic', icon: 'local_hospital', hours: 'Mon–Fri: 8:00 AM – 4:00 PM' },
    { id: 'social-science-gf7', icon: 'apartment', hours: 'Mon–Fri: 9:00 AM – 3:00 PM' },
  ];

  const handleSelect = (site: ClinicSite) => {
    updateDraftBooking({ clinicSite: site });
  };

  const handleContinue = () => {
    setPatientScreen('P02C_VISIT_TYPE');
  };

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center py-8 md:py-14 px-4">
      <div className="w-full max-w-[560px] bg-white border border-[#D8DCD9] shadow-[0_2px_8px_rgba(0,0,0,0.05)] p-6 md:p-8">
        {/* Step Progress & Back */}
        <div className="flex items-center justify-between border-b border-[#E5E7E6] pb-3.5 mb-6">
          <button
            onClick={() => setPatientScreen('P02_DETAILS')}
            className="text-xs font-semibold text-[#66706B] hover:text-[#111111] flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Back</span>
          </button>
          <span className="text-[11px] font-semibold tracking-wider text-[#087F6C] bg-[#E7F5F1] px-2.5 py-0.5 uppercase">
            Step 2 of 6
          </span>
        </div>

        <div className="mb-6">
          <div className="text-[11px] font-semibold text-[#66706B] uppercase tracking-wider mb-1">
            KNUST University Health Services
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111111] mb-1.5">
            Choose Your Clinic
          </h1>
          <p className="text-sm text-[#66706B] font-normal leading-relaxed">
            Select the clinic site where you would like to be seen.
          </p>
        </div>

        {/* Clinic Site Selection */}
        <div className="space-y-3 mb-8">
          {sites.map((site) => {
            const info = CLINIC_SITE_LABELS[site.id];
            const isSelected = selected === site.id;
            return (
              <button
                key={site.id}
                type="button"
                onClick={() => handleSelect(site.id)}
                className={`w-full text-left p-5 border-2 transition-all cursor-pointer ${
                  isSelected
                    ? 'border-[#087F6C] bg-[#E7F5F1]/30'
                    : 'border-[#D8DCD9] bg-white hover:border-[#087F6C]/40 hover:bg-[#F7F8F7]'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className={`w-11 h-11 flex items-center justify-center shrink-0 ${
                      isSelected
                        ? 'bg-[#087F6C] text-white'
                        : 'bg-[#F0F2F1] text-[#66706B]'
                    }`}>
                      <span className="material-symbols-outlined text-xl">{site.icon}</span>
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[#111111]">
                        {info.name}
                      </h3>
                      <p className="text-xs text-[#66706B] mt-0.5 font-medium">
                        {info.org}
                      </p>
                      <p className="text-[11px] text-[#8A948F] mt-1">
                        {info.address}
                      </p>
                    </div>
                  </div>
                  <div className={`w-6 h-6 flex items-center justify-center shrink-0 ${
                    isSelected
                      ? 'bg-[#087F6C] text-white'
                      : 'bg-[#F0F2F1] text-[#8A948F]'
                  }`}>
                    <span className="material-symbols-outlined text-[16px]">
                      {isSelected ? 'check' : 'radio_button_unchecked'}
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-[#E5E7E6]/60 flex items-center gap-2 text-[11px]">
                  <span className="material-symbols-outlined text-[14px] text-[#087F6C]">schedule</span>
                  <span className="text-[#66706B]">{site.hours}</span>
                </div>
              </button>
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
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
};
