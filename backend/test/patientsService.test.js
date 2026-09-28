import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ConflictError, NotFoundError, ValidationError } from '../src/patients/errors.js';
import { createMemoryStore } from '../src/patients/memoryStore.js';
import { createPatientService, PHONE_CHANGE_NEEDS_RECEPTION_MESSAGE } from '../src/patients/service.js';

const RECEPTIONIST = { staffId: 'stf_01', role: 'RECEPTIONIST' };

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

  it('lets reception update the stored phone when the same student has a new number', async () => {
    const patients = service();
    const first = await patients.registerOrLookup({
      fullName: 'Efua Darko',
      studentIndex: '20620111',
      phoneNumber: '024 700 1122',
    });
    const second = await patients.registerOrLookup(
      {
        fullName: 'Efua Darko',
        studentIndex: '20620111',
        phoneNumber: '027 922 5566',
      },
      { staff: RECEPTIONIST },
    );

    assert.equal(second.created, false);
    assert.equal(second.patient.id, first.patient.id);
    assert.equal(second.patient.phoneNumber, '+233279225566');
  });

  it('lets reception update the stored fullName', async () => {
    const patients = service();
    const first = await patients.registerOrLookup({
      fullName: 'Efua Darko',
      studentIndex: '20620111',
      phoneNumber: '024 700 1122',
    });
    const second = await patients.registerOrLookup(
      {
        fullName: 'Sterling Darko',
        studentIndex: '20620111',
        phoneNumber: '024 700 1122',
      },
      { staff: RECEPTIONIST },
    );

    assert.equal(second.created, false);
    assert.equal(second.patient.id, first.patient.id);
    assert.equal(second.patient.fullName, 'Sterling Darko');
  });

  it('refuses a public caller who gives a known index with a different phone, and changes nothing', async () => {
    const patients = service();
    const first = await patients.registerOrLookup({
      fullName: 'Efua Darko',
      studentIndex: '20620111',
      phoneNumber: '024 700 1122',
    });

    for (const staff of [null, { role: 'DOCTOR' }]) {
      await assert.rejects(
        () =>
          patients.registerOrLookup(
            { fullName: 'Someone Else', studentIndex: '20620111', phoneNumber: '027 922 5566' },
            { staff },
          ),
        (err) => {
          assert.ok(err instanceof ConflictError);
          assert.equal(err.status, 409);
          assert.equal(err.message, PHONE_CHANGE_NEEDS_RECEPTION_MESSAGE);
          return true;
        },
      );
    }

    const after = await patients.lookup('20620111');
    assert.equal(after.id, first.patient.id);
    assert.equal(after.phoneNumber, '+233247001122');
    assert.equal(after.fullName, 'Efua Darko');
  });

  it('returns a public caller the existing record unchanged when the phone matches', async () => {
    const patients = service();
    await patients.registerOrLookup({
      fullName: 'Efua Darko',
      studentIndex: '20620111',
      phoneNumber: '024 700 1122',
      nhis: '12345678',
    });

    const again = await patients.registerOrLookup({
      fullName: 'Sterling Darko',
      studentIndex: '20620111',
      phoneNumber: '0247001122',
      nhis: '99999999',
    });

    assert.equal(again.created, false);
    assert.equal(again.patient.fullName, 'Efua Darko');
    assert.equal(again.patient.nhis, '12345678');
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
