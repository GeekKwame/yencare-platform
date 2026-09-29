import { useEffect, useState } from "react";
import { formatAppointmentTime } from "../../data/mockAppointments";
import { getStaffActionState } from "./staffUtils";

function Row({ label, value, muted }) {
  return (
    <div className={`flex items-center justify-between gap-3 px-4 py-3.5 text-xs ${muted ? "bg-[#F7F8F7]" : "bg-white"}`}>
      <span className="text-[#66706B]">{label}</span>
      <span className="text-right font-semibold text-[#111111]">{value || "—"}</span>
    </div>
  );
}

export default function StaffAppointmentDetail({
  appointment,
  updating,
  onBack,
  onCheckInToQueue,
  onOpenVerification,
  onChangeTime,
  onNoShow,
  onOpenQueue,
}) {
  const [, setNow] = useState(() => new Date());

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(intervalId);
  }, []);

  if (!appointment) {
    return (
      <div className="max-w-xl space-y-4">
        <p className="text-sm text-[#66706B]">
          Select a student from the roster or desk lookup to open their record.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="rounded-xl border border-[#dce8df] px-4 py-2.5 text-sm font-semibold text-[#173b3a]"
        >
          Open roster
        </button>
      </div>
    );
  }

  const isBooked = appointment.status === "BOOKED";
  const isArrived = appointment.status === "CHECKED_IN";
  const canStaffCheckIn = isBooked || isArrived;
  const actionState = getStaffActionState(appointment);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between border-b border-[#D8DCD9] pb-3.5">
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-semibold text-[#66706B] hover:text-[#111111]"
        >
          ← Back to roster
        </button>
        <span className="rounded-full bg-[#E7F5F1] px-3 py-1 text-xs font-semibold text-[#176b5f]">
          {appointment.status}
          {appointment.queueToken ? ` · ${appointment.queueToken}` : ""}
        </span>
      </div>

      <div className="space-y-6 rounded-2xl border border-[#D8DCD9] bg-white p-6 shadow-sm md:p-8">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#66706B]">
            KNUST student clinical record
          </p>
          <h1 className="mt-1 text-2xl font-bold text-[#111111]">{appointment.patientName}</h1>
          <p className="mt-1 font-mono text-xs text-[#66706B]">
            Phone: {appointment.phone || "—"} · Ref: {appointment.reference}
            {appointment.studentIndex ? ` · Index ${appointment.studentIndex}` : ""}
          </p>
        </div>

        <div className="bg-gray-100 p-5 text-center">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
            Appointment reference
          </p>
          <p className="font-mono text-3xl font-bold text-[#173b3a]">{appointment.reference}</p>
          <p className="mt-1 text-xs text-[#66706B]">
            Verify this code against the student&apos;s SMS before check-in.
          </p>
        </div>

        {/* Student Verification Status Banner */}
        {appointment.verificationStatus === "VERIFIED" ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs">
            <div className="flex items-center justify-between">
              <p className="font-bold text-emerald-900 flex items-center gap-1.5">
                <span>✓</span> Student Identity Verified via Physical ID Card
              </p>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 font-bold text-[10px] text-emerald-800">
                VERIFIED
              </span>
            </div>
            <p className="mt-1 text-emerald-700">
              Verified by <strong>{appointment.verifiedBy || "Staff"}</strong>
              {appointment.verifiedAt
                ? ` on ${new Date(appointment.verifiedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`
                : ""}
              {appointment.verificationMethod ? ` (${appointment.verificationMethod})` : ""}.
            </p>
          </div>
        ) : appointment.verificationStatus === "FAILED" ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs">
            <div className="flex items-center justify-between">
              <p className="font-bold text-rose-900 flex items-center gap-1.5">
                <span>⚠️</span> Student ID Verification Failed
              </p>
              <button
                type="button"
                onClick={() => onOpenVerification?.(appointment)}
                className="rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-rose-700"
              >
                Retry Verification
              </button>
            </div>
            <p className="mt-1 text-rose-700">
              Reason: {appointment.verificationFailureReason || "Could not verify physical student ID card."}
            </p>
          </div>
        ) : !(appointment.clinicSite === "knust-hospital" && !appointment.studentIndex) ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <p className="font-bold text-amber-950 flex items-center gap-1.5">
                  <span>🪪</span> Physical Student ID Verification Required
                </p>
                <p className="mt-0.5 text-amber-800">
                  Student must present their physical KNUST Student ID Card at reception before queue admission.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onOpenVerification?.(appointment)}
                className="shrink-0 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-700"
              >
                Verify Student ID Now
              </button>
            </div>
          </div>
        ) : null}

        {isArrived && (
          <div className="rounded-xl border border-[#99D5C8] bg-[#E7F5F1] p-3 text-xs">
            <p className="font-bold text-[#087F6C]">Student has arrived and is waiting at the desk</p>
            <p className="mt-0.5 text-[#066A5A]">
              Verify the student ID card, then admit them into the live queue.
            </p>
          </div>
        )}

        {appointment.staffChangedTime && (
          <div className="rounded-xl border border-[#BEE3F8] bg-[#EBF8FF] p-3 text-xs">
            <p className="font-bold text-[#2B6CB0]">Appointment rescheduled by clinic staff</p>
            <p className="mt-0.5 text-[#2C5282]">
              Previous time: {formatAppointmentTime(appointment.staffChangedTime) || appointment.staffChangedTime}
              {appointment.staffChangeReason ? ` · ${appointment.staffChangeReason}` : ""}
            </p>
          </div>
        )}

        <div className="divide-y divide-[#E5E7E6] overflow-hidden rounded-xl border border-[#D8DCD9]">
          <Row label="Student index" value={appointment.studentIndex || "N/A (walk-in / general)"} muted />
          <Row
            label="Verification status"
            value={
              appointment.verificationStatus === "VERIFIED"
                ? "Verified (Physical KNUST ID Card)"
                : appointment.verificationStatus === "FAILED"
                  ? "Failed / Discrepancy"
                  : appointment.clinicSite === "knust-hospital" && !appointment.studentIndex
                    ? "Exempt (General Hospital OPD)"
                    : "Pending Physical Card Inspection"
            }
          />
          {appointment.nhisNumber ? <Row label="NHIS number" value={appointment.nhisNumber} muted /> : null}
          <Row label="Clinic site" value={appointment.clinic} />
          <Row label="Visit type" value={appointment.service} muted />
          <Row label="Scheduled date & time" value={`${appointment.date} at ${appointment.time}`} />
          <Row
            label="Doctor / room"
            value={`${appointment.clinicianName || "Clinician"}${appointment.roomName ? ` (${appointment.roomName})` : ""}`}
            muted
          />
          <Row
            label="Current queue state"
            value={`${appointment.status}${appointment.queueToken ? ` (${appointment.queueToken})` : ""}`}
          />
        </div>

        <div className="space-y-3 pt-2">
          {canStaffCheckIn && (
            <>
              <div>
                {appointment.verificationStatus !== "VERIFIED" &&
                appointment.verificationStatus !== "EXEMPT" &&
                !(appointment.clinicSite === "knust-hospital" && !appointment.studentIndex) ? (
                  <button
                    type="button"
                    disabled={updating || !actionState.canCheckIn}
                    onClick={() => onOpenVerification?.(appointment)}
                    title="Student identity must be verified with physical ID card before queue admission"
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-3 text-sm font-bold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 shadow-sm"
                  >
                    <span>🪪</span>
                    <span>
                      {updating
                        ? "Updating…"
                        : `Verify Student ID & Check In (${appointment.patientName})`}
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={updating || !actionState.canCheckIn}
                    onClick={() => onCheckInToQueue(appointment.id)}
                    title={actionState.checkInNote || undefined}
                    className="w-full rounded-xl bg-[#176b5f] px-4 py-3 text-sm font-semibold text-white hover:bg-[#14594f] disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
                  >
                    {updating
                      ? "Updating…"
                      : isArrived
                        ? `Check in to live queue (${appointment.patientName})`
                        : `Check in student (${appointment.patientName})`}
                  </button>
                )}
                {!actionState.canCheckIn && (
                  <p className="mt-1 text-center text-xs text-gray-500">{actionState.checkInNote}</p>
                )}
              </div>
              <div className={`grid ${isBooked ? "grid-cols-2" : "grid-cols-1"} gap-2.5`}>
                {isBooked && (
                  <button
                    type="button"
                    onClick={onChangeTime}
                    className="rounded-xl border border-[#dce8df] px-3 py-2.5 text-sm font-semibold text-[#173b3a] hover:bg-[#f5faf7]"
                  >
                    Change time
                  </button>
                )}
                <div>
                  <button
                    type="button"
                    onClick={onNoShow}
                    disabled={updating || !actionState.canNoShow}
                    title={actionState.noShowNote || undefined}
                    className="w-full rounded-xl border border-[#f1c0c0] bg-[#FFF5F5] px-3 py-2.5 text-sm font-semibold text-[#9B2C2C] hover:bg-[#fde8e8] disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400"
                  >
                    Mark no-show
                  </button>
                  {!actionState.canNoShow && (
                    <p className="mt-1 text-center text-[11px] text-gray-500">{actionState.noShowNote}</p>
                  )}
                </div>
              </div>
            </>
          )}

          <div className="flex items-center justify-between pt-2 text-xs">
            <button type="button" onClick={onOpenQueue} className="font-semibold text-[#087F6C] hover:underline">
              View live queue
            </button>
            <button type="button" onClick={onBack} className="text-[#66706B] hover:text-[#111111]">
              Close record
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
