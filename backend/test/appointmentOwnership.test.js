import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';

import { createStaffAuthService, DEMO_STAFF_PASSWORD } from '../src/auth/staffAuth.js';
import { createApp } from '../src/http/app.js';
import { createMemoryStore } from '../src/patients/memoryStore.js';
import { createPatientService } from '../src/patients/service.js';
import {
  assertAppointmentOwnership,
  assertNotInLiveQueue,
  LIVE_QUEUE_LOCKED_MESSAGE,
  OWNERSHIP_CHECK_FAILED_MESSAGE,
  PHONE_REQUIRED_MESSAGE,
} from '../src/services/appointmentOps.js';

const TEST_SECRET = 'test-staff-jwt-secret';

const bookedByAkosua = {
  _id: '68bf2c0e9c1a2b0012345678',
  referenceCode: 'YC-4821',
  status: 'BOOKED',
  patientId: { fullName: 'Akosua Boateng', phone: '+233241234567' },
};

function startApp(appointmentService) {
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

describe('appointment ownership proof (patient cancel / reschedule)', () => {
  it('lets authenticated staff through without a phone number', () => {
    assert.doesNotThrow(() =>
      assertAppointmentOwnership(bookedByAkosua, { actorIsStaff: true }),
    );
    assert.doesNotThrow(() =>
      assertAppointmentOwnership(bookedByAkosua, { actorIsStaff: true, phone: null }),
    );
  });

  it('accepts the phone the appointment was booked with, in any Ghana format', () => {
    for (const phone of ['0241234567', '241234567', '+233241234567', '024 123 4567']) {
      assert.doesNotThrow(
        () => assertAppointmentOwnership(bookedByAkosua, { phone }),
        `should accept ${phone}`,
      );
    }
  });

  it('rejects a wrong phone number with 403', () => {
    try {
      assertAppointmentOwnership(bookedByAkosua, { phone: '0209998888' });
      assert.fail('expected a ForbiddenError');
    } catch (err) {
      assert.equal(err.name, 'ForbiddenError');
      assert.equal(err.status, 403);
      assert.equal(err.message, OWNERSHIP_CHECK_FAILED_MESSAGE);
    }
  });

  it('rejects a missing phone number with 403', () => {
    for (const phone of [undefined, null, '', '   ']) {
      try {
        assertAppointmentOwnership(bookedByAkosua, { phone });
        assert.fail('expected a ForbiddenError');
      } catch (err) {
        assert.equal(err.status, 403);
        assert.equal(err.message, PHONE_REQUIRED_MESSAGE);
      }
    }
  });

  it('does not reveal whether a reference exists', () => {
    const unknownReference = () => assertAppointmentOwnership(null, { phone: '0241234567' });
    const wrongPhone = () =>
      assertAppointmentOwnership(bookedByAkosua, { phone: '0209998888' });

    assert.throws(unknownReference, { status: 403, message: OWNERSHIP_CHECK_FAILED_MESSAGE });
    assert.throws(wrongPhone, { status: 403, message: OWNERSHIP_CHECK_FAILED_MESSAGE });
  });

  it('rejects an unusable phone number with the same generic message', () => {
    assert.throws(() => assertAppointmentOwnership(bookedByAkosua, { phone: '12345' }), {
      status: 403,
      message: OWNERSHIP_CHECK_FAILED_MESSAGE,
    });
  });
});

describe('live queue lock (WAITING cancel / reschedule gap)', () => {
  it('blocks patient-initiated changes once the patient is WAITING', () => {
    assert.throws(() => assertNotInLiveQueue({ status: 'WAITING' }), {
      name: 'ValidationError',
      status: 400,
      message: LIVE_QUEUE_LOCKED_MESSAGE,
    });
    assert.match(LIVE_QUEUE_LOCKED_MESSAGE, /reception/i);
  });

  it('still allows staff to fix a WAITING appointment', () => {
    assert.doesNotThrow(() =>
      assertNotInLiveQueue({ status: 'WAITING' }, { actorIsStaff: true }),
    );
  });

  it('leaves BOOKED appointments alone for patients', () => {
    assert.doesNotThrow(() => assertNotInLiveQueue({ status: 'BOOKED' }));
  });
});

describe('cancel / reschedule HTTP ownership wiring', () => {
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

  /** Mock service that enforces the real domain guards against a fixed appointment. */
  function guardedService(appointment) {
    const handle = (id, options) => {
      assertAppointmentOwnership(appointment, options);
      assertNotInLiveQueue(appointment, options);
      return {
        appointment: { ...appointment, patientId: undefined, status: 'CANCELLED' },
        releasedSlotId: '68bf2c0e9c1a2b0099999999',
        cancelledTime: new Date().toISOString(),
        oldSlotId: '68bf2c0e9c1a2b0088888888',
        newSlotId: '68bf2c0e9c1a2b0099999999',
        seenOptions: options,
      };
    };

    return {
      cancelAppointment: async (id, options) => handle(id, options),
      rescheduleAppointment: async (id, options) => handle(id, options),
    };
  }

  async function cancel(url, { token, body } = {}) {
    return fetch(`${url}/api/appointments/YC-4821/cancel`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body || {}),
    });
  }

  it('a staff token cancels without a phone number', async () => {
    /** @type {object[]} */
    const seen = [];
    const { url } = await client({
      cancelAppointment: async (id, options) => {
        seen.push(options);
        assertAppointmentOwnership(bookedByAkosua, options);
        return { appointment: { referenceCode: 'YC-4821', status: 'CANCELLED' } };
      },
    });

    const res = await cancel(url, { token: await staffToken(url) });

    assert.equal(res.status, 200);
    assert.equal(seen[0].actorIsStaff, true);
    assert.equal(seen[0].phone, null);
  });

  it('an unauthenticated caller with the correct phone succeeds', async () => {
    const { url } = await client(guardedService(bookedByAkosua));

    const res = await cancel(url, { body: { phone: '0241234567' } });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.message, 'Appointment cancelled successfully');
  });

  it('an unauthenticated caller with the wrong phone gets 403', async () => {
    const { url } = await client(guardedService(bookedByAkosua));

    const res = await cancel(url, { body: { phone: '0209998888' } });

    assert.equal(res.status, 403);
    assert.equal((await res.json()).error, OWNERSHIP_CHECK_FAILED_MESSAGE);
  });

  it('an unauthenticated caller with no phone gets 403', async () => {
    const { url } = await client(guardedService(bookedByAkosua));

    const res = await cancel(url, { body: {} });

    assert.equal(res.status, 403);
    assert.equal((await res.json()).error, PHONE_REQUIRED_MESSAGE);
  });

  it('a stale or invalid staff token falls back to the patient phone path', async () => {
    const { url } = await client(guardedService(bookedByAkosua));

    const denied = await cancel(url, { token: 'not-a-real-token', body: {} });
    assert.equal(denied.status, 403);

    const allowed = await cancel(url, {
      token: 'not-a-real-token',
      body: { phone: '0241234567' },
    });
    assert.equal(allowed.status, 200);
  });

  it('reschedule enforces the same ownership rule', async () => {
    const { url } = await client(guardedService(bookedByAkosua));

    const denied = await fetch(`${url}/api/appointments/YC-4821/reschedule`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ newSlotId: '68bf2c0e9c1a2b0099999999' }),
    });
    assert.equal(denied.status, 403);

    const allowed = await fetch(`${url}/api/appointments/YC-4821/reschedule`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        newSlotId: '68bf2c0e9c1a2b0099999999',
        phone: '+233241234567',
      }),
    });
    assert.equal(allowed.status, 200);
  });

  it('a WAITING patient is blocked but reception is not', async () => {
    const waiting = { ...bookedByAkosua, status: 'WAITING' };
    const { url } = await client(guardedService(waiting));

    const blocked = await cancel(url, { body: { phone: '0241234567' } });
    assert.equal(blocked.status, 400);
    assert.match((await blocked.json()).error, /live queue/i);

    const allowed = await cancel(url, { token: await staffToken(url) });
    assert.equal(allowed.status, 200);
  });
});
