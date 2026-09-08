import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ConflictError, NotFoundError, ValidationError } from '../src/patients/errors.js';
import { createMemoryStore } from '../src/patients/memoryStore.js';
import { createPatientService } from '../src/patients/service.js';

function service() {
  return createPatientService(createMemoryStore());
}

describe('patientService.registerOrLookup', () => {
  it('creates a new student record from P02 details', async () => {
    const patients = service();
    const { patient, created } = await patients.registerOrLookup({
      fullName: 'Efua Darko',
      studentIndex: '20620111',
      phoneNumber: '024 700 1122',
      nhis: '12345678',
    });

    assert.equal(created, true);
    assert.equal(patient.fullName, 'Efua Darko');
    assert.equal(patient.studentIndex, '20620111');
    assert.equal(patient.phoneNumber, '+233247001122');
    assert.equal(patient.nhis, '12345678');
    assert.ok(patient.id);
  });

  it('returns the existing record when the student index already exists', async () => {
    const patients = service();
    const first = await patients.registerOrLookup({
      fullName: 'Efua Darko',
      studentIndex: '20620111',
      phoneNumber: '024 700 1122',
    });
    const second = await patients.registerOrLookup({
      studentIndex: '20620111',
    });

    assert.equal(second.created, false);
    assert.equal(second.patient.id, first.patient.id);
    assert.equal(second.patient.fullName, 'Efua Darko');
  });

  it('returns the existing record when the phone already exists', async () => {
    const patients = service();
    const first = await patients.registerOrLookup({
      fullName: 'Yaw Sarpong',
      studentIndex: '20620222',
      phoneNumber: '020 811 3344',
    });
    const second = await patients.registerOrLookup({
      phoneNumber: '0208113344',
    });

    assert.equal(second.created, false);
    assert.equal(second.patient.id, first.patient.id);
  });

  it('requires a full name to create a new record', async () => {
    const patients = service();
    await assert.rejects(
      () => patients.registerOrLookup({ studentIndex: '20620333' }),
      ValidationError,
    );
  });

  it('requires a Ghana phone to create a new record', async () => {
    const patients = service();
    await assert.rejects(
      () =>
        patients.registerOrLookup({
          fullName: 'Efua Darko',
          studentIndex: '20620111',
        }),
      ValidationError,
    );
  });

  it('conflicts when index and phone belong to different people', async () => {
    const patients = service();
    await patients.registerOrLookup({
      fullName: 'Efua Darko',
      studentIndex: '20620111',
      phoneNumber: '024 700 1122',
    });
    await patients.registerOrLookup({
      fullName: 'Yaw Sarpong',
      studentIndex: '20620222',
      phoneNumber: '020 811 3344',
    });

    await assert.rejects(
      () =>
        patients.registerOrLookup({
          fullName: 'Abena Kusi',
          studentIndex: '20620111',
          phoneNumber: '020 811 3344',
        }),
      ConflictError,
    );
  });
});

describe('patientService.lookup', () => {
  it('finds a patient by student index or phone', async () => {
    const patients = service();
    const { patient } = await patients.registerOrLookup({
      fullName: 'Abena Kusi',
      studentIndex: '20620333',
      phoneNumber: '027 922 5566',
    });

    const byIndex = await patients.lookup('20620333');
    const byPhone = await patients.lookup('0279225566');

    assert.equal(byIndex.id, patient.id);
    assert.equal(byPhone.id, patient.id);
  });

  it('returns not found for an unknown valid index', async () => {
    const patients = service();
    await assert.rejects(() => patients.lookup('20699999'), NotFoundError);
  });

  it('rejects an unusable identifier', async () => {
    const patients = service();
    await assert.rejects(() => patients.lookup('nope'), ValidationError);
  });
});
