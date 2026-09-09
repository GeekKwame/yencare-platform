import { useState } from "react";
import { Link } from "react-router-dom";
import {
  FaArrowLeft,
  FaCalendarAlt,
  FaCheck,
  FaCheckCircle,
  FaClock,
  FaHospital,
  FaIdCard,
  FaPhone,
  FaStethoscope,
  FaUser,
} from "react-icons/fa";

const ReviewBooking = ({ formData, onBack, onReset }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [bookingRef, setBookingRef] = useState("");

  const handleConfirm = () => {
    setIsSubmitting(true);

    // Simulate booking confirmation dispatch
    setTimeout(() => {
      // Generate a speakable reference code matching YC-XXXX pattern
      const code = `YC-${Math.floor(1000 + Math.random() * 9000)}`;
      setBookingRef(code);
      setIsSubmitting(false);
      setIsConfirmed(true);
    }, 600);
  };

  if (isConfirmed) {
    return (
      <section className="w-full rounded-3xl border border-[#dce8df] bg-white p-6 shadow-[0_20px_50px_rgba(23,59,58,0.09)] sm:p-8">
        <div className="text-center">
          {/* Success Icon */}
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#99d5c8] bg-[#e7f5f1] text-[#087f6c]">
            <FaCheck className="text-2xl" />
          </div>

          <span className="mt-4 inline-block rounded-full bg-[#dce8df] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#173b3a]">
            Booking Confirmed
          </span>

          <h2 className="display-font mt-2 text-2xl font-bold text-[#173b3a] sm:text-3xl">
            You&apos;re All Set!
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Your appointment has been booked. Present your reference code at the clinic reception.
          </p>

          {/* Reference Code Card */}
          <div className="mx-auto mt-6 max-w-sm rounded-2xl border-2 border-dashed border-[#176b5f]/40 bg-[#f5faf7] p-5 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#c37d32]">
              Booking Reference
            </p>
            <p className="display-font mt-1 text-3xl font-extrabold tracking-wider text-[#176b5f]">
              {bookingRef}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Show this code to the receptionist upon arrival
            </p>
          </div>

          {/* Summary Recap */}
          <div className="mx-auto mt-6 max-w-md divide-y divide-gray-100 rounded-2xl border border-[#dce8df] bg-white text-left text-sm">
            <div className="flex justify-between p-3.5">
              <span className="text-xs font-medium text-gray-500">Patient</span>
              <span className="font-semibold text-[#173b3a]">{formData.fullName}</span>
            </div>
            <div className="flex justify-between p-3.5">
              <span className="text-xs font-medium text-gray-500">Clinic</span>
              <span className="font-semibold text-[#173b3a]">{formData.clinic}</span>
            </div>
            <div className="flex justify-between p-3.5">
              <span className="text-xs font-medium text-gray-500">Clinician</span>
              <span className="font-semibold text-[#173b3a]">
                {formData.clinician} ({formData.clinicianRoom})
              </span>
            </div>
            <div className="flex justify-between p-3.5">
              <span className="text-xs font-medium text-gray-500">Scheduled Time</span>
              <span className="font-bold text-[#176b5f]">
                {formData.appointmentDate} · {formData.appointmentTime}
              </span>
            </div>
          </div>

          {/* SMS Notice */}
          <div className="mx-auto mt-6 max-w-md rounded-xl border border-green-200 bg-green-50 p-4 text-left">
            <div className="flex items-start gap-3">
              <FaCheckCircle className="mt-0.5 shrink-0 text-green-600" />
              <div>
                <p className="text-sm font-bold text-green-800">SMS Confirmation Sent</p>
                <p className="mt-0.5 text-xs text-green-700">
                  A text with your booking code has been dispatched to{" "}
                  <strong>{formData.phoneNumber}</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* Next Steps Buttons */}
          <div className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row">
            <Link
              to="/queue"
              className="flex flex-1 items-center justify-center rounded-xl bg-[#176b5f] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#14594f]"
            >
              Track Live Queue
            </Link>
            {onReset && (
              <button
                type="button"
                onClick={onReset}
                className="flex flex-1 items-center justify-center rounded-xl border border-[#dce8df] px-6 py-3.5 text-sm font-semibold text-[#173b3a] transition hover:bg-[#f5faf7]"
              >
                Book Another
              </button>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full rounded-3xl border border-[#dce8df] bg-white p-6 shadow-[0_20px_50px_rgba(23,59,58,0.09)] sm:p-8">
      {/* Back Button */}
      <button
        type="button"
        onClick={onBack}
        className="flex cursor-pointer items-center gap-2 rounded-xl border border-[#dce8df] px-5 py-3 text-sm font-semibold text-[#173b3a] transition hover:bg-[#f5faf7]"
      >
        <FaArrowLeft size={11} />
        Back
      </button>

      {/* Header */}
      <div className="mt-6 text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#c37d32]">
          Confirmation
        </p>

        <h2 className="mt-2 text-2xl font-bold leading-tight text-[#173b3a] sm:text-3xl">
          Review Your Booking
        </h2>

        <span className="mt-2 inline-block rounded-full bg-[#dce8df] px-3 py-1 text-xs font-semibold text-[#173b3a]">
          Step 6 of 6
        </span>

        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
          Please verify your consultation details before confirming.
        </p>
      </div>

      {/* Review Cards Grid */}
      <div className="mt-8 space-y-4">
        {/* Patient Details */}
        <div className="rounded-2xl border border-[#dce8df] bg-[#fbfdfc] p-5">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#176b5f]">
            <FaUser />
            Patient Information
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 text-sm">
            <div>
              <span className="text-xs text-gray-500">Full Name</span>
              <p className="font-semibold text-[#173b3a]">{formData.fullName || "—"}</p>
            </div>
            <div>
              <span className="text-xs text-gray-500">Student Index</span>
              <p className="font-mono font-semibold text-[#173b3a]">
                {formData.studentIndex || "—"}
              </p>
            </div>
            <div>
              <span className="text-xs text-gray-500">Phone Number</span>
              <p className="font-mono font-semibold text-[#173b3a] flex items-center gap-1.5">
                <FaPhone size={11} className="text-[#176b5f]" />
                {formData.phoneNumber || "—"}
              </p>
            </div>
            <div>
              <span className="text-xs text-gray-500">NHIS Number</span>
              <p className="font-mono font-semibold text-[#173b3a] flex items-center gap-1.5">
                <FaIdCard size={11} className="text-[#176b5f]" />
                {formData.nhisNumber || "Not provided"}
              </p>
            </div>
          </div>
        </div>

        {/* Clinical Details */}
        <div className="rounded-2xl border border-[#dce8df] bg-[#fbfdfc] p-5">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#176b5f]">
            <FaHospital />
            Clinic & Consultation
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 text-sm">
            <div>
              <span className="text-xs text-gray-500">Selected Clinic</span>
              <p className="font-semibold text-[#173b3a]">{formData.clinic || "—"}</p>
            </div>
            <div>
              <span className="text-xs text-gray-500">Service</span>
              <p className="font-semibold text-[#173b3a] flex items-center gap-1.5">
                <FaStethoscope size={11} className="text-[#176b5f]" />
                {formData.service || "—"}
              </p>
            </div>
            <div>
              <span className="text-xs text-gray-500">Attending Clinician</span>
              <p className="font-semibold text-[#173b3a]">
                {formData.clinician || "—"}
              </p>
              <p className="text-xs text-gray-500">{formData.clinicianRoom}</p>
            </div>
            <div>
              <span className="text-xs text-gray-500">Consultation Schedule</span>
              <p className="font-semibold text-[#176b5f] flex items-center gap-1.5">
                <FaCalendarAlt size={11} />
                {formData.appointmentDate || "—"}
              </p>
              <p className="font-semibold text-[#176b5f] flex items-center gap-1.5 mt-0.5">
                <FaClock size={11} />
                {formData.appointmentTime || "—"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Reminder Banner */}
      <div className="mt-6 rounded-xl border border-[#ead7ad] bg-[#fffaf0] p-4 text-xs leading-relaxed text-[#76551f] sm:text-sm">
        <strong>Important:</strong> Please arrive <strong>15 minutes prior</strong> to your scheduled time at{" "}
        {formData.clinic || "the clinic"}. If you cannot make it, please cancel or reschedule via the portal so your slot can be released.
      </div>

      {/* Confirm Button */}
      <button
        type="button"
        disabled={isSubmitting}
        onClick={handleConfirm}
        className="relative mt-7 flex w-full cursor-pointer items-center justify-center rounded-xl bg-[#176b5f] px-6 py-4 text-sm font-semibold text-white transition hover:bg-[#14594f] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span>{isSubmitting ? "Confirming Booking..." : "Confirm & Book Appointment"}</span>
      </button>
    </section>
  );
};

export default ReviewBooking;
