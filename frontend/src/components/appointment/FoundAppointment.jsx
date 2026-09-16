import { useState } from "react";
import { IoMdCloseCircle } from "react-icons/io";
import { Link } from "react-router-dom";
import {
  clinicSiteLabel,
  formatDateLabel,
  formatTimeLabel,
  visitTypeLabel,
} from "../../data/bookingOptions";
import { cancelAppointment } from "../../services/appointments";

const CANCELLABLE_STATUSES = new Set(["BOOKED", "WAITING"]);

function nestedValue(value, keys) {
  if (!value) return "";
  if (typeof value !== "object") return String(value);
  for (const key of keys) {
    if (value[key]) return String(value[key]);
  }
  return "";
}

function mapAppointment(appointment) {
  const patient = appointment?.patientId;
  return {
    id: appointment?.id || appointment?._id || "",
    referenceCode: appointment?.referenceCode || "—",
    status: appointment?.status || "",
    fullName: nestedValue(patient, ["fullName"]) || "—",
    studentIndex: nestedValue(patient, ["studentIndex"]) || "—",
    phoneNumber:
      nestedValue(patient, ["phoneNumber", "phone"]) || "—",
    clinician: nestedValue(appointment?.clinicianId, ["name"]) || "—",
    appointmentDate: formatDateLabel(appointment?.appointmentDate),
    appointmentTime: formatTimeLabel(appointment?.appointmentTime),
    clinic: clinicSiteLabel(appointment?.clinicSite),
    visitType: visitTypeLabel(appointment?.visitType),
  };
}

const FoundAppointment = ({ appointment, onBack, onHome }) => {
  const view = mapAppointment(appointment);
  const canCancel = CANCELLABLE_STATUSES.has(view.status);
  const [modal, setModal] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");

  const patientInfo = [
    { id: 1, label: "Patient", value: view.fullName },
    { id: 2, label: "Student Index", value: view.studentIndex },
    { id: 3, label: "Phone", value: view.phoneNumber },
    { id: 4, label: "Clinician", value: view.clinician },
    { id: 5, label: "Date", value: view.appointmentDate },
    { id: 6, label: "Time", value: view.appointmentTime },
    { id: 7, label: "Clinic", value: view.clinic },
    { id: 8, label: "Visit Type", value: view.visitType },
    { id: 9, label: "Status", value: view.status || "—" },
  ];

  const handleConfirmCancel = async () => {
    setIsCancelling(true);
    setCancelError("");

    try {
      await cancelAppointment(view.referenceCode || view.id, {
        cancelReason: "Cancelled by patient",
      });
      setModal("success");
    } catch (err) {
      setCancelError(
        err.response?.data?.error ||
          "Could not cancel this appointment. Please try again or ask reception.",
      );
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <section className="w-full">
      <button
        onClick={onBack}
        type="button"
        className="flex cursor-pointer items-center gap-2 rounded-xl border border-[#dce8df] px-5 py-3 text-sm font-semibold text-[#173b3a] transition hover:bg-[#f5faf7]"
      >
        Back to search
      </button>

      <p className="mt-7 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-[#c37d32]">
        {view.clinic}
      </p>

      <h2 className="display-font mt-2 text-center text-2xl font-bold text-[#173b3a] sm:text-3xl">
        Your Appointment
      </h2>

      <div className="mt-8 w-full bg-gray-100 p-5 text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
          Appointment Reference Code
        </p>
        <p className="text-3xl font-bold tracking-wide text-[#173b3a]">
          {view.referenceCode}
        </p>
        <p className="text-sm text-gray-400">
          Show this reference code when you arrive at the reception desk
        </p>
      </div>

      <div className="mt-5 space-y-5 text-sm">
        {patientInfo.map((info) => (
          <div key={info.id} className="flex items-center justify-between gap-4">
            <p className="text-[#607672]">{info.label}</p>
            <p className="text-right font-bold text-[#173b3a]">{info.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-7 flex flex-col gap-3 md:flex-row">
        <Link
          to="/queue"
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#176b5f] px-6 py-3.5 text-sm font-semibold text-white transition duration-300 hover:bg-[#14594f] focus:outline-none focus:ring-4 focus:ring-[#176b5f]/15"
        >
          Check Queue
        </Link>

        {canCancel ? (
          <button
            onClick={() => {
              setCancelError("");
              setModal("confirm");
            }}
            type="button"
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-6 py-3.5 text-sm font-semibold text-red-600 transition duration-300 hover:border-red-300 hover:bg-red-100 focus:outline-none focus:ring-4 focus:ring-red-500/10"
          >
            <IoMdCloseCircle size={19} />
            Cancel Appointment
          </button>
        ) : (
          <p className="flex w-full items-center justify-center rounded-xl border border-[#dce8df] px-6 py-3.5 text-center text-sm text-[#607672]">
            This appointment can no longer be cancelled online.
          </p>
        )}
      </div>

      {modal === "confirm" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#173b3a]/50 px-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-title"
            className="w-full max-w-md rounded-3xl border border-[#dce8df] bg-white p-7 shadow-[0_25px_70px_rgba(23,59,58,0.18)] sm:p-8"
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
              <IoMdCloseCircle size={28} />
            </div>

            <div className="mt-5 text-center">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#c37d32]">
                Confirm cancellation
              </p>
              <h3
                id="cancel-title"
                className="display-font mt-2 text-2xl font-bold text-[#173b3a]"
              >
                Cancel appointment?
              </h3>
              <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[#607672]">
                This will release{" "}
                <strong className="text-[#173b3a]">{view.referenceCode}</strong>{" "}
                so another patient can take the slot.
              </p>
            </div>

            {cancelError && (
              <p className="mt-4 text-center text-xs text-red-500" role="alert">
                {cancelError}
              </p>
            )}

            <div className="mt-7 flex flex-col gap-3">
              <button
                type="button"
                disabled={isCancelling}
                onClick={handleConfirmCancel}
                className="w-full cursor-pointer rounded-xl bg-red-600 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-wait disabled:opacity-70"
              >
                {isCancelling ? "Cancelling…" : "Yes, cancel appointment"}
              </button>
              <button
                type="button"
                disabled={isCancelling}
                onClick={() => setModal(null)}
                className="w-full cursor-pointer rounded-xl border border-[#dce8df] px-6 py-3.5 text-sm font-semibold text-[#173b3a] transition hover:bg-[#f5faf7]"
              >
                Keep appointment
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === "success" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#173b3a]/50 px-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancelled-title"
            className="w-full max-w-md rounded-3xl border border-[#dce8df] bg-white p-7 shadow-[0_25px_70px_rgba(23,59,58,0.18)] sm:p-8"
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#e8f4ed]">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#176b5f] text-white">
                ✓
              </div>
            </div>

            <div className="mt-5 text-center">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#c37d32]">
                Appointment Update
              </p>
              <h3
                id="cancelled-title"
                className="display-font mt-2 text-2xl font-bold text-[#173b3a]"
              >
                Appointment Cancelled
              </h3>
              <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[#607672]">
                Your appointment has been successfully cancelled. You can book a
                new appointment whenever you&apos;re ready.
              </p>
            </div>

            <button
              type="button"
              onClick={onHome}
              className="mt-7 w-full cursor-pointer rounded-xl bg-[#176b5f] px-6 py-3.5 text-sm font-semibold text-white transition duration-300 hover:bg-[#14594f] focus:outline-none focus:ring-4 focus:ring-[#176b5f]/15"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default FoundAppointment;
