import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { COLLECTION_SPECS, findConflictingIndexes, migrate, pickActiveSlotKeeper } from '../scripts/migrate.js';
import { Appointment, Patient, TimeSlot } from '../src/models/index.js';

function spec(name) {
  return COLLECTION_SPECS.find((item) => item.name === name);
}

function hasIndex(collectionName, keys, { unique = false } = {}) {
  const found = spec(collectionName).indexes.find(
    (index) => JSON.stringify(index.keys) === JSON.stringify(keys),
  );
  return Boolean(found && (!unique || found.options.unique === true));
}

describe('collection specs', () => {
  it('covers the six core collections', () => {
    assert.deepEqual(
      COLLECTION_SPECS.map((item) => item.name),
      ['patients', 'rooms', 'clinicians', 'time_slots', 'appointments', 'staff_users'],
    );
  });

  it('has no duplicate index names or key sets', () => {
    assert.deepEqual(findConflictingIndexes(), []);
  });

  it('registers unique double-booking guards on time_slots', () => {
    assert.equal(hasIndex('time_slots', { clinicianId: 1, date: 1, startTime: 1 }, { unique: true }), true);
    assert.equal(hasIndex('time_slots', { roomId: 1, date: 1, startTime: 1 }, { unique: true }), true);
    assert.equal(
      hasIndex(
        'appointments',
        { clinicianId: 1, appointmentDate: 1, appointmentTime: 1 },
        { unique: true },
      ),
      true,
    );
  });

  it('registers unique patient phone, room pair, and YC reference indexes', () => {
    assert.equal(hasIndex('patients', { phone: 1 }, { unique: true }), true);
    assert.equal(hasIndex('rooms', { clinicSite: 1, name: 1 }, { unique: true }), true);
    assert.equal(hasIndex('appointments', { referenceCode: 1 }, { unique: true }), true);
  });

  it('keeps mongoose schema indexes aligned with migration specs', () => {
    const timeSlotKeys = TimeSlot.schema.indexes().map(([key]) => JSON.stringify(key));
    const appointmentKeys = Appointment.schema.indexes().map(([key]) => JSON.stringify(key));
    const patientKeys = Patient.schema.indexes().map(([key]) => JSON.stringify(key));

    assert.ok(timeSlotKeys.includes(JSON.stringify({ clinicianId: 1, date: 1, startTime: 1 })));
    assert.ok(appointmentKeys.includes(JSON.stringify({ appointmentDate: 1, clinicSite: 1, status: 1 })));
    assert.ok(patientKeys.includes(JSON.stringify({ studentIndex: 1 })));
  });
});

describe('migrate dry-run', () => {
  it('is idempotent and does not require MongoDB', async () => {
    const first = await migrate({ dryRun: true });
    const second = await migrate({ dryRun: true });
    assert.equal(first.ok, true);
    assert.equal(second.ok, true);
    assert.deepEqual(first.collections, second.collections);
  });
});

describe('duplicate active slot keeper', () => {
  it('keeps the most progressed appointment, then the earliest created', () => {
    const checkedIn = {
      _id: '2',
      referenceCode: 'YC-7043',
      status: 'CHECKED_IN',
      createdAt: '2026-09-10T07:30:00.000Z',
    };
    const laterBooked = {
      _id: '3',
      referenceCode: 'YC-8166',
      status: 'BOOKED',
      createdAt: '2026-09-10T07:39:00.000Z',
    };
    const earlierBooked = {
      _id: '1',
      referenceCode: 'YC-6288',
      status: 'BOOKED',
      createdAt: '2026-09-09T18:08:00.000Z',
    };

    assert.equal(pickActiveSlotKeeper([laterBooked, checkedIn, earlierBooked]).referenceCode, 'YC-7043');
    assert.equal(pickActiveSlotKeeper([laterBooked, earlierBooked]).referenceCode, 'YC-6288');
  });
});
