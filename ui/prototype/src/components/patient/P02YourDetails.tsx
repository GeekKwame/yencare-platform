import React, { useState } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { Button } from '../common/Button';
import { GhanaPhoneInput } from '../common/GhanaPhoneInput';

export const P02YourDetails: React.FC = () => {
  const { draftBooking, updateDraftBooking, setPatientScreen } = useClinic();
  const [name, setName] = useState(draftBooking.patientName || 'Akosua Boateng');
  const [phone, setPhone] = useState(draftBooking.phone || '024 XXX XXXX');
  const [studentIndex, setStudentIndex] = useState(draftBooking.studentIndex || '20612345');
  const [nhis, setNhis] = useState(draftBooking.nhisNumber || '');
  const [errors, setErrors] = useState<{ name?: string; phone?: string; studentIndex?: string }>({});

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { name?: string; phone?: string; studentIndex?: string } = {};

    if (!name.trim()) {
      newErrors.name = 'Please enter your full name';
    }

    const cleanPhone = phone.replace(/\s+/g, '');
    if (!cleanPhone || cleanPhone.length < 9) {
      newErrors.phone = 'Please enter a valid Ghana phone number (e.g. 024 123 4567)';
    }

    if (!studentIndex.trim() || studentIndex.trim().length < 6) {
      newErrors.studentIndex = 'Please enter a valid student index number (e.g. 20612345)';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    updateDraftBooking({
      patientName: name.trim(),
      phone: phone.trim(),
      studentIndex: studentIndex.trim(),
      nhisNumber: nhis.trim(),
    });

    setPatientScreen('P02B_CLINIC_SITE');
  };

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center py-8 md:py-14 px-4">
      <div className="w-full max-w-[560px] bg-white border border-[#D8DCD9] shadow-[0_2px_8px_rgba(0,0,0,0.05)] p-6 md:p-8">
        {/* Step Progress & Back Navigation */}
        <div className="flex items-center justify-between border-b border-[#E5E7E6] pb-3.5 mb-6">
          <button
            onClick={() => setPatientScreen('P01_HOME')}
            className="text-xs font-semibold text-[#66706B] hover:text-[#111111] flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Home</span>
          </button>
          <span className="text-[11px] font-semibold tracking-wider text-[#087F6C] bg-[#E7F5F1] px-2.5 py-0.5 uppercase">
            Step 1 of 6
          </span>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-[#111111] mb-1.5">
            Your Details
          </h1>
          <p className="text-sm text-[#66706B] font-normal leading-relaxed">
            Please enter your student details. We will send your appointment reference by SMS.
          </p>
        </div>

        <form onSubmit={handleContinue} className="space-y-5">
          {/* Full Name */}
          <div className="text-left space-y-1.5">
            <label className="block text-xs font-semibold text-[#111111]">
              Full Name <span className="text-[#C53030]">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors({ ...errors, name: undefined });
              }}
              placeholder="e.g. Akosua Boateng"
              className={`w-full px-3.5 py-2.5 text-sm font-normal text-[#111111] border transition-all ${
                errors.name
                  ? 'border-[#C53030] bg-[#FDF2F2]'
                  : 'border-[#C8CDCA] bg-white focus:border-[#087F6C] focus:ring-1 focus:ring-[#087F6C]'
              } focus:outline-none`}
            />
            {errors.name && (
              <p className="text-xs font-medium text-[#C53030] flex items-center gap-1 pt-0.5">
                <span className="material-symbols-outlined text-[14px]">error</span>
                <span>{errors.name}</span>
              </p>
            )}
          </div>

          {/* Student Index Number */}
          <div className="text-left space-y-1.5">
            <label className="block text-xs font-semibold text-[#111111]">
              Student Index Number <span className="text-[#C53030]">*</span>
            </label>
            <input
              type="text"
              value={studentIndex}
              onChange={(e) => {
                setStudentIndex(e.target.value);
                if (errors.studentIndex) setErrors({ ...errors, studentIndex: undefined });
              }}
              placeholder="e.g. 20612345"
              maxLength={10}
              className={`w-full px-3.5 py-2.5 text-sm font-mono font-medium text-[#111111] border transition-all ${
                errors.studentIndex
                  ? 'border-[#C53030] bg-[#FDF2F2]'
                  : 'border-[#C8CDCA] bg-white focus:border-[#087F6C] focus:ring-1 focus:ring-[#087F6C]'
              } focus:outline-none tracking-wider`}
            />
            {errors.studentIndex ? (
              <p className="text-xs font-medium text-[#C53030] flex items-center gap-1 pt-0.5">
                <span className="material-symbols-outlined text-[14px]">error</span>
                <span>{errors.studentIndex}</span>
              </p>
            ) : (
              <p className="text-[11px] font-normal text-[#66706B]">
                Your KNUST student identification number
              </p>
            )}
          </div>

          {/* Ghana Phone */}
          <GhanaPhoneInput
            value={phone}
            onChange={(val) => {
              setPhone(val);
              if (errors.phone) setErrors({ ...errors, phone: undefined });
            }}
            error={errors.phone}
            required
          />

          {/* Optional NHIS */}
          <div className="text-left space-y-1.5">
            <label className="block text-xs font-semibold text-[#111111]">
              NHIS Number <span className="text-[#8A948F] font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={nhis}
              onChange={(e) => setNhis(e.target.value)}
              placeholder="e.g. 12345678"
              className="w-full px-3.5 py-2.5 text-sm font-normal text-[#111111] border border-[#C8CDCA] bg-white focus:border-[#087F6C] focus:ring-1 focus:ring-[#087F6C] focus:outline-none transition-all"
            />
            <p className="text-[11px] font-normal text-[#66706B]">
              National Health Insurance Scheme number, if available
            </p>
          </div>

          <div className="pt-4 border-t border-[#E5E7E6]">
            <Button type="submit" variant="primary" size="lg" fullWidth icon="arrow_forward">
              Continue
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
