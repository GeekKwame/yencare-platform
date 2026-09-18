import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { accraTodayIso } from '../src/lib/accraTime.js';
import {
  DID_NOT_CHECK_IN_REASON,
  OPEN_CLINIC_DAY_STATUSES,
  STALE_QUEUE_NO_SHOW_REASON,
  closeMissedAppointments,
  missedDayQuery,
  noShowReasonForStatus,
} from '../src/services/closeMissedAppointments.js';
import { liveClinicDayFilter } from '../src/services/queueEngine.js';
import { resolveRosterDate } from '../src/services/appointmentOps.js';

describe('hospital day-scoped roster', () => {
  it('defaults the staff list to Accra today when no date is sent', () => {
    const fridayMorning = new Date('2026-09-18T07:41:00.000Z');
    assert.equal(resolveRosterDate(undefined, fridayMorning), '2026-09-18');
    assert.equal(resolveRosterDate('', fridayMorning), '2026-09-18');
  });

  it('keeps an explicit visit date (not createdAt)', () => {
    assert.equal(resolveRosterDate('2026-09-17'), '2026-09-17');
  });

  it('rejects a malformed roster date', () => {
    assert.throws(() => resolveRosterDate('18/09/2026'), /date must be YYYY-MM-DD/);
  });
});

describe('live queue is scoped to the visit day', () => {
  it('filters call-next and corridor boards by appointmentDate', () => {
    assert.deepEqual(liveClinicDayFilter('2026-09-18'), {
      appointmentDate: '2026-09-18',
    });
  });
});

describe('missed-day no-show closeout', () => {
  it('selects unfinished visits from before Accra today', () => {
    assert.deepEqual(missedDayQuery('2026-09-18'), {
      appointmentDate: { $lt: '2026-09-18' },
      status: { $in: [...OPEN_CLINIC_DAY_STATUSES] },
    });
  });

  it('uses a check-in reason for BOOKED and a day-closed reason for queue leftovers', () => {
    assert.equal(noShowReasonForStatus('BOOKED'), DID_NOT_CHECK_IN_REASON);
    assert.equal(noShowReasonForStatus('CHECKED_IN'), STALE_QUEUE_NO_SHOW_REASON);
    assert.equal(noShowReasonForStatus('WAITING'), STALE_QUEUE_NO_SHOW_REASON);
    assert.equal(noShowReasonForStatus('CALLED'), STALE_QUEUE_NO_SHOW_REASON);
  });

  it('marks a prior-day BOOKED hospital visit as no-show after midnight Accra', async () => {
    const now = new Date('2026-09-18T07:41:00.000Z');
    const missed = {
      _id: 'appt-yesterday',
      referenceCode: 'YC-1101',
      status: 'BOOKED',
      appointmentDate: '2026-09-17',
    };
    const marked = [];
    let queryUsed = null;

    const result = await closeMissedAppointments({
      now,
      findMissed: async (query) => {
        queryUsed = query;
        return [missed];
      },
      noShow: async (params) => {
        marked.push(params);
        return { appointment: missed };
      },
    });

    assert.equal(accraTodayIso(now), '2026-09-18');
    assert.deepEqual(queryUsed, missedDayQuery('2026-09-18'));
    assert.deepEqual(marked, [
      {
        appointmentId: 'appt-yesterday',
        reason: DID_NOT_CHECK_IN_REASON,
      },
    ]);
    assert.equal(result.marked, 1);
    assert.equal(result.failed, 0);
    assert.deepEqual(result.references, ['YC-1101']);
    assert.equal(result.today, '2026-09-18');
  });

  it('does not close today’s BOOKED visits, including overnight hospital slots', async () => {
    const now = new Date('2026-09-18T02:15:00.000Z');
    let queryUsed = null;

    const result = await closeMissedAppointments({
      now,
      findMissed: async (query) => {
        queryUsed = query;
        return [];
      },
      noShow: async () => {
        throw new Error('should not mark today’s visits');
      },
    });

    assert.deepEqual(queryUsed, missedDayQuery('2026-09-18'));
    assert.equal(result.scanned, 0);
    assert.equal(result.marked, 0);
  });

  it('closes leftover WAITING/CALLED from yesterday so they cannot be called today', async () => {
    const now = new Date('2026-09-18T00:10:00.000Z');
    const leftover = {
      _id: 'appt-waiting',
      referenceCode: 'YC-1102',
      status: 'WAITING',
      appointmentDate: '2026-09-17',
    };
    const marked = [];

    const result = await closeMissedAppointments({
      now,
      findMissed: async () => [leftover],
      noShow: async (params) => {
        marked.push(params);
        return { appointment: leftover };
      },
    });

    assert.equal(marked[0].reason, STALE_QUEUE_NO_SHOW_REASON);
    assert.equal(result.marked, 1);
  });

  it('continues when one no-show fails', async () => {
    const now = new Date('2026-09-18T08:00:00.000Z');
    const result = await closeMissedAppointments({
      now,
      findMissed: async () => [
        { _id: 'bad', referenceCode: 'YC-1', status: 'BOOKED' },
        { _id: 'ok', referenceCode: 'YC-2', status: 'BOOKED' },
      ],
      noShow: async ({ appointmentId }) => {
        if (appointmentId === 'bad') throw new Error('already completed');
        return { appointment: { _id: appointmentId } };
      },
    });

    assert.equal(result.marked, 1);
    assert.equal(result.failed, 1);
    assert.deepEqual(result.references, ['YC-2']);
  });
});
