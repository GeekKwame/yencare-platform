const ACCRA = "Africa/Accra";

/**
 * @param {Date} [date]
 * @returns {string} YYYY-MM-DD in Africa/Accra
 */
export function accraTodayIso(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ACCRA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * @param {Date} [date]
 * @returns {string} HH:mm
 */
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

/**
 * @param {Date} [date]
 * @returns {{ weekday: string, hour: number, minute: number, hm: string }}
 */
export function accraParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: ACCRA,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const weekday = parts.find((part) => part.type === "weekday")?.value || "";
  const hour = Number(parts.find((part) => part.type === "hour")?.value || 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value || 0);

  return {
    weekday,
    hour,
    minute,
    hm: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
  };
}

export const CLINIC_CONFIG = Object.freeze({
  "students-clinic": Object.freeze({
    id: "students-clinic",
    name: "KNUST Students' Clinic",
    operatingDays: Object.freeze([1, 2, 3, 4, 5]), // Monday to Friday
    openHour: 8,
    openMinute: 0,
    closeHour: 16,
    closeMinute: 0,
    openingTime: "08:00",
    closingTime: "16:00",
    allDay: false,
    slotDurationMinutes: 30,
    timezone: ACCRA,
    label: "Monday to Friday, 08:00–16:00",
  }),
  "knust-hospital": Object.freeze({
    id: "knust-hospital",
    name: "KNUST Hospital",
    operatingDays: Object.freeze([0, 1, 2, 3, 4, 5, 6]), // 7 days a week
    openHour: 0,
    openMinute: 0,
    closeHour: 24,
    closeMinute: 0,
    openingTime: "00:00",
    closingTime: "24:00",
    allDay: true,
    slotDurationMinutes: 30,
    timezone: ACCRA,
    label: "24 hours, every day",
  }),
});

export const CLINIC_OPENING_HOURS = Object.freeze({
  "students-clinic": Object.freeze({
    allDay: false,
    openDays: Object.freeze([1, 2, 3, 4, 5]),
    openHour: 8,
    closeHour: 16,
    label: "Monday to Friday, 08:00–16:00",
  }),
  "knust-hospital": Object.freeze({
    allDay: true,
    openDays: Object.freeze([0, 1, 2, 3, 4, 5, 6]),
    openHour: 0,
    closeHour: 24,
    label: "24 hours, every day",
  }),
});

const DEFAULT_CLINIC_SITE = "students-clinic";

const WEEKDAY_NUMBERS = Object.freeze({
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
});

export function clinicOpeningHours(clinicSite = DEFAULT_CLINIC_SITE) {
  return CLINIC_OPENING_HOURS[clinicSite] || CLINIC_OPENING_HOURS[DEFAULT_CLINIC_SITE];
}

export function clinicHoursLabel(clinicSite = DEFAULT_CLINIC_SITE) {
  return clinicOpeningHours(clinicSite).label;
}

/**
 * Returns whether clinic is currently open.
 * Students' Clinic: Mon–Fri 08:00–16:00 Accra. KNUST Hospital: 24 hours.
 */
export function isClinicOpen(clinicSite = DEFAULT_CLINIC_SITE, date = new Date()) {
  const hours = clinicOpeningHours(clinicSite);
  if (hours.allDay) return true;

  const { weekday, hour, minute } = accraParts(date);
  const weekdayNumber = WEEKDAY_NUMBERS[weekday];
  if (weekdayNumber === undefined || !hours.openDays.includes(weekdayNumber)) {
    return false;
  }

  const minutesOfDay = hour * 60 + minute;
  return minutesOfDay >= hours.openHour * 60 && minutesOfDay < hours.closeHour * 60;
}

export function isStudentsClinicOpen(date = new Date()) {
  return isClinicOpen("students-clinic", date);
}

/**
 * Day of week for a calendar date (0 = Sunday).
 */
export function accraWeekday(dateOrIso = new Date()) {
  if (dateOrIso instanceof Date) {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: ACCRA,
      weekday: "short",
    }).format(dateOrIso);
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateOrIso || ""));
  if (!match) return null;
  const [, year, month, day] = match.map(Number);
  const stamp = Date.UTC(year, month - 1, day);
  if (Number.isNaN(stamp)) return null;
  return new Date(stamp).getUTCDay();
}

/**
 * Check if a future calendar slot is valid for a clinic
 */
export function isClinicOpenAt(clinicSite, dateIso, timeHm) {
  const hours = clinicOpeningHours(clinicSite);
  if (hours.allDay) return true;

  const weekday = accraWeekday(dateIso);
  if (weekday === null || !hours.openDays.includes(weekday)) return false;

  const time = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(timeHm || ""));
  if (!time) return false;

  const slotMinutes = Number(time[1]) * 60 + Number(time[2]);
  return slotMinutes >= hours.openHour * 60 && slotMinutes < hours.closeHour * 60;
}

export function isFutureSlot(dateIso, startTime, now = new Date()) {
  const today = accraTodayIso(now);
  if (!dateIso) return false;
  if (dateIso > today) return true;
  if (dateIso < today) return false;
  return String(startTime || "") > accraNowHm(now);
}

export const EARLY_WINDOW_MINUTES = 60;
export const LATE_GRACE_MINUTES = 15;

export function clockMinutes(hhmm) {
  const match = /^(\d{1,2}):(\d{2})(?:\s*([AP]M))?$/i.exec(String(hhmm || "").trim());
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3]?.toUpperCase();
  if (minutes > 59 || hours > 23 || (meridiem && hours > 12)) return null;
  if (meridiem === "AM" && hours === 12) hours = 0;
  if (meridiem === "PM" && hours !== 12) hours += 12;
  return hours * 60 + minutes;
}

export function accraMinutesNow(now = new Date()) {
  const { hour, minute } = accraParts(now);
  return hour * 60 + minute;
}

export function formatClock(totalMinutes) {
  const minutesOfDay = ((totalMinutes % 1440) + 1440) % 1440;
  const hours = Math.floor(minutesOfDay / 60);
  const minutes = minutesOfDay % 60;
  const suffix = hours >= 12 ? "PM" : "AM";
  return `${((hours + 11) % 12) + 1}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

export function formatVisitDate(dateIso) {
  const [year, month, day] = String(dateIso || "").split("-").map(Number);
  if (!year || !month || !day) return String(dateIso || "");
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

/**
 * Arrival window: 60 minutes before slot start up to 15 minutes after.
 */
export function getArrivalWindowStatus(dateIso, startTime, now = new Date()) {
  const start = clockMinutes(startTime);
  if (!dateIso || start === null) {
    return { canArrive: false, reason: "Your appointment time is missing. Please tell reception you are here." };
  }

  const opensAt = formatClock(start - EARLY_WINDOW_MINUTES);
  const today = accraTodayIso(now);
  if (dateIso < today) {
    return {
      canArrive: false,
      reason: "This appointment date has passed. Please book a new appointment or speak to reception.",
    };
  }
  if (dateIso > today) {
    return { canArrive: false, reason: `Check-in opens on ${formatVisitDate(dateIso)} at ${opensAt}.` };
  }

  const offset = accraMinutesNow(now) - start;
  if (offset < -EARLY_WINDOW_MINUTES) {
    return { canArrive: false, reason: `Check-in opens at ${opensAt}.` };
  }
  if (offset > LATE_GRACE_MINUTES) {
    return { canArrive: false, reason: "You're past your time, please see reception." };
  }

  return { canArrive: true, reason: "" };
}

export function isWithinArrivalWindow(dateIso, startTime, now = new Date()) {
  return getArrivalWindowStatus(dateIso, startTime, now).canArrive;
}

export function upcomingWeekdays(fromIso, count = 14) {
  const [year, month, day] = String(fromIso).split("-").map(Number);
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

export function upcomingCalendarDays(fromIso, count = 14) {
  const [year, month, day] = String(fromIso).split("-").map(Number);
  const cursor = new Date(Date.UTC(year, month - 1, day));
  const dates = [];

  while (dates.length < count) {
    dates.push(cursor.toISOString().slice(0, 10));
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

