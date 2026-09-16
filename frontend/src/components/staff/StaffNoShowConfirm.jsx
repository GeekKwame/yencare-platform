import { useState } from "react";

export default function StaffNoShowConfirm({ appointment, busy, onBack, onConfirm }) {
  const [confirmed, setConfirmed] = useState(false);

  if (!appointment) {
    return (
      <div className="mx-auto max-w-xl space-y-4 pt-6">
        <p className="text-sm text-[#66706B]">Select a student from the roster first.</p>
        <button type="button" onClick={onBack} className="rounded-xl border border-[#dce8df] px-4 py-2 text-sm font-semibold">
          Open roster
        </button>
      </div>
    );
  }

  if (confirmed) {
    return (
      <div className="mx-auto max-w-xl space-y-4 pt-6">
        <div className="border border-[#D8DCD9] bg-white p-8 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9B2C2C]">Record updated</p>
          <h2 className="mt-2 text-xl font-bold">Marked as no-show</h2>
          <p className="mx-auto mt-2 max-w-sm text-xs text-[#66706B]">
            Appointment <strong>{appointment.reference}</strong> for{" "}
            <strong>{appointment.patientName}</strong> has been marked as a no-show. The slot is released.
          </p>
          <button
            type="button"
            onClick={onBack}
            className="mt-5 rounded-xl bg-[#176b5f] px-4 py-2.5 text-sm font-semibold text-white"
          >
            Return to appointments roster
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 pt-6">
      <div className="space-y-6 rounded-2xl border border-[#D8DCD9] bg-white p-6 md:p-8">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9B2C2C]">
            Clinical workflow action
          </p>
          <h1 className="mt-1 text-xl font-bold">Mark patient as no-show?</h1>
        </div>
        <p className="text-xs leading-5 text-[#66706B]">
          This marks the student as absent for their scheduled appointment. Their slot is closed and
          removed from today&apos;s waiting queue.
        </p>
        <div className="space-y-2 border border-[#D8DCD9] bg-[#F7F8F7] p-4 text-xs">
          <div className="flex justify-between">
            <span className="text-[#66706B]">Student name</span>
            <span className="font-bold">{appointment.patientName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#66706B]">Student index</span>
            <span className="font-mono">{appointment.studentIndex || "N/A"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#66706B]">Reference</span>
            <span className="font-semibold">{appointment.reference}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#66706B]">Scheduled slot</span>
            <span>{appointment.time}</span>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-[#E5E7E6] pt-4">
          <button type="button" onClick={onBack} className="text-xs font-semibold text-[#66706B]">
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              const ok = await onConfirm();
              if (ok) setConfirmed(true);
            }}
            className="rounded-xl bg-[#9B2C2C] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy ? "Updating…" : "Yes, mark as no-show"}
          </button>
        </div>
      </div>
    </div>
  );
}
