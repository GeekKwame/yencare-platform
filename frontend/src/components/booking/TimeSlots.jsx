import { useState } from "react";
import { FaArrowLeft, FaArrowRight, FaCalendarAlt, FaClock } from "react-icons/fa";
import {
  AVAILABLE_DATES,
  TIME_SLOTS,
  formatDateLabel,
  formatTimeLabel,
  getArriveByLabel,
} from "../../data/bookingOptions";

const TimeSlots = ({ formData, updateFormData, onNext, onBack }) => {
  const [error, setError] = useState("");
  const arriveBy = getArriveByLabel(formData.appointmentTime);

  const handleContinue = () => {
    if (!formData.appointmentDate || !formData.appointmentTime) {
      setError("Please select a date and time for your appointment");
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

      <div className="mt-7">
        <div className="flex items-center gap-2 text-sm font-bold text-[#173b3a]">
          <FaCalendarAlt className="text-[#176b5f]" />
          Available dates
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {AVAILABLE_DATES.map((date) => (
            <button
              key={date.iso}
              type="button"
              onClick={() => {
                updateFormData({ appointmentDate: date.iso });
                setError("");
              }}
              className={`rounded-xl border p-3 text-left transition ${
                formData.appointmentDate === date.iso
                  ? "border-[#176b5f] bg-[#f5faf7] text-[#176b5f]"
                  : "border-gray-200 hover:border-[#9fc8bb]"
              }`}
            >
              <span className="block text-xs font-semibold text-gray-500">{date.day}</span>
              <span className="mt-1 block text-sm font-bold">{date.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-7">
        <div className="flex items-center gap-2 text-sm font-bold text-[#173b3a]">
          <FaClock className="text-[#176b5f]" />
          Available times
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {TIME_SLOTS.map((slot) => (
            <button
              key={slot.value}
              type="button"
              onClick={() => {
                updateFormData({ appointmentTime: slot.value });
                setError("");
              }}
              className={`rounded-xl border p-4 text-left text-sm font-semibold transition ${
                formData.appointmentTime === slot.value
                  ? "border-[#176b5f] bg-[#f5faf7] text-[#176b5f]"
                  : "border-gray-200 text-[#173b3a] hover:border-[#9fc8bb]"
              }`}
            >
              {slot.label}
            </button>
          ))}
        </div>
      </div>

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
        className="relative mt-7 flex w-full items-center justify-center rounded-xl bg-[#176b5f] px-6 py-4 text-sm font-semibold text-white transition hover:bg-[#14594f]"
      >
        <span>Review Booking</span>
        <FaArrowRight size={12} className="absolute right-6" />
      </button>
    </section>
  );
};

export default TimeSlots;
