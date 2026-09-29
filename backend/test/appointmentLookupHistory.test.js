import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';

import { createApp } from '../src/http/app.js';
import { createMemoryStore } from '../src/patients/memoryStore.js';
import { createPatientService } from '../src/patients/service.js';

const cancelled = {
  id: '68bf2c0e9c1a2b0012345678',
  referenceCode: 'YC-4821',
  status: 'CANCELLED',
  appointmentDate: '2026-09-15',
  appointmentTime: '10:00',
  cancelledTime: '2026-09-14T09:00:00.000Z',
  patientId: { fullName: 'Akosua Boateng', phone: '+233241234567' },
};

const activeReplacement = {
  id: '68bf2c0e9c1a2b0012349999',
  referenceCode: 'YC-7734',
  status: 'BOOKED',
  appointmentDate: '2026-09-18',
  appointmentTime: '09:30',
  patientId: { fullName: 'Akosua Boateng', phone: '+233241234567' },
};

function startApp(appointmentService) {
  const app = createApp({
    patientService: createPatientService(createMemoryStore()),
    appointmentService: {
      createAppointment: async () => ({ appointment: {}, sms: {} }),
      ...appointmentService,
    },
  });

  return new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, url: `http://127.0.0.1:${port}` });
    });
  });
}

describe('reference lookup flags superseded appointments', () => {
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

  async function client(appointmentService) {
    const instance = await startApp(appointmentService);
    started.push(instance);
    return instance;
  }

  /**
   * @param {object} appointment
   * @param {object | null} active
   */
  function serviceFor(appointment, active) {
    return {
      findByReference: async () => appointment,
      lookupAppointment: async () => appointment,
      findActiveAppointmentForPatient: async () => active,
    };
  }

  const endpoints = [
    [
      'GET /api/appointments/:reference',
      (url) =>
        `${url}/api/appointments/YC-4821`,
    ],
    [
      'GET /api/appointments/lookup',
      (url) =>
        `${url}/api/appointments/lookup?reference=YC-4821`,
    ],
  ];

  for (const [label, buildUrl] of endpoints) {
    it(`${label} marks a cancelled reference historical and returns the active one`, async () => {
      const { url } = await client(serviceFor(cancelled, activeReplacement));

      const res = await fetch(buildUrl(url), { headers: { 'x-booking-phone': '0241234567' } });
      assert.equal(res.status, 200);
      const body = await res.json();

      // Still the appointment itself at the top level.
      assert.equal(body.referenceCode, 'YC-4821');
      assert.equal(body.status, 'CANCELLED');

      assert.equal(body.isHistorical, true);
      assert.equal(body.supersededBy.referenceCode, 'YC-7734');
      assert.equal(body.supersededBy.status, 'BOOKED');
      assert.equal(body.supersededBy.appointmentDate, '2026-09-18');
      // Same serialized shape, but never recursive.
      assert.equal(body.supersededBy.isHistorical, false);
      assert.equal(body.supersededBy.supersededBy, null);
    });

    it(`${label} returns supersededBy null when the patient has no active booking`, async () => {
      const { url } = await client(serviceFor(cancelled, null));

      const res = await fetch(buildUrl(url), { headers: { 'x-booking-phone': '0241234567' } });
      const body = await res.json();

      assert.equal(body.isHistorical, true);
      assert.equal(body.supersededBy, null);
    });

    it(`${label} leaves an active reference unflagged`, async () => {
      const { url } = await client(serviceFor({ ...activeReplacement }, activeReplacement));

      const res = await fetch(buildUrl(url), { headers: { 'x-booking-phone': '0241234567' } });
      const body = await res.json();

      assert.equal(body.status, 'BOOKED');
      assert.equal(body.isHistorical, false);
      assert.equal(body.supersededBy, null);
    });
  }

  it('treats NO_SHOW and COMPLETED as historical too', async () => {
    for (const status of ['NO_SHOW', 'COMPLETED']) {
      const { url } = await client(serviceFor({ ...cancelled, status }, activeReplacement));

      const res = await fetch(
        `${url}/api/appointments/YC-4821`,
        { headers: { 'x-booking-phone': '0241234567' } },
      );
      const body = await res.json();

      assert.equal(body.isHistorical, true, `${status} should be historical`);
      assert.equal(body.supersededBy.referenceCode, 'YC-7734');
    }
  });

  it('does not query for a replacement when the reference is live', async () => {
    let calls = 0;
    const { url } = await client({
      findByReference: async () => ({ ...activeReplacement }),
      findActiveAppointmentForPatient: async () => {
        calls += 1;
        return null;
      },
    });

    const res = await fetch(
      `${url}/api/appointments/YC-7734`,
      { headers: { 'x-booking-phone': '0241234567' } },
    );
    await res.json();

    assert.equal(calls, 0);
  });

  it('still returns the appointment when the replacement lookup fails', async () => {
    const { url } = await client({
      findByReference: async () => cancelled,
      findActiveAppointmentForPatient: async () => {
        throw new Error('mongo unavailable');
      },
    });

    const res = await fetch(
      `${url}/api/appointments/YC-4821`,
      { headers: { 'x-booking-phone': '0241234567' } },
    );
    assert.equal(res.status, 200);
    const body = await res.json();

    assert.equal(body.referenceCode, 'YC-4821');
    assert.equal(body.isHistorical, true);
    assert.equal(body.supersededBy, null);
  });
});
