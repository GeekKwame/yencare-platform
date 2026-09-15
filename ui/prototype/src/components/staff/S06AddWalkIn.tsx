import React, { useState } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { Button } from '../common/Button';
import { GhanaPhoneInput } from '../common/GhanaPhoneInput';
import { VisitType, VISIT_TYPE_LABELS } from '../../types/clinic';

export const S06AddWalkIn: React.FC = () => {
  const { addWalkIn, setStaffScreen } = useClinic();

  const [patientName, setPatientName] = useState('');
  const [studentIndex, setStudentIndex] = useState('');
  const [phone, setPhone] = useState('024');
  const [visitType, setVisitType] = useState<VisitType>('general-opd');
  const [notes, setNotes] = useState('');
  const [createdToken, setCreatedToken] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim()) return;

    const token = addWalkIn({
      patientName,
      studentIndex: studentIndex.trim() || undefined,
      phone,
      visitType,
      notes: notes.trim() || undefined,
    });

    setCreatedToken(token);
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#D8DCD9] pb-3.5">
        <button
          onClick={() => setStaffScreen('S05_LIVE_QUEUE')}
          className="text-xs font-semibold text-[#66706B] hover:text-[#111111] flex items-center gap-1 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          <span>Back to Live Queue</span>
        </button>
        <span className="text-[11px] font-semibold px-2 py-0.5 bg-[#EBF8FF] text-[#2B6CB0] border border-[#BEE3F8]">
          WALK-IN REGISTRATION
        </span>
      </div>

      {createdToken ? (
        <div className="bg-white border-2 border-[#087F6C] p-6 md:p-8 text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 bg-[#E7F5F1] text-[#087F6C] rounded-full mx-auto flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl">check</span>
          </div>

          <span className="text-[11px] font-semibold text-[#087F6C] uppercase tracking-wider block">
            Walk-in Successfully Queued
          </span>

          <h2 className="text-xl font-bold text-[#111111]">
            {patientName} Added to Live Queue
          </h2>

          <div className="p-4 bg-[#F7F8F7] border border-[#D8DCD9] inline-block min-w-[200px] my-2">
            <div className="text-[10px] text-[#66706B] font-semibold uppercase">Assigned Token</div>
            <div className="text-4xl font-bold font-mono text-[#087F6C] mt-1">
              {createdToken}
            </div>
          </div>

          <p className="text-xs text-[#66706B] max-w-sm mx-auto">
            The student has been issued a walk-in token and added to the waiting corridor. An SMS notification has been simulated to {phone}.
          </p>

          <div className="pt-3 flex justify-center gap-3">
            <Button
              variant="secondary"
              size="md"
              onClick={() => {
                setPatientName('');
                setStudentIndex('');
                setPhone('024');
                setNotes('');
                setCreatedToken(null);
              }}
            >
              Add Another Walk-In
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => setStaffScreen('S05_LIVE_QUEUE')}
              icon="reorder"
            >
              Go to Live Queue
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-[#D8DCD9] p-6 md:p-8 shadow-xs">
          <div className="mb-6">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#66706B] block mb-1">
              Reception Desk Desk Workstation
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-[#111111]">
              Register Walk-In Student
            </h1>
            <p className="text-xs text-[#66706B] mt-1">
              For unscheduled students presenting physically at KNUST Students' Clinic reception.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Student Name */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#111111]">
                Student Full Name <span className="text-[#C53030]">*</span>
              </label>
              <input
                type="text"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="e.g. Kwame Ofori Atta"
                className="w-full px-3.5 py-2.5 text-xs font-normal text-[#111111] border border-[#C8CDCA] focus:border-[#087F6C] focus:ring-1 focus:ring-[#087F6C] focus:outline-none"
                required
              />
            </div>

            {/* Student Index Number */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#111111]">
                Student Index Number (Optional but recommended)
              </label>
              <input
                type="text"
                value={studentIndex}
                onChange={(e) => setStudentIndex(e.target.value)}
                placeholder="e.g. 20689412"
                className="w-full px-3.5 py-2.5 text-xs font-normal text-[#111111] border border-[#C8CDCA] focus:border-[#087F6C] focus:ring-1 focus:ring-[#087F6C] focus:outline-none font-mono"
              />
            </div>

            {/* Ghana Phone */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#111111]">
                Mobile Phone (for queue SMS alert)
              </label>
              <GhanaPhoneInput
                value={phone}
                onChange={setPhone}
              />
            </div>

            {/* Visit Type */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#111111]">
                Visit Type
              </label>
              <select
                value={visitType}
                onChange={(e) => setVisitType(e.target.value as VisitType)}
                className="w-full px-3.5 py-2.5 text-xs font-normal text-[#111111] border border-[#C8CDCA] focus:border-[#087F6C] focus:ring-1 focus:ring-[#087F6C] focus:outline-none bg-white"
              >
                {(Object.entries(VISIT_TYPE_LABELS) as [VisitType, string][]).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Staff Notes */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#111111]">
                Triage Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Brief triage note, e.g. headache since morning, vitals recorded..."
                className="w-full px-3.5 py-2 text-xs font-normal text-[#111111] border border-[#C8CDCA] focus:border-[#087F6C] focus:ring-1 focus:ring-[#087F6C] focus:outline-none"
              />
            </div>

            {/* Submit */}
            <div className="pt-4 flex items-center justify-between border-t border-[#E5E7E6]">
              <button
                type="button"
                onClick={() => setStaffScreen('S05_LIVE_QUEUE')}
                className="text-xs font-semibold text-[#66706B] hover:text-[#111111] cursor-pointer"
              >
                Cancel
              </button>
              <Button
                type="submit"
                variant="accent"
                size="lg"
                icon="add"
              >
                Issue Walk-in Token & Queue
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
