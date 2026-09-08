import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ValidationError } from '../src/patients/errors.js';
import {
  classifyIdentifier,
  normalizeStudentIndex,
  parseRegisterInput,
} from '../src/patients/validate.js';

describe('normalizeStudentIndex', () => {
  it('accepts prototype KNUST indexes', () => {
    assert.equal(normalizeStudentIndex('20612345'), '20612345');
    assert.equal(normalizeStudentIndex('20620111'), '20620111');
  });

  it('strips spaces and requires 8 digits (MongoDB Patient schema)', () => {
    assert.equal(normalizeStudentIndex('2061 2345'), '20612345');
    assert.throws(() => normalizeStudentIndex('123456'), ValidationError);
    assert.throws(() => normalizeStudentIndex('1234567890'), ValidationError);
  });

  it('rejects values that fail the P02 format check', () => {
    assert.throws(() => normalizeStudentIndex(''), ValidationError);
    assert.throws(() => normalizeStudentIndex('20612'), ValidationError);
    assert.throws(() => normalizeStudentIndex('20612345678'), ValidationError);
    assert.throws(() => normalizeStudentIndex('AB123456'), ValidationError);
  });
});

describe('parseRegisterInput', () => {
  it('accepts frontend camelCase from registerPatient()', () => {
    const parsed = parseRegisterInput({
      fullName: 'Efua Darko',
      studentIndex: '20620111',
      phoneNumber: '024 700 1122',
      nhis: '12345678',
    });

    assert.equal(parsed.fullName, 'Efua Darko');
    assert.equal(parsed.studentIndex, '20620111');
    assert.equal(parsed.phoneNumber, '+233247001122');
    assert.equal(parsed.nhis, '12345678');
  });

  it('accepts snake_case field names from the ticket', () => {
    const parsed = parseRegisterInput({
      full_name: 'Yaw Sarpong',
      student_index: '20620222',
      phone_number: '0208113344',
    });

    assert.equal(parsed.fullName, 'Yaw Sarpong');
    assert.equal(parsed.studentIndex, '20620222');
    assert.equal(parsed.phoneNumber, '+233208113344');
    assert.equal(parsed.nhis, null);
  });

  it('accepts prototype patientName + phone aliases', () => {
    const parsed = parseRegisterInput({
      patientName: 'Abena Kusi',
      studentIndex: '20620333',
      phone: '0279225566',
    });

    assert.equal(parsed.fullName, 'Abena Kusi');
    assert.equal(parsed.phoneNumber, '+233279225566');
  });

  it('allows walk-in style payloads with only a phone', () => {
    const parsed = parseRegisterInput({
      fullName: 'Kwame Ofori Atta',
      phoneNumber: '0245551234',
    });

    assert.equal(parsed.studentIndex, null);
    assert.equal(parsed.phoneNumber, '+233245551234');
  });

  it('requires at least one identifier', () => {
    assert.throws(
      () => parseRegisterInput({ fullName: 'Akosua Boateng' }),
      /student index number or a Ghana phone/,
    );
  });

  it('rejects invalid Ghana phones with the prototype copy', () => {
    assert.throws(
      () =>
        parseRegisterInput({
          fullName: 'Akosua Boateng',
          studentIndex: '20612345',
          phoneNumber: '123',
        }),
      /valid Ghana phone number/,
    );
  });
});

describe('classifyIdentifier', () => {
  it('treats prototype indexes as student_index', () => {
    assert.deepEqual(classifyIdentifier('20612345'), {
      type: 'student_index',
      value: '20612345',
    });
  });

  it('treats Ghana phone forms as phone (E.164)', () => {
    assert.deepEqual(classifyIdentifier('024 700 1122'), {
      type: 'phone',
      value: '+233247001122',
    });
    assert.deepEqual(classifyIdentifier('+233247001122'), {
      type: 'phone',
      value: '+233247001122',
    });
    assert.deepEqual(classifyIdentifier('0247001122'), {
      type: 'phone',
      value: '+233247001122',
    });
  });

  it('rejects empty and unusable values', () => {
    assert.equal(classifyIdentifier('').type, 'invalid');
    assert.equal(classifyIdentifier('nope').type, 'invalid');
  });
});
