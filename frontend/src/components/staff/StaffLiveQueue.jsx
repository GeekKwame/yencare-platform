import ElapsedTimer from "./ElapsedTimer";
import { sortWaiting } from "./staffUtils";
import { Button, StatusBadge } from "../ui";

export default function StaffLiveQueue({
  appointments,
  clinicLabel,
  canCallNext,
  canComplete,
  updatingId,
  busyRoomId,
  rooms,
  onCheckInToQueue,
  onCallNext,
  onComplete,
  onOpenRoster,
  onOpenWalkIn,
  showCorridor = false,
}) {
  const called = appointments.filter((appt) => appt.status === "CALLED");
  const waiting = sortWaiting(appointments.filter((appt) => appt.status === "WAITING"));
  const arrived = appointments.filter((appt) => appt.status === "CHECKED_IN");
  const empty = called.length === 0 && waiting.length === 0 && arrived.length === 0;

  if (empty) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-[#dce8df] bg-white p-10 text-center">
        <h2 className="text-2xl font-bold text-[#173b3a]">No patients in the queue</h2>
        <p className="mt-3 text-sm text-[#607672]">
          The waiting corridor and consultation rooms are currently clear for
          today&apos;s visits. Arriving patients can be checked in from the
          appointments roster for this date.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={onOpenRoster}
            className="rounded-xl bg-[#176b5f] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#14594f]"
          >
            View Appointments
          </button>
          <button
            type="button"
            onClick={onOpenWalkIn}
            className="rounded-xl border border-[#dce8df] px-4 py-2.5 text-sm font-semibold text-[#173b3a] hover:bg-[#f5faf7]"
          >
            Add Walk-In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 border-b border-[#dce8df] pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            Clinical Workstation · {clinicLabel}
          </p>
          <h2 className="text-2xl font-bold text-[#173b3a]">Live Virtual Queue Board</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onOpenWalkIn}
            className="rounded-xl border border-[#dce8df] px-3 py-2 text-xs font-semibold text-[#173b3a] hover:bg-[#f5faf7]"
          >
            + Add Walk-In
          </button>
          {showCorridor ? (
            <a
              href="/staff/display"
              className="rounded-xl border border-[#dce8df] px-3 py-2 text-xs font-semibold text-[#173b3a] hover:bg-[#f5faf7]"
            >
              Corridor TV
            </a>
          ) : null}
          <span className="rounded-xl border border-[#FCD34D] bg-[#FEF7ED] px-3 py-1.5 text-xs font-semibold text-[#B7791F]">
            {waiting.length} Waiting
          </span>
          {arrived.length > 0 && (
            <span className="rounded-xl border border-[#99D5C8] bg-[#E7F5F1] px-3 py-1.5 text-xs font-semibold text-[#176b5f]">
              {arrived.length} At desk
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#dce8df] bg-white p-4">
            <div className="mb-3 flex items-center justify-between border-b border-[#e5e7e6] pb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#66706B]">
                Active Consultations
              </span>
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-[#176b5f]">
                <span className="h-2 w-2 animate-pulse rounded-full bg-[#176b5f]" />
                LIVE
              </span>
            </div>
            {called.length > 0 ? (
              <div className="space-y-3">
                {called.map((appt) => (
                  <div key={appt.id} className="border-2 border-[#176b5f] bg-[#E7F5F1]/40 p-4">
                    <div className="flex items-center justify-between">
                      <span className="bg-[#176b5f] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                        {appt.roomName || "Room"}
                      </span>
                      {appt.bookingType === "WALK_IN" && (
                        <StatusBadge status="WALK_IN" size="sm" />
                      )}
                    </div>
                    <p className="mt-2 font-mono text-4xl font-bold text-[#173b3a]">
                      {appt.queueToken || "—"}
                    </p>
                    <h3 className="mt-1 text-base font-bold text-[#173b3a]">{appt.patientName}</h3>
                    <p className="text-xs text-[#66706B]">
                      Ref: {appt.reference}
                      {appt.studentIndex ? ` · Idx: ${appt.studentIndex}` : ""}
                    </p>
                    <ElapsedTimer resetKey={appt.id} className="mt-1 text-xs font-semibold text-[#176b5f]" />
                    {canComplete && (
                      <button
                        type="button"
                        onClick={() => onComplete(appt.id)}
                        disabled={updatingId === appt.id}
                        className="mt-3 w-full rounded-xl bg-[#176b5f] px-3 py-2 text-xs font-semibold text-white hover:bg-[#14594f] disabled:opacity-60"
                      >
                        Complete Visit
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-gray-500">No active consultation.</p>
            )}
          </div>

          {canCallNext && rooms.length > 0 && (
            <div className="rounded-2xl border border-[#dce8df] bg-white p-4">
              <p className="text-xs font-bold text-[#173b3a]">
                {waiting[0]
                  ? `Call next patient (${waiting[0].patientName})`
                  : "Call next patient"}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {rooms.map((room) => (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => onCallNext(room)}
                    disabled={Boolean(busyRoomId)}
                    className="rounded-xl bg-[#173b3a] px-3 py-2 text-xs font-semibold text-white hover:bg-[#176b5f] disabled:opacity-60"
                  >
                    {busyRoomId === room.id ? "Calling…" : `→ ${room.name}`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {arrived.length > 0 && (
            <div className="space-y-2 rounded-2xl border border-[#99D5C8] bg-[#E7F5F1] p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#176b5f]">
                Arrived — not yet queued
              </p>
              {arrived.map((appt) => (
                <div key={appt.id} className="rounded-xl border border-[#99D5C8] bg-white p-3">
                  <p className="text-xs font-semibold text-[#173b3a]">{appt.patientName}</p>
                  <p className="text-[10px] text-[#66706B]">
                    {appt.reference} · {appt.time}
                  </p>
                  <Button
                    variant="accent"
                    size="sm"
                    fullWidth
                    disabled={updatingId === appt.id}
                    onClick={() => onCheckInToQueue(appt.id)}
                  >
                    Check In to Queue
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 overflow-hidden rounded-2xl border border-[#dce8df] bg-white">
          <div className="flex items-center justify-between border-b border-[#dce8df] bg-[#f7f8f7] p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#173b3a]">
              Waiting Corridor ({waiting.length})
            </h3>
            <span className="text-xs text-[#66706B]">Virtual & physical waiting line</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#e5e7e6] text-[#66706B]">
                  <th className="p-3.5">Token</th>
                  <th className="p-3.5">Student</th>
                  <th className="hidden p-3.5 sm:table-cell">Type</th>
                  <th className="p-3.5 text-right">Est. wait</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e7e6]">
                {waiting.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-[#66706B]">
                      No students currently waiting in the queue.
                    </td>
                  </tr>
                ) : (
                  waiting.map((appt, index) => (
                    <tr key={appt.id}>
                      <td className="p-3.5 font-mono text-sm font-bold">{appt.queueToken || "—"}</td>
                      <td className="p-3.5">
                        <p className="font-semibold text-[#173b3a]">{appt.patientName}</p>
                        <p className="text-[10px] text-[#66706B]">
                          {appt.reference}
                          {appt.studentIndex ? ` · ${appt.studentIndex}` : ""}
                        </p>
                      </td>
                      <td className="hidden p-3.5 sm:table-cell">
                        {appt.bookingType === "WALK_IN" ? (
                          <span className="rounded-md bg-[#EBF8FF] px-1.5 py-0.5 text-[10px] font-bold text-[#2B6CB0]">
                            WALK-IN
                          </span>
                        ) : (
                          <span className="text-[#66706B]">Booked</span>
                        )}
                      </td>
                      <td className="p-3.5 text-right font-mono text-[#66706B]">
                        ~{(index + 1) * 15}m
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
