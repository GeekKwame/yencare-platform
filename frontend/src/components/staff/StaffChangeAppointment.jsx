import { useEffect, useState } from "react";
import { formatDateLabel, formatTimeLabel } from "../../data/bookingOptions";
import { isFutureSlot } from "../../lib/accraTime";
import { mapTimeSlot } from "../../lib/catalogView";
import { listTimeSlots } from "../../services/catalog";
import { rescheduleAppointment } from "../../services/appointments";

export default function StaffChangeAppointment({ appointment, onBack, onDone }) {
  const [slots, setSlots] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [reason, setReason] = useState("Clinic schedule adjustment due to emergency consult");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!appointment?.clinicianId) {
        setLoading(false);
        setError("This record has no clinician assigned.");
        return;
      }
      try {
        const rows = await listTimeSlots({ clinicianId: appointment.clinicianId });
        if (cancelled) return;
        setSlots(
          (Array.isArray(rows) ? rows : [])
            .map(mapTimeSlot)
            .filter((slot) => !slot.isBooked && isFutureSlot(slot.date, slot.startTime)),
        );
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.error || "Could not load open slots.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [appointment?.clinicianId]);

  if (!appointment) {
    return (
      <div className="max-w-xl space-y-4">
        <p className="text-sm text-[#66706B]">Select a student from the roster first.</p>
        <button type="button" onClick={onBack} className="rounded-xl border border-[#dce8df] px-4 py-2 text-sm font-semibold">
          Open roster
        </button>
      </div>
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!selectedId || !reason.trim()) return;
    setSaving(true);
    setError("");
    try {
      await rescheduleAppointment(appointment.id, selectedId, {
        staffChangeReason: reason.trim(),
      });
      setSubmitted(true);
      onDone?.();
    } catch (err) {
      setError(err.response?.data?.error || "Could not change this appointment time.");
    } finally {
      setSaving(false);
    }
  }

  const chosen = slots.find((slot) => slot.id === selectedId);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between border-b border-[#D8DCD9] pb-3.5">
        <button type="button" onClick={onBack} className="text-xs font-semibold text-[#66706B] hover:text-[#111111]">
          ← Back to patient record
        </button>
        <span className="border border-[#FCD34D] bg-[#FEF7ED] px-2 py-0.5 text-[11px] font-semibold text-[#B7791F]">
          Schedule modification
        </span>
      </div>

      {submitted ? (
        <div className="border-2 border-[#087F6C] bg-white p-8 text-center">
          <h2 className="text-xl font-bold text-[#111111]">Appointment rescheduled</h2>
          <p className="mx-auto mt-2 max-w-sm text-xs text-[#66706B]">
            {appointment.patientName}&apos;s appointment ({appointment.reference}) has been updated
            {chosen ? ` to ${formatDateLabel(chosen.date)} at ${formatTimeLabel(chosen.startTime)}` : ""}.
            An SMS notification has been sent.
          </p>
          <button
            type="button"
            onClick={onBack}
            className="mt-5 rounded-xl bg-[#176b5f] px-4 py-2.5 text-sm font-semibold text-white"
          >
            Return to patient record
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="rounded-2xl border border-[#D8DCD9] bg-white p-6 shadow-sm md:p-8">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#66706B]">Staff clinical action</p>
          <h1 className="mt-1 text-2xl font-bold text-[#111111]">Change appointment time</h1>
          <p className="mt-1 text-xs text-[#66706B]">
            Adjust the scheduled time for {appointment.patientName} ({appointment.reference}). The student will receive an SMS.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3 border border-[#D8DCD9] bg-[#F7F8F7] p-3.5 text-xs">
            <div>
              <span className="block text-[#66706B]">Current slot</span>
              <span className="font-bold text-[#111111]">
                {appointment.date} at {appointment.time}
              </span>
            </div>
            <div>
              <span className="block text-[#66706B]">Student index / phone</span>
              <span className="font-mono text-[#111111]">{appointment.studentIndex || appointment.phone}</span>
            </div>
          </div>

          <label className="mt-6 block text-xs font-semibold text-[#111111]">
            Select new slot <span className="text-[#C53030]">*</span>
          </label>
          {loading ? (
            <p className="mt-3 text-sm text-[#66706B]">Loading open slots…</p>
          ) : slots.length === 0 ? (
            <p className="mt-3 text-sm text-[#66706B]">No later open slots for this clinician.</p>
          ) : (
            <div className="mt-2 grid max-h-64 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
              {slots.map((slot) => (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => setSelectedId(slot.id)}
                  className={`p-2.5 text-center text-xs font-medium ${
                    selectedId === slot.id
                      ? "bg-[#087F6C] font-bold text-white"
                      : "border border-[#D8DCD9] bg-white text-[#111111] hover:border-[#087F6C]"
                  }`}
                >
                  <span className="block font-mono">{formatTimeLabel(slot.startTime)}</span>
                  <span className="block text-[10px] font-sans opacity-80">{formatDateLabel(slot.date)}</span>
                </button>
              ))}
            </div>
          )}

          <label className="mt-5 block text-xs font-semibold text-[#111111]">
            Reason for change (included in student notification) <span className="text-[#C53030]">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            required
            className="mt-1.5 w-full border border-[#C8CDCA] px-3.5 py-2.5 text-xs outline-none focus:border-[#087F6C]"
          />

          {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

          <div className="mt-5 flex items-center justify-between border-t border-[#E5E7E6] pt-4">
            <button type="button" onClick={onBack} className="text-xs font-semibold text-[#66706B]">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !selectedId}
              className="rounded-xl bg-[#176b5f] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? "Saving…" : "Confirm reschedule & send SMS"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
