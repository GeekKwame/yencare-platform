import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { mapAppointment } from "../../lib/appointmentView";
import { arriveAppointment, cancelAppointment } from "../../services/appointments";
import { Button, ReferenceBlock, StatusBadge } from "../ui";

const TERMINAL = new Set(["CANCELLED", "COMPLETED", "NO_SHOW"]);

export default function FoundAppointment({
  appointment,
  onBack,
  onHome,
  onReschedule,
  onCancelled,
  onUpdated,
  onOpenCurrent,
}) {
  const view = mapAppointment(appointment);
  const isHistorical = Boolean(view.isHistorical) || TERMINAL.has(view.status);
  const isBooked = view.status === "BOOKED" && !isHistorical;
  const inQueue = ["CHECKED_IN", "WAITING", "CALLED"].includes(view.status);
  const [modal, setModal] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [arriving, setArriving] = useState(false);
  const [arriveError, setArriveError] = useState("");
  const navigate = useNavigate();

  const rows = [
    { label: "Patient", value: view.fullName },
    { label: "Student Index", value: view.studentIndex },
    { label: "Phone", value: view.phoneNumber },
    {
      label: "Clinician",
      value: `${view.clinician}${view.room && view.room !== "—" ? ` · ${view.room}` : ""}`,
    },
    { label: "Date", value: view.dateLabel },
    { label: "Time", value: view.timeLabel },
    { label: "Clinic", value: view.clinic },
    { label: "Visit Type", value: view.visitType },
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
      const ref = updated?.referenceCode || view.referenceCode;
      if (ref && ref !== "—") {
        navigate(`/queue?ref=${encodeURIComponent(ref)}`);
      }
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
        phone: view.phoneNumber !== "—" ? view.phoneNumber : undefined,
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

  const referenceSubtext = isHistorical
    ? view.status === "CANCELLED"
      ? "This booking was cancelled. It is no longer valid at reception."
      : view.status === "COMPLETED"
        ? "This visit is finished. Keep the code only as a record."
        : "This appointment is closed and cannot be used at reception."
    : "Show this reference code when you arrive at the reception desk";

  return (
    <section className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="secondary" onClick={onBack}>
          Back to search
        </Button>
        <StatusBadge status={view.status} token={view.queueToken} />
      </div>

      {isHistorical && (
        <div className="mt-5 border border-error-border bg-error-soft p-3.5 text-left text-sm text-error" role="status">
          <strong className="block">
            {view.status === "CANCELLED"
              ? "This appointment was cancelled"
              : view.status === "COMPLETED"
                ? "This visit is finished"
                : "This appointment is no longer active"}
          </strong>
          <p className="mt-1 text-xs leading-5">
            {view.supersededBy
              ? `Your current booking is ${view.supersededBy.referenceCode}.`
              : "This reference is historical. It cannot be used at reception."}
          </p>
          {view.supersededBy && (
            <div className="mt-3">
              <Button variant="accent" size="sm" onClick={() => onOpenCurrent?.(view.supersededBy)}>
                View current appointment {view.supersededBy.referenceCode}
              </Button>
            </div>
          )}
        </div>
      )}

      {view.staffChangedTime && !isHistorical && (
        <div className="mt-5 border border-warning-border bg-warning-soft p-3.5 text-left text-xs text-warning">
          <strong className="block text-primary">Your appointment has been updated by the clinic.</strong>
          Previous time: {view.staffChangedTime}
          {view.staffChangeReason ? ` · ${view.staffChangeReason}` : ""}
        </div>
      )}

      <p className="type-label-micro mt-7 text-center text-text-muted">{view.clinic}</p>
      <h2 className="display-font mt-2 text-center text-2xl font-bold text-primary sm:text-3xl">
        {isHistorical ? "Appointment record" : "Your Appointment"}
      </h2>
      <p className="mt-1 text-center text-sm text-text-muted">{view.visitType}</p>

      <ReferenceBlock code={view.referenceCode} subtext={referenceSubtext} />

      <div className="mt-5 divide-y divide-border-divider overflow-hidden border border-clinic-border text-sm">
        {rows.map((info, index) => (
          <div
            key={info.label}
            className={`flex items-center justify-between gap-4 px-4 py-3.5 ${
              index % 2 === 0 ? "bg-clinic-bg" : "bg-surface"
            }`}
          >
            <p className="text-text-muted">{info.label}</p>
            <p className="text-right font-bold text-primary">{info.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-7 flex flex-col gap-3">
        {isBooked && (
          <div className="border border-warning-border bg-warning-soft p-3.5 text-sm text-warning">
            <strong className="block text-primary">Not arrived at clinic yet</strong>
            <p className="mt-1 text-xs leading-5">
              When you get to the clinic, tap I&apos;ve arrived. Reception will verify your ID and add you to the live queue.
            </p>
            {arriveError && (
              <p className="mt-2 text-xs text-error" role="alert">
                {arriveError}
              </p>
            )}
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-warning-border/60 pt-3">
              <span className="text-xs font-medium text-primary">Already at the clinic?</span>
              <Button variant="accent" size="sm" loading={arriving} loadingText="Recording…" onClick={handleArrive}>
                I&apos;ve arrived
              </Button>
            </div>
          </div>
        )}

        {view.status === "CHECKED_IN" && (
          <div className="border border-accent-border bg-accent-soft p-3.5 text-sm text-accent-hover">
            <strong className="block text-accent">You&apos;ve arrived — waiting for reception</strong>
            <p className="mt-1 text-xs leading-5">
              Present {view.referenceCode} at the desk. Staff will check you into the live queue and assign your token.
            </p>
          </div>
        )}

        {inQueue && (
          <Button as={Link} to={`/queue?ref=${encodeURIComponent(view.referenceCode)}`} variant="accent" fullWidth>
            {view.status === "CHECKED_IN" ? "View arrival status" : "Check Queue Status"}
          </Button>
        )}

        {isBooked && (
          <>
            <Button
              as={Link}
              to={`/clinic-activity?ref=${encodeURIComponent(view.referenceCode)}`}
              variant="accent"
              fullWidth
            >
              View live clinic activity
            </Button>
            <Button variant="secondary" fullWidth onClick={onReschedule}>
              Reschedule
            </Button>
            <Button
              variant="destructive"
              fullWidth
              onClick={() => {
                setCancelError("");
                setModal("confirm");
              }}
            >
              Cancel appointment
            </Button>
          </>
        )}

        {!isBooked && !inQueue && (
          <p className="border border-clinic-border px-6 py-3.5 text-center text-sm text-text-muted">
            This appointment can no longer be changed online.
          </p>
        )}
      </div>

      {modal === "confirm" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/50 px-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-title"
            className="card-clinical w-full max-w-md p-7 text-center sm:p-8"
          >
            <h3 id="cancel-title" className="display-font mt-2 text-2xl font-bold text-primary">
              Cancel appointment?
            </h3>
            <p className="mt-3 text-sm leading-6 text-text-muted">
              Are you sure you want to cancel your consultation for{" "}
              <strong className="text-primary">{view.referenceCode}</strong>?
            </p>
            <div className="mt-5 space-y-2 border border-clinic-border bg-clinic-bg p-4 text-left text-xs">
              <div className="flex justify-between gap-3">
                <span className="text-text-muted">Clinician</span>
                <span className="font-semibold text-primary">{view.clinician}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-text-muted">Date & time</span>
                <span className="font-semibold text-primary">
                  {view.dateLabel}, {view.timeLabel}
                </span>
              </div>
            </div>
            {cancelError && (
              <p className="mt-3 text-xs text-error" role="alert">
                {cancelError}
              </p>
            )}
            <div className="mt-6 flex flex-col gap-3">
              <Button
                variant="destructive"
                fullWidth
                loading={isCancelling}
                loadingText="Cancelling…"
                onClick={handleConfirmCancel}
              >
                Yes, cancel appointment
              </Button>
              <Button variant="secondary" fullWidth disabled={isCancelling} onClick={() => setModal(null)}>
                Keep appointment
              </Button>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onHome}
        className="mt-4 w-full cursor-pointer text-sm font-semibold text-text-muted hover:text-primary"
      >
        Return home
      </button>
    </section>
  );
}
