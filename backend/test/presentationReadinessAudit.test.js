import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';
import jwt from 'jsonwebtoken';

import { createStaffAuthService, DEMO_STAFF_PASSWORD } from '../src/auth/staffAuth.js';
import { createApp } from '../src/http/app.js';
import { createMemoryStore } from '../src/patients/memoryStore.js';
import { createPatientService } from '../src/patients/service.js';
import {
  assertAppointmentRescheduleOtp,
  lookupAppointment,
  RESCHEDULE_OTP_REQUIRED_MESSAGE,
} from '../src/services/appointmentOps.js';
import {
  assertWithinClinicHours,
  claimOpenSlot,
} from '../src/services/bookAppointment.js';
import {
  CLINIC_CONFIG,
  isClinicOpenAt,
} from '../src/lib/accraTime.js';

import { normalizeGhanaPhone } from '../src/sms/normalizePhone.js';
import { ValidationError, NotFoundError } from '../src/patients/errors.js';

const TEST_SECRET = 'test-secret-audit-key-jwt-12345';

const sampleAppointment = {
  _id: '68bf2c0e9c1a2b0012345678',
  id: '68bf2c0e9c1a2b0012345678',
  referenceCode: 'YC-4821',
  status: 'BOOKED',
  appointmentDate: '2026-09-30',
  appointmentTime: '10:00',
  clinicSite: 'students-clinic',
  patientId: {
    fullName: 'Akosua Boateng',
    phone: '+233241234567',
    phoneNumber: '+233241234567',
    studentIndex: '20612345',
  },
};

function createMockLookup(appointments = [sampleAppointment]) {
  return async ({ reference, phone, actorIsStaff }) => {
    if (!actorIsStaff) {
      if (!reference || !phone) {
        throw new ValidationError(
          'Both appointment reference code and phone number are required for appointment lookup.',
        );
      }
    }
    const found = appointments.find((a) => a.referenceCode === reference);
    if (!found) {
      throw new NotFoundError('Appointment not found or phone number does not match');
    }
    if (!actorIsStaff) {
      const stored = found.patientId?.phone || found.phone;
      if (normalizeGhanaPhone(stored) !== normalizeGhanaPhone(phone)) {
        throw new NotFoundError('Appointment not found or phone number does not match');
      }
    }
    return found;
  };
}

function startAuditApp(mockService = {}) {
  const staffAuth = createStaffAuthService({
    jwtSecret: TEST_SECRET,
    demoPassword: DEMO_STAFF_PASSWORD,
  });

  const app = createApp({
    patientService: createPatientService(createMemoryStore()),
    appointmentService: {
      createAppointment: async () => ({ appointment: {}, sms: {} }),
      lookupAppointment: createMockLookup(),
      findByReference: async (ref) => (ref === 'YC-4821' ? sampleAppointment : null),
      ...mockService,
    },
    staffAuth,
  });

  return new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, url: `http://127.0.0.1:${port}` });
    });
  });
}

describe('Presentation Readiness: Appointment Lookup Security (Section 2)', () => {
  const started = [];

  after(async () => {
    await Promise.all(
      started.map(
        ({ server }) =>
          new Promise((resolve, reject) => {
            server.close((err) => (err ? reject(err) : resolve()));
          }),
      ),
    );
  });

  async function client(mockService) {
    const instance = await startAuditApp(mockService);
    started.push(instance);
    return instance;
  }

  it('1. Valid reference + valid matching phone number returns 200 with masked details', async () => {
    const { url } = await client();

    const res = await fetch(`${url}/api/appointments/lookup?reference=YC-4821`, { headers: { 'x-booking-phone': '0241234567' } });
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.referenceCode, 'YC-4821');
    assert.equal(body.patientId.phone, '+233 24 **** 567');
    assert.equal(body.patientId.studentIndex, '2061****');
    assert.equal(body.patientId.fullName, 'Akosua Boateng');
  });

  it('2. Valid reference + wrong phone number returns 404 with generic error', async () => {
    const { url } = await client();

    const res = await fetch(`${url}/api/appointments/lookup?reference=YC-4821`, { headers: { 'x-booking-phone': '0209998877' } });
    assert.equal(res.status, 404);

    const body = await res.json();
    assert.equal(body.error, 'Appointment not found or phone number does not match');
  });

  it('3. Invalid reference + valid phone number returns identical 404 generic error (Anti-enumeration)', async () => {
    const { url } = await client({
      lookupAppointment: createMockLookup([]),
      findByReference: async () => null,
    });

    const res = await fetch(`${url}/api/appointments/lookup?reference=YC-9999`, { headers: { 'x-booking-phone': '0241234567' } });
    assert.equal(res.status, 404);

    const body = await res.json();
    assert.equal(body.error, 'Appointment not found or phone number does not match');
  });

  it('4. Reference only is rejected with 400 (Phone required)', async () => {
    const { url } = await client();

    const resLookup = await fetch(`${url}/api/appointments/lookup?reference=YC-4821`);
    assert.equal(resLookup.status, 400);
    const bodyLookup = await resLookup.json();
    assert.ok(bodyLookup.error.toLowerCase().includes('phone number'));

    const resDirect = await fetch(`${url}/api/appointments/YC-4821`);
    assert.equal(resDirect.status, 400);
  });

  it('5. Phone number only is rejected with 400 (Reference required)', async () => {
    const { url } = await client();

    const res = await fetch(`${url}/api/appointments/lookup`, { headers: { 'x-booking-phone': '0241234567' } });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.ok(body.error.toLowerCase().includes('reference'));
  });

  it('6. Empty values return 400', async () => {
    const { url } = await client();

    const res = await fetch(`${url}/api/appointments/lookup`);
    assert.equal(res.status, 400);
  });

  it('7. Direct GET /api/appointments/:reference enforces phone matching for public callers', async () => {
    const { url } = await client({
      findByReference: async (ref) => (ref === 'YC-4821' ? sampleAppointment : null),
    });

    // Valid ref + valid phone
    const okRes = await fetch(`${url}/api/appointments/YC-4821`, { headers: { 'x-booking-phone': '0241234567' } });
    assert.equal(okRes.status, 200);

    // Valid ref + wrong phone -> 404 generic
    const wrongPhoneRes = await fetch(`${url}/api/appointments/YC-4821`, { headers: { 'x-booking-phone': '0200000000' } });
    assert.equal(wrongPhoneRes.status, 404);
    assert.equal((await wrongPhoneRes.json()).error, 'Appointment not found or phone number does not match');

    // Invalid ref + phone -> 404 generic
    const badRefRes = await fetch(`${url}/api/appointments/YC-0000`, { headers: { 'x-booking-phone': '0241234567' } });
    assert.equal(badRefRes.status, 404);
    assert.equal((await badRefRes.json()).error, 'Appointment not found or phone number does not match');
  });

  it('8. Authenticated staff can retrieve appointment by reference without phone', async () => {
    const { url } = await client({
      findByReference: async (ref) => (ref === 'YC-4821' ? sampleAppointment : null),
    });

    const token = jwt.sign(
      { sub: 'stf_01', role: 'RECEPTIONIST', clinicSite: 'students-clinic' },
      TEST_SECRET,
    );

    const res = await fetch(`${url}/api/appointments/YC-4821`, {
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.referenceCode, 'YC-4821');
  });
});

describe('Presentation Readiness: Clinic Availability / Operating Hours (Section 3)', () => {
  // 2026-09-30 is a Wednesday (open weekday for students-clinic)
  // 2026-10-03 is a Saturday (closed for students-clinic)
  // 2026-10-04 is a Sunday (closed for students-clinic)

  it('allows Students Clinic bookings Monday-Friday during clinic hours (08:00 - 16:00)', () => {
    assert.doesNotThrow(() => {
      assertWithinClinicHours({
        clinicSite: 'students-clinic',
        appointmentDate: '2026-09-30',
        appointmentTime: '08:30',
      });
    });

    assert.doesNotThrow(() => {
      assertWithinClinicHours({
        clinicSite: 'students-clinic',
        appointmentDate: '2026-09-30',
        appointmentTime: '15:30',
      });
    });
  });

  it('respects exact opening boundary (08:00 AM) for Students Clinic', () => {
    assert.equal(isClinicOpenAt('students-clinic', '2026-09-30', '08:00'), true);
    assert.doesNotThrow(() => {
      assertWithinClinicHours({
        clinicSite: 'students-clinic',
        appointmentDate: '2026-09-30',
        appointmentTime: '08:00',
      });
    });
  });

  it('rejects Students Clinic before 8 AM (e.g. 07:59, 07:30)', () => {
    assert.equal(isClinicOpenAt('students-clinic', '2026-09-30', '07:30'), false);
    assert.equal(isClinicOpenAt('students-clinic', '2026-09-30', '07:59'), false);
    assert.throws(
      () => {
        assertWithinClinicHours({
          clinicSite: 'students-clinic',
          appointmentDate: '2026-09-30',
          appointmentTime: '07:30',
        });
      },
      (err) => err.name === 'ValidationError',
    );
  });

  it('rejects Students Clinic at or after closing boundary 4:00 PM (16:00)', () => {
    assert.equal(isClinicOpenAt('students-clinic', '2026-09-30', '16:00'), false);
    assert.equal(isClinicOpenAt('students-clinic', '2026-09-30', '16:30'), false);
    assert.throws(
      () => {
        assertWithinClinicHours({
          clinicSite: 'students-clinic',
          appointmentDate: '2026-09-30',
          appointmentTime: '16:00',
        });
      },
      (err) => err.name === 'ValidationError',
    );
  });

  it('rejects Students Clinic on Saturday and Sunday', () => {
    assert.equal(isClinicOpenAt('students-clinic', '2026-10-03', '10:00'), false);
    assert.equal(isClinicOpenAt('students-clinic', '2026-10-04', '10:00'), false);

    assert.throws(
      () => {
        assertWithinClinicHours({
          clinicSite: 'students-clinic',
          appointmentDate: '2026-10-03',
          appointmentTime: '10:00',
        });
      },
      (err) => err.name === 'ValidationError',
    );
  });

  it('allows KNUST Hospital bookings 24 hours every day including weekends and evenings', () => {
    // Saturday morning
    assert.equal(isClinicOpenAt('knust-hospital', '2026-10-03', '02:00'), true);
    // Sunday night
    assert.equal(isClinicOpenAt('knust-hospital', '2026-10-04', '21:30'), true);
    // Weekday early morning
    assert.equal(isClinicOpenAt('knust-hospital', '2026-09-30', '06:00'), true);

    assert.doesNotThrow(() => {
      assertWithinClinicHours({
        clinicSite: 'knust-hospital',
        appointmentDate: '2026-10-04',
        appointmentTime: '21:30',
      });
    });
  });
});

describe('Presentation Readiness: Independent Time Slots Per Clinic (Section 4)', () => {
  it('defines distinct operating days and slotTimes in CLINIC_CONFIG', () => {
    const studentConfig = CLINIC_CONFIG['students-clinic'];
    const hospitalConfig = CLINIC_CONFIG['knust-hospital'];

    assert.ok(studentConfig);
    assert.ok(hospitalConfig);

    // Operating days
    assert.deepEqual(studentConfig.operatingDays, [1, 2, 3, 4, 5]);
    assert.deepEqual(hospitalConfig.operatingDays, [0, 1, 2, 3, 4, 5, 6]);

    // Hours
    assert.equal(studentConfig.openingTime, '08:00');
    assert.equal(studentConfig.closingTime, '16:00');
    assert.equal(hospitalConfig.openingTime, '00:00');
    assert.equal(hospitalConfig.closingTime, '24:00');

    // Slot pools
    assert.ok(studentConfig.slotTimes.length > 0);
    assert.ok(hospitalConfig.slotTimes.length > studentConfig.slotTimes.length);

    // Every student clinic slot is within 08:00 to 16:00
    for (const slot of studentConfig.slotTimes) {
      assert.ok(slot.startTime >= '08:00');
      assert.ok(slot.endTime <= '16:00');
    }
  });
});

describe('Presentation Readiness: Reschedule OTP Security (S1)', () => {
  it('strictly requires an OTP verification code for patient reschedule', async () => {
    const mockAppt = {
      _id: '68bf2c0e9c1a2b0012345678',
      referenceCode: 'YC-4821',
      patientId: { phone: '+233241234567' },
    };

    // Reschedule with phone only must be rejected
    await assert.rejects(
      () =>
        assertAppointmentRescheduleOtp(mockAppt, {
          actorIsStaff: false,
          phone: '0241234567',
          otpCode: null,
        }),
      (err) => {
        assert.equal(err.name, 'ForbiddenError');
        assert.equal(err.message, RESCHEDULE_OTP_REQUIRED_MESSAGE);
        return true;
      },
    );
  });
});
