import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';
import { createStaffAuthService, DEMO_STAFF_PASSWORD } from '../src/auth/staffAuth.js';
import { createApp } from '../src/http/app.js';
import { createMemoryStore } from '../src/patients/memoryStore.js';
import { createPatientService } from '../src/patients/service.js';

const TEST_SECRET = 'test-staff-jwt-secret';

function startApp({ mockAppointmentService = {}, mockQueueService = {} } = {}) {
  const staffAuth = createStaffAuthService({
    jwtSecret: TEST_SECRET,
    demoPassword: DEMO_STAFF_PASSWORD,
  });

  const app = createApp({
    patientService: createPatientService(createMemoryStore()),
    appointmentService: {
      createAppointment: async () => ({ appointment: {}, sms: {} }),
      listAppointments: async () => [
        {
          id: '68bf2c0e9c1a2b0012345678',
          referenceCode: 'YC-4821',
          status: 'BOOKED',
        },
      ],
      updateStatus: async (_id, status) => ({
        id: '68bf2c0e9c1a2b0012345678',
        status,
      }),
      ...mockAppointmentService,
    },
    queueService: {
      callNextPatient: async () => ({
        appointment: { status: 'CALLED', queueToken: 'A-01' },
        room: { name: 'Room 1' },
        message: 'Called token A-01 into Room 1',
      }),
      advanceQueue: async () => ({
        appointment: { status: 'COMPLETED' },
        message: 'Completed',
      }),
      markNoShow: async () => ({
        appointment: { status: 'NO_SHOW' },
        message: 'No-show',
      }),
      ...mockQueueService,
    },
    staffAuth,
  });

  return new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({
        server,
        url: `http://127.0.0.1:${port}`,
        staffAuth,
      });
    });
  });
}

describe('staff auth HTTP', () => {
  /** @type {{ server: import('node:http').Server, url: string }[]} */
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

  async function client(overrides) {
    const instance = await startApp(overrides);
    started.push(instance);
    return instance;
  }

  async function loginAs(url, identifier) {
    const res = await fetch(`${url}/api/auth/staff-login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        identifier,
        password: DEMO_STAFF_PASSWORD,
      }),
    });
    assert.equal(res.status, 200);
    return res.json();
  }

  it('POST /api/auth/staff-login issues a JWT and staff profile', async () => {
    const { url } = await client();
    const body = await loginAs(url, 'abena.osei@yencare.gh');

    assert.ok(body.token);
    assert.equal(body.staff.name, 'Abena Osei');
    assert.equal(body.staff.role, 'RECEPTIONIST');
    assert.equal(body.staff.clinicSite, 'students-clinic');
    assert.equal(body.staff.assignedRoom, null);
  });

  it('POST /api/auth/staff-login accepts Staff ID', async () => {
    const { url } = await client();
    const body = await loginAs(url, 'stf_02');

    assert.equal(body.staff.name, 'Dr. Kwame Boateng');
    assert.equal(body.staff.role, 'DOCTOR');
    assert.equal(body.staff.assignedRoom, 'Room 1');
  });

  it('POST /api/auth/staff-login returns 401 for a bad password', async () => {
    const { url } = await client();
    const res = await fetch(`${url}/api/auth/staff-login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        identifier: 'abena.osei@yencare.gh',
        password: 'wrong-password',
      }),
    });

    assert.equal(res.status, 401);
    const body = await res.json();
    assert.match(body.error, /invalid staff credentials/i);
  });

  it('POST /api/auth/staff-login returns 400 when credentials are missing', async () => {
    const { url } = await client();
    const res = await fetch(`${url}/api/auth/staff-login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ identifier: 'abena.osei@yencare.gh' }),
    });

    assert.equal(res.status, 400);
  });

  it('GET /api/auth/staff-me returns the authenticated staff member', async () => {
    const { url } = await client();
    const { token } = await loginAs(url, 'kojo.mensah@yencare.gh');

    const res = await fetch(`${url}/api/auth/staff-me`, {
      headers: { authorization: `Bearer ${token}` },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.staff.role, 'ADMIN');
    assert.equal(body.staff.name, 'Kojo Mensah');
  });

  it('GET /api/appointments requires a staff token when auth is enabled', async () => {
    const { url } = await client();
    const res = await fetch(`${url}/api/appointments?date=2026-09-15`);
    assert.equal(res.status, 401);
  });

  it('GET /api/appointments succeeds with a receptionist token', async () => {
    const { url } = await client();
    const { token } = await loginAs(url, 'abena.osei@yencare.gh');

    const res = await fetch(`${url}/api/appointments?date=2026-09-15`, {
      headers: { authorization: `Bearer ${token}` },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body[0].referenceCode, 'YC-4821');
  });

  it('PATCH /api/appointments/:id/status forbids doctors', async () => {
    const { url } = await client();
    const { token } = await loginAs(url, 'kwame.boateng@yencare.gh');

    const res = await fetch(
      `${url}/api/appointments/68bf2c0e9c1a2b0012345678/status`,
      {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'CHECKED_IN' }),
      },
    );

    assert.equal(res.status, 403);
  });

  it('POST /api/queue/call-next forbids receptionists and allows doctors', async () => {
    const { url } = await client();
    const desk = await loginAs(url, 'abena.osei@yencare.gh');
    const doctor = await loginAs(url, 'stf_02');

    const denied = await fetch(`${url}/api/queue/call-next`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${desk.token}`,
      },
      body: JSON.stringify({ roomId: '68bf2c0e9c1a2b0012345671' }),
    });
    assert.equal(denied.status, 403);

    const allowed = await fetch(`${url}/api/queue/call-next`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${doctor.token}`,
      },
      body: JSON.stringify({ roomId: '68bf2c0e9c1a2b0012345671' }),
    });
    assert.equal(allowed.status, 200);
  });

  it('POST /api/queue/advance is doctor-only', async () => {
    const { url } = await client();
    const admin = await loginAs(url, 'kojo.mensah@yencare.gh');

    const res = await fetch(`${url}/api/queue/advance`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${admin.token}`,
      },
      body: JSON.stringify({ appointmentId: '68bf2c0e9c1a2b0012345678' }),
    });

    assert.equal(res.status, 403);
  });

  it('POST /api/queue/call-next forbids a doctor from calling another doctor clinicianId', async () => {
    const { url } = await client();
    const doctor = await loginAs(url, 'stf_02');

    const res = await fetch(`${url}/api/queue/call-next`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${doctor.token}`,
      },
      body: JSON.stringify({
        roomId: '68bf2c0e9c1a2b0012345671',
        clinicianId: '68bf2c0e9c1a2b0099999999',
      }),
    });

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.match(body.error, /only call patients who booked a consultation with them/i);
  });

  it('POST /api/queue/call-next automatically injects authenticated doctor clinicianId', async () => {
    let capturedClinicianId = null;
    const mockQueue = {
      callNextPatient: async ({ clinicianId }) => {
        capturedClinicianId = clinicianId;
        return {
          appointment: { status: 'CALLED', queueToken: 'A-01' },
          room: { name: 'Room 1' },
          message: 'Called token A-01 into Room 1',
        };
      },
    };

    const { url } = await client({ mockQueueService: mockQueue });
    const doctor = await loginAs(url, 'stf_02');

    const res = await fetch(`${url}/api/queue/call-next`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${doctor.token}`,
      },
      body: JSON.stringify({ roomId: '68bf2c0e9c1a2b0012345671' }),
    });

    assert.equal(res.status, 200);
    assert.equal(capturedClinicianId, '68bf2c0e9c1a2b0012345671');
  });

  it('POST /api/queue/advance forbids a doctor from advancing another doctor consultation', async () => {
    const { url } = await client();
    const doctor = await loginAs(url, 'stf_02');

    const res = await fetch(`${url}/api/queue/advance`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${doctor.token}`,
      },
      body: JSON.stringify({
        appointmentId: '68bf2c0e9c1a2b0012345678',
        clinicianId: '68bf2c0e9c1a2b0099999999',
      }),
    });

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.match(body.error, /only advance appointments booked for their consultation/i);
  });
});
