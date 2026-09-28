import assert from 'node:assert/strict';
import { after, beforeEach, describe, it } from 'node:test';

import { createStaffAuthService, DEMO_STAFF_PASSWORD } from '../src/auth/staffAuth.js';
import { createApp } from '../src/http/app.js';
import { createMemoryStore } from '../src/patients/memoryStore.js';
import { createPatientService } from '../src/patients/service.js';
import {
  clearAllOtps,
  generateOtpCode,
  getLatestOtpForTesting,
  storeOtp,
  verifyOtp,
} from '../src/services/otpService.js';
import {
  assertAppointmentCancelOtp,
  buildCancelOtpSms,
  buildRescheduleOtpSms,
  OTP_REQUIRED_MESSAGE,
} from '../src/services/appointmentOps.js';
import { maskPhone } from '../src/sms/normalizePhone.js';

const TEST_SECRET = 'test-staff-jwt-secret';

const mockAppointment = {
  _id: '68bf2c0e9c1a2b0012345678',
  id: '68bf2c0e9c1a2b0012345678',
  referenceCode: 'YC-4821',
  status: 'BOOKED',
  appointmentDate: '2026-09-28',
  appointmentTime: '10:00',
  clinicSite: 'students-clinic',
  visitType: 'general-opd',
  patientId: {
    _id: '68bf2c0e9c1a2b0012345670',
    fullName: 'Kofi Mensah',
    phone: '+233241234567',
    studentIndex: '20612345',
  },
  timeSlotId: '68bf2c0e9c1a2b0099999999',
};

function startTestApp(appointmentService) {
  const staffAuth = createStaffAuthService({
    jwtSecret: TEST_SECRET,
    demoPassword: DEMO_STAFF_PASSWORD,
  });

  const app = createApp({
    patientService: createPatientService(createMemoryStore()),
    appointmentService: {
      createAppointment: async () => ({ appointment: {}, sms: {} }),
      ...appointmentService,
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

describe('SMS OTP Generation and Verification Engine', () => {
  beforeEach(() => {
    clearAllOtps();
  });

  it('generateOtpCode emits exactly 4 numeric digits', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateOtpCode();
      assert.equal(typeof code, 'string');
      assert.equal(code.length, 4);
      assert.match(code, /^\d{4}$/, `Expected 4 digits, got ${code}`);
      const num = Number(code);
      assert.ok(num >= 1000 && num <= 9999);
    }
  });

  it('stores OTP and verifies matching code', async () => {
    await storeOtp({
      appointmentId: '68bf2c0e9c1a2b0012345678',
      referenceCode: 'YC-4821',
      action: 'CANCEL',
      phone: '+233241234567',
      code: '4829',
    });

    const result = await verifyOtp({
      appointmentId: '68bf2c0e9c1a2b0012345678',
      referenceCode: 'YC-4821',
      action: 'CANCEL',
      code: '4829',
    });

    assert.equal(result.ok, true);
    assert.match(result.message, /successful/i);
  });

  it('rejects incorrect OTP code and increments attempt counter', async () => {
    await storeOtp({
      appointmentId: '68bf2c0e9c1a2b0012345678',
      referenceCode: 'YC-4821',
      action: 'CANCEL',
      phone: '+233241234567',
      code: '4829',
    });

    const failed = await verifyOtp({
      appointmentId: '68bf2c0e9c1a2b0012345678',
      referenceCode: 'YC-4821',
      action: 'CANCEL',
      code: '0000',
    });

    assert.equal(failed.ok, false);
    assert.equal(failed.reason, 'INVALID');
    assert.match(failed.message, /incorrect/i);
  });

  it('locks out after 5 consecutive incorrect attempts', async () => {
    await storeOtp({
      appointmentId: '68bf2c0e9c1a2b0012345678',
      referenceCode: 'YC-4821',
      action: 'CANCEL',
      phone: '+233241234567',
      code: '4829',
    });

    for (let i = 0; i < 5; i++) {
      const res = await verifyOtp({
        appointmentId: '68bf2c0e9c1a2b0012345678',
        referenceCode: 'YC-4821',
        action: 'CANCEL',
        code: '1111',
      });
      assert.equal(res.ok, false);
    }

    // 6th attempt even with correct code must be rejected due to lockout
    const locked = await verifyOtp({
      appointmentId: '68bf2c0e9c1a2b0012345678',
      referenceCode: 'YC-4821',
      action: 'CANCEL',
      code: '4829',
    });

    assert.equal(locked.ok, false);
    assert.equal(locked.reason, 'MAX_ATTEMPTS');
  });

  it('rejects expired OTP code', async () => {
    await storeOtp({
      appointmentId: '68bf2c0e9c1a2b0012345678',
      referenceCode: 'YC-4821',
      action: 'CANCEL',
      phone: '+233241234567',
      code: '4829',
      ttlMs: 60000, // 1 minute
    });

    // Verify 2 minutes in the future
    const future = new Date(Date.now() + 120000);
    const expired = await verifyOtp({
      appointmentId: '68bf2c0e9c1a2b0012345678',
      referenceCode: 'YC-4821',
      action: 'CANCEL',
      code: '4829',
      now: future,
    });

    assert.equal(expired.ok, false);
    assert.equal(expired.reason, 'EXPIRED');
    assert.match(expired.message, /expired/i);
  });

  it('single-use: consumed OTP cannot be reused', async () => {
    await storeOtp({
      appointmentId: '68bf2c0e9c1a2b0012345678',
      referenceCode: 'YC-4821',
      action: 'CANCEL',
      phone: '+233241234567',
      code: '4829',
    });

    const first = await verifyOtp({
      appointmentId: '68bf2c0e9c1a2b0012345678',
      referenceCode: 'YC-4821',
      action: 'CANCEL',
      code: '4829',
    });
    assert.equal(first.ok, true);

    const second = await verifyOtp({
      appointmentId: '68bf2c0e9c1a2b0012345678',
      referenceCode: 'YC-4821',
      action: 'CANCEL',
      code: '4829',
    });
    assert.equal(second.ok, false);
    assert.equal(second.reason, 'NOT_FOUND');
  });

  it('SMS template builders generate GSM-7 compliant bodies with reference and code', () => {
    const cancelBody = buildCancelOtpSms({ referenceCode: 'YC-4821' }, '5812');
    assert.match(cancelBody, /YC-4821/);
    assert.match(cancelBody, /5812/);
    assert.match(cancelBody, /cancel/i);

    const rescheduleBody = buildRescheduleOtpSms({ referenceCode: 'YC-4821' }, '9421');
    assert.match(rescheduleBody, /YC-4821/);
    assert.match(rescheduleBody, /9421/);
    assert.match(rescheduleBody, /reschedul/i);
  });
});

describe('Public Lookup Privacy (Phone Masking)', () => {
  /** @type {{ server: import('node:http').Server }[]} */
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
    const instance = await startTestApp(mockService);
    started.push(instance);
    return instance;
  }

  it('GET /api/appointments/lookup masks patient phone in public response', async () => {
    const service = {
      lookupAppointment: async () => ({ ...mockAppointment }),
    };

    const { url } = await client(service);
    const res = await fetch(`${url}/api/appointments/lookup?reference=YC-4821`);
    assert.equal(res.status, 200);

    const body = await res.json();

    // Verify phone masking format: +233 24 **** 567
    assert.equal(body.patientId.phone, '+233 24 **** 567');
    assert.equal(body.maskedPhone, '+233 24 **** 567');
    // Ensure raw phone is NEVER leaked
    assert.notEqual(body.patientId.phone, '+233241234567');
    assert.notEqual(JSON.stringify(body).includes('241234567'), true);
  });

  it('GET /api/appointments/:reference masks patient phone in public response', async () => {
    const service = {
      findByReference: async () => ({ ...mockAppointment }),
    };

    const { url } = await client(service);
    const res = await fetch(`${url}/api/appointments/YC-4821?phone=${encodeURIComponent('+233241234567')}`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.patientId.phone, '+233 24 **** 567');
    assert.equal(body.maskedPhone, '+233 24 **** 567');
  });

  it('masks phone numbers in supersededBy and activeAppointments', async () => {
    const activeBooking = {
      ...mockAppointment,
      referenceCode: 'YC-9999',
      status: 'BOOKED',
    };

    const service = {
      findByReference: async () => ({
        ...mockAppointment,
        status: 'CANCELLED',
      }),
      findActiveAppointmentForPatient: async () => activeBooking,
      findActiveAppointmentsForPatient: async () => [activeBooking],
    };

    const { url } = await client(service);
    const res = await fetch(`${url}/api/appointments/YC-4821?phone=${encodeURIComponent('+233241234567')}`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.supersededBy.patientId.phone, '+233 24 **** 567');
    assert.equal(body.activeAppointments[0].patientId.phone, '+233 24 **** 567');
  });
});

describe('OTP Request & Verification Flow Endpoints', () => {
  /** @type {{ server: import('node:http').Server }[]} */
  const started = [];

  beforeEach(() => {
    clearAllOtps();
  });

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
    const instance = await startTestApp(mockService);
    started.push(instance);
    return instance;
  }

  async function staffToken(url) {
    const res = await fetch(`${url}/api/auth/staff-login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        identifier: 'abena.osei@yencare.gh',
        password: DEMO_STAFF_PASSWORD,
      }),
    });
    assert.equal(res.status, 200);
    return (await res.json()).token;
  }

  it('POST /api/appointments/:id/request-cancel-otp sends 4-digit SMS OTP', async () => {
    let capturedId = null;
    const service = {
      requestCancelOtp: async (id) => {
        capturedId = id;
        const code = generateOtpCode();
        await storeOtp({
          appointmentId: mockAppointment._id,
          referenceCode: mockAppointment.referenceCode,
          action: 'CANCEL',
          phone: mockAppointment.patientId.phone,
          code,
        });

        return {
          message: 'Cancellation verification code sent via SMS',
          referenceCode: mockAppointment.referenceCode,
          maskedPhone: maskPhone(mockAppointment.patientId.phone),
          expiresInMinutes: 10,
          sms: { ok: true, provider: 'mock' },
          testOtp: code,
        };
      },
    };

    const { url } = await client(service);
    const res = await fetch(`${url}/api/appointments/YC-4821/request-cancel-otp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });

    assert.equal(res.status, 200);
    assert.equal(capturedId, 'YC-4821');

    const body = await res.json();
    assert.equal(body.referenceCode, 'YC-4821');
    assert.equal(body.maskedPhone, '+233 24 **** 567');
    assert.equal(body.sms.ok, true);
    assert.match(body.testOtp, /^\d{4}$/);
  });

  it('PATCH /api/appointments/:id/cancel requires valid otpCode unless initiated by staff', async () => {
    let cancelCalledWith = null;

    const service = {
      cancelAppointment: async (id, options) => {
        cancelCalledWith = options;
        await assertAppointmentCancelOtp(mockAppointment, options);
        return {
          appointment: { ...mockAppointment, status: 'CANCELLED' },
          releasedSlotId: mockAppointment.timeSlotId,
          cancelledTime: new Date().toISOString(),
          sms: { ok: true },
        };
      },
    };

    const { url } = await client(service);

    // 1. Unauthenticated request without otpCode is rejected
    const noOtpRes = await fetch(`${url}/api/appointments/YC-4821/cancel`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ cancelReason: 'Cannot make it' }),
    });
    assert.equal(noOtpRes.status, 403);
    const noOtpBody = await noOtpRes.json();
    assert.equal(noOtpBody.error, OTP_REQUIRED_MESSAGE);

    // 2. Unauthenticated request with WRONG otpCode is rejected
    await storeOtp({
      appointmentId: mockAppointment._id,
      referenceCode: mockAppointment.referenceCode,
      action: 'CANCEL',
      phone: mockAppointment.patientId.phone,
      code: '8822',
    });

    const wrongOtpRes = await fetch(`${url}/api/appointments/YC-4821/cancel`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        cancelReason: 'Cannot make it',
        otpCode: '1111',
      }),
    });
    assert.equal(wrongOtpRes.status, 403);
    const wrongOtpBody = await wrongOtpRes.json();
    assert.match(wrongOtpBody.error, /incorrect/i);

    // 3. Unauthenticated request with CORRECT otpCode succeeds
    const correctOtpRes = await fetch(`${url}/api/appointments/YC-4821/cancel`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        cancelReason: 'Cannot make it',
        otpCode: '8822',
      }),
    });
    assert.equal(correctOtpRes.status, 200);
    const correctBody = await correctOtpRes.json();
    assert.equal(correctBody.message, 'Appointment cancelled successfully');
    assert.equal(correctBody.appointment.status, 'CANCELLED');
    assert.equal(cancelCalledWith.otpCode, '8822');
    assert.equal(cancelCalledWith.actorIsStaff, false);

    // 4. Staff token cancels WITHOUT needing otpCode
    const staffJwt = await staffToken(url);
    const staffRes = await fetch(`${url}/api/appointments/YC-4821/cancel`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${staffJwt}`,
      },
      body: JSON.stringify({ cancelReason: 'Clinician on leave' }),
    });
    assert.equal(staffRes.status, 200);
    assert.equal(cancelCalledWith.actorIsStaff, true);
    assert.equal(cancelCalledWith.otpCode, null);
  });

  it('PATCH /api/appointments/:id/cancel rejects expired OTP code', async () => {
    const service = {
      cancelAppointment: async (id, options) => {
        await assertAppointmentCancelOtp(mockAppointment, options);
        return {
          appointment: { ...mockAppointment, status: 'CANCELLED' },
        };
      },
    };

    const { url } = await client(service);

    // Store expired OTP
    await storeOtp({
      appointmentId: mockAppointment._id,
      referenceCode: mockAppointment.referenceCode,
      action: 'CANCEL',
      phone: mockAppointment.patientId.phone,
      code: '3344',
      ttlMs: -1000, // already expired
    });

    const res = await fetch(`${url}/api/appointments/YC-4821/cancel`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ otpCode: '3344' }),
    });

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.match(body.error, /expired/i);
  });
});
