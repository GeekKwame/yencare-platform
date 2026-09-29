import { useEffect, useState } from "react";
import { formatAppointmentTime } from "../../data/mockAppointments";
import { staffActionState } from "../../lib/visitRules";

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
  const actionState = staffActionState(appointment);
  const primaryAllowed = isArrived ? actionState.canQueue : actionState.canCheckIn;
  const primaryNote = isArrived ? actionState.queueNote : actionState.checkInNote;

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

        {isArrived && (
          <div className="rounded-xl border border-[#99D5C8] bg-[#E7F5F1] p-3 text-xs">
            <p className="font-bold text-[#087F6C]">Student has arrived and is waiting at the desk</p>
            <p className="mt-0.5 text-[#066A5A]">
              Verify the reference, then check them into the live queue.
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
          {appointment.nhisNumber ? <Row label="NHIS number" value={appointment.nhisNumber} /> : null}
          <Row label="Clinic site" value={appointment.clinic} muted />
          <Row label="Visit type" value={appointment.service} />
          <Row label="Scheduled date & time" value={`${appointment.date} at ${appointment.time}`} muted />
          <Row
            label="Doctor / room"
            value={`${appointment.clinicianName || "Clinician"}${appointment.roomName ? ` (${appointment.roomName})` : ""}`}
          />
          <Row
            label="Current queue state"
            value={`${appointment.status}${appointment.queueToken ? ` (${appointment.queueToken})` : ""}`}
            muted
          />
        </div>

        <div className="space-y-3 pt-2">
          {canStaffCheckIn && (
            <>
              <div>
                <button
                  type="button"
                  disabled={updating || !primaryAllowed}
                  onClick={() => onCheckInToQueue(appointment.id)}
                  aria-describedby={primaryNote ? "detail-checkin-reason" : undefined}
                  className="w-full rounded-xl bg-[#176b5f] px-4 py-3 text-sm font-semibold text-white hover:bg-[#14594f] disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
                >
                  {updating
                    ? "Updating…"
                    : isArrived
                      ? `Check in to live queue (${appointment.patientName})`
                      : `Check in student (${appointment.patientName})`}
                </button>
                {primaryNote && (
                  <p id="detail-checkin-reason" className="mt-1 text-center text-xs text-gray-600">{primaryNote}</p>
                )}
              </div>
              <div className={`grid ${isBooked ? "grid-cols-2" : "grid-cols-1"} gap-2.5`}>
                {actionState.canChangeTime && (
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
                    aria-describedby={actionState.noShowNote ? "detail-noshow-reason" : undefined}
                    className="w-full rounded-xl border border-[#f1c0c0] bg-[#FFF5F5] px-3 py-2.5 text-sm font-semibold text-[#9B2C2C] hover:bg-[#fde8e8] disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400"
                  >
                    Mark no-show
                  </button>
                  {actionState.noShowNote && (
                    <p id="detail-noshow-reason" className="mt-1 text-center text-[11px] text-gray-600">{actionState.noShowNote}</p>
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
