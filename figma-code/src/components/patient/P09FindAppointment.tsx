import React, { useState } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { Button } from '../common/Button';
import { GhanaPhoneInput } from '../common/GhanaPhoneInput';

export const P09FindAppointment: React.FC = () => {
  const { appointments, setActivePatientAppointmentId, setPatientScreen } = useClinic();
  const [phone, setPhone] = useState('024 123 4567');
  const [reference, setReference] = useState('YC-4821');
  const [error, setError] = useState<string | null>(null);

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanRef = reference.trim().toUpperCase();
    const cleanPhone = phone.replace(/\s+/g, '');

    const found = appointments.find((a) => {
      const matchRef = a.id.toUpperCase() === cleanRef;
      const matchPhone = a.phone.replace(/\s+/g, '') === cleanPhone;
      return matchRef || matchPhone;
    });

    if (found) {
      setActivePatientAppointmentId(found.id);
      setPatientScreen('P11_DETAILS');
    } else {
      setError('Appointment not found. Please check your phone number and reference code.');
    }
  };

  const handleFillDemo = () => {
    setPhone('024 123 4567');
    setReference('YC-4821');
    setError(null);
  };

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center py-8 md:py-14 px-4">
      <div className="w-full max-w-[560px] bg-white border border-[#D8DCD9] shadow-[0_2px_8px_rgba(0,0,0,0.05)] p-6 md:p-8">
        {/* Back link & autofill demo */}
        <div className="flex items-center justify-between border-b border-[#E5E7E6] pb-3.5 mb-6">
          <button
            onClick={() => setPatientScreen('P01_HOME')}
            className="text-xs font-semibold text-[#66706B] hover:text-[#111111] flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Home</span>
          </button>
          <button
            type="button"
            onClick={handleFillDemo}
            className="text-[11px] font-semibold text-[#087F6C] hover:underline cursor-pointer"
          >
            Autofill Demo (YC-4821)
          </button>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-[#111111] mb-1.5">
            Find Appointment
          </h1>
          <p className="text-sm text-[#66706B] font-normal leading-relaxed">
            Enter the phone number used during booking and your reference code.
          </p>
        </div>

        <form onSubmit={handleLookup} className="space-y-5">
          {/* Ghana Phone */}
          <GhanaPhoneInput
            value={phone}
            onChange={(val) => {
              setPhone(val);
              if (error) setError(null);
            }}
            required
          />

          {/* Reference Code Input */}
          <div className="text-left space-y-1.5">
            <label className="block text-xs font-semibold text-[#111111]">
              Appointment Reference Code <span className="text-[#C53030]">*</span>
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => {
                setReference(e.target.value.toUpperCase());
                if (error) setError(null);
              }}
              placeholder="e.g. YC-4821"
              maxLength={8}
              className="w-full px-3.5 py-2.5 text-sm font-reference text-[#111111] border border-[#C8CDCA] uppercase tracking-wider focus:border-[#087F6C] focus:ring-1 focus:ring-[#087F6C] focus:outline-none transition-all"
            />
            <p className="text-[11px] font-normal text-[#66706B]">
              Your reference code was sent via SMS (e.g. YC-4821).
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3.5 bg-[#FDF2F2] border border-[#F8B4B4] text-[#C53030] text-xs font-medium flex items-start gap-2">
              <span className="material-symbols-outlined text-[18px] shrink-0 text-[#C53030]">
                error
              </span>
              <span>{error}</span>
            </div>
          )}

          <div className="pt-3 border-t border-[#E5E7E6]">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              icon="search"
            >
              Find appointment
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
