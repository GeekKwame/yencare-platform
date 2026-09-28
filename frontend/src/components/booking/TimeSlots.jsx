import { useEffect, useMemo, useState } from "react";
import { FaArrowLeft, FaArrowRight, FaCalendarAlt, FaClock } from "react-icons/fa";
import {
  formatDateLabel,
  formatDayAndDate,
  formatTimeLabel,
  getArriveByLabel,
} from "../../data/bookingOptions";
import { accraTodayIso, isFutureSlot } from "../../lib/accraTime";
import { mapTimeSlot } from "../../lib/catalogView";
import { listTimeSlots } from "../../services/catalog";
import api from "../../services/api";
import { Button } from "../ui";

const TimeSlots = ({ formData, updateFormData, onNext, onBack }) => {
  const [error, setError] = useState("");
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const [tick, setTick] = useState(() => Date.now());
  const arriveBy = getArriveByLabel(formData.appointmentTime);

  // Periodically refresh the live clock ticker every 60s so passed slots/dates update in real time
  useEffect(() => {
    const timer = setInterval(() => {
      setTick(Date.now());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load({ silent = false } = {}) {
      if (!formData.clinicianId) {
        setSlots([]);
        setLoading(false);
        setLoadError("Select a clinician before choosing a time.");
        return;
      }

      if (!silent) {
        setLoading(true);
        setLoadError("");
      }
      try {
        const rows = await listTimeSlots({
          clinicianId: formData.clinicianId,
          fromDate: accraTodayIso(),
        });
        const mapped = (Array.isArray(rows) ? rows : [])
          .map(mapTimeSlot)
          .filter((slot) => slot.date && slot.startTime);
        if (!cancelled) setSlots(mapped);
      } catch (err) {
        if (!cancelled && !silent) {
          setSlots([]);
          setLoadError(
            err.response?.data?.error ||
              "Could not load appointment times. Check that the API is running.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    const eventsUrl = `${api.defaults.baseURL}/appointments/events`;
    let source;
    try {
      source = new EventSource(eventsUrl);
      const refresh = () => {
        if (!cancelled) load({ silent: true });
      };
      source.addEventListener("slotBooked", refresh);
      source.addEventListener("slotReleased", refresh);
    } catch {
      source = null;
    }

    return () => {
      cancelled = true;
      source?.close();
    };
  }, [formData.clinicianId, reloadToken]);

  // Only include candidate dates on or after today that have at least one open, future-available consultation slot
  const dates = useMemo(() => {
    const today = accraTodayIso();
    const candidates = [...new Set(slots.map((slot) => slot.date))]
      .filter((iso) => iso >= today)
      .sort();

    return candidates.filter((iso) => {
      return slots.some(
        (slot) =>
          slot.date === iso &&
          !slot.isBooked &&
          isFutureSlot(slot.date, slot.startTime),
      );
    });
  }, [slots, tick]);

  // Ensure selected date stays in sync with currently available dates
  useEffect(() => {
    if (dates.length > 0) {
      if (!formData.appointmentDate || !dates.includes(formData.appointmentDate)) {
        updateFormData({
          appointmentDate: dates[0],
          appointmentTime: "",
          timeSlotId: "",
        });
      }
    } else if (formData.appointmentDate) {
      updateFormData({
        appointmentDate: "",
        appointmentTime: "",
        timeSlotId: "",
      });
    }
  }, [dates, formData.appointmentDate]);

  const times = useMemo(
    () =>
      slots
        .filter(
          (slot) =>
            slot.date === formData.appointmentDate &&
            isFutureSlot(slot.date, slot.startTime),
        )
        .sort((a, b) => String(a.startTime).localeCompare(String(b.startTime))),
    [slots, formData.appointmentDate, tick],
  );

  const handleContinue = () => {
    if (!formData.appointmentDate || !formData.appointmentTime) {
      setError("Please select a date and time for your appointment");
      return;
    }
    if (!formData.timeSlotId) {
      setError("Please choose an available consultation slot");
      return;
    }
    const selected = slots.find((slot) => slot.id === formData.timeSlotId);
    if (!selected || selected.isBooked || !isFutureSlot(selected.date, selected.startTime)) {
      setError("That consultation time has passed or was taken. Please choose another slot.");
      return;
    }
    onNext();
  };

  return (
    <section className="w-full rounded-3xl border border-[#dce8df] bg-white p-6 shadow-[0_20px_50px_rgba(23,59,58,0.09)] sm:p-8">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 rounded-xl border border-[#dce8df] px-5 py-3 text-sm font-semibold text-[#173b3a] transition hover:bg-[#f5faf7]"
      >
        <FaArrowLeft size={11} />
        Back
      </button>

      <div className="mt-7 rounded-2xl bg-[#f5faf7] p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#c37d32]">
          Selected clinician
        </p>
        <h2 className="mt-2 text-xl font-bold text-[#173b3a] sm:text-2xl">
          {formData.clinician}
        </h2>
        <p className="mt-1 text-sm text-gray-500">{formData.clinicianRoom}</p>
      </div>

      <div className="mt-8 text-center">
        <h2 className="text-2xl font-bold leading-tight text-[#173b3a] sm:text-3xl">
          Select Date & Time
        </h2>
        <span className="mt-2 inline-block rounded-full bg-[#dce8df] px-3 py-1 text-xs font-semibold text-[#173b3a]">
          Step 5 of 6
        </span>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
          Choose an appointment date and 30-minute consultation slot
        </p>
      </div>

      {loading ? (
        <p className="mt-8 text-center text-sm text-[#607672]">Loading available times…</p>
      ) : loadError ? (
        <div className="mt-8 space-y-3 text-center">
          <p className="text-sm text-error" role="alert">{loadError}</p>
          <Button variant="secondary" onClick={() => setReloadToken((n) => n + 1)}>
            Retry
          </Button>
        </div>
      ) : dates.length === 0 ? (
        <p className="mt-8 text-center text-sm text-[#607672]">
          No consultation slots are open for this clinician. Try another clinician or ask reception.
        </p>
      ) : (
        <>
          <div className="mt-7">
            <div className="flex items-center gap-2 text-sm font-bold text-[#173b3a]">
              <FaCalendarAlt className="text-[#176b5f]" />
              Available dates
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {dates.map((iso) => {
                const openCount = slots.filter(
                  (slot) =>
                    slot.date === iso &&
                    !slot.isBooked &&
                    isFutureSlot(slot.date, slot.startTime),
                ).length;
                const { day, label } = formatDayAndDate(iso);
                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => {
                      updateFormData({
                        appointmentDate: iso,
                        appointmentTime: "",
                        timeSlotId: "",
                      });
                      setError("");
                    }}
                    className={`rounded-xl border p-3 text-left transition ${
                      formData.appointmentDate === iso
                        ? "border-[#176b5f] bg-[#f5faf7] text-[#176b5f]"
                        : "border-gray-200 hover:border-[#9fc8bb]"
                    }`}
                  >
                    <span className="block text-xs font-semibold text-gray-500">
                      {day}
                    </span>
                    <span className="mt-1 block text-sm font-bold">
                      {label}
                    </span>
                    <span className="mt-1 block text-[10px] font-medium text-[#607672]">
                      {openCount} open
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {formData.appointmentDate && (
            <div className="mt-7">
              <div className="flex items-center justify-between gap-2 text-sm font-bold text-[#173b3a]">
                <span className="flex items-center gap-2">
                  <FaClock className="text-[#176b5f]" />
                  Available times
                </span>
                <span className="text-[11px] font-medium text-[#607672]">30-min window</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {times.map((slot) => {
                  const taken = slot.isBooked;
                  const selected = formData.timeSlotId === slot.id;
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      disabled={taken}
                      onClick={() => {
                        updateFormData({
                          appointmentTime: slot.startTime,
                          timeSlotId: slot.id,
                          roomId: slot.roomId || formData.roomId,
                        });
                        setError("");
                      }}
                      className={`rounded-xl border p-3 text-center text-sm font-semibold transition ${
                        taken
                          ? "cursor-not-allowed border-[#e5e7e6] bg-[#f0f2f1] text-[#8a948f] line-through opacity-70"
                          : selected
                            ? "border-[#176b5f] bg-[#176b5f] text-white shadow-sm"
                            : "border-gray-200 text-[#173b3a] hover:border-[#9fc8bb]"
                      }`}
                    >
                      <span className="block">{formatTimeLabel(slot.startTime)}</span>
                      {taken && (
                        <span className="mt-0.5 block text-[10px] font-normal no-underline">
                          Taken
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {formData.appointmentDate && formData.appointmentTime && (
        <div className="mt-6 rounded-xl border border-[#ead7ad] bg-[#fffaf0] p-4 text-sm text-[#76551f]">
          <strong>Appointment:</strong> {formatDateLabel(formData.appointmentDate)} at{" "}
          {formatTimeLabel(formData.appointmentTime)}.
          {arriveBy
            ? ` Please arrive by ${arriveBy} (15 minutes before).`
            : " Please arrive 15 minutes before your appointment."}
        </div>
      )}

      {error && <p className="mt-4 text-sm font-medium text-red-500">{error}</p>}

      <button
        type="button"
        onClick={handleContinue}
        disabled={loading}
        className="relative mt-7 flex w-full items-center justify-center rounded-xl bg-[#176b5f] px-6 py-4 text-sm font-semibold text-white transition hover:bg-[#14594f] disabled:opacity-60"
      >
        <span>Review Booking</span>
        <FaArrowRight size={12} className="absolute right-6" />
      </button>
    </section>
  );
};

export default TimeSlots;
