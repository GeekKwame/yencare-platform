import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import mongoose from 'mongoose';
import { Appointment, QueueCounter, TimeSlot } from '../src/models/index.js';
import { accraTodayIso } from '../src/lib/accraTime.js';
import { markPatientArrived, updateAppointmentStatus } from '../src/services/appointmentOps.js';
import { ValidationError } from '../src/patients/errors.js';

const oid = () => new mongoose.Types.ObjectId();

const PINNED_NOW = new Date('2026-09-16T10:30:00Z');

describe('Check-in and arrival visit-day guards integration', () => {
  beforeEach(() => mock.timers.enable({ apis: ['Date'], now: PINNED_NOW }));

  afterEach(() => {
    mock.timers.reset();
    mock.restoreAll();
  });

  function fakeAppointment(overrides = {}) {
    return {
      _id: oid(),
      referenceCode: 'YC-4821',
      appointmentDate: '2026-09-20',
      appointmentTime: '10:00',
      status: 'BOOKED',
      roomId: oid(),
      timeSlotId: null,
      save: mock.fn(async () => {}),
      ...overrides,
    };
  }

  describe('markPatientArrived (public patient self-check-in)', () => {
    it('refuses arrival if appointment date is in the future', async () => {
      const appt = fakeAppointment({ appointmentDate: '2026-09-25' });
      mock.method(Appointment, 'findByReference', async () => appt);

      await assert.rejects(
        () => markPatientArrived('YC-4821'),
        (err) => {
          assert.ok(err instanceof ValidationError);
          assert.match(err.message, /2026-09-25/);
          assert.match(err.message, /day of the visit/);
          return true;
        },
      );
      assert.equal(appt.save.mock.callCount(), 0);
    });

    it('refuses arrival if appointment date is in the past', async () => {
      const appt = fakeAppointment({ appointmentDate: '2026-09-10' });
      mock.method(Appointment, 'findByReference', async () => appt);

      await assert.rejects(
        () => markPatientArrived('YC-4821'),
        (err) => {
          assert.ok(err instanceof ValidationError);
          assert.match(err.message, /has passed/);
          return true;
        },
      );
      assert.equal(appt.save.mock.callCount(), 0);
    });
  });

  function mockFindById(appt) {
    const query = {
      populate: () => query,
      then: (resolve, reject) => Promise.resolve(appt).then(resolve, reject),
    };
    return mock.method(Appointment, 'findById', () => query);
  }

  describe('updateAppointmentStatus (reception check-in)', () => {
    it('allows reception to check in a late patient on the appointment day', async () => {
      const today = accraTodayIso();
      const appt = fakeAppointment({
        appointmentDate: today,
        appointmentTime: '08:00', // Slot was early today
        status: 'BOOKED',
      });
      mockFindById(appt);

      // Reception changes status to CHECKED_IN
      const result = await updateAppointmentStatus(appt._id, 'CHECKED_IN');
      assert.equal(result.status, 'CHECKED_IN');
      assert.equal(appt.save.mock.callCount(), 1);
    });

    it('refuses reception check-in for a future-dated appointment', async () => {
      const appt = fakeAppointment({
        appointmentDate: '2099-12-31',
        appointmentTime: '10:00',
        status: 'BOOKED',
      });
      mockFindById(appt);

      await assert.rejects(
        () => updateAppointmentStatus(appt._id, 'CHECKED_IN'),
        (err) => {
          assert.ok(err instanceof ValidationError);
          assert.match(err.message, /day of the visit/);
          return true;
        },
      );
      assert.equal(appt.save.mock.callCount(), 0);
    });

    it('frees timeSlotId and clears active appointment in QueueCounter when updated to NO_SHOW', async () => {
      const slotId = oid();
      const roomId = oid();
      const appt = fakeAppointment({
        appointmentDate: '2026-09-10', // past date allowed for no-show
        appointmentTime: '10:00',
        status: 'BOOKED',
        timeSlotId: slotId,
        roomId,
      });

      mockFindById(appt);
      const slotUpdate = mock.method(TimeSlot, 'updateOne', async () => ({}));
      const counterUpdate = mock.method(QueueCounter, 'updateOne', async () => ({}));

      const result = await updateAppointmentStatus(appt._id, 'NO_SHOW');
      assert.equal(result.status, 'NO_SHOW');
      assert.equal(appt.save.mock.callCount(), 1);

      assert.equal(slotUpdate.mock.callCount(), 1);
      const [slotFilter, slotDoc] = slotUpdate.mock.calls[0].arguments;
      assert.deepEqual(slotFilter, { _id: slotId });
      assert.deepEqual(slotDoc, { $set: { isBooked: false, appointmentId: null } });

      assert.equal(counterUpdate.mock.callCount(), 1);
      const [counterFilter, counterDoc] = counterUpdate.mock.calls[0].arguments;
      assert.deepEqual(counterFilter, { roomId, activeAppointmentId: appt._id });
      assert.deepEqual(counterDoc, { $set: { activeAppointmentId: null } });
    });
  });
});
