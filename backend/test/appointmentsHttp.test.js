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
            server.close((err) =>
              err ? reject(err) : resolve(),
            );
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
          sms: {
            ok: true,
            id: 'mock-sms-1',
          },
        };
      },
    };

    const { url } = await client(mockService);

    const res = await fetch(`${url}/api/appointments`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
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
      headers: {
        'content-type': 'application/json',
      },
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

    const res = await fetch(
      `${url}/api/appointments/YC-4821`,
    );

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

    const res = await fetch(
      `${url}/api/appointments/YC-9999`,
    );

    assert.equal(res.status, 404);

    const body = await res.json();

    assert.equal(body.error, 'Appointment not found');
  });

  it('GET /api/appointments/lookup returns 200 for a matching reference', async () => {
    const mockService = {
      createAppointment: async () => {},
      lookupAppointment: async ({ reference }) => {
        if (reference === 'YC-4821') {
          return {
            id: '68bf2c0e9c1a2b0012345678',
            referenceCode: 'YC-4821',
            status: 'BOOKED',
          };
        }
        return null;
      },
    };

    const { url } = await client(mockService);
    const res = await fetch(
      `${url}/api/appointments/lookup?reference=YC-4821`,
    );

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.referenceCode, 'YC-4821');
  });

  it('GET /api/appointments/lookup returns 200 for student index search', async () => {
    const mockService = {
      createAppointment: async () => {},
      lookupAppointment: async ({ studentIndex, phone }) => {
        assert.equal(studentIndex, '20612345');
        assert.equal(phone, undefined);
        return {
          id: '68bf2c0e9c1a2b0012345678',
          referenceCode: 'YC-4821',
          status: 'BOOKED',
        };
      },
    };

    const { url } = await client(mockService);
    const res = await fetch(
      `${url}/api/appointments/lookup?studentIndex=20612345`,
    );

    assert.equal(res.status, 200);
    assert.equal((await res.json()).referenceCode, 'YC-4821');
  });

  it('GET /api/appointments/lookup returns 404 when not found', async () => {
    const mockService = {
      createAppointment: async () => {},
      lookupAppointment: async () => {
        const err = new Error('Appointment not found');
        err.status = 404;
        throw err;
      },
    };

    const { url } = await client(mockService);
    const res = await fetch(
      `${url}/api/appointments/lookup?phone=0241234567`,
    );

    assert.equal(res.status, 404);
    assert.equal((await res.json()).error, 'Appointment not found');
  });

  it('GET /api/appointments/lookup returns 400 when no search field is provided', async () => {
    const mockService = {
      createAppointment: async () => {},
      lookupAppointment: async () => {
        const err = new Error(
          'Provide a reference code, student index, or phone number',
        );
        err.status = 400;
        throw err;
      },
    };

    const { url } = await client(mockService);
    const res = await fetch(`${url}/api/appointments/lookup`);

    assert.equal(res.status, 400);
    assert.match((await res.json()).error, /reference code/i);
  });

  it('GET /api/appointments lists appointments filtered by date and clinicSite', async () => {
    const mockService = {
      createAppointment: async () => {},

      listAppointments: async (filters) => {
        assert.equal(filters.date, '2026-09-10');
        assert.equal(
          filters.clinicSite,
          'students-clinic',
        );

        return [
          {
            id: '68bf2c0e9c1a2b0012345678',
            referenceCode: 'YC-4821',
            status: 'BOOKED',
            clinicSite: 'students-clinic',
            appointmentDate: '2026-09-10',
            appointmentTime: '10:00',
            visitType: 'general-opd',
            patientId: {
              fullName: 'Akosua Boateng',
            },
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
        assert.equal(
          id,
          '68bf2c0e9c1a2b0012345678',
        );

        assert.equal(status, 'CHECKED_IN');

        return {
          id,
          referenceCode: 'YC-4821',
          status: 'CHECKED_IN',
        };
      },
    };

    const { url } = await client(mockService);

    const res = await fetch(
      `${url}/api/appointments/68bf2c0e9c1a2b0012345678/status`,
      {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          status: 'CHECKED_IN',
        }),
      },
    );

    assert.equal(res.status, 200);

    const body = await res.json();

    assert.equal(body.status, 'CHECKED_IN');
  });

  it('PATCH /api/appointments/:id/status returns 400 on illegal transition', async () => {
    const mockService = {
      createAppointment: async () => {},

      updateStatus: async () => {
        const err = new Error(
          'Illegal status transition: COMPLETED -> CHECKED_IN',
        );

        err.name = 'ValidationError';
        err.status = 400;

        throw err;
      },
    };

    const { url } = await client(mockService);

    const res = await fetch(
      `${url}/api/appointments/68bf2c0e9c1a2b0012345678/status`,
      {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          status: 'CHECKED_IN',
        }),
      },
    );

    assert.equal(res.status, 400);

    const body = await res.json();

    assert.match(
      body.error,
      /Illegal status transition/,
    );
  });

  it('POST /api/appointments rejects double-booking conflict with 409', async () => {
    const mockService = {
      createAppointment: async () => {
        const err = new Error(
          'This time slot is already booked for this clinician',
        );

        err.status = 409;

        throw err;
      },
    };

    const { url } = await client(mockService);

    const res = await fetch(
      `${url}/api/appointments`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          patientId: '68bf2c0e9c1a2b0012345670',
          clinicianId: '68bf2c0e9c1a2b0012345671',
          roomId: '68bf2c0e9c1a2b0012345672',
          clinicSite: 'students-clinic',
          visitType: 'general-opd',
          appointmentDate: '2026-09-15',
          appointmentTime: '11:00',
        }),
      },
    );

    assert.equal(res.status, 409);

    const body = await res.json();

    assert.match(
      body.error,
      /already booked/i,
    );
  });

  it('POST /api/appointments rejects student exceeding 2 active bookings with 409 and policy message', async () => {
    const mockService = {
      createAppointment: async () => {
        const err = new Error(
          'You have reached the maximum of 2 active appointments. Please complete or cancel existing visits.',
        );
        err.status = 409;
        err.name = 'ConflictError';
        throw err;
      },
    };

    const { url } = await client(mockService);

    const res = await fetch(`${url}/api/appointments`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        patientId: '68bf2c0e9c1a2b0012345670',
        studentIndex: '20612345',
        clinicianId: '68bf2c0e9c1a2b0012345671',
        roomId: '68bf2c0e9c1a2b0012345672',
        clinicSite: 'students-clinic',
        visitType: 'general-opd',
        appointmentDate: '2026-09-25',
        appointmentTime: '11:00',
      }),
    });

    assert.equal(res.status, 409);
    const body = await res.json();
    assert.equal(
      body.error,
      'You have reached the maximum of 2 active appointments. Please complete or cancel existing visits.',
    );
  });

  // ------------------------------------------------------------
  // CANCELLATION TESTS
  // ------------------------------------------------------------

  it('PATCH /api/appointments/:id/cancel cancels an appointment and releases its slot', async () => {
    const mockService = {
      createAppointment: async () => {},

      cancelAppointment: async (id, options) => {
        assert.equal(
          id,
          '68bf2c0e9c1a2b0012345678',
        );

        assert.equal(
          options.cancelReason,
          'Patient unavailable',
        );

        return {
          appointment: {
            id,
            referenceCode: 'YC-4821',
            status: 'CANCELLED',
            cancelledTime: '2026-09-15T10:30:00.000Z',
            cancelReason: 'Patient unavailable',
          },
          releasedSlotId: '68bf2c0e9c1a2b0099999999',
          cancelledTime: '2026-09-15T10:30:00.000Z',
        };
      },
    };

    const { url } = await client(mockService);

    const res = await fetch(
      `${url}/api/appointments/68bf2c0e9c1a2b0012345678/cancel`,
      {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          cancelReason: 'Patient unavailable',
        }),
      },
    );

    assert.equal(res.status, 200);

    const body = await res.json();

    assert.equal(
      body.message,
      'Appointment cancelled successfully',
    );

    assert.equal(
      body.appointment.status,
      'CANCELLED',
    );

    assert.equal(
      body.appointment.cancelReason,
      'Patient unavailable',
    );

    assert.equal(
      body.releasedSlotId,
      '68bf2c0e9c1a2b0099999999',
    );

    assert.ok(body.cancelledTime);
  });

  it('PATCH /api/appointments/:id/cancel returns 400 when appointment cannot be cancelled', async () => {
    const mockService = {
      createAppointment: async () => {},

      cancelAppointment: async () => {
        const err = new Error(
          'Appointment cannot be cancelled when status is CHECKED_IN',
        );

        err.status = 400;

        throw err;
      },
    };

    const { url } = await client(mockService);

    const res = await fetch(
      `${url}/api/appointments/68bf2c0e9c1a2b0012345678/cancel`,
      {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({}),
      },
    );

    assert.equal(res.status, 400);

    const body = await res.json();

    assert.match(
      body.error,
      /cannot be cancelled/i,
    );
  });

  it('PATCH /api/appointments/:id/cancel returns 400 for an already cancelled appointment', async () => {
    const mockService = {
      createAppointment: async () => {},

      cancelAppointment: async () => {
        const err = new Error(
          'Appointment is already cancelled',
        );

        err.status = 400;

        throw err;
      },
    };

    const { url } = await client(mockService);

    const res = await fetch(
      `${url}/api/appointments/68bf2c0e9c1a2b0012345678/cancel`,
      {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({}),
      },
    );

    assert.equal(res.status, 400);

    const body = await res.json();

    assert.match(
      body.error,
      /already cancelled/i,
    );
  });

  // ------------------------------------------------------------
  // RESCHEDULE TESTS
  // ------------------------------------------------------------

  it('PATCH /api/appointments/:id/reschedule reschedules to a new slot', async () => {
    const mockService = {
      createAppointment: async () => {},

      rescheduleAppointment: async (id, options) => {
        assert.equal(
          id,
          '68bf2c0e9c1a2b0012345678',
        );

        assert.equal(
          options.newSlotId,
          '68bf2c0e9c1a2b0099999999',
        );

        return {
          appointment: {
            id,
            referenceCode: 'YC-4821',
            status: 'BOOKED',
            timeSlotId: '68bf2c0e9c1a2b0099999999',
            appointmentDate: '2026-09-16',
            appointmentTime: '11:00',
          },
          oldSlotId: '68bf2c0e9c1a2b0088888888',
          newSlotId: '68bf2c0e9c1a2b0099999999',
          sms: { ok: true, provider: 'mock', to: '+233241234567' },
        };
      },
    };

    const { url } = await client(mockService);

    const res = await fetch(
      `${url}/api/appointments/68bf2c0e9c1a2b0012345678/reschedule`,
      {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          newSlotId:
            '68bf2c0e9c1a2b0099999999',
        }),
      },
    );

    assert.equal(res.status, 200);

    const body = await res.json();

    assert.equal(
      body.message,
      'Appointment rescheduled successfully',
    );

    assert.equal(
      body.oldSlotId,
      '68bf2c0e9c1a2b0088888888',
    );

    assert.equal(
      body.newSlotId,
      '68bf2c0e9c1a2b0099999999',
    );

    assert.equal(
      body.appointment.timeSlotId,
      '68bf2c0e9c1a2b0099999999',
    );

    assert.equal(body.sms.ok, true);
  });

  it('PATCH /api/appointments/:id/reschedule returns 400 when new slot is already booked', async () => {
    const mockService = {
      createAppointment: async () => {},

      rescheduleAppointment: async () => {
        const err = new Error(
          'The selected time slot is already booked',
        );

        err.status = 400;

        throw err;
      },
    };

    const { url } = await client(mockService);

    const res = await fetch(
      `${url}/api/appointments/68bf2c0e9c1a2b0012345678/reschedule`,
      {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          newSlotId:
            '68bf2c0e9c1a2b0099999999',
        }),
      },
    );

    assert.equal(res.status, 400);

    const body = await res.json();

    assert.match(
      body.error,
      /already booked/i,
    );
  });

  it('PATCH /api/appointments/:id/reschedule returns 400 when appointment is already completed', async () => {
    const mockService = {
      createAppointment: async () => {},

      rescheduleAppointment: async () => {
        const err = new Error(
          'Appointment cannot be rescheduled when status is COMPLETED',
        );

        err.status = 400;

        throw err;
      },
    };

    const { url } = await client(mockService);

    const res = await fetch(
      `${url}/api/appointments/68bf2c0e9c1a2b0012345678/reschedule`,
      {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          newSlotId:
            '68bf2c0e9c1a2b0099999999',
        }),
      },
    );

    assert.equal(res.status, 400);

    const body = await res.json();

    assert.match(
      body.error,
      /cannot be rescheduled/i,
    );
  });
});
