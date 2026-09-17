import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import mongoose from 'mongoose';

import { Appointment } from '../src/models/Appointment.js';
import { Patient } from '../src/models/Patient.js';
import { TimeSlot } from '../src/models/TimeSlot.js';
import { assertWithinClinicHours, createAppointment } from '../src/services/bookAppointment.js';

const oid = () => new mongoose.Types.ObjectId();

const CLINICIAN_ID = oid();
const ROOM_ID = oid();
const PATIENT_ID = oid();

// 2026-09-16 is a Wednesday, 2026-09-20 a Sunday.
const WEDNESDAY = '2026-09-16';
const SUNDAY = '2026-09-20';

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
 * @param {{ catalogSlot?: boolean, existingAppointment?: boolean }} [options]
 */
function stubModels({ catalogSlot = true, existingAppointment = false } = {}) {
  const original = {
    findOneAndUpdate: TimeSlot.findOneAndUpdate,
    slotFindById: TimeSlot.findById,
    slotFindOne: TimeSlot.findOne,
    updateOne: TimeSlot.updateOne,
    create: Appointment.create,
    appointmentFindOne: Appointment.findOne,
    patientFindById: Patient.findById,
  };

  const slot = catalogSlot
    ? { _id: oid(), clinicianId: CLINICIAN_ID, roomId: ROOM_ID, isBooked: false, appointmentId: null }
    : null;

  const state = { created: [], claims: 0, released: 0 };

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
    return doc;
  };
  Appointment.findOne = async () => (existingAppointment ? { _id: oid() } : null);

  // No patient means createAppointment short-circuits before any SMS work.
  Patient.findById = async () => null;

  return {
    state,
    slot,
    restore() {
      TimeSlot.findOneAndUpdate = original.findOneAndUpdate;
      TimeSlot.findById = original.slotFindById;
      TimeSlot.findOne = original.slotFindOne;
      TimeSlot.updateOne = original.updateOne;
      Appointment.create = original.create;
      Appointment.findOne = original.appointmentFindOne;
      Patient.findById = original.patientFindById;
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
      createAppointment(basePayload({ bookingType: 'WALK_IN' })),
      createAppointment(basePayload({ bookingType: 'WALK_IN' })),
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

    const { appointment } = await createAppointment(basePayload({ bookingType: 'WALK_IN' }));

    assert.equal(String(appointment.timeSlotId), String(stubs.slot._id));
    assert.equal(stubs.slot.isBooked, true);
  });

  it('still creates unscheduled walk-ins that have no catalog slot', async () => {
    stubs = stubModels({ catalogSlot: false });

    const { appointment } = await createAppointment(
      basePayload({ bookingType: 'WALK_IN', appointmentTime: '13:47' }),
    );

    assert.equal(stubs.state.created.length, 1);
    assert.equal(appointment.timeSlotId, undefined);
  });

  it('refuses a walk-in that clashes with an existing appointment off-catalog', async () => {
    stubs = stubModels({ catalogSlot: false, existingAppointment: true });

    await assert.rejects(
      () => createAppointment(basePayload({ bookingType: 'WALK_IN', appointmentTime: '13:47' })),
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

    await assert.rejects(() => createAppointment(basePayload({ bookingType: 'WALK_IN' })), {
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
    );

    assert.equal(appointment.referenceCode, 'YC-4821');
    assert.equal(stubs.state.created.length, 1);
  });
});
