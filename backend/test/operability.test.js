import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';

import { createApp } from '../src/http/app.js';
import { REQUEST_ID_HEADER } from '../src/http/requestId.js';
import { getLogLevel, logger, setLogLevel } from '../src/lib/logger.js';
import { createMemoryStore } from '../src/patients/memoryStore.js';
import { createPatientService } from '../src/patients/service.js';

/** Captures the JSON lines the logger writes. */
function captureLogs(run, { level = 'debug' } = {}) {
  const lines = [];
  const previousLevel = getLogLevel();
  const outWrite = process.stdout.write.bind(process.stdout);
  const errWrite = process.stderr.write.bind(process.stderr);

  const collect = (chunk) => {
    lines.push(String(chunk));
    return true;
  };

  setLogLevel(level);
  process.stdout.write = collect;
  process.stderr.write = collect;

  try {
    run();
  } finally {
    process.stdout.write = outWrite;
    process.stderr.write = errWrite;
    setLogLevel(previousLevel);
  }

  return lines.map((line) => JSON.parse(line));
}

function startApp(overrides = {}) {
  const app = createApp({
    patientService: createPatientService(createMemoryStore()),
    ...overrides,
  });

  return new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, url: `http://127.0.0.1:${port}` });
    });
  });
}

describe('structured logger', () => {
  it('writes one JSON line per event with level, time, message, and context', () => {
    const [entry] = captureLogs(() => {
      logger.info('booking created', { subsystem: 'booking', referenceCode: 'YC-4821' });
    });

    assert.equal(entry.level, 'info');
    assert.equal(entry.msg, 'booking created');
    assert.equal(entry.subsystem, 'booking');
    assert.equal(entry.referenceCode, 'YC-4821');
    assert.ok(!Number.isNaN(Date.parse(entry.time)));
  });

  it('unwraps Error context so stacks survive JSON serialization', () => {
    const [entry] = captureLogs(() => {
      const err = new Error('slot gone');
      err.status = 409;
      logger.error('booking failed', { err });
    });

    assert.equal(entry.level, 'error');
    assert.equal(entry.err.message, 'slot gone');
    assert.equal(entry.err.status, 409);
    assert.match(entry.err.stack, /slot gone/);
  });

  it('honours the active level and stays silent in tests by default', () => {
    const quiet = captureLogs(
      () => {
        logger.debug('noise');
        logger.warn('kept');
      },
      { level: 'warn' },
    );

    assert.equal(quiet.length, 1);
    assert.equal(quiet[0].msg, 'kept');
    assert.equal(getLogLevel(), 'silent');
  });

  it('supports bound child loggers for per-request context', () => {
    const [entry] = captureLogs(() => {
      logger.child({ requestId: 'req-1' }).warn('slow query', { ms: 900 });
    });

    assert.equal(entry.requestId, 'req-1');
    assert.equal(entry.ms, 900);
  });
});

describe('request ids and security headers', () => {
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

  async function client(overrides) {
    const instance = await startApp(overrides);
    started.push(instance);
    return instance;
  }

  it('assigns a request id header to every response', async () => {
    const { url } = await client();

    const res = await fetch(`${url}/health`);
    await res.json();

    const id = res.headers.get(REQUEST_ID_HEADER.toLowerCase());
    assert.match(id, /^[0-9a-f-]{36}$/);
  });

  it('reuses a caller-supplied request id', async () => {
    const { url } = await client();

    const res = await fetch(`${url}/health`, {
      headers: { 'x-request-id': 'edge-abc-123' },
    });
    await res.json();

    assert.equal(res.headers.get(REQUEST_ID_HEADER.toLowerCase()), 'edge-abc-123');
  });

  it('includes the request id in error-handler output', async () => {
    const { url } = await client({
      appointmentService: {
        createAppointment: async () => {
          throw new Error('mongo exploded');
        },
      },
    });

    const res = await fetch(`${url}/api/appointments`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-request-id': 'trace-me-1234' },
      body: JSON.stringify({}),
    });

    assert.equal(res.status, 500);
    const body = await res.json();

    assert.equal(body.error, 'Internal server error');
    assert.equal(body.requestId, 'trace-me-1234');
    assert.equal(res.headers.get(REQUEST_ID_HEADER.toLowerCase()), 'trace-me-1234');
  });

  it('carries the request id on 4xx responses too', async () => {
    const { url } = await client({
      appointmentService: {
        createAppointment: async () => {
          const err = new Error('patientId is required');
          err.status = 400;
          throw err;
        },
      },
    });

    const res = await fetch(`${url}/api/appointments`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error, 'patientId is required');
    assert.ok(body.requestId);
  });

  it('sets the Helmet baseline headers and hides Express', async () => {
    const { url } = await client();

    const res = await fetch(`${url}/health`);
    await res.json();

    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('x-frame-options'), 'DENY');
    assert.equal(res.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
    assert.equal(res.headers.get('x-dns-prefetch-control'), 'off');
    assert.equal(
      res.headers.get('permissions-policy'),
      'camera=(), microphone=(), geolocation=()',
    );
    assert.equal(res.headers.get('x-powered-by'), null);
    // HSTS is production-only.
    assert.equal(res.headers.get('strict-transport-security'), null);
  });
});
