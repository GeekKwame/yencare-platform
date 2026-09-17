import { useEffect, useState } from "react";
import {
  FaArrowLeft,
  FaHashtag,
  FaIdCard,
  FaPhone,
  FaSearch,
} from "react-icons/fa";
import { isValidGhanaPhone, isValidStudentIndex } from "../../data/bookingOptions";
import { normalizeReference, REFERENCE_PATTERN } from "../../lib/appointmentView";
import { lookupAppointment } from "../../services/appointments";
import AppointmentCancelled from "./AppointmentCancelled";
import FoundAppointment from "./FoundAppointment";
import RescheduleFlow from "./RescheduleFlow";

function validateSearch(method, searchInput) {
  if (method === "reference") {
    const reference = normalizeReference(searchInput);
    if (!REFERENCE_PATTERN.test(reference)) {
      return { error: "Enter a valid reference code (e.g. YC-4821)." };
    }
    return { query: { reference } };
  }

  const value = String(searchInput || "").trim();
  if (!value) {
    return { error: "Please enter a value to search." };
  }

  if (method === "studentId") {
    const studentIndex = value.replace(/\s+/g, "");
    if (!isValidStudentIndex(studentIndex)) {
      return { error: "Enter a valid 8-digit student index number." };
    }
    return { query: { studentIndex } };
  }

  if (!isValidGhanaPhone(value)) {
    return {
      error: "Enter a valid Ghana phone number (e.g. 024 123 4567).",
    };
  }
  return { query: { phone: value } };
}

const FindAppointment = ({ setAppointment, initialReference = "" }) => {
  const [searchMethod, setSearchMethod] = useState("reference");
  const [searchInput, setSearchInput] = useState(() =>
    initialReference ? String(initialReference).toUpperCase() : "",
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [appointment, setFoundAppointment] = useState(null);
  const [flow, setFlow] = useState("detail");

  const methods = [
    { id: "reference", label: "YC Reference", icon: FaHashtag },
    { id: "studentId", label: "Student Index", icon: FaIdCard },
    { id: "phone", label: "Phone Number", icon: FaPhone },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { error, query } = validateSearch(searchMethod, searchInput);
    if (error) {
      setErrorMessage(error);
      return;
    }

    setIsSearching(true);
    setErrorMessage("");

    try {
      const found = await lookupAppointment(query);
      setFoundAppointment(found);
      setFlow("detail");
    } catch (err) {
      const status = err.response?.status;
      const apiMessage = err.response?.data?.error;
      if (status === 404) {
        setErrorMessage(
          "Appointment not found. Please check your details and try again.",
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

  useEffect(() => {
    if (!initialReference) return undefined;
    let cancelled = false;

    async function loadRef() {
      const { error, query } = validateSearch("reference", initialReference);
      if (error) {
        setErrorMessage(error);
        return;
      }
      setIsSearching(true);
      try {
        const found = await lookupAppointment(query);
        if (!cancelled) {
          setFoundAppointment(found);
          setFlow("detail");
        }
      } catch {
        if (!cancelled) {
          setErrorMessage(
            "Appointment not found. Please check your details and try again.",
          );
        }
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    }

    void loadRef();
    return () => {
      cancelled = true;
    };
  }, [initialReference]);

  if (appointment && flow === "reschedule") {
    return (
      <RescheduleFlow
        appointment={appointment}
        onBack={() => setFlow("detail")}
        onSuccess={async (updated) => {
          const ref =
            updated?.referenceCode || appointment.referenceCode;
          try {
            const fresh = await lookupAppointment({ reference: ref });
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
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#c37d32]">
          Appointment lookup
        </p>
        <h2 className="display-font mt-2 text-2xl font-bold text-[#173b3a] sm:text-3xl">
          Find your appointment
        </h2>
      </div>

      <p className="mt-3 max-w-xl text-sm leading-6 text-[#607672]">
        Search with your YC reference, student index, or the phone number on
        the booking.
      </p>

      <div
        className="mt-7 grid gap-2 rounded-2xl bg-[#f5faf7] p-1.5 sm:grid-cols-3"
        role="tablist"
      >
        {methods.map(({ id, label, icon: Icon }) => {
          const isActive = searchMethod === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => {
                setSearchMethod(id);
                setSearchInput("");
                setErrorMessage("");
              }}
              className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl px-3 py-3 text-xs font-bold transition sm:text-sm ${
                isActive
                  ? "bg-[#176b5f] text-white shadow-[0_6px_16px_rgba(23,107,95,0.18)]"
                  : "text-[#55706c] hover:bg-white hover:text-[#176b5f]"
              }`}
            >
              <Icon size={12} />
              {label}
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="mt-7 space-y-5">
        <div>
          <label htmlFor="appointment-search" className="text-sm font-bold text-[#173b3a]">
            {searchMethod === "reference"
              ? "Appointment Reference Code"
              : searchMethod === "studentId"
                ? "Student Index Number"
                : "Ghana Phone Number"}
          </label>
          <input
            id="appointment-search"
            type="text"
            inputMode={
              searchMethod === "studentId"
                ? "numeric"
                : searchMethod === "phone"
                  ? "tel"
                  : "text"
            }
            autoCapitalize={searchMethod === "reference" ? "characters" : undefined}
            autoComplete={searchMethod === "phone" ? "tel" : "off"}
            value={searchInput}
            onChange={(e) => {
              setSearchInput(
                searchMethod === "reference"
                  ? e.target.value.toUpperCase()
                  : e.target.value,
              );
              if (errorMessage) setErrorMessage("");
            }}
            className="mt-2 w-full rounded-xl border border-[#cbdcd3] bg-[#fbfdfc] px-4 py-3 text-sm text-[#173b3a] outline-none transition placeholder:text-[#9aaba5] focus:border-[#176b5f] focus:ring-4 focus:ring-[#176b5f]/10"
            placeholder={
              searchMethod === "reference"
                ? "e.g. YC-4821"
                : searchMethod === "studentId"
                  ? "e.g. 20612345"
                  : "e.g. 024 123 4567"
            }
          />
          {searchMethod === "reference" ? (
            <p className="mt-2 text-xs text-[#78908a]">
              Your 4-digit YC code was sent via SMS (e.g. YC-4821).
            </p>
          ) : null}
        </div>

        {errorMessage && (
          <p className="text-xs text-red-500" role="alert">
            {errorMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={isSearching}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#176b5f] px-6 py-4 text-sm font-semibold text-white transition hover:bg-[#14594f] disabled:cursor-wait disabled:opacity-70"
        >
          <FaSearch size={13} />
          {isSearching ? "Searching…" : "Find Appointment"}
        </button>
      </form>
    </section>
  );
};

export default FindAppointment;
