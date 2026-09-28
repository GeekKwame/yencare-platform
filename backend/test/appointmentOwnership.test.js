import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';
import jwt from 'jsonwebtoken';

import { createStaffAuthService, DEMO_STAFF_PASSWORD } from '../src/auth/staffAuth.js';
import { createApp } from '../src/http/app.js';
import { createMemoryStore } from '../src/patients/memoryStore.js';
import { createPatientService } from '../src/patients/service.js';
import {
  assertAppointmentCancelOtp,
  assertAppointmentOwnership,
  assertAppointmentRescheduleOtp,
  assertNotInLiveQueue,
  LIVE_QUEUE_LOCKED_MESSAGE,
  OTP_REQUIRED_MESSAGE,
  OWNERSHIP_CHECK_FAILED_MESSAGE,
  PHONE_REQUIRED_MESSAGE,
  RESCHEDULE_OTP_REQUIRED_MESSAGE,
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

describe('forged staff tokens on cancel / reschedule', () => {
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

  // What an attacker would put in a self-made token: a real desk role and staffId.
  const forgedClaims = {
    sub: 'forged-sub',
    staffId: 'stf_01',
    name: 'Abena Osei',
    role: 'RECEPTIONIST',
    clinicSite: 'students-clinic',
  };

  function base64url(value) {
    return Buffer.from(JSON.stringify(value)).toString('base64url');
  }

  const forgedTokens = {
    // Primary case: a well-formed HS256 token signed with a secret the server does not hold.
    'signed with the wrong secret': jwt.sign(forgedClaims, 'attacker-chosen-secret', {
      expiresIn: '1h',
    }),
    'unsigned (alg: none)': `${base64url({ alg: 'none', typ: 'JWT' })}.${base64url(forgedClaims)}.`,
  };

  /**
   * Records the options the route resolved, then applies the real domain guards
   * the production cancel / reschedule services run first.
   */
  function recordingService() {
    /** @type {{ op: string, options: object }[]} */
    const seen = [];
    return {
      seen,
      service: {
        cancelAppointment: async (id, options) => {
          seen.push({ op: 'cancel', options });
          await assertAppointmentCancelOtp(bookedByAkosua, options);
          return { appointment: { referenceCode: 'YC-4821', status: 'CANCELLED' } };
        },
        rescheduleAppointment: async (id, options) => {
          seen.push({ op: 'reschedule', options });
          await assertAppointmentRescheduleOtp(bookedByAkosua, options);
          return {
            appointment: { referenceCode: 'YC-4821', status: 'BOOKED' },
            oldSlotId: '68bf2c0e9c1a2b0088888888',
            newSlotId: options.newSlotId,
          };
        },
      },
    };
  }

  async function client() {
    const recorder = recordingService();
    const instance = await startApp(recorder.service);
    started.push(instance);
    return { ...instance, seen: recorder.seen };
  }

  async function patch(url, action, { token, body } = {}) {
    return fetch(`${url}/api/appointments/YC-4821/${action}`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body || {}),
    });
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

  function assertTreatedAsPatient(options) {
    assert.equal(options.actorIsStaff, false);
    assert.equal(options.actorType, 'PATIENT');
    assert.equal(options.actorId, null);
    assert.equal(options.actingUserId, null);
  }

  for (const [label, token] of Object.entries(forgedTokens)) {
    describe(`a token ${label}`, () => {
      it('decodes to desk-staff claims but does not verify against the server secret', () => {
        // Guards against this suite passing for the wrong reason: the token must be
        // one a decode-only check would have accepted as RECEPTIONIST.
        assert.equal(jwt.decode(token)?.role, 'RECEPTIONIST');
        assert.throws(() => jwt.verify(token, TEST_SECRET));
      });

      it('reschedule without an OTP is refused with the OTP-required 403', async () => {
        const { url, seen } = await client();

        const res = await patch(url, 'reschedule', {
          token,
          body: { newSlotId: '68bf2c0e9c1a2b0099999999' },
        });

        assert.equal(res.status, 403);
        assert.equal((await res.json()).error, RESCHEDULE_OTP_REQUIRED_MESSAGE);
        assert.equal(seen.length, 1, 'request must reach the reschedule service');
        assertTreatedAsPatient(seen[0].options);
      });

      it('cancel without an OTP is refused with the OTP-required 403', async () => {
        const { url, seen } = await client();

        const res = await patch(url, 'cancel', { token, body: {} });

        assert.equal(res.status, 403);
        assert.equal((await res.json()).error, OTP_REQUIRED_MESSAGE);
        assert.equal(seen.length, 1, 'request must reach the cancel service');
        assertTreatedAsPatient(seen[0].options);
      });
    });
  }

  it('body actorType / actorId cannot claim a staff identity', async () => {
    const { url, seen } = await client();
    const spoof = { actorType: 'STAFF', actorId: 'stf_01', actingUserId: 'stf_01' };

    const cancelRes = await patch(url, 'cancel', { body: spoof });
    assert.equal(cancelRes.status, 403);
    assert.equal((await cancelRes.json()).error, OTP_REQUIRED_MESSAGE);

    // Reschedule without verified staff token is treated as patient and requires OTP
    const rescheduleRes = await patch(url, 'reschedule', {
      body: { ...spoof, newSlotId: '68bf2c0e9c1a2b0099999999', phone: '0241234567' },
    });
    assert.equal(rescheduleRes.status, 403);
    assert.equal((await rescheduleRes.json()).error, RESCHEDULE_OTP_REQUIRED_MESSAGE);

    assert.equal(seen.length, 2);
    for (const { options } of seen) assertTreatedAsPatient(options);
  });

  it('a verified staff token still cancels and reschedules without phone or OTP', async () => {
    const { url, seen } = await client();
    const token = await staffToken(url);

    const cancelRes = await patch(url, 'cancel', { token, body: {} });
    assert.equal(cancelRes.status, 200);

    const rescheduleRes = await patch(url, 'reschedule', {
      token,
      // A body actorId must not override the verified identity either.
      body: { newSlotId: '68bf2c0e9c1a2b0099999999', actorId: 'someone-else' },
    });
    assert.equal(rescheduleRes.status, 200);

    assert.deepEqual(seen.map(({ op }) => op), ['cancel', 'reschedule']);
    for (const { options } of seen) {
      assert.equal(options.actorIsStaff, true);
      assert.equal(options.actorType, 'STAFF');
      assert.equal(options.actorId, 'stf_01');
    }
  });
});
