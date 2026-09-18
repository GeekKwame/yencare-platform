import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import mongoose from 'mongoose';
import {
  isAllowedStatusTransition,
  STATUS_TRANSITIONS,
} from '../src/db/constants.js';
import { Appointment, QueueCounter, Room } from '../src/models/index.js';
import { accraTodayIso } from '../src/lib/accraTime.js';
import {
  AVERAGE_CONSULT_DURATION_MINUTES,
  getRoomTokenPrefix,
  getAccraQueueDate,
  liveClinicDayFilter,
} from '../src/services/queueEngine.js';

const oid = () => new mongoose.Types.ObjectId();

describe('queueEngine room prefix and date logic', () => {
  it('derives token prefix from explicit room tokenPrefix', () => {
    assert.equal(getRoomTokenPrefix({ tokenPrefix: 'b' }), 'B');
    assert.equal(getRoomTokenPrefix({ tokenPrefix: 'GF' }), 'GF');
  });

  it('derives letter prefix from room numbering (e.g. Room 1 -> A, Room 2 -> B)', () => {
    assert.equal(getRoomTokenPrefix({ name: 'Room 1' }), 'A');
    assert.equal(getRoomTokenPrefix({ name: 'Room 2' }), 'B');
    assert.equal(getRoomTokenPrefix({ name: 'Consulting Room 4' }), 'D');
  });

  it('uses explicit tokenPrefix for hospital OPD rooms', () => {
    assert.equal(getRoomTokenPrefix({ name: 'OPD Room 1', tokenPrefix: 'H' }), 'H');
    assert.equal(getRoomTokenPrefix({ name: 'OPD Room 2', tokenPrefix: 'J' }), 'J');
  });

  it('falls back to first letter for unnumbered rooms', () => {
    assert.equal(getRoomTokenPrefix({ name: 'Triage Room' }), 'T');
    assert.equal(getRoomTokenPrefix({}), 'A');
  });

  it('getAccraQueueDate returns YYYY-MM-DD resetting at Accra midnight', () => {
    assert.equal(getAccraQueueDate(), accraTodayIso());
    assert.match(getAccraQueueDate(), /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(getAccraQueueDate('2026-09-15'), '2026-09-15');
  });

  it('getAccraQueueDate rejects invalid date pattern', () => {
    assert.throws(() => getAccraQueueDate('15-09-2026'), /overrideDate must be YYYY-MM-DD/);
  });

  it('scopes the live queue to appointmentDate (visit day), not createdAt', () => {
    assert.deepEqual(liveClinicDayFilter('2026-09-18'), { appointmentDate: '2026-09-18' });
    assert.deepEqual(liveClinicDayFilter(), { appointmentDate: accraTodayIso() });
  });
});

describe('queueEngine state machine transitions', () => {
  it('enforces strict status progression: BOOKED → CHECKED_IN → WAITING → CALLED → COMPLETED', () => {
    assert.equal(isAllowedStatusTransition('BOOKED', 'CHECKED_IN'), true);
    assert.equal(isAllowedStatusTransition('CHECKED_IN', 'WAITING'), true);
    assert.equal(isAllowedStatusTransition('WAITING', 'CALLED'), true);
    assert.equal(isAllowedStatusTransition('CALLED', 'COMPLETED'), true);
  });

  it('allows NO_SHOW from BOOKED, CHECKED_IN, WAITING, and CALLED', () => {
    assert.equal(isAllowedStatusTransition('BOOKED', 'NO_SHOW'), true);
    assert.equal(isAllowedStatusTransition('CHECKED_IN', 'NO_SHOW'), true);
    assert.equal(isAllowedStatusTransition('WAITING', 'NO_SHOW'), true);
    assert.equal(isAllowedStatusTransition('CALLED', 'NO_SHOW'), true);
  });

  it('rejects illegal status transitions', () => {
    assert.equal(isAllowedStatusTransition('BOOKED', 'CALLED'), false);
    assert.equal(isAllowedStatusTransition('BOOKED', 'COMPLETED'), false);
    assert.equal(isAllowedStatusTransition('CHECKED_IN', 'COMPLETED'), false);
    assert.equal(isAllowedStatusTransition('COMPLETED', 'WAITING'), false);
    assert.equal(isAllowedStatusTransition('COMPLETED', 'CHECKED_IN'), false);
    assert.equal(isAllowedStatusTransition('NO_SHOW', 'WAITING'), false);
  });
});

describe('queue dynamic wait time calculation formula', () => {
  it('calculates dynamic estimated wait time as (patients ahead) × 15 min', () => {
    assert.equal(AVERAGE_CONSULT_DURATION_MINUTES, 15);

    const calcWait = (patientsAhead) => patientsAhead * AVERAGE_CONSULT_DURATION_MINUTES;

    assert.equal(calcWait(0), 0);
    assert.equal(calcWait(1), 15);
    assert.equal(calcWait(2), 30);
    assert.equal(calcWait(4), 60);
  });
});

describe('Mongoose queue models and schema indexes', () => {
  it('validates queue fields on Appointment model', async () => {
    const app = new Appointment({
      patientId: oid(),
      clinicianId: oid(),
      roomId: oid(),
      clinicSite: 'students-clinic',
      visitType: 'general-opd',
      appointmentDate: '2026-09-15',
      appointmentTime: '09:30',
      queueToken: 'A-01',
      queueDate: '2026-09-15',
      queueSequence: 1,
      estimatedWaitMinutes: 15,
    });

    await app.validate();
    assert.equal(app.queueToken, 'A-01');
    assert.equal(app.queueDate, '2026-09-15');
    assert.equal(app.queueSequence, 1);
    assert.equal(app.estimatedWaitMinutes, 15);
  });

  it('registers unique daily room queue sequence index on Appointment', () => {
    const indexes = Appointment.schema.indexes();
    const keys = indexes.map(([key]) => JSON.stringify(key));
    assert.ok(
      keys.includes(JSON.stringify({ roomId: 1, queueDate: 1, queueSequence: 1 })),
      'Should register unique index on (roomId, queueDate, queueSequence)',
    );
    assert.ok(
      keys.includes(JSON.stringify({ roomId: 1, appointmentDate: 1, status: 1 })),
      'Should register index on (roomId, appointmentDate, status)',
    );
  });

  it('registers QueueCounter model and compound index on (roomId, queueDate)', () => {
    const indexes = QueueCounter.schema.indexes();
    const keys = indexes.map(([key]) => JSON.stringify(key));
    assert.ok(
      keys.includes(JSON.stringify({ roomId: 1, queueDate: 1 })),
      'Should register unique index on (roomId, queueDate)',
    );
  });

  it('accepts tokenPrefix on Room model', async () => {
    const room = new Room({
      name: 'Room 1',
      clinicSite: 'students-clinic',
      tokenPrefix: 'A',
    });
    await room.validate();
    assert.equal(room.tokenPrefix, 'A');
  });
});

describe('Token format and progression lifecycle', () => {
  it('formats non-colliding token with two-digit sequence (e.g. A-01, B-04)', () => {
    const formatToken = (prefix, seq) => `${prefix}-${String(seq).padStart(2, '0')}`;
    assert.equal(formatToken('A', 1), 'A-01');
    assert.equal(formatToken('B', 4), 'B-04');
    assert.equal(formatToken('C', 12), 'C-12');
  });

  it('validates queue progression lifecycle: BOOKED -> CHECKED_IN -> WAITING -> CALLED -> COMPLETED / NO_SHOW', () => {
    let currentStatus = 'BOOKED';
    const transitions = ['CHECKED_IN', 'WAITING', 'CALLED', 'COMPLETED'];

    for (const nextStatus of transitions) {
      assert.equal(
        isAllowedStatusTransition(currentStatus, nextStatus),
        true,
        `Should allow transition from ${currentStatus} to ${nextStatus}`,
      );
      currentStatus = nextStatus;
    }

    assert.equal(currentStatus, 'COMPLETED');
    assert.equal(isAllowedStatusTransition(currentStatus, 'WAITING'), false);
  });
});

