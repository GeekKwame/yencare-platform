import assert from 'node:assert/strict';
import { after, afterEach, describe, it } from 'node:test';
import cors from 'cors';
import express from 'express';
import jwt from 'jsonwebtoken';

import { createStaffAuthService, DEMO_STAFF_PASSWORD } from '../src/auth/staffAuth.js';
import { createApp } from '../src/http/app.js';
import {
  BOOKING_PHONE_HEADER,
  LOOKUP_NOT_MATCHED_MESSAGE,
  LOOKUP_PHONE_REQUIRED_MESSAGE,
} from '../src/http/appointmentsRoutes.js';
import { buildCorsOptions } from '../src/http/corsOrigins.js';
import { getLogLevel, logger, setLogLevel } from '../src/lib/logger.js';
import { redactUrl } from '../src/lib/redact.js';
import { Appointment } from '../src/models/Appointment.js';
import { createMemoryStore } from '../src/patients/memoryStore.js';
import { createPatientService } from '../src/patients/service.js';
import { lookupAppointment } from '../src/services/appointmentOps.js';
import { getQueueStatus } from '../src/services/queueEngine.js';

const TEST_SECRET = 'lookup-privacy-test-secret';
const STORED_PHONE = '+233241234567';
const PHONE_DIGITS = '241234567';

const booking = {
  _id: '68bf2c0e9c1a2b0012345678',
  id: '68bf2c0e9c1a2b0012345678',
  referenceCode: 'YC-4821',
  status: 'CHECKED_IN',
  appointmentDate: '2026-09-30',
  appointmentTime: '10:00',
  clinicSite: 'students-clinic',
  notes: 'Asthma review',
  queueToken: null,
  roomId: { _id: '68bf2c0e9c1a2b00000000aa', name: 'Room 2', clinicSite: 'students-clinic' },
  clinicianId: { _id: '68bf2c0e9c1a2b00000000bb', name: 'Dr. Ama Serwaa', title: 'Medical Officer' },
  patientId: {
    fullName: 'Akosua Boateng',
    phone: STORED_PHONE,
    studentIndex: '20612345',
    nhisNumber: 'NH-445566',
  },
};

const originals = {
  findByReference: Appointment.findByReference,
  findOne: Appointment.findOne,
  countDocuments: Appointment.countDocuments,
};

function stubAppointments() {
  Appointment.findByReference = async (ref) => (ref === booking.referenceCode ? booking : null);
  Appointment.findOne = async () => null;
  Appointment.countDocuments = async () => 0;
}

function restoreAppointments() {
  Appointment.findByReference = originals.findByReference;
  Appointment.findOne = originals.findOne;
  Appointment.countDocuments = originals.countDocuments;
}

const servers = [];

async function startApp() {
  const app = createApp({
    patientService: createPatientService(createMemoryStore()),
    appointmentService: {
      createAppointment: async () => ({ appointment: {}, sms: {} }),
      lookupAppointment,
      findByReference: (ref) => Appointment.findByReference(ref),
      getQueueStatus,
    },
    staffAuth: createStaffAuthService({ jwtSecret: TEST_SECRET, demoPassword: DEMO_STAFF_PASSWORD }),
  });
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  servers.push(server);
  return `http://127.0.0.1:${server.address().port}`;
}

async function captureLogLines(run) {
  const lines = [];
  const previousLevel = getLogLevel();
  const outWrite = process.stdout.write;
  const errWrite = process.stderr.write;
  const collect = (original) =>
    function write(chunk, ...rest) {
      const text = String(chunk);
      try {
        const parsed = JSON.parse(text);
        if (parsed && typeof parsed === 'object' && 'level' in parsed && 'msg' in parsed) {
          lines.push(text);
          return true;
        }
      } catch {
        /* not a logger line */
      }
      return original.call(this, chunk, ...rest);
    };

  setLogLevel('debug');
  process.stdout.write = collect(outWrite);
  process.stderr.write = collect(errWrite);
  try {
    await run();
  } finally {
    process.stdout.write = outWrite;
    process.stderr.write = errWrite;
    setLogLevel(previousLevel);
  }
  return lines;
}

async function statusAndError(res) {
  const body = await res.json();
  return { status: res.status, error: body.error };
}

describe('public appointment lookup privacy', () => {
  afterEach(restoreAppointments);
  after(async () => {
    await Promise.all(servers.map((server) => new Promise((resolve) => server.close(resolve))));
  });

  it('public lookup without phone is refused, whether or not the reference exists', async () => {
    stubAppointments();
    const url = await startApp();

    const known = await statusAndError(await fetch(`${url}/api/appointments/YC-4821`));
    const unknown = await statusAndError(await fetch(`${url}/api/appointments/YC-0001`));
    const search = await statusAndError(await fetch(`${url}/api/appointments/lookup?reference=YC-4821`));

    assert.deepEqual(known, { status: 400, error: LOOKUP_PHONE_REQUIRED_MESSAGE });
    assert.deepEqual(unknown, known);
    assert.deepEqual(search, known);
  });

  it('a phone in the query string does not unlock a public lookup', async () => {
    stubAppointments();
    const url = await startApp();

    const res = await fetch(`${url}/api/appointments/YC-4821?phone=${encodeURIComponent(STORED_PHONE)}`);

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.patientId, undefined);
    assert.equal(body.error, LOOKUP_PHONE_REQUIRED_MESSAGE);
  });

  it('unknown reference and wrong phone get identical responses', async () => {
    stubAppointments();
    const url = await startApp();
    const withPhone = (phone) => ({ headers: { [BOOKING_PHONE_HEADER]: phone } });

    const wrongPhone = await statusAndError(await fetch(`${url}/api/appointments/YC-4821`, withPhone('0209998877')));
    const unknownRef = await statusAndError(await fetch(`${url}/api/appointments/YC-0001`, withPhone('0241234567')));
    const searchWrong = await statusAndError(await fetch(`${url}/api/appointments/lookup?reference=YC-4821`, withPhone('0209998877')));
    const searchUnknown = await statusAndError(await fetch(`${url}/api/appointments/lookup?reference=YC-0001`, withPhone('0241234567')));

    assert.deepEqual(wrongPhone, { status: 404, error: LOOKUP_NOT_MATCHED_MESSAGE });
    assert.deepEqual(unknownRef, wrongPhone);
    assert.deepEqual(searchWrong, wrongPhone);
    assert.deepEqual(searchUnknown, wrongPhone);

    const ok = await fetch(`${url}/api/appointments/YC-4821`, withPhone('024 123 4567'));
    assert.equal(ok.status, 200);
    assert.equal((await ok.json()).referenceCode, 'YC-4821');
  });

  it('staff still look up by reference alone', async () => {
    stubAppointments();
    const url = await startApp();
    const token = jwt.sign({ sub: 'stf_01', staffId: 'stf_01', role: 'RECEPTIONIST' }, TEST_SECRET);

    const res = await fetch(`${url}/api/appointments/YC-4821`, {
      headers: { authorization: `Bearer ${token}` },
    });

    assert.equal(res.status, 200);
    assert.equal((await res.json()).referenceCode, 'YC-4821');
  });

  it('I\'ve arrived response carries no personal details', async () => {
    const app = createApp({
      patientService: createPatientService(createMemoryStore()),
      appointmentService: {
        createAppointment: async () => ({ appointment: {}, sms: {} }),
        markPatientArrived: async () => booking,
      },
    });
    const server = await new Promise((resolve) => {
      const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
    });
    servers.push(server);

    const res = await fetch(`http://127.0.0.1:${server.address().port}/api/appointments/YC-4821/arrive`, {
      method: 'POST',
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.referenceCode, 'YC-4821');
    assert.equal(body.status, 'CHECKED_IN');
    const text = JSON.stringify(body);
    for (const secret of ['Akosua', PHONE_DIGITS, '20612345', 'NH-445566', 'Asthma', 'patientId']) {
      assert.ok(!text.includes(secret), `arrival response leaked ${secret}`);
    }
  });

  it('queue status by reference returns schedule and queue fields but no personal details', async () => {
    stubAppointments();
    const url = await startApp();

    const res = await fetch(`${url}/api/appointments/YC-4821/queue-status`);
    assert.equal(res.status, 200);
    const body = await res.json();

    assert.equal(body.status, 'CHECKED_IN');
    assert.equal(body.appointmentDate, '2026-09-30');
    assert.equal(body.appointmentTime, '10:00');
    assert.equal(body.clinicSite, 'students-clinic');
    const text = JSON.stringify(body);
    for (const secret of ['Akosua', PHONE_DIGITS, '20612345', 'NH-445566', 'Asthma', 'patientId', 'notes']) {
      assert.ok(!text.includes(secret), `queue status leaked ${secret}`);
    }
  });
});

describe('booking phone header across origins', () => {
  const corsServers = [];
  after(async () => {
    await Promise.all(corsServers.map((server) => new Promise((resolve) => server.close(resolve))));
  });

  it('production CORS lets the Vercel frontend send X-Booking-Phone, and refuses other origins', async () => {
    const productionEnv = {
      NODE_ENV: 'production',
      CORS_ORIGIN: 'https://yencare-platform.vercel.app',
      CORS_ALLOW_VERCEL_PREVIEWS: 'true',
    };
    const app = express();
    app.use(cors(buildCorsOptions(productionEnv)));
    app.get('/api/appointments/:reference', (_req, res) => res.json({ ok: true }));
    const server = await new Promise((resolve) => {
      const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
    });
    corsServers.push(server);
    const url = `http://127.0.0.1:${server.address().port}/api/appointments/YC-4821`;
    const preflight = (origin) =>
      fetch(url, {
        method: 'OPTIONS',
        headers: {
          origin,
          'access-control-request-method': 'GET',
          'access-control-request-headers': 'x-booking-phone',
        },
      });

    for (const origin of ['https://yencare-platform.vercel.app', 'https://yencare-platform-git-fix-abc.vercel.app']) {
      const res = await preflight(origin);
      assert.equal(res.status, 204);
      assert.equal(res.headers.get('access-control-allow-origin'), origin);
      assert.match(res.headers.get('access-control-allow-headers') || '', /x-booking-phone/i);
    }

    const blocked = await preflight('https://evil.example.com');
    assert.equal(blocked.headers.get('access-control-allow-origin'), null);
    const local = await preflight('http://localhost:5173');
    assert.equal(local.headers.get('access-control-allow-origin'), null);
  });
});

describe('patient phone numbers stay out of the logs', () => {
  after(async () => {
    await Promise.all(servers.map((server) => new Promise((resolve) => server.close(resolve))));
  });

  it('patient phone never appears in a logged line', async () => {
    stubAppointments();
    const url = await startApp();
    const token = jwt.sign({ sub: 'stf_01', staffId: 'stf_01', role: 'RECEPTIONIST' }, TEST_SECRET);

    const lines = await captureLogLines(async () => {
      await fetch(`${url}/api/appointments/lookup?reference=YC-48&phone=${encodeURIComponent('0241234567')}`, {
        headers: { [BOOKING_PHONE_HEADER]: '0241234567' },
      });
      await fetch(`${url}/api/appointments/lookup?reference=YC-4821&phoneNumber=0241234567&studentIndex=20612345`, {
        headers: { authorization: `Bearer ${token}` },
      });
      await fetch(`${url}/api/patients/0241234567`, { headers: { authorization: `Bearer ${token}` } });
      logger.info('mock SMS dispatched', { to: STORED_PHONE, path: '/x?phone=0241234567' });
    });
    restoreAppointments();

    assert.ok(lines.length >= 3, `expected logged lines, got ${lines.length}`);
    for (const line of lines) {
      assert.ok(!line.includes(PHONE_DIGITS), `phone leaked into log: ${line.slice(0, 200)}`);
      assert.ok(!line.includes('20612345'), `student index leaked into log: ${line.slice(0, 200)}`);
    }
  });

  it('logged paths hide phone numbers, student indexes and other sensitive query values', () => {
    assert.equal(
      redactUrl('/api/appointments/lookup?reference=YC-4821&phone=0241234567'),
      '/api/appointments/lookup?reference=YC-4821&phone=[redacted]',
    );
    assert.equal(redactUrl('/api/patients/%2B233241234567'), '/api/patients/[redacted]');
    assert.equal(redactUrl('/api/patients/20612345'), '/api/patients/[redacted]');
    assert.equal(redactUrl('/api/appointments/YC-4821/queue-status'), '/api/appointments/YC-4821/queue-status');
    assert.equal(redactUrl('/api/appointments?date=2026-09-30&clinicSite=students-clinic'), '/api/appointments?date=2026-09-30&clinicSite=students-clinic');
    assert.equal(redactUrl('/api/x?otpCode=1234&studentIndex=20612345'), '/api/x?otpCode=[redacted]&studentIndex=[redacted]');
    assert.equal(
      redactUrl('/api/x?nhisNumber=NH-1&token=abc&password=secret&phoneNumber=0241234567'),
      '/api/x?nhisNumber=[redacted]&token=[redacted]&password=[redacted]&phoneNumber=[redacted]',
    );
  });

  it('logged paths keep the booking reference so support can trace a request', () => {
    assert.equal(
      redactUrl('/api/appointments/lookup?reference=YC-4821&referenceCode=YC-4821&phone=0241234567'),
      '/api/appointments/lookup?reference=YC-4821&referenceCode=YC-4821&phone=[redacted]',
    );
    assert.equal(redactUrl('/api/appointments/YC-4821/arrive'), '/api/appointments/YC-4821/arrive');
  });
});
