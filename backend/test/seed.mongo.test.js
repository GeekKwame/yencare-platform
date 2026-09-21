import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { connectDb, disconnectDb } from '../src/db/connection.js';
import { Appointment, Room } from '../src/models/index.js';
import { accraTodayIso } from '../src/lib/accraTime.js';
import { migrate } from '../scripts/migrate.js';
import { seed } from '../scripts/seed.js';

const skipReason = process.env.MONGODB_TEST_URI
  ? false
  : 'set MONGODB_TEST_URI (a database whose name contains "test") to run this suite';

describe('MongoDB migration + seed regression', { skip: skipReason }, () => {
  let connection;
  let db;

  before(async () => {
    process.env.MONGODB_URI = process.env.MONGODB_TEST_URI;

    connection = await connectDb();
    db = connection.db;

    assert.match(
      db.databaseName,
      /test/i,
      `Refusing to drop "${db.databaseName}": it is not a test database`,
    );

    await db.dropDatabase();

    await migrate();
    await seed();
    await Appointment.createIndexes();
  });

  after(async () => {
    await disconnectDb();
  });

  it('runs migration and seed successfully', async () => {
    const appointmentCount = await Appointment.countDocuments();

    assert.equal(appointmentCount, 5);
  });

  it('allows multiple unqueued appointments in the same room', async () => {
    const room1 = await Room.findOne({
      name: 'Room 1',
      clinicSite: 'students-clinic',
    }).lean();

    assert.ok(room1, 'Room 1 should exist');

    const seeded = await Appointment.find({
      roomId: room1._id,
      referenceCode: { $in: ['YC-2001', 'YC-4821'] },
    }).lean();

    assert.equal(
      seeded.length,
      2,
      'YC-2001 and YC-4821 should both be seeded in Room 1',
    );

    for (const appointment of seeded) {
      assert.equal(
        appointment.queueDate,
        undefined,
        `${appointment.referenceCode} should not have queueDate`,
      );

      assert.equal(
        appointment.queueSequence,
        undefined,
        `${appointment.referenceCode} should not have queueSequence`,
      );
    }
  });

  it('rejects duplicate queued appointments for the same room and day', async () => {
    const room1 = await Room.findOne({
      name: 'Room 1',
      clinicSite: 'students-clinic',
    }).lean();

    assert.ok(room1, 'Room 1 should exist');

    const base = await Appointment.findOne({ referenceCode: 'YC-2001' }).lean();

    assert.ok(base, 'YC-2001 should exist');

    const today = accraTodayIso();

    const queued = (referenceCode, appointmentTime) => ({
      referenceCode,
      patientId: base.patientId,
      clinicianId: base.clinicianId,
      roomId: room1._id,
      timeSlotId: null,
      clinicSite: 'students-clinic',
      visitType: 'general-opd',
      bookingType: 'BOOKED',
      status: 'WAITING',
      appointmentDate: today,
      appointmentTime,
      queueToken: 'A-02',
      queueDate: today,
      queueSequence: 2,
    });

    await Appointment.create(queued('YC-9001', '13:00'));

    await assert.rejects(
      () => Appointment.create(queued('YC-9002', '13:30')),
      (error) => {
        assert.equal(error?.code, 11000);
        assert.match(error.message, /appointments_room_day_queue_sequence_unique/);
        return true;
      },
    );
  });
});