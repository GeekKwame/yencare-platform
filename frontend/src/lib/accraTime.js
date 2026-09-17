const ACCRA = "Africa/Accra";

export function accraTodayIso(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ACCRA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function accraNowHm(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: ACCRA,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const hour = parts.find((part) => part.type === "hour")?.value || "00";
  const minute = parts.find((part) => part.type === "minute")?.value || "00";
  return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
}

export function accraWeekday(date = new Date()) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: ACCRA,
    weekday: "short",
  }).format(date);
}

/**
 * Students' Clinic: Mon–Fri 08:00–16:00 Accra. KNUST Hospital is open 24 hours.
 */
export function isClinicOpen(clinicSite = "students-clinic", date = new Date()) {
  if (clinicSite === "knust-hospital") return true;
  const weekday = accraWeekday(date);
  if (weekday === "Sat" || weekday === "Sun") return false;
  const hour = Number(accraNowHm(date).slice(0, 2));
  return hour >= 8 && hour < 16;
}

export function isStudentsClinicOpen(date = new Date()) {
  return isClinicOpen("students-clinic", date);
}

export function isFutureSlot(dateIso, startTime, now = new Date()) {
  const today = accraTodayIso(now);
  if (!dateIso) return false;
  if (dateIso > today) return true;
  if (dateIso < today) return false;
  return String(startTime || "") > accraNowHm(now);
}

export function upcomingWeekdays(fromIso, count = 14) {
  const [year, month, day] = String(fromIso)
    .split("-")
    .map(Number);
  const cursor = new Date(Date.UTC(year, month - 1, day));
  const dates = [];

  while (dates.length < count) {
    const dow = cursor.getUTCDay();
    if (dow !== 0 && dow !== 6) {
      dates.push(cursor.toISOString().slice(0, 10));
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

export function accraTomorrowIso(date = new Date()) {
  const today = accraTodayIso(date);
  const [year, month, day] = today.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return next.toISOString().slice(0, 10);
}

export function accraClockLabel(date = new Date()) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: ACCRA,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

