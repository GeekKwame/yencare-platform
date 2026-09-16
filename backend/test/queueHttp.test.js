import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';
import { createApp } from '../src/http/app.js';
import { createMemoryStore } from '../src/patients/memoryStore.js';
import { createPatientService } from '../src/patients/service.js';

function startApp({ mockAppointmentService = {}, mockQueueService = {} } = {}) {
  const app = createApp({
    patientService: createPatientService(createMemoryStore()),
    appointmentService: mockAppointmentService,
    queueService: mockQueueService,
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

describe('queue HTTP endpoints', () => {
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

  async function client(services) {
    const instance = await startApp(services);
    started.push(instance);
    return instance;
  }

  it('POST /api/queue/call-next calls next FIFO patient and returns token', async () => {
    const mockQueue = {
      callNextPatient: async ({ roomId }) => {
        if (!roomId) {
          const err = new Error('roomId is required');
          err.status = 400;
          throw err;
        }
        return {
          appointment: {
            id: 'app-1',
            referenceCode: 'YC-4821',
            status: 'CALLED',
            queueToken: 'A-01',
          },
          queueToken: 'A-01',
          room: { id: roomId, name: 'Room 1' },
          message: 'Called token A-01 into Room 1',
        };
      },
    };

    const { url } = await client({ mockQueueService: mockQueue });

    const res = await fetch(`${url}/api/queue/call-next`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId: 'room-1' }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.queueToken, 'A-01');
    assert.equal(body.appointment.status, 'CALLED');
    assert.equal(body.room.name, 'Room 1');
  });

  it('POST /api/queue/call-next returns 409 conflict when room already has active consultation', async () => {
    const mockQueue = {
      callNextPatient: async () => {
        const err = new Error('Room 1 currently has an active consultation. Complete or mark no-show first.');
        err.status = 409;
        throw err;
      },
    };

    const { url } = await client({ mockQueueService: mockQueue });

    const res = await fetch(`${url}/api/queue/call-next`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId: 'room-1' }),
    });

    assert.equal(res.status, 409);
    const body = await res.json();
    assert.match(body.error, /active consultation/i);
  });

  it('POST /api/queue/advance advances appointment through state machine', async () => {
    const mockQueue = {
      advanceQueue: async ({ referenceCode }) => {
        return {
          appointment: {
            id: 'app-1',
            referenceCode,
            status: 'CHECKED_IN',
            queueToken: 'A-01',
          },
          message: `Appointment ${referenceCode} advanced to CHECKED_IN`,
        };
      },
    };

    const { url } = await client({ mockQueueService: mockQueue });

    const res = await fetch(`${url}/api/queue/advance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ referenceCode: 'YC-4821' }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.appointment.status, 'CHECKED_IN');
    assert.equal(body.appointment.queueToken, 'A-01');
  });

  it('POST /api/queue/no-show transitions appointment to NO_SHOW', async () => {
    const mockQueue = {
      markNoShow: async ({ referenceCode }) => {
        return {
          appointment: {
            id: 'app-1',
            referenceCode,
            status: 'NO_SHOW',
          },
          message: `Appointment ${referenceCode} marked as no-show`,
        };
      },
    };

    const { url } = await client({ mockQueueService: mockQueue });

    const res = await fetch(`${url}/api/queue/no-show`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ referenceCode: 'YC-4821', reason: 'Did not respond to call' }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.appointment.status, 'NO_SHOW');
  });

  it('GET /api/appointments/:reference/queue-status returns real-time position, estimated wait, and room token', async () => {
    const mockAppointmentService = {
      getQueueStatus: async (ref) => {
        if (ref !== 'YC-4821') {
          const err = new Error('Appointment not found');
          err.status = 404;
          throw err;
        }
        return {
          referenceCode: 'YC-4821',
          status: 'WAITING',
          queueToken: 'A-02',
          position: 2,
          patientsAhead: 1,
          estimatedWaitMinutes: 15,
          roomToken: 'A-01',
          nowServingToken: 'A-01',
          room: { id: 'room-1', name: 'Room 1', clinicSite: 'students-clinic' },
          clinician: { id: 'doc-1', name: 'Dr. Kwame Boateng' },
        };
      },
    };

    const { url } = await client({ mockAppointmentService });

    const res = await fetch(`${url}/api/appointments/YC-4821/queue-status`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.referenceCode, 'YC-4821');
    assert.equal(body.status, 'WAITING');
    assert.equal(body.queueToken, 'A-02');
    assert.equal(body.position, 2);
    assert.equal(body.patientsAhead, 1);
    assert.equal(body.estimatedWaitMinutes, 15);
    assert.equal(body.roomToken, 'A-01');
    assert.equal(body.room.name, 'Room 1');
  });

  it('GET /api/appointments/:reference/queue-status returns 404 when appointment does not exist', async () => {
    const mockAppointmentService = {
      getQueueStatus: async () => {
        const err = new Error('Appointment not found');
        err.status = 404;
        throw err;
      },
    };

    const { url } = await client({ mockAppointmentService });

    const res = await fetch(`${url}/api/appointments/YC-9999/queue-status`);
    assert.equal(res.status, 404);
  });

  it('GET /api/queue/activity returns public now-serving token and waiting count', async () => {
    const mockQueue = {
      getClinicActivity: async (clinicSite) => ({
        clinicSite: clinicSite || 'students-clinic',
        nowServingToken: '#2',
        waitingCount: 3,
        estimatedWaitMinutes: 25,
        rooms: [{ name: 'Room 1', nowServingToken: '#2' }],
      }),
    };

    const { url } = await client({ mockQueueService: mockQueue });
    const res = await fetch(`${url}/api/queue/activity?clinicSite=students-clinic`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.nowServingToken, '#2');
    assert.equal(body.waitingCount, 3);
    assert.equal(body.estimatedWaitMinutes, 25);
    assert.equal(body.rooms[0].name, 'Room 1');
  });
});
