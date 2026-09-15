import { Appointment, ClinicSite } from '../types/clinic';

/** Subtract 15 minutes from a 12-hour clock time like "9:30 AM". */
export function getArriveBy(time: string): string {
  const match = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return time;
  let h = parseInt(match[1], 10);
  let m = parseInt(match[2], 10);
  const period = match[3].toUpperCase();

  m -= 15;
  if (m < 0) {
    m += 60;
    h -= 1;
  }
  if (h <= 0) h = 12;
  return `${h}:${String(m).padStart(2, '0')} ${period}`;
}

/** Numeric sort key for queue tokens (#4 before #9, then W-024). */
export function parseTokenNumber(token?: string): number {
  if (!token) return Number.MAX_SAFE_INTEGER;
  if (token.startsWith('W-')) {
    const n = parseInt(token.slice(2), 10);
    return 1000 + (Number.isNaN(n) ? 0 : n);
  }
  const n = parseInt(token.replace(/\D/g, ''), 10);
  return Number.isNaN(n) ? Number.MAX_SAFE_INTEGER : n;
}

export function sortByQueueToken<T extends { queueToken?: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => parseTokenNumber(a.queueToken) - parseTokenNumber(b.queueToken));
}

/** Next #N token for a clinic site, based on patients already in the live queue. */
export function nextQueueToken(appointments: Appointment[], site: ClinicSite): string {
  const used = appointments
    .filter(
      (a) =>
        a.clinicSite === site &&
        (a.status === 'WAITING' || a.status === 'CALLED') &&
        a.queueToken?.startsWith('#')
    )
    .map((a) => parseTokenNumber(a.queueToken))
    .filter((n) => n < 1000);

  const max = used.length ? Math.max(...used) : 0;
  return `#${max + 1}`;
}

export function waitingOnSite(appointments: Appointment[], site: ClinicSite): Appointment[] {
  return sortByQueueToken(
    appointments.filter((a) => a.status === 'WAITING' && a.clinicSite === site)
  );
}

export function patientsAheadOf(app: Appointment, appointments: Appointment[]): number {
  if (app.status !== 'WAITING') return 0;
  const mine = parseTokenNumber(app.queueToken);
  return waitingOnSite(appointments, app.clinicSite).filter(
    (a) => a.id !== app.id && parseTokenNumber(a.queueToken) < mine
  ).length;
}

const BLOCKING_STATUSES = new Set(['BOOKED', 'CHECKED_IN', 'WAITING', 'CALLED']);

export function isSlotOccupied(
  appointments: Appointment[],
  doctorId: string,
  date: string,
  time: string,
  excludeId?: string
): boolean {
  return appointments.some(
    (a) =>
      a.id !== excludeId &&
      a.doctor.id === doctorId &&
      a.date === date &&
      a.time === time &&
      BLOCKING_STATUSES.has(a.status)
  );
}

/** Next unused YC-NNNN for a new student booking. Skips 9xxx (seeded other-site IDs). */
export function nextYcReference(appointments: Appointment[]): string {
  const nums = appointments
    .map((a) => {
      const match = a.id.match(/^YC-(\d+)$/i);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((n) => n > 0 && n < 9000);
  const next = Math.max(6000, ...(nums.length ? nums : [5999])) + 1;
  return `YC-${String(next).padStart(4, '0')}`;
}
