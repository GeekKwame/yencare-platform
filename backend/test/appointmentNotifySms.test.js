import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import mongoose from 'mongoose';

import {
  buildArrivalSms,
  buildCancelSms,
  buildRescheduleSms,
  buildVisitCompletedSms,
  buildWaitingSms,
  sendAppointmentSms,
} from '../src/services/appointmentOps.js';

function assertGsmSafe(message) {
  assert.equal(
    message.includes('ɛ'),
    false,
    'operational SMS must stay on GSM-7 (no ɛ) so mNotify delivers it',
  );
  assert.match(message, /^YenCare Health\n/);
}

describe('appointment update SMS copy', () => {
  it('uses GSM-safe YenCare Health copy for reschedule', () => {
    const message = buildRescheduleSms({
      referenceCode: 'YC-4821',
      appointmentDate: '2026-09-18',
      appointmentTime: '14:30',
      clinicSite: 'students-clinic',
      staffChangeReason: 'Clinician delayed',
    });

    assertGsmSafe(message);
    assert.match(message, /Appointment updated/);
    assert.match(message, /New: 2026-09-18, 2:30 PM/);
    assert.match(message, /Booking ID: YC-4821/);
    assert.match(message, /Reason: Clinician delayed/);
    assert.match(message, /KNUST Students' Clinic/);
  });

  it('uses GSM-safe YenCare Health copy for cancel', () => {
    const message = buildCancelSms({
      referenceCode: 'YC-4821',
      appointmentDate: '2026-09-18',
      appointmentTime: '09:00',
      clinicSite: 'knust-hospital',
    });

    assertGsmSafe(message);
    assert.match(message, /has been cancelled/);
    assert.match(message, /KNUST Hospital/);
    assert.doesNotMatch(message, /KNUST KNUST/);
  });

  it('keeps queue and arrival notices on GSM-safe copy', () => {
    assertGsmSafe(
      buildWaitingSms({
        clinicSite: 'students-clinic',
        queueToken: 'A-02',
        estimatedWaitMinutes: 15,
        referenceCode: 'YC-1001',
      }),
    );
    assertGsmSafe(
      buildArrivalSms({
        clinicSite: 'students-clinic',
        referenceCode: 'YC-1001',
      }),
    );
    assertGsmSafe(
      buildVisitCompletedSms({
        referenceCode: 'YC-1001',
        clinicSite: 'students-clinic',
        clinicianId: { name: 'Dr. Kwame Boateng' },
      }),
    );
  });
});

describe('sendAppointmentSms destinations', () => {
  it('sends to the verified request phone when the patient is not populated', async () => {
    const result = await sendAppointmentSms({
      appointment: {
        referenceCode: 'YC-4821',
        patientId: new mongoose.Types.ObjectId(),
      },
      requestedPhone: '0241234567',
      message: 'YenCare Health\n\nAppointment updated',
      kind: 'reschedule',
    });

    assert.equal(result.ok, true);
    assert.equal(result.provider, 'mock');
  });

  it('returns a structured failure instead of throwing when no phone exists', async () => {
    const result = await sendAppointmentSms({
      appointment: {
        referenceCode: 'YC-4821',
        patientId: { fullName: 'Akosua Boateng' },
      },
      message: 'YenCare Health\n\nAppointment updated',
      kind: 'reschedule',
    });

    assert.equal(result.ok, false);
    assert.match(result.error, /no phone/i);
  });
});
