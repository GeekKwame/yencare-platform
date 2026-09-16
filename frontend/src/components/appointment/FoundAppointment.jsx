import { useState } from "react";
import { IoMdCloseCircle } from "react-icons/io";
import { Link } from "react-router-dom";
import { mapAppointment } from "../../lib/appointmentView";
import { arriveAppointment, cancelAppointment } from "../../services/appointments";

const FoundAppointment = ({
  appointment,
  onBack,
  onHome,
  onReschedule,
  onCancelled,
  onUpdated,
}) => {
  const view = mapAppointment(appointment);
  const isBooked = view.status === "BOOKED";
  const inQueue = ["CHECKED_IN", "WAITING", "CALLED"].includes(view.status);
  const [modal, setModal] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [arriving, setArriving] = useState(false);
  const [arriveError, setArriveError] = useState("");

  const rows = [
    { label: "Patient", value: view.fullName },
    { label: "Student Index", value: view.studentIndex },
    { label: "Phone", value: view.phoneNumber },
    { label: "Clinician", value: `${view.clinician}${view.room && view.room !== "—" ? ` · ${view.room}` : ""}` },
    { label: "Date", value: view.dateLabel },
    { label: "Time", value: view.timeLabel },
    { label: "Clinic", value: view.clinic },
    { label: "Visit Type", value: view.visitType },
    { label: "Status", value: view.status || "—" },
  ];

  if ((view.status === "WAITING" || view.status === "CALLED") && view.queueToken) {
    rows.push({ label: "Queue Token", value: view.queueToken });
  }

  const handleArrive = async () => {
    setArriving(true);
    setArriveError("");
    try {
      const updated = await arriveAppointment(view.referenceCode || view.id, {
        phone: view.phoneNumber !== "—" ? view.phoneNumber : undefined,
      });
      onUpdated?.(updated);
    } catch (err) {
      setArriveError(
        err.response?.data?.error ||
          "Could not record arrival. Please tell reception you are here.",
      );
    } finally {
      setArriving(false);
    }
  };

  const handleConfirmCancel = async () => {
    setIsCancelling(true);
    setCancelError("");
    try {
      await cancelAppointment(view.referenceCode || view.id, {
        cancelReason: "Cancelled by patient",
      });
      onCancelled();
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
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={onBack}
          type="button"
          className="flex cursor-pointer items-center gap-2 rounded-xl border border-[#dce8df] px-5 py-3 text-sm font-semibold text-[#173b3a] transition hover:bg-[#f5faf7]"
        >
          Back to search
        </button>
        <span className="rounded-full bg-[#e7f5f1] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#176b5f]">
          {view.status || "Unknown"}
          {view.queueToken ? ` · ${view.queueToken}` : ""}
        </span>
      </div>

      {view.staffChangedTime && (
        <div className="mt-5 rounded-xl border border-[#fcd34d] bg-[#fef7ed] p-3.5 text-left text-xs text-[#92400e]">
          <strong className="block text-[#78350f]">
            Your appointment has been updated by the clinic.
          </strong>
          Previous time: {view.staffChangedTime}
          {view.staffChangeReason ? ` · ${view.staffChangeReason}` : ""}
        </div>
      )}

      <p className="mt-7 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-[#c37d32]">
        {view.clinic}
      </p>
      <h2 className="display-font mt-2 text-center text-2xl font-bold text-[#173b3a] sm:text-3xl">
        Your Appointment
      </h2>
      <p className="mt-1 text-center text-sm text-[#607672]">{view.visitType}</p>

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

      <div className="mt-5 divide-y divide-[#e5e7e6] overflow-hidden rounded-2xl border border-[#dce8df] text-sm">
        {rows.map((info, index) => (
          <div
            key={info.label}
            className={`flex items-center justify-between gap-4 px-4 py-3.5 ${
              index % 2 === 0 ? "bg-[#f7f8f7]" : "bg-white"
            }`}
          >
            <p className="text-[#607672]">{info.label}</p>
            <p className="text-right font-bold text-[#173b3a]">{info.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-7 flex flex-col gap-3">
        {isBooked && (
          <div className="rounded-xl border border-[#fcd34d] bg-[#fef7ed] p-3.5 text-sm text-[#92400e]">
            <strong className="block text-[#78350f]">Not arrived at clinic yet</strong>
            <p className="mt-1 text-xs leading-5">
              When you get to the clinic, tap I&apos;ve arrived. Reception will verify your ID and add you to the live queue.
            </p>
            {arriveError && (
              <p className="mt-2 text-xs text-red-600" role="alert">
                {arriveError}
              </p>
            )}
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-[#FCD34D]/60 pt-3">
              <span className="text-[11px] font-medium text-[#78350F]">Already at the clinic?</span>
              <button
                type="button"
                disabled={arriving}
                onClick={handleArrive}
                className="rounded-lg bg-[#087F6C] px-3 py-1.5 text-[11px] font-bold text-white hover:bg-[#066354] disabled:opacity-60"
              >
                {arriving ? "Recording…" : "I've arrived"}
              </button>
            </div>
          </div>
        )}

        {view.status === "CHECKED_IN" && (
          <div className="rounded-xl border border-[#99D5C8] bg-[#E7F5F1] p-3.5 text-sm text-[#066A5A]">
            <strong className="block text-[#087F6C]">You&apos;ve arrived — waiting for reception</strong>
            <p className="mt-1 text-xs leading-5">
              Present {view.referenceCode} at the desk. Staff will check you into the live queue and assign your token.
            </p>
          </div>
        )}

        {inQueue && (
          <Link
            to={`/queue?ref=${encodeURIComponent(view.referenceCode)}`}
            className="flex w-full items-center justify-center rounded-xl bg-[#176b5f] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#14594f]"
          >
            {view.status === "CHECKED_IN" ? "View arrival status" : "Check Queue Status"}
          </Link>
        )}

        {isBooked && (
          <>
            <Link
              to={`/clinic-activity?ref=${encodeURIComponent(view.referenceCode)}`}
              className="flex w-full items-center justify-center rounded-xl bg-[#176b5f] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#14594f]"
            >
              View live clinic activity
            </Link>
            <button
              type="button"
              onClick={onReschedule}
              className="w-full cursor-pointer rounded-xl border border-[#dce8df] px-6 py-3.5 text-sm font-semibold text-[#173b3a] transition hover:bg-[#f5faf7]"
            >
              Reschedule
            </button>
            <button
              type="button"
              onClick={() => {
                setCancelError("");
                setModal("confirm");
              }}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-6 py-3.5 text-sm font-semibold text-red-600 transition hover:bg-red-100"
            >
              <IoMdCloseCircle size={19} />
              Cancel appointment
            </button>
          </>
        )}

        {!isBooked && !inQueue && (
          <p className="rounded-xl border border-[#dce8df] px-6 py-3.5 text-center text-sm text-[#607672]">
            This appointment can no longer be changed online.
          </p>
        )}
      </div>

      {modal === "confirm" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#173b3a]/50 px-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-title"
            className="w-full max-w-md rounded-3xl border border-[#dce8df] bg-white p-7 text-center shadow-[0_25px_70px_rgba(23,59,58,0.18)] sm:p-8"
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
              <IoMdCloseCircle size={28} />
            </div>
            <h3
              id="cancel-title"
              className="display-font mt-5 text-2xl font-bold text-[#173b3a]"
            >
              Cancel appointment?
            </h3>
            <p className="mt-3 text-sm leading-6 text-[#607672]">
              Are you sure you want to cancel your consultation for{" "}
              <strong className="text-[#173b3a]">{view.referenceCode}</strong>?
            </p>
            <div className="mt-5 space-y-2 rounded-xl border border-[#dce8df] bg-[#f7f8f7] p-4 text-left text-xs">
              <div className="flex justify-between gap-3">
                <span className="text-[#607672]">Clinician</span>
                <span className="font-semibold text-[#173b3a]">{view.clinician}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-[#607672]">Date & time</span>
                <span className="font-semibold text-[#173b3a]">
                  {view.dateLabel}, {view.timeLabel}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-[#607672]">Clinic</span>
                <span className="font-semibold text-[#173b3a]">{view.clinic}</span>
              </div>
            </div>
            <p className="mt-4 text-left text-xs leading-5 text-[#607672]">
              Releasing your appointment helps another patient in need of care.
            </p>
            {cancelError && (
              <p className="mt-3 text-xs text-red-500" role="alert">
                {cancelError}
              </p>
            )}
            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                disabled={isCancelling}
                onClick={handleConfirmCancel}
                className="w-full cursor-pointer rounded-xl bg-red-600 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-70"
              >
                {isCancelling ? "Cancelling…" : "Yes, cancel appointment"}
              </button>
              <button
                type="button"
                disabled={isCancelling}
                onClick={() => setModal(null)}
                className="w-full cursor-pointer rounded-xl border border-[#dce8df] px-6 py-3.5 text-sm font-semibold text-[#173b3a] hover:bg-[#f5faf7]"
              >
                Keep appointment
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onHome}
        className="mt-4 w-full cursor-pointer text-sm font-semibold text-[#607672] hover:text-[#173b3a]"
      >
        Return home
      </button>
    </section>
  );
};

export default FoundAppointment;
