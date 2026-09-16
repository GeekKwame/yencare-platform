export const STATUS_RANK = {
  CHECKED_IN: 0,
  BOOKED: 1,
  WAITING: 2,
  CALLED: 3,
  COMPLETED: 4,
  NO_SHOW: 5,
  CANCELLED: 6,
};

export const ROSTER_FILTERS = [
  { id: "all", label: "All" },
  { id: "BOOKED", label: "Booked" },
  { id: "CHECKED_IN", label: "Arrived" },
  { id: "WAITING", label: "In queue" },
  { id: "CALLED", label: "In consult" },
  { id: "WALK_IN", label: "Walk-ins" },
  { id: "COMPLETED", label: "Completed" },
  { id: "NO_SHOW", label: "No-shows" },
];

export function statusBadgeClass(status) {
  switch (status) {
    case "CHECKED_IN":
      return "bg-[#176b5f] text-white";
    case "WAITING":
      return "bg-[#fff6e8] text-[#8a5a12]";
    case "CALLED":
      return "bg-[#E7F5F1] text-[#176b5f]";
    case "COMPLETED":
      return "bg-[#dce8df] text-[#173b3a]";
    case "NO_SHOW":
      return "bg-[#fde8e8] text-[#9b2c2c]";
    case "CANCELLED":
      return "bg-gray-100 text-gray-500";
    default:
      return "bg-[#dce8df] text-[#173b3a]";
  }
}

export function matchesDeskQuery(appt, rawQuery) {
  const q = rawQuery.trim();
  if (!q) return true;

  const compact = q.replace(/\s+/g, "").toUpperCase();
  const name = String(appt.patientName || "").toUpperCase();
  const reference = String(appt.reference || "").replace(/\s+/g, "").toUpperCase();
  const index = String(appt.studentIndex || "").replace(/\s+/g, "").toUpperCase();
  const phone = String(appt.phone || "").replace(/\s+/g, "").toUpperCase();

  return (
    name.includes(q.toUpperCase()) ||
    reference.includes(compact) ||
    index === compact ||
    phone === compact ||
    phone.endsWith(compact)
  );
}

export function rosterMetrics(appointments) {
  return {
    total: appointments.length,
    arrived: appointments.filter((a) => a.status === "CHECKED_IN").length,
    waiting: appointments.filter((a) => a.status === "WAITING").length,
    inConsult: appointments.filter((a) => a.status === "CALLED").length,
    completed: appointments.filter((a) => a.status === "COMPLETED").length,
    walkIns: appointments.filter((a) => a.bookingType === "WALK_IN").length,
    noShows: appointments.filter((a) => a.status === "NO_SHOW").length,
  };
}

export function sortRoster(appointments) {
  return [...appointments].sort((a, b) => {
    const rankDiff = (STATUS_RANK[a.status] ?? 99) - (STATUS_RANK[b.status] ?? 99);
    if (rankDiff !== 0) return rankDiff;
    return String(a.time || "").localeCompare(String(b.time || ""));
  });
}

export function sortWaiting(appointments) {
  return [...appointments].sort((a, b) =>
    String(a.queueToken || "").localeCompare(String(b.queueToken || ""), undefined, {
      numeric: true,
    }),
  );
}
