import { Appointment } from '../models/Appointment.js';
import { accraTodayIso } from '../lib/accraTime.js';
import { markNoShow } from './queueEngine.js';

/** Still expected in the live clinic day until midnight Accra rolls the roster. */
export const OPEN_CLINIC_DAY_STATUSES = Object.freeze([
  'BOOKED',
  'CHECKED_IN',
  'WAITING',
  'CALLED',
]);

export const DID_NOT_CHECK_IN_REASON = 'Did not check in on appointment day';
export const STALE_QUEUE_NO_SHOW_REASON = 'Clinic day closed without completing visit';

/**
 * Hospital OPD closeout: a visit belongs to its appointmentDate, not the day
 * the booking was created. After Accra midnight, yesterday's unfinished
 * visits leave the live board.
 *
 * BOOKED (never arrived) → no-show.
 * CHECKED_IN / WAITING / CALLED left overnight → no-show so they cannot be
 * called on the next hospital day.
 *
 * @param {string} todayIso YYYY-MM-DD in Africa/Accra
 */
export function missedDayQuery(todayIso) {
  return {
    appointmentDate: { $lt: todayIso },
    status: { $in: [...OPEN_CLINIC_DAY_STATUSES] },
  };
}

export function noShowReasonForStatus(status) {
  return status === 'BOOKED' ? DID_NOT_CHECK_IN_REASON : STALE_QUEUE_NO_SHOW_REASON;
}

/**
 * @param {{
 *   now?: Date,
 *   findMissed?: (query: object) => Promise<object[]>,
 *   noShow?: (params: object) => Promise<object>,
 * }} [options]
 */
export async function closeMissedAppointments({
  now = new Date(),
  findMissed,
  noShow,
} = {}) {
  const today = accraTodayIso(now);
  const query = missedDayQuery(today);
  const missed = findMissed
    ? await findMissed(query)
    : await Appointment.find(query).select('_id referenceCode status appointmentDate');

  const mark = noShow || markNoShow;
  const references = [];
  let marked = 0;
  let failed = 0;

  for (const appointment of missed) {
    try {
      await mark({
        appointmentId: appointment._id,
        reason: noShowReasonForStatus(appointment.status),
      });
      marked += 1;
      if (appointment.referenceCode) references.push(appointment.referenceCode);
    } catch {
      failed += 1;
    }
  }

  return {
    ok: true,
    today,
    scanned: missed.length,
    marked,
    failed,
    references,
  };
}
