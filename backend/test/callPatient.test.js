import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildCalledSms,
  buildVisitCompletedSms,
  notifyPatientCompleted,
} from '../src/services/callPatient.js';

describe('buildCalledSms', () => {
  it('includes turn copy, token, room, and booking id', () => {
    const message = buildCalledSms(
      { queueToken: 'A-02', referenceCode: 'YC-4821' },
      { name: 'Room 1' },
    );

    assert.match(message, /It is your turn now/);
    assert.match(message, /Token A-02 is now called to Room 1/);
    assert.match(message, /Booking ID: YC-4821/);
    assert.match(message, /Please proceed inside immediately/);
  });

  it('falls back when token and room name are missing', () => {
    const message = buildCalledSms({ referenceCode: 'YC-1001' }, null);
    assert.match(message, /Please go to the consultation room/);
    assert.match(message, /Booking ID: YC-1001/);
  });
});

describe('buildVisitCompletedSms', () => {
  it('includes hospital visit completed copy, doctor name, clinic site, and pharmacy/lab directions', () => {
    const message = buildVisitCompletedSms(
      { referenceCode: 'YC-1709', clinicSite: 'students-clinic' },
      { clinician: { name: 'Dr. Ama Serwaa' } },
    );

    assert.match(message, /^YenCare Health\n/);
    assert.match(message, /Visit completed/);
    assert.match(message, /Your consultation with Dr\. Ama Serwaa at KNUST Students' Clinic is complete\./);
    assert.match(message, /Please proceed to the pharmacy for prescribed medications or laboratory for tests\./);
    assert.match(message, /Booking ID: YC-1709/);
  });

  it('supports KNUST Hospital site label and clinician attached to appointment', () => {
    const message = buildVisitCompletedSms({
      referenceCode: 'YC-2002',
      clinicSite: 'knust-hospital',
      clinicianId: { name: 'Dr. Kofi Adjei' },
    });

    assert.match(message, /KNUST Hospital/);
    assert.match(message, /Dr\. Kofi Adjei/);
    assert.match(message, /Booking ID: YC-2002/);
  });

  it('falls back cleanly when clinician is unspecified', () => {
    const message = buildVisitCompletedSms({
      referenceCode: 'YC-3301',
      clinicSite: 'students-clinic',
    });

    assert.match(message, /Your consultation at KNUST Students' Clinic is complete\./);
    assert.match(message, /Booking ID: YC-3301/);
  });
});

describe('notifyPatientCompleted', () => {
  it('sends visit completed SMS to patient with phone on record', async () => {
    const appointment = {
      referenceCode: 'YC-1709',
      clinicSite: 'students-clinic',
      clinicianId: { name: 'Dr. Ama Serwaa' },
      patientId: { fullName: 'Akosua Boateng', phone: '+233241234567' },
    };

    const result = await notifyPatientCompleted(appointment);
    assert.equal(result.ok, true);
  });

  it('returns structured failure when patient has no phone', async () => {
    const appointment = {
      referenceCode: 'YC-1709',
      patientId: { fullName: 'Akosua Boateng' },
    };

    const result = await notifyPatientCompleted(appointment);
    assert.equal(result.ok, false);
    assert.match(result.error, /no phone/i);
  });
});

