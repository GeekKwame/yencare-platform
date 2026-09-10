import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';
import { createApp } from '../src/http/app.js';
import { createMemoryStore } from '../src/patients/memoryStore.js';
import { createPatientService } from '../src/patients/service.js';

function startApp(mockService) {
  const app = createApp({
    patientService: createPatientService(createMemoryStore()),
    appointmentService: mockService,
  });
  return new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({
        server,
        url: `http://127.0.0.1:${port}`,
      });
    });
  });
}

describe('appointments HTTP', () => {
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

  async function client(mockService) {
    const instance = await startApp(mockService);
    started.push(instance);
    return instance;
  }

  it('POST /api/appointments creates appointment and returns 201 with SMS status', async () => {
    const mockService = {
      createAppointment: async (data) => {
        if (!data.patientId || !data.clinicianId) {
          const err = new Error('Validation failed');
          err.name = 'ValidationError';
          throw err;
        }
        return {
          appointment: {
            id: '68bf2c0e9c1a2b0012345678',
            referenceCode: 'YC-4821',
            patientId: data.patientId,
            clinicianId: data.clinicianId,
            roomId: data.roomId,
            clinicSite: data.clinicSite,
            visitType: data.visitType,
            appointmentDate: data.appointmentDate,
            appointmentTime: data.appointmentTime,
            status: 'BOOKED',
          },
          sms: { ok: true, id: 'mock-sms-1' },
        };
      },
    };

    const { url } = await client(mockService);
    const res = await fetch(`${url}/api/appointments`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        patientId: '68bf2c0e9c1a2b0012345670',
        clinicianId: '68bf2c0e9c1a2b0012345671',
        roomId: '68bf2c0e9c1a2b0012345672',
        clinicSite: 'students-clinic',
        visitType: 'general-opd',
        appointmentDate: '2026-09-15',
        appointmentTime: '10:00',
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.referenceCode, 'YC-4821');
    assert.equal(body.status, 'BOOKED');
    assert.equal(body.sms.ok, true);
  });

  it('POST /api/appointments returns 400 on validation error', async () => {
    const mockService = {
      createAppointment: async () => {
        const err = new Error('patientId is required');
        err.name = 'ValidationError';
        throw err;
      },
    };

    const { url } = await client(mockService);
    const res = await fetch(`${url}/api/appointments`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.ok(body.error.includes('patientId is required'));
  });

  it('GET /api/appointments/:reference returns 200 for matching reference', async () => {
    const mockService = {
      createAppointment: async () => {},
      findByReference: async (ref) => {
        if (ref === 'YC-4821') {
          return {
            id: '68bf2c0e9c1a2b0012345678',
            referenceCode: 'YC-4821',
            status: 'BOOKED',
            appointmentDate: '2026-09-15',
            appointmentTime: '10:00',
          };
        }
        return null;
      },
    };

    const { url } = await client(mockService);
    const res = await fetch(`${url}/api/appointments/YC-4821`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.referenceCode, 'YC-4821');
  });

  it('GET /api/appointments/:reference returns 404 when not found', async () => {
    const mockService = {
      createAppointment: async () => {},
      findByReference: async () => null,
    };

    const { url } = await client(mockService);
    const res = await fetch(`${url}/api/appointments/YC-9999`);
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.error, 'Appointment not found');
  });

  it('GET /api/appointments lists appointments filtered by date and clinicSite', async () => {
    const mockService = {
      createAppointment: async () => {},
      listAppointments: async (filters) => {
        assert.equal(filters.date, '2026-09-10');
        assert.equal(filters.clinicSite, 'students-clinic');
        return [
          {
            id: '68bf2c0e9c1a2b0012345678',
            referenceCode: 'YC-4821',
            status: 'BOOKED',
            clinicSite: 'students-clinic',
            appointmentDate: '2026-09-10',
            appointmentTime: '10:00',
            visitType: 'general-opd',
            patientId: { fullName: 'Akosua Boateng' },
          },
        ];
      },
    };

    const { url } = await client(mockService);
    const res = await fetch(
      `${url}/api/appointments?date=2026-09-10&clinicSite=students-clinic`,
    );
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.length, 1);
    assert.equal(body[0].referenceCode, 'YC-4821');
  });

  it('PATCH /api/appointments/:id/status transitions BOOKED to CHECKED_IN', async () => {
    const mockService = {
      createAppointment: async () => {},
      updateStatus: async (id, status) => {
        assert.equal(id, '68bf2c0e9c1a2b0012345678');
        assert.equal(status, 'CHECKED_IN');
        return {
          id,
          referenceCode: 'YC-4821',
          status: 'CHECKED_IN',
        };
      },
    };

    const { url } = await client(mockService);
    const res = await fetch(`${url}/api/appointments/68bf2c0e9c1a2b0012345678/status`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'CHECKED_IN' }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'CHECKED_IN');
  });

  it('PATCH /api/appointments/:id/status returns 400 on illegal transition', async () => {
    const mockService = {
      createAppointment: async () => {},
      updateStatus: async () => {
        const err = new Error('Illegal status transition: COMPLETED → CHECKED_IN');
        err.name = 'ValidationError';
        err.status = 400;
        throw err;
      },
    };

    const { url } = await client(mockService);
    const res = await fetch(`${url}/api/appointments/68bf2c0e9c1a2b0012345678/status`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'CHECKED_IN' }),
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /Illegal status transition/);
  });

  it('POST /api/appointments rejects double-booking conflict with 409', async () => {
    const mockService = {
      createAppointment: async () => {
        const err = new Error('This time slot is already booked for this clinician');
        err.status = 409;
        throw err;
      },
    };

    const { url } = await client(mockService);
    const res = await fetch(`${url}/api/appointments`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        patientId: '68bf2c0e9c1a2b0012345670',
        clinicianId: '68bf2c0e9c1a2b0012345671',
        roomId: '68bf2c0e9c1a2b0012345672',
        clinicSite: 'students-clinic',
        visitType: 'general-opd',
        appointmentDate: '2026-09-15',
        appointmentTime: '11:00',
      }),
    });

    assert.equal(res.status, 409);
    const body = await res.json();
    assert.match(body.error, /already booked/i);
  });
});
