import assert from 'node:assert/strict';
import { describe, it, mock, afterEach } from 'node:test';
import mongoose from 'mongoose';
import {
  isAllowedStatusTransition,
  STATUS_TRANSITIONS,
} from '../src/db/constants.js';
import { Appointment, Clinician, QueueCounter, Room, TimeSlot } from '../src/models/index.js';
import { accraTodayIso } from '../src/lib/accraTime.js';
import {
  AVERAGE_CONSULT_DURATION_MINUTES,
  getRoomTokenPrefix,
  getAccraQueueDate,
  liveClinicDayFilter,
  markNoShow,
  callNextPatient,
  advanceQueue,
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
    const queueSeqIndex = indexes.find(
      ([key]) => JSON.stringify(key) === JSON.stringify({ roomId: 1, queueDate: 1, queueSequence: 1 }),
    );
    assert.ok(
      queueSeqIndex,
      'Should register unique index on (roomId, queueDate, queueSequence)',
    );
    assert.deepEqual(queueSeqIndex[1]?.partialFilterExpression, {
      queueDate: { $type: 'string' },
      queueSequence: { $type: 'number' },
    });
    const keys = indexes.map(([key]) => JSON.stringify(key));
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
      assert.ok(
        isAllowedStatusTransition(currentStatus, nextStatus),
        `Should allow ${currentStatus} -> ${nextStatus}`,
      );
      currentStatus = nextStatus;
    }

    assert.equal(currentStatus, 'COMPLETED');
    assert.equal(isAllowedStatusTransition(currentStatus, 'WAITING'), false);
  });
});


function fakeAppointment(overrides = {}) {
  return {
    _id: oid(),
    referenceCode: 'YC-4821',
    appointmentDate: accraTodayIso(),
    appointmentTime: '10:00',
    status: 'WAITING',
    roomId: oid(),
    timeSlotId: null,
    save: mock.fn(async () => {}),
    ...overrides,
  };
}

function stubDb(appointment) {
  mock.method(Appointment, 'findByReference', async () => appointment);
  return {
    counterUpdate: mock.method(QueueCounter, 'updateOne', async () => ({})),
    appointmentUpdate: mock.method(Appointment, 'updateOne', async () => ({})),
    slotUpdate: mock.method(TimeSlot, 'updateOne', async () => ({})),
  };
}

describe('markNoShow', () => {
  afterEach(() => mock.restoreAll());

  it('marks a WAITING appointment as NO_SHOW with a normal save', async () => {
    const appt = fakeAppointment({ status: 'WAITING' });
    const { appointmentUpdate, slotUpdate } = stubDb(appt);

    await markNoShow({
      referenceCode: 'YC-4821',
      reason: 'Clinic day closed without completing visit',
    });

    
    assert.equal(appt.status, 'NO_SHOW');
    assert.equal(appt.cancelReason, 'Clinic day closed without completing visit');
    assert.equal(appt.save.mock.callCount(), 1);

    assert.equal(appointmentUpdate.mock.callCount(), 0);
    assert.equal(slotUpdate.mock.callCount(), 0);
  });

  it('frees timeSlotId on normal save when marked as NO_SHOW', async () => {
    const slotId = oid();
    const appt = fakeAppointment({ status: 'WAITING', timeSlotId: slotId });
    const { slotUpdate } = stubDb(appt);

    await markNoShow({
      referenceCode: 'YC-4821',
      reason: 'Clinic day closed without completing visit',
    });

    assert.equal(appt.status, 'NO_SHOW');
    assert.equal(slotUpdate.mock.callCount(), 1);
    const [slotFilter, slotDoc] = slotUpdate.mock.calls[0].arguments;
    assert.deepEqual(slotFilter, { _id: slotId });
    assert.deepEqual(slotDoc, { $set: { isBooked: false, appointmentId: null } });
  });

  it('marks a BOOKED appointment that never arrived as NO_SHOW', async () => {
    const appt = fakeAppointment({ status: 'BOOKED', appointmentDate: '2026-09-01' });
    stubDb(appt);

    await markNoShow({
      referenceCode: 'YC-4821',
      reason: 'Did not check in on appointment day',
    });

    assert.equal(appt.status, 'NO_SHOW');
    assert.equal(appt.cancelReason, 'Did not check in on appointment day');
    assert.equal(appt.save.mock.callCount(), 1);
  });

  it('forces NO_SHOW and frees the slot when save is refused by a status rule', async () => {
    const slotId = oid();
    const appt = fakeAppointment({
      timeSlotId: slotId,
      save: mock.fn(async () => {
        throw new Error('Illegal status transition: WAITING → NO_SHOW');
      }),
    });
    const { appointmentUpdate, slotUpdate } = stubDb(appt);

    await markNoShow({ referenceCode: 'YC-4821', reason: 'Did not check in' });

    assert.equal(appointmentUpdate.mock.callCount(), 1);
    const [filter, update] = appointmentUpdate.mock.calls[0].arguments;
    assert.deepEqual(filter, { _id: appt._id });
    assert.equal(update.$set.status, 'NO_SHOW');
    assert.equal(update.$set.cancelReason, 'Did not check in');

    assert.equal(slotUpdate.mock.callCount(), 1);
    const [slotFilter, slotDoc] = slotUpdate.mock.calls[0].arguments;
    assert.deepEqual(slotFilter, { _id: slotId });
    assert.deepEqual(slotDoc, { $set: { isBooked: false, appointmentId: null } });
  });

  it('rethrows unrelated errors instead of forcing the update', async () => {
    const appt = fakeAppointment({
      save: mock.fn(async () => {
        throw new Error('connection lost');
      }),
    });
    const { appointmentUpdate } = stubDb(appt);

    await assert.rejects(() => markNoShow({ referenceCode: 'YC-4821' }), /connection lost/);
    assert.equal(appointmentUpdate.mock.callCount(), 0);
  });

  it('refuses appointments that are already finished', async () => {
    for (const status of ['COMPLETED', 'CANCELLED', 'NO_SHOW']) {
      const appt = fakeAppointment({ status });
      stubDb(appt);

      await assert.rejects(
        () => markNoShow({ referenceCode: 'YC-4821' }),
        (err) => err.status === 400,
      );
      assert.equal(appt.save.mock.callCount(), 0);

      mock.restoreAll();
    }
  });

  it("clears the room's active-patient pointer", async () => {
    const appt = fakeAppointment();
    const { counterUpdate } = stubDb(appt);

    await markNoShow({ referenceCode: 'YC-4821' });

    assert.equal(counterUpdate.mock.callCount(), 1);
    const [filter, update] = counterUpdate.mock.calls[0].arguments;
    assert.deepEqual(filter, { roomId: appt.roomId, activeAppointmentId: appt._id });
    assert.deepEqual(update, { $set: { activeAppointmentId: null } });
  });
});

describe('callNextPatient and advanceQueue clinician scoping', () => {
  afterEach(() => mock.restoreAll());

  it('callNextPatient scopes queries to clinicianId so doctor only calls their own patients', async () => {
    const roomId = oid();
    const docAId = oid();
    const room = { _id: roomId, id: String(roomId), name: 'Room 1' };
    const clinician = { _id: docAId, id: String(docAId), name: 'Dr. Kwame Boateng', roomId };

    mock.method(Room, 'findById', async () => room);
    mock.method(Clinician, 'findById', async () => clinician);

    const docAPatient = {
      _id: oid(),
      queueToken: 'A-02',
      status: 'WAITING',
      clinicianId: docAId,
      roomId,
      save: mock.fn(async () => {}),
    };

    let capturedWaiterQuery = null;
    mock.method(Appointment, 'findOne', (query) => {
      if (query.status === 'CALLED') {
        return Promise.resolve(null);
      }
      if (query.status === 'WAITING') {
        capturedWaiterQuery = query;
        return {
          sort: () => ({
            populate: () => ({
              populate: () => ({
                populate: () => Promise.resolve(docAPatient),
              }),
            }),
          }),
        };
      }
      return Promise.resolve(null);
    });

    mock.method(QueueCounter, 'updateOne', async () => ({}));

    const result = await callNextPatient({ roomId, clinicianId: docAId });

    assert.equal(result.queueToken, 'A-02');
    assert.equal(docAPatient.status, 'CALLED');
    assert.equal(docAPatient.save.mock.callCount(), 1);
    // Crucially: query was strictly filtered by clinicianId
    assert.equal(capturedWaiterQuery.clinicianId, docAId);
    assert.equal(capturedWaiterQuery.roomId, undefined);
  });

  it('callNextPatient returns message when no patients are waiting for that specific doctor', async () => {
    const roomId = oid();
    const docAId = oid();
    const room = { _id: roomId, id: String(roomId), name: 'Room 1' };
    const clinician = { _id: docAId, id: String(docAId), name: 'Dr. Kwame Boateng', roomId };

    mock.method(Room, 'findById', async () => room);
    mock.method(Clinician, 'findById', async () => clinician);

    mock.method(Appointment, 'findOne', (query) => {
      if (query.status === 'CALLED') {
        return Promise.resolve(null);
      }
      if (query.status === 'WAITING') {
        return {
          sort: () => ({
            populate: () => ({
              populate: () => ({
                populate: () => Promise.resolve(null),
              }),
            }),
          }),
        };
      }
      return Promise.resolve(null);
    });

    const result = await callNextPatient({ roomId, clinicianId: docAId });

    assert.equal(result.appointment, null);
    assert.equal(result.message, 'No waiting patients for Dr. Kwame Boateng');
  });

  it('advanceQueue forbids advancing an appointment booked with a different doctor', async () => {
    const docAId = oid();
    const docBId = oid();
    const appt = fakeAppointment({
      status: 'WAITING',
      clinicianId: docBId,
    });
    mock.method(Appointment, 'findById', () => ({
      populate: () => ({
        populate: () => ({
          populate: () => Promise.resolve(appt),
        }),
      }),
    }));

    // Doc A tries to advance Doc B's appointment
    await assert.rejects(
      () => advanceQueue({ appointmentId: String(appt._id), clinicianId: String(docAId) }),
      (err) => {
        assert.equal(err.status, 403);
        assert.match(err.message, /Doctors can only call or advance appointments/);
        return true;
      },
    );
  });

  it('advanceQueue transitions CALLED to COMPLETED and dispatches completion notification', async () => {
    const roomId = oid();
    const appt = fakeAppointment({
      status: 'CALLED',
      roomId,
      patientId: { fullName: 'Ama Serwaa', phone: '+233241234567' },
      clinicianId: { name: 'Dr. Kwame Boateng' },
    });
    mock.method(Appointment, 'findById', () => ({
      populate: () => ({
        populate: () => ({
          populate: () => Promise.resolve(appt),
        }),
      }),
    }));
    const counterUpdate = mock.method(QueueCounter, 'updateOne', async () => ({}));

    const result = await advanceQueue({ appointmentId: String(appt._id) });
    assert.equal(appt.status, 'COMPLETED');
    assert.equal(result.appointment.status, 'COMPLETED');
    assert.equal(counterUpdate.mock.callCount(), 1);
    assert.deepEqual(counterUpdate.mock.calls[0].arguments[1], {
      $set: { activeAppointmentId: null },
    });
  });
});
describe('doctor isolation in the queue engine', () => {
  afterEach(() => mock.restoreAll());

  function query(value) {
    const chain = {
      populate: () => chain,
      sort: () => chain,
      then: (resolve, reject) => Promise.resolve(value).then(resolve, reject),
    };
    return chain;
  }

  function assertForbidden(err) {
    assert.equal(err.status, 403);
    assert.match(err.message, /Doctors can only/);
    return true;
  }

  it("markNoShow refuses another doctor's patient before changing anything", async () => {
    const docA = oid();
    const appt = fakeAppointment({ status: 'CALLED', clinicianId: oid(), timeSlotId: oid() });
    const { counterUpdate, appointmentUpdate, slotUpdate } = stubDb(appt);

    await assert.rejects(
      () => markNoShow({ referenceCode: 'YC-4821', clinicianId: String(docA) }),
      assertForbidden,
    );
    assert.equal(appt.status, 'CALLED');
    assert.equal(appt.save.mock.callCount(), 0);
    assert.equal(appointmentUpdate.mock.callCount(), 0);
    assert.equal(slotUpdate.mock.callCount(), 0);
    assert.equal(counterUpdate.mock.callCount(), 0);
  });

  it("markNoShow lets a doctor no-show their own patient (clinician populated or raw id)", async () => {
    const docA = oid();
    for (const clinicianId of [docA, { _id: docA, name: 'Dr. Kwame Boateng' }]) {
      const appt = fakeAppointment({ status: 'CALLED', clinicianId });
      stubDb(appt);

      await markNoShow({ referenceCode: 'YC-4821', clinicianId: String(docA) });
      assert.equal(appt.status, 'NO_SHOW');
      mock.restoreAll();
    }
  });

  it('markNoShow without a clinicianId (reception, end-of-day closeout) is not restricted', async () => {
    const appt = fakeAppointment({ status: 'WAITING', clinicianId: oid() });
    stubDb(appt);

    await markNoShow({ referenceCode: 'YC-4821', reason: 'Clinic day closed' });
    assert.equal(appt.status, 'NO_SHOW');
  });

  it('markNoShow scoped to a clinician refuses an appointment with no clinician', async () => {
    const appt = fakeAppointment({ status: 'CALLED' });
    stubDb(appt);

    await assert.rejects(
      () => markNoShow({ referenceCode: 'YC-4821', clinicianId: String(oid()) }),
      assertForbidden,
    );
    assert.equal(appt.status, 'CALLED');
  });

  it("markNoShow by room looks only for the doctor's own CALLED patient", async () => {
    const roomId = oid();
    const docA = oid();
    let captured = null;
    mock.method(Appointment, 'findOne', (filter) => {
      captured = filter;
      return query(null);
    });

    await assert.rejects(() => markNoShow({ roomId, clinicianId: docA }), { status: 404 });
    assert.equal(captured.roomId, roomId);
    assert.equal(captured.clinicianId, docA);
    assert.equal(captured.status, 'CALLED');
  });

  it("advanceQueue by room completes only the doctor's own consultation", async () => {
    const roomId = oid();
    const docA = oid();
    mock.method(Room, 'findById', async () => ({ _id: roomId, name: 'Room 1' }));
    let captured = null;
    mock.method(Appointment, 'findOne', (filter) => {
      captured = filter;
      return query(null);
    });

    await assert.rejects(() => advanceQueue({ roomId, clinicianId: docA }), {
      message: 'No active consultation in Room 1 to advance',
    });
    assert.equal(captured.roomId, roomId);
    assert.equal(captured.clinicianId, docA);
  });

  it('advanceQueue scoped to a clinician refuses an appointment with no clinician', async () => {
    const appt = fakeAppointment({ status: 'CALLED' });
    mock.method(Appointment, 'findById', () => query(appt));

    await assert.rejects(
      () => advanceQueue({ appointmentId: String(appt._id), clinicianId: String(oid()) }),
      assertForbidden,
    );
    assert.equal(appt.save.mock.callCount(), 0);
  });

  it('callNextPatient for a doctor covering another room calls their patient into the booked room', async () => {
    const coveringRoomId = oid();
    const bookedRoom = { _id: oid(), name: 'Room 1' };
    const docA = oid();
    mock.method(Room, 'findById', async () => ({ _id: coveringRoomId, name: 'Room 2' }));
    mock.method(Clinician, 'findById', async () => ({ _id: docA, name: 'Dr. Kwame Boateng' }));

    const patient = {
      _id: oid(),
      queueToken: 'A-03',
      status: 'WAITING',
      clinicianId: docA,
      roomId: bookedRoom,
      save: mock.fn(async () => {}),
    };
    const queries = {};
    mock.method(Appointment, 'findOne', (filter) => {
      queries[filter.status] = filter;
      return query(filter.status === 'WAITING' ? patient : null);
    });
    const counter = mock.method(QueueCounter, 'updateOne', async () => ({}));

    const result = await callNextPatient({ roomId: coveringRoomId, clinicianId: docA });

    for (const status of ['CALLED', 'WAITING']) {
      assert.equal(queries[status].clinicianId, docA);
      assert.equal(queries[status].roomId, undefined, `${status} lookup must not be room-scoped`);
    }
    assert.equal(patient.status, 'CALLED');
    assert.equal(counter.mock.calls[0].arguments[0].roomId, bookedRoom._id);
    assert.equal(result.room.name, 'Room 1');
    assert.equal(result.message, 'Called token A-03 into Room 1');
  });

  it('callNextPatient by room only (admin) stays scoped to that room', async () => {
    const roomId = oid();
    mock.method(Room, 'findById', async () => ({ _id: roomId, name: 'Room 1' }));
    const queries = {};
    mock.method(Appointment, 'findOne', (filter) => {
      queries[filter.status] = filter;
      return query(null);
    });

    const result = await callNextPatient({ roomId });

    assert.equal(result.appointment, null);
    for (const status of ['CALLED', 'WAITING']) {
      assert.equal(queries[status].roomId, roomId);
      assert.equal(queries[status].clinicianId, undefined);
    }
  });
});
