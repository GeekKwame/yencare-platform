import { useState } from "react";
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
import {
  clinicSiteLabel,
  formatDateLabel,
  formatTimeLabel,
  getArriveByLabel,
  visitTypeLabel,
} from "../../data/bookingOptions";
import { createAppointment } from "../../services/appointments";
import { rememberBookingReference } from "../../lib/appointmentView";
import { Button, ReferenceBlock } from "../ui";

const ReviewBooking = ({ formData, onBack, onReset, onSlotTaken, onViewAppointment }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [bookingRef, setBookingRef] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [smsResult, setSmsResult] = useState(null);

  const clinicLabel = clinicSiteLabel(formData.clinicSite);
  const serviceLabel = visitTypeLabel(formData.visitType);
  const dateLabel = formatDateLabel(formData.appointmentDate);
  const timeLabel = formatTimeLabel(formData.appointmentTime);
  const arriveBy = getArriveByLabel(formData.appointmentTime);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setConfirmError("");

    try {
      if (!formData.patientId) {
        throw new Error("Patient record is missing. Go back to Your Details and continue again.");
      }
      if (!formData.clinicianId || !formData.roomId) {
        throw new Error("Clinician or room is missing. Go back and choose a clinician again.");
      }
      if (!formData.timeSlotId) {
        throw new Error("Time slot is missing. Go back and choose an available time.");
      }

      const created = await createAppointment({
        patientId: formData.patientId,
        studentIndex: formData.studentIndex,
        phoneNumber: formData.phoneNumber,
        phone: formData.phoneNumber,
        clinicianId: formData.clinicianId,
        roomId: formData.roomId,
        timeSlotId: formData.timeSlotId,
        clinicSite: formData.clinicSite,
        visitType: formData.visitType,
        appointmentDate: formData.appointmentDate,
        appointmentTime: formData.appointmentTime,
      });

      const ref = created.referenceCode || created.id;
      rememberBookingReference(ref);
      setBookingRef(ref);
      setSmsResult(created.sms ?? null);
      setIsConfirmed(true);
    } catch (err) {
      const apiMessage = err.response?.data?.error || err.response?.data?.message;
      const isCapError =
        apiMessage?.includes("maximum of 2 active appointments") ||
        apiMessage?.toLowerCase().includes("maximum of 2");

      if (err.response?.status === 409 && !isCapError && typeof onSlotTaken === "function") {
        onSlotTaken();
        return;
      }
      setConfirmError(
        apiMessage ||
          err.message ||
          "Could not confirm this booking. Check that the API is running and try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isConfirmed) {
    return (
      <section className="w-full rounded-3xl border border-[#dce8df] bg-white p-6 shadow-[0_20px_50px_rgba(23,59,58,0.09)] sm:p-8">
        <div className="text-center">
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
            You do not have a queue number yet — reception check-in assigns your live queue token.
          </p>

          <ReferenceBlock code={bookingRef} />

          <div className="mx-auto mt-6 max-w-md divide-y divide-gray-100 rounded-2xl border border-[#dce8df] bg-white text-left text-sm">
            <div className="flex justify-between p-3.5">
              <span className="text-xs font-medium text-gray-500">Patient</span>
              <span className="font-semibold text-[#173b3a]">{formData.fullName}</span>
            </div>
            <div className="flex justify-between p-3.5">
              <span className="text-xs font-medium text-gray-500">Clinic</span>
              <span className="font-semibold text-[#173b3a]">{clinicLabel}</span>
            </div>
            <div className="flex justify-between p-3.5">
              <span className="text-xs font-medium text-gray-500">Service</span>
              <span className="font-semibold text-[#173b3a]">{serviceLabel}</span>
            </div>
            <div className="flex justify-between p-3.5">
              <span className="text-xs font-medium text-gray-500">Clinician</span>
              <span className="font-semibold text-[#173b3a]">
                {formData.clinician || "—"}
              </span>
            </div>
            <div className="flex justify-between p-3.5">
              <span className="text-xs font-medium text-gray-500">Scheduled Time</span>
              <span className="font-bold text-[#176b5f]">
                {dateLabel} · {timeLabel}
              </span>
            </div>
          </div>

          {smsResult?.ok === false ? (
            <div className="mx-auto mt-6 max-w-md rounded-xl border border-amber-200 bg-amber-50 p-4 text-left">
              <div className="flex items-start gap-3">
                <FaCheckCircle className="mt-0.5 shrink-0 text-amber-600" />
                <div>
                  <p className="text-sm font-bold text-amber-800">SMS not delivered</p>
                  <p className="mt-0.5 text-xs text-amber-700">
                    Your booking is confirmed. We could not send the confirmation SMS
                    {formData.phoneNumber ? ` to ${formData.phoneNumber}` : ""}.
                    Present your reference code at reception.
                    {arriveBy ? ` Arrive by ${arriveBy}.` : ""}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mx-auto mt-6 max-w-md rounded-xl border border-green-200 bg-green-50 p-4 text-left">
              <div className="flex items-start gap-3">
                <FaCheckCircle className="mt-0.5 shrink-0 text-green-600" />
                <div>
                  <p className="text-sm font-bold text-green-800">SMS Confirmation</p>
                  <p className="mt-0.5 text-xs text-green-700">
                    {formData.phoneNumber
                      ? `A confirmation SMS was sent only to ${formData.phoneNumber}.`
                      : "A confirmation SMS was sent to the patient who booked."}
                    {arriveBy ? ` Arrive by ${arriveBy}.` : ""}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() =>
                typeof onViewAppointment === "function"
                  ? onViewAppointment(bookingRef)
                  : onReset?.()
              }
              className="flex flex-1 items-center justify-center rounded-xl bg-[#176b5f] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#14594f]"
            >
              View appointment
            </button>
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
      <button
        type="button"
        onClick={onBack}
        className="flex cursor-pointer items-center gap-2 rounded-xl border border-[#dce8df] px-5 py-3 text-sm font-semibold text-[#173b3a] transition hover:bg-[#f5faf7]"
      >
        <FaArrowLeft size={11} />
        Back
      </button>

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

      <div className="mt-8 space-y-4">
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

        <div className="rounded-2xl border border-[#dce8df] bg-[#fbfdfc] p-5">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#176b5f]">
            <FaHospital />
            Clinic & Consultation
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 text-sm">
            <div>
              <span className="text-xs text-gray-500">Selected Clinic</span>
              <p className="font-semibold text-[#173b3a]">{clinicLabel}</p>
            </div>
            <div>
              <span className="text-xs text-gray-500">Service</span>
              <p className="font-semibold text-[#173b3a] flex items-center gap-1.5">
                <FaStethoscope size={11} className="text-[#176b5f]" />
                {serviceLabel}
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
                {dateLabel}
              </p>
              <p className="font-semibold text-[#176b5f] flex items-center gap-1.5 mt-0.5">
                <FaClock size={11} />
                {timeLabel}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-[#dce8df] bg-[#f5faf7] p-4 text-xs leading-relaxed text-[#173b3a] sm:text-sm">
        A confirmation SMS with your reference code will be sent to{" "}
        <strong>{formData.phoneNumber || "the number on this booking"}</strong>.
        Booking success does not depend on SMS delivery.
      </div>

      <div className="mt-4 rounded-xl border border-[#ead7ad] bg-[#fffaf0] p-4 text-xs leading-relaxed text-[#76551f] sm:text-sm">
        <strong>Important:</strong> Please arrive{" "}
        <strong>{arriveBy ? `by ${arriveBy}` : "15 minutes prior"}</strong> to your scheduled time at{" "}
        {clinicLabel || "the clinic"}. If you cannot make it, please cancel or reschedule via the portal so your slot can be released.
      </div>

      {confirmError && (
        <p className="mt-4 text-sm font-medium text-red-500 text-center">{confirmError}</p>
      )}

      <button
        type="button"
        disabled={isSubmitting}
        onClick={handleConfirm}
        className="relative mt-7 flex w-full cursor-pointer items-center justify-center rounded-xl bg-[#176b5f] px-6 py-4 text-sm font-semibold text-white transition hover:bg-[#14594f] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span>{isSubmitting ? "Confirming booking…" : "Confirm booking"}</span>
      </button>
    </section>
  );
};

export default ReviewBooking;
