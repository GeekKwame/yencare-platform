import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Appointment } from '../src/models/Appointment.js';
import { Patient } from '../src/models/Patient.js';
import { resolveNhis, resolvePatientPhone } from '../src/patients/fields.js';
import { serializePatient } from '../src/patients/serialize.js';

describe('resolvePatientPhone', () => {
  it('prefers Mongo `phone` then HTTP `phoneNumber`', () => {
    assert.equal(resolvePatientPhone({ phone: '+233241234567' }), '+233241234567');
    assert.equal(resolvePatientPhone({ phoneNumber: '+233247001122' }), '+233247001122');
    assert.equal(
      resolvePatientPhone({ phone: '+233241234567', phoneNumber: '+233247001122' }),
      '+233241234567',
    );
    assert.equal(resolvePatientPhone({}), null);
  });
});

describe('serializePatient aliases', () => {
  it('emits both Mongo and HTTP names so SMS cannot read undefined', () => {
    const fromMongo = serializePatient({
      id: 'p1',
      fullName: 'Efua Darko',
      studentIndex: '20620111',
      phone: '+233247001122',
      nhisNumber: '12345678',
    });
    assert.equal(fromMongo.phone, '+233247001122');
    assert.equal(fromMongo.phoneNumber, '+233247001122');
    assert.equal(fromMongo.nhisNumber, '12345678');
    assert.equal(fromMongo.nhis, '12345678');

    const fromHttpStore = serializePatient({
      id: 'p2',
      fullName: 'Yaw Sarpong',
      phoneNumber: '+233208113344',
      nhis: '99',
    });
    assert.equal(fromHttpStore.phone, '+233208113344');
    assert.equal(fromHttpStore.phoneNumber, '+233208113344');
    assert.equal(fromHttpStore.nhisNumber, '99');
    assert.equal(fromHttpStore.nhis, '99');
  });
});

describe('Appointment.populateQueue field list', () => {
  it('only asks Patient for paths that exist on the schema', () => {
    const paths = Object.keys(Patient.schema.paths);
    for (const field of ['fullName', 'phone', 'studentIndex']) {
      assert.ok(paths.includes(field), `Patient schema missing ${field}`);
    }
    assert.equal(paths.includes('phoneNumber'), false);
    assert.match(String(Appointment.populateQueue), /fullName phone studentIndex/);
  });
});

describe('resolveNhis', () => {
  it('reads nhisNumber first', () => {
    assert.equal(resolveNhis({ nhisNumber: 'A', nhis: 'B' }), 'A');
    assert.equal(resolveNhis({ nhis: 'B' }), 'B');
  });
});
