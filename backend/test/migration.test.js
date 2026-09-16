import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { COLLECTION_SPECS, findConflictingIndexes, migrate } from '../scripts/migrate.js';
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
