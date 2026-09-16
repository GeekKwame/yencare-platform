import { ROSTER_FILTERS, sortRoster, statusBadgeClass } from "./staffUtils";

export default function StaffRoster({
  appointments,
  filteredAppointments,
  statusFilter,
  onFilterChange,
  highlightedId,
  updatingId,
  loading,
  onCheckIn,
  onCheckInToQueue,
  onNoShow,
  onOpenWalkIn,
}) {
  const sorted = sortRoster(filteredAppointments);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 border-b border-[#dce8df] pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            Clinical Roster
          </p>
          <h2 className="text-2xl font-bold text-[#173b3a]">Appointments Roster</h2>
        </div>
        <button
          type="button"
          onClick={onOpenWalkIn}
          className="rounded-xl bg-[#176b5f] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#14594f]"
        >
          + Add Walk-In
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {ROSTER_FILTERS.map((filter) => {
          const active = statusFilter === filter.id;
          const count =
            filter.id === "all"
              ? appointments.length
              : filter.id === "WALK_IN"
                ? appointments.filter((appt) => appt.bookingType === "WALK_IN").length
                : appointments.filter((appt) => appt.status === filter.id).length;
          return (
            <button
              key={filter.id}
              type="button"
              onClick={() => onFilterChange(filter.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                active
                  ? "bg-[#176b5f] text-white"
                  : "border border-[#dce8df] bg-white text-[#173b3a] hover:bg-[#E7F5F1]"
              }`}
            >
              {filter.label} ({count})
            </button>
          );
        })}
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading roster…</p>
      ) : sorted.length === 0 ? (
        <p className="text-sm text-gray-500">
          {appointments.length === 0
            ? "No appointments for this clinic on this date."
            : "No appointments match this filter or search."}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((appt) => (
            <div
              key={appt.id}
              id={`staff-appt-${appt.id}`}
              className={`rounded-2xl border bg-white p-5 shadow-[0_14px_30px_rgba(23,59,58,0.07)] ${
                highlightedId === appt.id
                  ? "border-[#176b5f] ring-2 ring-[#176b5f]/25"
                  : "border-[#dce8df]"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wide text-[#c37d32]">
                  {appt.reference}
                </span>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(appt.status)}`}>
                  {appt.status}
                  {appt.queueToken ? ` · ${appt.queueToken}` : ""}
                </span>
              </div>
              <h3 className="mt-3 text-lg font-bold text-[#173b3a]">{appt.patientName}</h3>
              <p className="mt-1 text-sm text-gray-500">
                {appt.service} · {appt.time}
              </p>
              {(appt.studentIndex || appt.phone) && (
                <p className="mt-1 text-xs text-gray-400">
                  {[
                    appt.studentIndex ? `Index ${appt.studentIndex}` : null,
                    appt.phone || null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
              {appt.bookingType === "WALK_IN" && (
                <span className="mt-2 inline-block rounded-md border border-[#BEE3F8] bg-[#EBF8FF] px-1.5 py-0.5 text-[10px] font-bold text-[#2B6CB0]">
                  WALK-IN
                </span>
              )}

              {appt.status === "BOOKED" && (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onCheckIn(appt.id)}
                    disabled={updatingId === appt.id}
                    className="rounded-xl bg-[#176b5f] px-3 py-2 text-sm font-semibold text-white hover:bg-[#14594f] disabled:opacity-60"
                  >
                    {updatingId === appt.id ? "Updating…" : "Check In"}
                  </button>
                  <button
                    type="button"
                    onClick={() => onNoShow(appt.id)}
                    disabled={updatingId === appt.id}
                    className="rounded-xl border border-[#f1c0c0] bg-[#FFF5F5] px-3 py-2 text-sm font-semibold text-[#9B2C2C] hover:bg-[#fde8e8] disabled:opacity-60"
                  >
                    No-Show
                  </button>
                </div>
              )}

              {appt.status === "CHECKED_IN" && (
                <button
                  type="button"
                  onClick={() => onCheckInToQueue(appt.id)}
                  disabled={updatingId === appt.id}
                  className="mt-4 w-full rounded-xl bg-[#176b5f] px-4 py-2 text-sm font-semibold text-white hover:bg-[#14594f] disabled:opacity-60"
                >
                  {updatingId === appt.id ? "Updating…" : "Check In to Queue"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
