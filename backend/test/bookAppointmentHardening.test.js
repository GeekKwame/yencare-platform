import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import mongoose from 'mongoose';

import { Appointment } from '../src/models/Appointment.js';
import { Patient } from '../src/models/Patient.js';
import { TimeSlot } from '../src/models/TimeSlot.js';
import {
  assertWithinClinicHours,
  createAppointment,
  countActiveBookingsForStudent,
  assertStudentBookingCap,
  MAX_ACTIVE_STUDENT_BOOKINGS,
  STUDENT_BOOKING_CAP_MESSAGE,
  ACTIVE_STUDENT_BOOKING_STATUSES,
  WALK_IN_STAFF_ONLY_MESSAGE,
} from '../src/services/bookAppointment.js';

const oid = () => new mongoose.Types.ObjectId();

const CLINICIAN_ID = oid();
const ROOM_ID = oid();
const PATIENT_ID = oid();

// The verified identity the route passes for a reception-desk walk-in.
const AS_RECEPTION = { staff: { staffId: 'stf_01', role: 'RECEPTIONIST' } };

// 2026-09-16 is a Wednesday, 2026-09-20 a Sunday, 2026-09-28 a Monday.
const WEDNESDAY = '2026-09-16';
const SUNDAY = '2026-09-20';
const MONDAY = '2026-09-28';

// Fixed clock for public bookings (past-slot guard, cap window): Tuesday
// 2026-09-15 07:00 Accra, before every booking date used in this file.
const NOW = new Date('2026-09-15T07:00:00Z');

function basePayload(overrides = {}) {
  return {
    patientId: PATIENT_ID,
    clinicianId: CLINICIAN_ID,
    roomId: ROOM_ID,
    clinicSite: 'students-clinic',
    visitType: 'general-opd',
    appointmentDate: WEDNESDAY,
    appointmentTime: '10:00',
    ...overrides,
  };
}

/**
 * Replaces the model calls `createAppointment` makes with an in-memory stand-in
 * whose slot claim is atomic in the same way Mongo's is: the first writer wins.
 *
 * @param {{ catalogSlot?: boolean, existingAppointment?: boolean, existingAppointments?: object[], slotDate?: string, slotTime?: string }} [options]
 *   `slotDate` / `slotTime` are the catalog slot record's own date and start time
 *   (defaults match `basePayload`).
 */
function stubModels({
  catalogSlot = true,
  existingAppointment = false,
  existingAppointments = [],
  slotDate = WEDNESDAY,
  slotTime = '10:00',
} = {}) {
  const original = {
    findOneAndUpdate: TimeSlot.findOneAndUpdate,
    slotFindById: TimeSlot.findById,
    slotFindOne: TimeSlot.findOne,
    updateOne: TimeSlot.updateOne,
    create: Appointment.create,
    appointmentFindOne: Appointment.findOne,
    appointmentCountDocuments: Appointment.countDocuments,
    appointmentFind: Appointment.find,
    patientFindById: Patient.findById,
    patientFind: Patient.find,
  };

  const slot = catalogSlot
    ? {
        _id: oid(),
        clinicianId: CLINICIAN_ID,
        roomId: ROOM_ID,
        date: slotDate,
        startTime: slotTime,
        isBooked: false,
        appointmentId: null,
      }
    : null;

  const state = { created: [], claims: 0, released: 0 };
  const mockAppointments = [...existingAppointments];

  TimeSlot.findOneAndUpdate = async () => {
    if (!slot || slot.isBooked) return null;
    slot.isBooked = true;
    state.claims += 1;
    return slot;
  };
  TimeSlot.findById = async () => slot;
  TimeSlot.findOne = async () => slot;
  TimeSlot.updateOne = async () => {
    state.released += 1;
    if (slot) slot.isBooked = false;
    return { modifiedCount: 1 };
  };

  Appointment.create = async (payload) => {
    const doc = { ...payload, _id: oid(), referenceCode: 'YC-4821' };
    state.created.push(doc);
    mockAppointments.push(doc);
    return doc;
  };
  Appointment.findOne = async () => (existingAppointment ? { _id: oid() } : null);

  Appointment.countDocuments = async (query = {}) => {
    return mockAppointments.filter((app) => {
      if (query.status?.$in && !query.status.$in.includes(app.status)) return false;
      if (query.appointmentDate?.$gte && app.appointmentDate < query.appointmentDate.$gte) return false;
      if (query._id?.$ne && String(app._id) === String(query._id.$ne)) return false;
      if (query.studentIndex && app.studentIndex && app.studentIndex !== query.studentIndex) return false;
      return true;
    }).length;
  };

  Appointment.find = async (query = {}) => {
    return mockAppointments.filter((app) => {
      if (query.status?.$in && !query.status.$in.includes(app.status)) return false;
      if (query.appointmentDate?.$gte && app.appointmentDate < query.appointmentDate.$gte) return false;
      if (query._id?.$ne && String(app._id) === String(query._id.$ne)) return false;
      if (query.studentIndex && app.studentIndex && app.studentIndex !== query.studentIndex) return false;
      return true;
    });
  };

  // No patient means createAppointment short-circuits before any SMS work.
  Patient.findById = async () => null;
  Patient.find = async () => [];

  return {
    state,
    slot,
    mockAppointments,
    restore() {
      TimeSlot.findOneAndUpdate = original.findOneAndUpdate;
      TimeSlot.findById = original.slotFindById;
      TimeSlot.findOne = original.slotFindOne;
      TimeSlot.updateOne = original.updateOne;
      Appointment.create = original.create;
      Appointment.findOne = original.appointmentFindOne;
      Appointment.countDocuments = original.appointmentCountDocuments;
      Appointment.find = original.appointmentFind;
      Patient.findById = original.patientFindById;
      Patient.find = original.patientFind;
    },
  };
}

describe('walk-in slot claiming is atomic', () => {
  /** @type {{ restore: () => void } | null} */
  let stubs = null;

  afterEach(() => {
    stubs?.restore();
    stubs = null;
  });

  it('two concurrent identical walk-ins produce one appointment and one 409', async () => {
    stubs = stubModels({ catalogSlot: true });

    const results = await Promise.allSettled([
      createAppointment(basePayload({ bookingType: 'WALK_IN' }), AS_RECEPTION),
      createAppointment(basePayload({ bookingType: 'WALK_IN' }), AS_RECEPTION),
    ]);

    const fulfilled = results.filter((result) => result.status === 'fulfilled');
    const rejected = results.filter((result) => result.status === 'rejected');

    assert.equal(fulfilled.length, 1, 'exactly one walk-in should be created');
    assert.equal(rejected.length, 1, 'the other walk-in should be refused');
    assert.equal(rejected[0].reason.status, 409);
    assert.match(rejected[0].reason.message, /already booked/i);
    assert.equal(stubs.state.created.length, 1);
    assert.equal(stubs.state.claims, 1);
  });

  it('links the claimed catalog slot to the walk-in so online patients cannot take it', async () => {
    stubs = stubModels({ catalogSlot: true });

    const { appointment } = await createAppointment(
      basePayload({ bookingType: 'WALK_IN' }),
      AS_RECEPTION,
    );

    assert.equal(String(appointment.timeSlotId), String(stubs.slot._id));
    assert.equal(stubs.slot.isBooked, true);
  });

  it('still creates unscheduled walk-ins that have no catalog slot', async () => {
    stubs = stubModels({ catalogSlot: false });

    const { appointment } = await createAppointment(
      basePayload({ bookingType: 'WALK_IN', appointmentTime: '13:47' }),
      AS_RECEPTION,
    );

    assert.equal(stubs.state.created.length, 1);
    assert.equal(appointment.timeSlotId, undefined);
  });

  it('refuses a walk-in that clashes with an existing appointment off-catalog', async () => {
    stubs = stubModels({ catalogSlot: false, existingAppointment: true });

    await assert.rejects(
      () =>
        createAppointment(
          basePayload({ bookingType: 'WALK_IN', appointmentTime: '13:47' }),
          AS_RECEPTION,
        ),
      (err) => {
        assert.equal(err.status, 409);
        assert.match(err.message, /already booked for this clinician/i);
        return true;
      },
    );
    assert.equal(stubs.state.created.length, 0);
  });

  it('releases the claimed slot when appointment creation fails', async () => {
    stubs = stubModels({ catalogSlot: true });
    Appointment.create = async () => {
      const err = new Error('duplicate');
      err.code = 11000;
      throw err;
    };

    await assert.rejects(() => createAppointment(basePayload({ bookingType: 'WALK_IN' }), AS_RECEPTION), {
      status: 409,
    });
    assert.equal(stubs.state.released, 1);
  });
});

describe('clinic opening hours are enforced server-side', () => {
  /** @type {{ restore: () => void } | null} */
  let stubs = null;

  afterEach(() => {
    stubs?.restore();
    stubs = null;
  });

  it('accepts a weekday booking inside opening hours', () => {
    assert.doesNotThrow(() =>
      assertWithinClinicHours({
        clinicSite: 'students-clinic',
        appointmentDate: WEDNESDAY,
        appointmentTime: '10:00',
      }),
    );
  });

  it('rejects a Sunday Students\u2019 Clinic booking with the real hours in the message', () => {
    try {
      assertWithinClinicHours({
        clinicSite: 'students-clinic',
        appointmentDate: SUNDAY,
        appointmentTime: '10:00',
      });
      assert.fail('expected a ValidationError');
    } catch (err) {
      assert.equal(err.name, 'ValidationError');
      assert.equal(err.status, 400);
      assert.match(err.message, /Monday to Friday, 08:00–16:00/);
      assert.match(err.message, /KNUST Students' Clinic/);
    }
  });

  it('rejects times outside 08:00-16:00 on a weekday', () => {
    for (const time of ['07:30', '16:00', '19:00']) {
      assert.throws(
        () =>
          assertWithinClinicHours({
            clinicSite: 'students-clinic',
            appointmentDate: WEDNESDAY,
            appointmentTime: time,
          }),
        { status: 400 },
        `should reject ${time}`,
      );
    }
  });

  it('accepts a KNUST Hospital booking at 22:00, including at the weekend', () => {
    assert.doesNotThrow(() =>
      assertWithinClinicHours({
        clinicSite: 'knust-hospital',
        appointmentDate: WEDNESDAY,
        appointmentTime: '22:00',
      }),
    );
    assert.doesNotThrow(() =>
      assertWithinClinicHours({
        clinicSite: 'knust-hospital',
        appointmentDate: SUNDAY,
        appointmentTime: '22:00',
      }),
    );
  });

  it('blocks an online Sunday booking before it claims a slot', async () => {
    stubs = stubModels({ catalogSlot: true });

    await assert.rejects(
      () => createAppointment(basePayload({ appointmentDate: SUNDAY })),
      { status: 400 },
    );
    assert.equal(stubs.state.claims, 0);
    assert.equal(stubs.state.created.length, 0);
  });

  it('lets staff create a walk-in outside opening hours', async () => {
    stubs = stubModels({ catalogSlot: false });

    const { appointment } = await createAppointment(
      basePayload({
        bookingType: 'WALK_IN',
        appointmentDate: SUNDAY,
        appointmentTime: '20:15',
      }),
      AS_RECEPTION,
    );

    assert.equal(appointment.referenceCode, 'YC-4821');
    assert.equal(stubs.state.created.length, 1);
  });
});

describe('student booking cap policy (Issue B)', () => {
  /** @type {{ restore: () => void } | null} */
  let stubs = null;

  afterEach(() => {
    stubs?.restore();
    stubs = null;
  });

  const STUDENT_INDEX = '20612345';

  it('counts active non-completed, non-cancelled bookings per studentIndex on future dates', async () => {
    const existing = [
      { studentIndex: STUDENT_INDEX, appointmentDate: '2026-09-25', status: 'BOOKED' },
      { studentIndex: STUDENT_INDEX, appointmentDate: '2026-09-26', status: 'CHECKED_IN' },
      { studentIndex: STUDENT_INDEX, appointmentDate: '2026-09-27', status: 'WAITING' },
      { studentIndex: STUDENT_INDEX, appointmentDate: '2026-09-28', status: 'COMPLETED' },
      { studentIndex: STUDENT_INDEX, appointmentDate: '2026-09-29', status: 'CANCELLED' },
      { studentIndex: STUDENT_INDEX, appointmentDate: '2026-09-30', status: 'NO_SHOW' },
      { studentIndex: STUDENT_INDEX, appointmentDate: '2026-09-20', status: 'BOOKED' }, // past date
    ];

    stubs = stubModels({ existingAppointments: existing });

    // With minDate = '2026-09-24':
    // 3 active upcoming (BOOKED on 09-25, CHECKED_IN on 09-26, WAITING on 09-27).
    // COMPLETED, CANCELLED, NO_SHOW, and past 09-20 are excluded.
    const count = await countActiveBookingsForStudent(STUDENT_INDEX, { minDate: '2026-09-24' });
    assert.equal(count, 3);
  });

  it('allows booking when student has 0 or 1 active booking', async () => {
    stubs = stubModels({
      catalogSlot: true,
      slotDate: '2026-09-25',
      slotTime: '10:30',
      existingAppointments: [
        { studentIndex: STUDENT_INDEX, appointmentDate: '2026-09-24', status: 'BOOKED' },
      ],
    });

    const result = await createAppointment(
      basePayload({
        studentIndex: STUDENT_INDEX,
        appointmentDate: '2026-09-25',
        appointmentTime: '10:30',
      }),
      { now: NOW },
    );

    assert.ok(result.appointment);
    assert.equal(stubs.state.created.length, 1);
  });

  it('rejects booking request with HTTP 409 if student already has 2 active upcoming bookings', async () => {
    // Booked on an open day: the opening-hours check runs before the cap.
    stubs = stubModels({
      catalogSlot: true,
      slotDate: MONDAY,
      slotTime: '11:00',
      existingAppointments: [
        { studentIndex: STUDENT_INDEX, appointmentDate: '2026-09-25', status: 'BOOKED' },
        { studentIndex: STUDENT_INDEX, appointmentDate: '2026-09-26', status: 'BOOKED' },
      ],
    });

    await assert.rejects(
      () =>
        createAppointment(
          basePayload({
            studentIndex: STUDENT_INDEX,
            appointmentDate: MONDAY,
            appointmentTime: '11:00',
          }),
          { now: NOW },
        ),
      (err) => {
        assert.equal(err.status, 409);
        assert.equal(err.name, 'ConflictError');
        assert.equal(
          err.message,
          'You have reached the maximum of 2 active appointments. Please complete or cancel existing visits.',
        );
        return true;
      },
    );

    // Assert no slot was claimed and no appointment was created
    assert.equal(stubs.state.claims, 0);
    assert.equal(stubs.state.created.length, 0);
  });

  it('resolves studentIndex through Patient record if not passed in booking payload', async () => {
    // Booked on an open day: the opening-hours check runs before the cap.
    stubs = stubModels({
      catalogSlot: true,
      slotDate: MONDAY,
      slotTime: '11:00',
      existingAppointments: [
        { studentIndex: STUDENT_INDEX, appointmentDate: '2026-09-25', status: 'BOOKED' },
        { studentIndex: STUDENT_INDEX, appointmentDate: '2026-09-26', status: 'WAITING' },
      ],
    });

    Patient.findById = async () => ({
      _id: PATIENT_ID,
      studentIndex: STUDENT_INDEX,
      fullName: 'Akosua Boateng',
      phone: '+233241234567',
    });

    await assert.rejects(
      () =>
        createAppointment(
          basePayload({
            // studentIndex omitted from payload, resolved via Patient.findById
            appointmentDate: MONDAY,
            appointmentTime: '11:00',
          }),
          { now: NOW },
        ),
      (err) => {
        assert.equal(err.status, 409);
        assert.equal(
          err.message,
          'You have reached the maximum of 2 active appointments. Please complete or cancel existing visits.',
        );
        return true;
      },
    );
  });

  it('allows non-student booking with no studentIndex even if other records exist', async () => {
    stubs = stubModels({ catalogSlot: true, slotDate: '2026-09-25', slotTime: '10:00' });
    Patient.findById = async () => ({
      _id: PATIENT_ID,
      fullName: 'Community Member',
      phone: '+233241234567',
    });

    const result = await createAppointment(
      basePayload({
        clinicSite: 'knust-hospital',
        appointmentDate: '2026-09-25',
        appointmentTime: '10:00',
      }),
      { now: NOW },
    );

    assert.ok(result.appointment);
    assert.equal(stubs.state.created.length, 1);
  });
});

describe('walk-ins require a verified reception or admin identity', () => {
  /** @type {{ restore: () => void } | null} */
  let stubs = null;

  afterEach(() => {
    stubs?.restore();
    stubs = null;
  });

  const STUDENT_INDEX = '20612345';

  /** A student who already holds the maximum number of active bookings. */
  function stubCappedStudent() {
    stubs = stubModels({
      catalogSlot: true,
      existingAppointments: [
        { studentIndex: STUDENT_INDEX, appointmentDate: '2099-01-05', status: 'BOOKED' },
        { studentIndex: STUDENT_INDEX, appointmentDate: '2099-01-06', status: 'BOOKED' },
      ],
    });
    // No phone on purpose: createAppointment then stops before any SMS is sent.
    Patient.findById = async () => ({
      _id: PATIENT_ID,
      studentIndex: STUDENT_INDEX,
      fullName: 'Akosua Boateng',
    });

    let capQueries = 0;
    const countDocuments = Appointment.countDocuments;
    Appointment.countDocuments = async (query) => {
      capQueries += 1;
      return countDocuments(query);
    };
    return { capQueries: () => capQueries };
  }

  function assertForbiddenWalkIn(err) {
    assert.equal(err.name, 'ForbiddenError');
    assert.equal(err.status, 403);
    assert.equal(err.message, WALK_IN_STAFF_ONLY_MESSAGE);
    return true;
  }

  it('refuses an anonymous WALK_IN before claiming a slot or creating anything', async () => {
    stubs = stubModels({ catalogSlot: true });

    await assert.rejects(
      () => createAppointment(basePayload({ bookingType: 'WALK_IN' })),
      assertForbiddenWalkIn,
    );
    assert.equal(stubs.state.claims, 0);
    assert.equal(stubs.state.created.length, 0);
  });

  it('refuses a WALK_IN from a doctor: walk-ins go through the desk', async () => {
    stubs = stubModels({ catalogSlot: true });

    await assert.rejects(
      () =>
        createAppointment(basePayload({ bookingType: 'WALK_IN' }), {
          staff: { staffId: 'stf_02', role: 'DOCTOR' },
        }),
      assertForbiddenWalkIn,
    );
    assert.equal(stubs.state.claims, 0);
    assert.equal(stubs.state.created.length, 0);
  });

  it('ignores a staff identity smuggled into the request body', async () => {
    stubs = stubModels({ catalogSlot: true });

    await assert.rejects(
      () =>
        createAppointment(
          basePayload({ bookingType: 'WALK_IN', staff: { role: 'RECEPTIONIST' } }),
        ),
      assertForbiddenWalkIn,
    );
    assert.equal(stubs.state.created.length, 0);
  });

  it('lets an admin create a walk-in', async () => {
    stubs = stubModels({ catalogSlot: true });

    const { appointment } = await createAppointment(basePayload({ bookingType: 'WALK_IN' }), {
      staff: { staffId: 'stf_03', role: 'ADMIN' },
    });

    assert.equal(appointment.bookingType, 'WALK_IN');
    assert.equal(stubs.state.created.length, 1);
  });

  it('a reception walk-in skips the booking cap for a student already at the maximum', async () => {
    const cap = stubCappedStudent();

    const { appointment } = await createAppointment(
      basePayload({ bookingType: 'WALK_IN' }),
      AS_RECEPTION,
    );

    assert.equal(appointment.bookingType, 'WALK_IN');
    assert.equal(stubs.state.created.length, 1);
    assert.equal(cap.capQueries(), 0, 'the cap must not be consulted for a staff walk-in');
  });

  it('the same student booking online is still capped', async () => {
    const cap = stubCappedStudent();

    await assert.rejects(() => createAppointment(basePayload(), { now: NOW }), {
      name: 'ConflictError',
      status: 409,
      message: STUDENT_BOOKING_CAP_MESSAGE,
    });
    assert.equal(cap.capQueries(), 1);
    assert.equal(stubs.state.claims, 0);
    assert.equal(stubs.state.created.length, 0);
  });

  it('a reception-staff booking that is not a walk-in stays capped', async () => {
    stubCappedStudent();

    await assert.rejects(() => createAppointment(basePayload(), { ...AS_RECEPTION, now: NOW }), {
      status: 409,
      message: STUDENT_BOOKING_CAP_MESSAGE,
    });
    assert.equal(stubs.state.created.length, 0);
  });
});

describe('already-started slots are refused before claiming', () => {
  /** @type {{ restore: () => void } | null} */
  let stubs = null;

  afterEach(() => {
    stubs?.restore();
    stubs = null;
  });

  // Wednesday 2026-09-16, 10:20 Accra.
  const DURING_CLINIC = new Date('2026-09-16T10:20:00Z');
  const STARTED_MESSAGE = 'That time slot has already started. Please choose a later slot.';
  const STUDENT_INDEX = '20612345';

  function assertStartedSlot(err) {
    assert.equal(err.name, 'ValidationError');
    assert.equal(err.status, 400);
    assert.equal(err.message, STARTED_MESSAGE);
    return true;
  }

  /** Student at the cap, to prove the cap is not the reason reported. */
  function stubCappedStudent(options) {
    stubs = stubModels({
      ...options,
      existingAppointments: [
        { studentIndex: STUDENT_INDEX, appointmentDate: '2099-01-05', status: 'BOOKED' },
        { studentIndex: STUDENT_INDEX, appointmentDate: '2099-01-06', status: 'BOOKED' },
      ],
    });
    // No phone on purpose: createAppointment then stops before any SMS is sent.
    Patient.findById = async () => ({ _id: PATIENT_ID, studentIndex: STUDENT_INDEX });

    let capQueries = 0;
    const countDocuments = Appointment.countDocuments;
    Appointment.countDocuments = async (query) => {
      capQueries += 1;
      return countDocuments(query);
    };
    return { capQueries: () => capQueries };
  }

  it('refuses a slot that started earlier today, before claiming it', async () => {
    stubs = stubModels({ slotDate: WEDNESDAY, slotTime: '10:00' });

    await assert.rejects(
      () => createAppointment(basePayload(), { now: DURING_CLINIC }),
      assertStartedSlot,
    );
    assert.equal(stubs.state.claims, 0);
    assert.equal(stubs.slot.isBooked, false);
    assert.equal(stubs.state.created.length, 0);
  });

  it('refuses a started slot addressed by timeSlotId', async () => {
    stubs = stubModels({ slotDate: WEDNESDAY, slotTime: '10:00' });

    await assert.rejects(
      () =>
        createAppointment(basePayload({ timeSlotId: stubs.slot._id }), { now: DURING_CLINIC }),
      assertStartedSlot,
    );
    assert.equal(stubs.state.claims, 0);
  });

  it('judges by the slot record, not the date and time the client sent', async () => {
    stubs = stubModels({ slotDate: WEDNESDAY, slotTime: '10:00' });

    await assert.rejects(
      () =>
        createAppointment(
          basePayload({ timeSlotId: stubs.slot._id, appointmentTime: '11:00' }),
          { now: DURING_CLINIC },
        ),
      assertStartedSlot,
    );
    assert.equal(stubs.state.claims, 0);
  });

  it('accepts a later slot today and a slot tomorrow', async () => {
    stubs = stubModels({ slotDate: WEDNESDAY, slotTime: '10:30' });
    await createAppointment(basePayload({ appointmentTime: '10:30' }), { now: DURING_CLINIC });
    assert.equal(stubs.state.created.length, 1);
    stubs.restore();

    stubs = stubModels({ slotDate: '2026-09-17', slotTime: '09:00' });
    await createAppointment(
      basePayload({ appointmentDate: '2026-09-17', appointmentTime: '09:00' }),
      { now: DURING_CLINIC },
    );
    assert.equal(stubs.state.created.length, 1);
  });

  it('leaves a missing catalog slot for the claim to report', async () => {
    stubs = stubModels({ catalogSlot: false });

    await assert.rejects(
      () => createAppointment(basePayload(), { now: DURING_CLINIC }),
      { status: 409, message: 'That consultation slot is no longer available' },
    );
  });

  it('exempts a reception walk-in at the current time', async () => {
    stubs = stubModels({ slotDate: WEDNESDAY, slotTime: '10:00' });

    const { appointment } = await createAppointment(basePayload({ bookingType: 'WALK_IN' }), {
      ...AS_RECEPTION,
      now: DURING_CLINIC,
    });

    assert.equal(String(appointment.timeSlotId), String(stubs.slot._id));
    assert.equal(stubs.state.claims, 1);
  });

  it('reports a started slot, not the cap, for a student already at the maximum', async () => {
    const cap = stubCappedStudent({ slotDate: WEDNESDAY, slotTime: '10:00' });

    await assert.rejects(
      () => createAppointment(basePayload(), { now: DURING_CLINIC }),
      assertStartedSlot,
    );
    assert.equal(cap.capQueries(), 0);
  });

  it('reports a closed day, not the cap, for a student already at the maximum', async () => {
    const cap = stubCappedStudent({ slotDate: SUNDAY, slotTime: '10:00' });

    await assert.rejects(
      () => createAppointment(basePayload({ appointmentDate: SUNDAY }), { now: NOW }),
      (err) => {
        assert.equal(err.status, 400);
        assert.match(err.message, /Monday to Friday/);
        return true;
      },
    );
    assert.equal(cap.capQueries(), 0);
    assert.equal(stubs.state.claims, 0);
  });
});
