import { rosterMetrics, sortRoster, statusBadgeClass } from "./staffUtils";

export default function StaffToday({
  appointments,
  clinicLabel,
  selectedDateLabel,
  isSelectedToday,
  onOpenRoster,
  onOpenQueue,
  onOpenWalkIn,
  onCheckInToQueue,
  updatingId,
}) {
  const metrics = rosterMetrics(appointments);
  const arrivedPatients = appointments.filter((a) => a.status === "CHECKED_IN");
  const called = appointments.filter((a) => a.status === "CALLED");
  const todayList = sortRoster(appointments).slice(0, 8);

  const kpiCards = [
    { label: "Total Patients", value: metrics.total, hint: "Roster today" },
    { label: "Arrived", value: metrics.arrived, hint: "Awaiting desk", accent: true },
    { label: "In Queue", value: metrics.waiting, hint: "Live waiting" },
    { label: "In Consult", value: metrics.inConsult, hint: "Being seen" },
    { label: "Completed", value: metrics.completed, hint: "Concluded" },
    { label: "Walk-Ins", value: metrics.walkIns, hint: "Unscheduled" },
    { label: "No-Shows", value: metrics.noShows, hint: "Missed slots" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-[#dce8df] pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            Clinic Operations Dashboard
          </p>
          <h1 className="text-3xl font-bold text-[#173b3a]">
            {isSelectedToday ? "Today's Clinical Operations" : "Clinical Operations Roster"}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {clinicLabel} · {selectedDateLabel}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onOpenWalkIn}
            className="rounded-xl border border-[#dce8df] bg-white px-4 py-2.5 text-sm font-semibold text-[#173b3a] hover:bg-[#f5faf7]"
          >
            + Add Walk-In
          </button>
          <button
            type="button"
            onClick={onOpenRoster}
            className="rounded-xl border border-[#dce8df] bg-white px-4 py-2.5 text-sm font-semibold text-[#173b3a] hover:bg-[#f5faf7]"
          >
            Roster ({metrics.total})
          </button>
          <button
            type="button"
            onClick={onOpenQueue}
            className="rounded-xl bg-[#176b5f] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#14594f]"
          >
            Live Queue →
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-7">
        {kpiCards.map((card) => (
          <div
            key={card.label}
            className={`rounded-2xl border bg-white p-4 shadow-[0_8px_20px_rgba(23,59,58,0.04)] ${
              card.accent ? "border-[#176b5f] bg-[#E7F5F1]/40" : "border-[#dce8df]"
            }`}
          >
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
              {card.label}
            </div>
            <div className="text-3xl font-bold tabular-nums text-[#173b3a]">{card.value}</div>
            <div className="mt-1 text-[10px] text-gray-500">{card.hint}</div>
          </div>
        ))}
      </div>

      {called.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {called.map((appt) => (
            <div key={appt.id} className="rounded-2xl border-2 border-[#176b5f] bg-[#E7F5F1]/40 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#176b5f]">
                {appt.roomName || "In consult"}
              </p>
              <p className="mt-1 font-mono text-3xl font-bold text-[#173b3a]">
                {appt.queueToken || "—"}
              </p>
              <p className="mt-1 text-sm font-semibold text-[#173b3a]">{appt.patientName}</p>
            </div>
          ))}
        </div>
      )}

      {arrivedPatients.length > 0 && (
        <section className="rounded-2xl border border-[#99D5C8] bg-[#E7F5F1] p-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#176b5f]">
            Waiting at reception ({arrivedPatients.length})
          </h2>
          <div className="mt-3 space-y-2">
            {arrivedPatients.map((appt) => (
              <div
                key={appt.id}
                className="flex flex-col gap-3 rounded-xl border border-[#99D5C8] bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="text-sm font-semibold text-[#173b3a]">{appt.patientName}</div>
                  <div className="text-xs text-gray-500">
                    {appt.reference} · {appt.time}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onCheckInToQueue(appt.id)}
                  disabled={updatingId === appt.id}
                  className="shrink-0 rounded-xl bg-[#176b5f] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-[#14594f] disabled:opacity-60"
                >
                  {updatingId === appt.id ? "Updating…" : "Check In to Queue"}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-[#dce8df] bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#66706B]">
            Next on the roster
          </h2>
          <button
            type="button"
            onClick={onOpenRoster}
            className="text-xs font-semibold text-[#176b5f] hover:underline"
          >
            View all
          </button>
        </div>
        {todayList.length === 0 ? (
          <p className="text-sm text-gray-500">No appointments for this clinic on this date.</p>
        ) : (
          <ul className="divide-y divide-[#e5e7e6]">
            {todayList.map((appt) => (
              <li key={appt.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-semibold text-[#173b3a]">{appt.patientName}</p>
                  <p className="text-xs text-gray-500">
                    {appt.reference} · {appt.time} · {appt.service}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-[10px] font-semibold ${statusBadgeClass(appt.status)}`}>
                  {appt.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
