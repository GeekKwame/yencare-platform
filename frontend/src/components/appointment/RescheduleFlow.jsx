import { useEffect, useMemo, useState } from "react";
import { FaArrowLeft } from "react-icons/fa";
import { formatDateLabel, formatTimeLabel } from "../../data/bookingOptions";
import { isFutureSlot } from "../../lib/accraTime";
import { entityId, mapAppointment } from "../../lib/appointmentView";
import { listTimeSlots } from "../../services/catalog";
import { rescheduleAppointment } from "../../services/appointments";

function slotId(slot) {
  return slot?.id || slot?._id || "";
}

const RescheduleFlow = ({ appointment, onBack, onSuccess }) => {
  const view = mapAppointment(appointment);
  const [step, setStep] = useState(1);
  const [slots, setSlots] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [confirmed, setConfirmed] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setLoadError("");
      try {
        const rows = await listTimeSlots({
          clinicianId: view.clinicianId,
          available: "true",
        });
        const future = (Array.isArray(rows) ? rows : []).filter((slot) => {
          const clinicianMatch =
            !view.clinicianId ||
            entityId(slot.clinicianId) === view.clinicianId;
          return clinicianMatch && isFutureSlot(slot.date, slot.startTime);
        });
        if (!cancelled) setSlots(future);
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            err.response?.data?.error ||
              "Could not load available times. Try again shortly.",
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [view.clinicianId]);

  const dates = useMemo(() => {
    const unique = [...new Set(slots.map((slot) => slot.date))].sort();
    return unique;
  }, [slots]);

  const times = useMemo(
    () => slots.filter((slot) => slot.date === selectedDate),
    [slots, selectedDate],
  );

  if (confirmed) {
    const updated = mapAppointment(confirmed.appointment || confirmed);
    return (
      <section className="w-full rounded-3xl border border-[#dce8df] bg-white p-6 text-center shadow-[0_20px_50px_rgba(23,59,58,0.09)] sm:p-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[#99d5c8] bg-[#e7f5f1] text-2xl text-[#087f6c]">
          ✓
        </div>
        <h2 className="display-font mt-4 text-2xl font-bold text-[#173b3a] sm:text-3xl">
          Appointment Updated
        </h2>
        <p className="mt-2 text-sm text-[#607672]">
          Your new consultation time has been successfully confirmed.
        </p>
        <div className="mt-6 bg-gray-100 p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
            Reference (unchanged)
          </p>
          <p className="mt-1 text-3xl font-bold tracking-wide text-[#173b3a]">
            {updated.referenceCode}
          </p>
        </div>
        <div className="mt-5 space-y-3 text-left text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-[#607672]">New date & time</span>
            <span className="font-bold text-[#176b5f]">
              {updated.dateLabel}, {updated.timeLabel}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[#607672]">Clinician</span>
            <span className="font-semibold text-[#173b3a]">{updated.clinician}</span>
          </div>
        </div>
        <div className="mt-6 rounded-2xl border border-[#dce8df] bg-[#f5faf7] p-4 text-left text-sm leading-6 text-[#607672]">
          An updated confirmation text has been sent to{" "}
          <strong className="text-[#173b3a]">{updated.phoneNumber}</strong>.
        </div>
        <button
          type="button"
          onClick={() => onSuccess(confirmed.appointment || confirmed)}
          className="mt-7 w-full cursor-pointer rounded-xl bg-[#176b5f] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#14594f]"
        >
          View appointment
        </button>
      </section>
    );
  }

  return (
    <section className="w-full rounded-3xl border border-[#dce8df] bg-white p-6 shadow-[0_20px_50px_rgba(23,59,58,0.09)] sm:p-8">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={step === 1 ? onBack : () => setStep((value) => value - 1)}
          className="flex cursor-pointer items-center gap-2 rounded-xl border border-[#dce8df] px-5 py-3 text-sm font-semibold text-[#173b3a] transition hover:bg-[#f5faf7]"
        >
          <FaArrowLeft size={11} />
          Back
        </button>
        <span className="rounded-full bg-[#e7f5f1] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#176b5f]">
          Reschedule: Step {step} of 3
        </span>
      </div>

      <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-[#607672]">
        Ref: {view.referenceCode}
      </p>

      {step === 1 && (
        <>
          <h2 className="display-font mt-2 text-2xl font-bold text-[#173b3a]">
            Choose New Date
          </h2>
          <p className="mt-2 text-sm text-[#607672]">
            Select a new day for your consultation with {view.clinician}.
          </p>
          <div className="mt-5 flex items-center justify-between rounded-xl border border-[#dce8df] bg-[#f5faf7] p-3 text-sm">
            <span className="text-[#607672]">Current booking</span>
            <span className="font-semibold text-[#173b3a]">
              {view.dateLabel}, {view.timeLabel}
            </span>
          </div>
          {isLoading ? (
            <p className="mt-6 text-sm text-[#607672]">Loading available days…</p>
          ) : loadError ? (
            <p className="mt-6 text-sm text-red-500">{loadError}</p>
          ) : dates.length === 0 ? (
            <p className="mt-6 text-sm text-[#607672]">
              No future slots are open for this clinician. Ask reception for help.
            </p>
          ) : (
            <div className="mt-6 space-y-2">
              {dates.map((iso) => (
                <button
                  key={iso}
                  type="button"
                  onClick={() => {
                    setSelectedDate(iso);
                    setSelectedSlot(null);
                  }}
                  className={`flex w-full cursor-pointer items-center justify-between rounded-xl border px-4 py-3.5 text-left text-sm transition ${
                    selectedDate === iso
                      ? "border-[#176b5f] bg-[#e7f5f1]/50 font-semibold text-[#173b3a]"
                      : "border-[#dce8df] hover:bg-[#f5faf7]"
                  }`}
                >
                  {formatDateLabel(iso)}
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            disabled={!selectedDate}
            onClick={() => setStep(2)}
            className="mt-7 w-full cursor-pointer rounded-xl bg-[#176b5f] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#14594f] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Continue to Choose Time
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <h2 className="display-font mt-2 text-2xl font-bold text-[#173b3a]">
            Choose New Time
          </h2>
          <p className="mt-2 text-sm text-[#607672]">
            Date: {formatDateLabel(selectedDate)}
          </p>
          <div className="mt-6 grid grid-cols-2 gap-2.5">
            {times.map((slot) => {
              const selected = slotId(selectedSlot) === slotId(slot);
              return (
                <button
                  key={slotId(slot)}
                  type="button"
                  onClick={() => setSelectedSlot(slot)}
                  className={`cursor-pointer rounded-xl border p-3.5 text-center transition ${
                    selected
                      ? "border-[#176b5f] bg-[#176b5f] text-white"
                      : "border-[#dce8df] hover:bg-[#f5faf7]"
                  }`}
                >
                  <span className="block text-sm font-semibold">
                    {formatTimeLabel(slot.startTime)}
                  </span>
                  <span className={`mt-0.5 block text-[10px] uppercase tracking-wider ${selected ? "text-white/80" : "text-[#607672]"}`}>
                    {selected ? "Selected" : "Available"}
                  </span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            disabled={!selectedSlot}
            onClick={() => setStep(3)}
            className="mt-7 w-full cursor-pointer rounded-xl bg-[#176b5f] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#14594f] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Review New Time
          </button>
        </>
      )}

      {step === 3 && (
        <>
          <h2 className="display-font mt-2 text-2xl font-bold text-[#173b3a]">
            Confirm New Time
          </h2>
          <p className="mt-2 text-sm text-[#607672]">
            Review the difference between your previous appointment and the new
            requested time.
          </p>
          <div className="mt-6 divide-y divide-[#e5e7e6] overflow-hidden rounded-2xl border border-[#dce8df] text-sm">
            <div className="flex justify-between bg-[#f5faf7] px-4 py-3.5">
              <span className="text-[#607672]">Previous time</span>
              <span className="font-medium text-[#8a948f] line-through">
                {view.dateLabel}, {view.timeLabel}
              </span>
            </div>
            <div className="flex justify-between bg-[#e7f5f1]/40 px-4 py-3.5">
              <span className="font-semibold text-[#176b5f]">New time</span>
              <span className="font-bold text-[#176b5f]">
                {formatDateLabel(selectedSlot?.date)},{" "}
                {formatTimeLabel(selectedSlot?.startTime)}
              </span>
            </div>
            <div className="flex justify-between px-4 py-3.5">
              <span className="text-[#607672]">Clinician</span>
              <span className="font-semibold text-[#173b3a]">{view.clinician}</span>
            </div>
            <div className="flex justify-between bg-[#f5faf7] px-4 py-3.5">
              <span className="text-[#607672]">Reference</span>
              <span className="font-semibold text-[#173b3a]">
                {view.referenceCode} (retained)
              </span>
            </div>
          </div>
          {saveError && (
            <p className="mt-4 text-xs text-red-500" role="alert">
              {saveError}
            </p>
          )}
          <div className="mt-7 flex flex-col gap-3">
            <button
              type="button"
              disabled={isSaving}
              onClick={async () => {
                setIsSaving(true);
                setSaveError("");
                try {
                  const result = await rescheduleAppointment(
                    view.referenceCode || view.id,
                    slotId(selectedSlot),
                  );
                  setConfirmed(result);
                } catch (err) {
                  setSaveError(
                    err.response?.data?.error ||
                      "Could not reschedule. That slot may have been taken.",
                  );
                } finally {
                  setIsSaving(false);
                }
              }}
              className="w-full cursor-pointer rounded-xl bg-[#176b5f] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#14594f] disabled:opacity-70"
            >
              {isSaving ? "Confirming…" : "Confirm new time"}
            </button>
            <button
              type="button"
              onClick={onBack}
              className="w-full cursor-pointer rounded-xl border border-[#dce8df] px-6 py-3.5 text-sm font-semibold text-[#173b3a] transition hover:bg-[#f5faf7]"
            >
              Keep current appointment
            </button>
          </div>
        </>
      )}
    </section>
  );
};

export default RescheduleFlow;
