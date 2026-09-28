import { useState } from "react";
import {
  FaArrowLeft,
  FaHashtag,
  FaPhone,
  FaSearch,
  FaShieldAlt,
} from "react-icons/fa";
import { isValidGhanaPhone } from "../../data/bookingOptions";
import { normalizeReference, REFERENCE_PATTERN } from "../../lib/appointmentView";
import { lookupAppointment } from "../../services/appointments";
import AppointmentCancelled from "./AppointmentCancelled";
import FoundAppointment from "./FoundAppointment";
import RescheduleFlow from "./RescheduleFlow";

const FindAppointment = ({ setAppointment, initialReference = "" }) => {
  const [referenceInput, setReferenceInput] = useState(() =>
    initialReference ? normalizeReference(initialReference) : "",
  );
  const [phoneInput, setPhoneInput] = useState("");
  const [verifiedPhone, setVerifiedPhone] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [appointment, setFoundAppointment] = useState(null);
  const [flow, setFlow] = useState("detail");

  const handleSubmit = async (e) => {
    e.preventDefault();

    const ref = normalizeReference(referenceInput);
    if (!ref || !REFERENCE_PATTERN.test(ref)) {
      setErrorMessage("Please enter a valid reference code (e.g. YC-4821).");
      return;
    }

    const phone = String(phoneInput || "").trim();
    if (!phone) {
      setErrorMessage("Please enter the patient phone number used during booking.");
      return;
    }

    if (!isValidGhanaPhone(phone)) {
      setErrorMessage("Please enter a valid Ghana phone number (e.g. 024 123 4567).");
      return;
    }

    setIsSearching(true);
    setErrorMessage("");

    try {
      const found = await lookupAppointment({ reference: ref, phone });
      setVerifiedPhone(phone);
      setFoundAppointment(found);
      setFlow("detail");
    } catch (err) {
      const status = err.response?.status;
      const apiMessage = err.response?.data?.error;
      if (status === 404 || status === 400) {
        setErrorMessage(
          "Appointment not found or phone number does not match. Please verify both details and try again.",
        );
      } else {
        setErrorMessage(
          apiMessage ||
            "Unable to connect to the server. Check your connection and try again.",
        );
      }
    } finally {
      setIsSearching(false);
    }
  };

  if (appointment && flow === "reschedule") {
    return (
      <RescheduleFlow
        appointment={appointment}
        onBack={() => setFlow("detail")}
        onSuccess={async (updated) => {
          const ref = updated?.referenceCode || appointment.referenceCode;
          try {
            const fresh = await lookupAppointment({ reference: ref, phone: verifiedPhone });
            setFoundAppointment(fresh);
          } catch {
            setFoundAppointment(updated);
          }
          setFlow("detail");
        }}
      />
    );
  }

  if (appointment && flow === "cancelled") {
    return (
      <AppointmentCancelled
        appointment={appointment}
        onHome={() => setAppointment(false)}
      />
    );
  }

  if (appointment) {
    return (
      <section className="w-full rounded-3xl border border-[#dce8df] bg-white p-6 shadow-[0_20px_50px_rgba(23,59,58,0.09)] sm:p-8">
        <FoundAppointment
          appointment={appointment}
          onBack={() => setFoundAppointment(null)}
          onHome={() => setAppointment(false)}
          onReschedule={() => setFlow("reschedule")}
          onCancelled={() => setFlow("cancelled")}
          onUpdated={(updated) => setFoundAppointment(updated)}
          onOpenCurrent={async (next) => {
            const ref = next?.referenceCode;
            if (!ref) return;
            try {
              const fresh = await lookupAppointment({ reference: ref, phone: verifiedPhone });
              setFoundAppointment(fresh);
              setFlow("detail");
            } catch {
              setFoundAppointment(next);
            }
          }}
        />
      </section>
    );
  }

  return (
    <section className="w-full rounded-3xl border border-[#dce8df] bg-white p-6 shadow-[0_20px_50px_rgba(23,59,58,0.09)] sm:p-8">
      <button
        onClick={() => setAppointment(false)}
        type="button"
        className="flex cursor-pointer items-center gap-2 rounded-xl border border-[#dce8df] px-5 py-3 text-sm font-semibold text-[#173b3a] transition hover:bg-[#f5faf7]"
      >
        <FaArrowLeft size={11} />
        Back
      </button>

      <div className="mt-7">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-[#f5faf7] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#176b5f]">
          <FaShieldAlt size={10} />
          <span>Secure Appointment Lookup</span>
        </div>
        <h2 className="display-font mt-2 text-2xl font-bold text-[#173b3a] sm:text-3xl">
          Find your appointment
        </h2>
      </div>

      <p className="mt-3 max-w-xl text-sm leading-6 text-[#607672]">
        To protect student privacy, please provide both your <strong>Appointment Reference Code</strong> and the <strong>Phone Number</strong> registered on the booking.
      </p>

      <form onSubmit={handleSubmit} className="mt-7 space-y-5">
        <div>
          <label htmlFor="appointment-reference" className="flex items-center gap-1.5 text-sm font-bold text-[#173b3a]">
            <FaHashtag size={11} className="text-[#176b5f]" />
            <span>Appointment Reference Code <span className="text-red-500">*</span></span>
          </label>
          <input
            id="appointment-reference"
            type="text"
            required
            autoCapitalize="characters"
            autoComplete="off"
            value={referenceInput}
            onChange={(e) => {
              setReferenceInput(e.target.value.toUpperCase());
              if (errorMessage) setErrorMessage("");
            }}
            className="mt-2 w-full rounded-xl border border-[#cbdcd3] bg-[#fbfdfc] px-4 py-3 text-sm font-mono font-semibold tracking-wider text-[#173b3a] outline-none transition placeholder:font-sans placeholder:text-[#9aaba5] focus:border-[#176b5f] focus:ring-4 focus:ring-[#176b5f]/10"
            placeholder="e.g. YC-4821"
          />
          <p className="mt-1.5 text-xs text-[#78908a]">
            Enter the speakable 4-digit code sent via SMS upon booking.
          </p>
        </div>

        <div>
          <label htmlFor="patient-phone" className="flex items-center gap-1.5 text-sm font-bold text-[#173b3a]">
            <FaPhone size={11} className="text-[#176b5f]" />
            <span>Booking Phone Number <span className="text-red-500">*</span></span>
          </label>
          <input
            id="patient-phone"
            type="tel"
            required
            inputMode="tel"
            autoComplete="tel"
            value={phoneInput}
            onChange={(e) => {
              setPhoneInput(e.target.value);
              if (errorMessage) setErrorMessage("");
            }}
            className="mt-2 w-full rounded-xl border border-[#cbdcd3] bg-[#fbfdfc] px-4 py-3 text-sm text-[#173b3a] outline-none transition placeholder:text-[#9aaba5] focus:border-[#176b5f] focus:ring-4 focus:ring-[#176b5f]/10"
            placeholder="e.g. 024 123 4567"
          />
          <p className="mt-1.5 text-xs text-[#78908a]">
            The Ghanaian mobile number associated with this clinical record.
          </p>
        </div>

        {errorMessage && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700" role="alert">
            {errorMessage}
          </div>
        )}

        <button
          type="submit"
          disabled={isSearching}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#176b5f] px-6 py-4 text-sm font-semibold text-white transition hover:bg-[#14594f] disabled:cursor-wait disabled:opacity-70"
        >
          <FaSearch size={13} />
          {isSearching ? "Verifying & Finding…" : "Find Appointment"}
        </button>
      </form>
    </section>
  );
};

export default FindAppointment;
