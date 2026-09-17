const ACCRA = 'Africa/Accra';

/**
 * @param {Date} [date]
 * @returns {string} YYYY-MM-DD in Africa/Accra
 */
export function accraTodayIso(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ACCRA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * @param {Date} [date]
 * @returns {{ weekday: string, hour: number, minute: number, hm: string }}
 */
export function accraParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: ACCRA,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const weekday = parts.find((part) => part.type === 'weekday')?.value || '';
  const hour = Number(parts.find((part) => part.type === 'hour')?.value || 0);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value || 0);

  return {
    weekday,
    hour,
    minute,
    hm: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
  };
}

/**
 * Single source of truth for clinic opening hours, in Accra time.
 * `openDays` uses JS day numbers (0 = Sunday).
 */
export const CLINIC_OPENING_HOURS = Object.freeze({
  'students-clinic': Object.freeze({
    allDay: false,
    openDays: Object.freeze([1, 2, 3, 4, 5]),
    openHour: 8,
    closeHour: 16,
    label: 'Monday to Friday, 08:00–16:00',
  }),
  'knust-hospital': Object.freeze({
    allDay: true,
    openDays: Object.freeze([0, 1, 2, 3, 4, 5, 6]),
    openHour: 0,
    closeHour: 24,
    label: '24 hours, every day',
  }),
});

const DEFAULT_CLINIC_SITE = 'students-clinic';

const WEEKDAY_NUMBERS = Object.freeze({
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
});

function withinHours(hours, minutesOfDay) {
  return minutesOfDay >= hours.openHour * 60 && minutesOfDay < hours.closeHour * 60;
}

/**
 * @param {string} [clinicSite]
 * @returns {typeof CLINIC_OPENING_HOURS['students-clinic']}
 */
export function clinicOpeningHours(clinicSite = DEFAULT_CLINIC_SITE) {
  return CLINIC_OPENING_HOURS[clinicSite] || CLINIC_OPENING_HOURS[DEFAULT_CLINIC_SITE];
}

/**
 * Human-readable hours for error messages and UI copy.
 *
 * @param {string} [clinicSite]
 */
export function clinicHoursLabel(clinicSite = DEFAULT_CLINIC_SITE) {
  return clinicOpeningHours(clinicSite).label;
}

/**
 * Students' Clinic: Monday–Friday, 08:00–16:00 Accra.
 * KNUST Hospital OPD bookings remain available 24 hours.
 *
 * @param {string} [clinicSite]
 * @param {Date} [date]
 */
export function isClinicOpen(clinicSite = DEFAULT_CLINIC_SITE, date = new Date()) {
  const hours = clinicOpeningHours(clinicSite);
  if (hours.allDay) return true;

  const { weekday, hour, minute } = accraParts(date);
  const weekdayNumber = WEEKDAY_NUMBERS[weekday];
  if (weekdayNumber === undefined || !hours.openDays.includes(weekdayNumber)) {
    return false;
  }

  return withinHours(hours, hour * 60 + minute);
}

/**
 * Day of week for a calendar date. Ghana has no DST and sits on UTC+0 all year,
 * so a plain YYYY-MM-DD maps straight onto a UTC day.
 *
 * @param {string} dateIso YYYY-MM-DD
 * @returns {number | null} 0 = Sunday, or null when the date is unparseable.
 */
export function accraWeekday(dateIso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateIso || ''));
  if (!match) return null;

  const [, year, month, day] = match.map(Number);
  const stamp = Date.UTC(year, month - 1, day);
  if (Number.isNaN(stamp)) return null;

  return new Date(stamp).getUTCDay();
}

/**
 * Whether a *scheduled* appointment date/time falls inside opening hours.
 * Unlike `isClinicOpen`, this asks about a calendar slot rather than "now".
 *
 * @param {string} clinicSite
 * @param {string} dateIso YYYY-MM-DD
 * @param {string} timeHm HH:mm
 */
export function isClinicOpenAt(clinicSite, dateIso, timeHm) {
  const hours = clinicOpeningHours(clinicSite);
  if (hours.allDay) return true;

  const weekday = accraWeekday(dateIso);
  if (weekday === null || !hours.openDays.includes(weekday)) return false;

  const time = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(timeHm || ''));
  if (!time) return false;

  return withinHours(hours, Number(time[1]) * 60 + Number(time[2]));
}

/**
 * @param {string} fromIso YYYY-MM-DD
 * @param {number} [count]
 * @returns {string[]}
 */
export function upcomingWeekdays(fromIso, count = 14) {
  const [year, month, day] = String(fromIso)
    .split('-')
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
  const [year, month, day] = today.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return next.toISOString().slice(0, 10);
}
