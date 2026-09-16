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
 * Students' Clinic: Monday–Friday, 08:00–16:00 Accra.
 * KNUST Hospital OPD bookings remain available 24 hours.
 *
 * @param {string} [clinicSite]
 * @param {Date} [date]
 */
export function isClinicOpen(clinicSite = 'students-clinic', date = new Date()) {
  if (clinicSite === 'knust-hospital') return true;

  const { weekday, hour } = accraParts(date);
  const weekdayOpen = !['Sat', 'Sun'].includes(weekday);
  return weekdayOpen && hour >= 8 && hour < 16;
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
