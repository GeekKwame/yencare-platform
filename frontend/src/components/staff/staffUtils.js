import { accraTodayIso } from "../../lib/accraTime";

export const STATUS_RANK = {
  CHECKED_IN: 0,
  BOOKED: 1,
  WAITING: 2,
  CALLED: 3,
  COMPLETED: 4,
  NO_SHOW: 5,
  CANCELLED: 6,
};

function parseAppointmentTime(value) {
  const match = String(value || "").trim().match(/^(\d{1,2}):(\d{2})(?:\s*([AP]M))?$/i);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3]?.toUpperCase();
  if (minutes > 59 || hours > 23 || (meridiem && hours > 12)) return null;
  if (meridiem === "AM" && hours === 12) hours = 0;
  if (meridiem === "PM" && hours !== 12) hours += 12;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function formatUnlockDate(dateIso) {
  const [year, month, day] = String(dateIso).split("-").map(Number);
  if (!year || !month || !day) return dateIso;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function formatUnlockTime(hhmm) {
  const [hours, minutes] = hhmm.split(":").map(Number);
  const suffix = hours >= 12 ? "PM" : "AM";
  const hour12 = ((hours + 11) % 12) + 1;
  return `${hour12}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

export function getStaffActionState(appointment, now = new Date()) {
  const date = appointment?.date || appointment?.appointmentDate;
  const startTime = parseAppointmentTime(appointment?.appointmentTime || appointment?.time);
  const isVisitDate = Boolean(date) && date === accraTodayIso(now);
  const checkInNote = isVisitDate
    ? ""
    : `Check-in opens on ${formatUnlockDate(date)}`;

  if (!date || !startTime) {
    return {
      canCheckIn: isVisitDate,
      checkInNote,
      canNoShow: false,
      noShowNote: "No-show availability cannot be determined yet",
    };
  }

  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes] = startTime.split(":").map(Number);
  const unlockAt = new Date(Date.UTC(year, month - 1, day, hours, minutes + 15));
  const canNoShow = now >= unlockAt;
  const unlockLabel = formatUnlockTime(
    `${String(unlockAt.getUTCHours()).padStart(2, "0")}:${String(unlockAt.getUTCMinutes()).padStart(2, "0")}`,
  );

  return {
    canCheckIn: isVisitDate,
    checkInNote,
    canNoShow,
    noShowNote: canNoShow
      ? ""
      : `No-show available after ${unlockLabel}${date === accraTodayIso(now) ? "" : ` on ${formatUnlockDate(date)}`}`,
  };
}

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
