import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';
import express from 'express';
import jwt from 'jsonwebtoken';

import {
  createMemoryRateLimitStore,
  getRateLimitStore,
  resetRateLimitStore,
  setRateLimitStore,
} from '../src/http/rateLimitStore.js';
import { createStaffAuthService, DEMO_STAFF_PASSWORD } from '../src/auth/staffAuth.js';
import { arrivalReferenceKey, queueStatusReferenceKey } from '../src/http/app.js';
import { createAuthRouter } from '../src/http/authRoutes.js';
import { createPatientsRouter } from '../src/http/patientsRoutes.js';
import { createMemoryStore } from '../src/patients/memoryStore.js';
import { createPatientService } from '../src/patients/service.js';
import {
  rateLimit,
  rateLimitDisableRequested,
  rateLimitEnabled,
  TOO_MANY_REQUESTS_MESSAGE,
} from '../src/http/security.js';

function startLimited(middleware) {
  const app = express();
  app.get('/probe/:reference', middleware, (_req, res) => res.status(200).json({ ok: true }));

  return new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, url: `http://127.0.0.1:${port}` });
    });
  });
}

describe('public endpoint rate limiting', () => {
  /** @type {{ server: import('node:http').Server }[]} */
  const started = [];

  after(async () => {
    resetRateLimitStore();
    await Promise.all(
      started.map(
        ({ server }) =>
          new Promise((resolve, reject) => {
            server.close((err) => (err ? reject(err) : resolve()));
          }),
      ),
    );
  });

  async function client(middleware) {
    const instance = await startLimited(middleware);
    started.push(instance);
    return instance;
  }

  it('returns 429 once the configured threshold is exceeded', async () => {
    const { url } = await client(
      rateLimit({
        name: 'probe',
        windowMs: 60_000,
        max: 3,
        store: createMemoryRateLimitStore(),
      }),
    );

    const statuses = [];
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const res = await fetch(`${url}/probe/YC-000${attempt}`);
      statuses.push(res.status);
      if (res.status === 429) {
        assert.equal((await res.json()).error, TOO_MANY_REQUESTS_MESSAGE);
        assert.ok(Number(res.headers.get('retry-after')) > 0);
      } else {
        await res.json();
      }
    }

    assert.deepEqual(statuses, [200, 200, 200, 429, 429]);
  });

  it('keys per reference when asked, so one code cannot be hammered', async () => {
    const { url } = await client(
      rateLimit({
        name: 'probe-reference',
        windowMs: 60_000,
        max: 2,
        store: createMemoryRateLimitStore(),
        keyGenerator: (req) => `${req.ip}|${req.params.reference}`,
      }),
    );

    const same = [];
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const res = await fetch(`${url}/probe/YC-4821`);
      same.push(res.status);
      await res.text();
    }
    assert.deepEqual(same, [200, 200, 429]);

    // A different reference has its own budget.
    const other = await fetch(`${url}/probe/YC-9999`);
    await other.text();
    assert.equal(other.status, 200);
  });

  it('is disabled during test runs and enabled elsewhere', () => {
    assert.equal(rateLimitEnabled(), false);
    assert.equal(rateLimitEnabled({ NODE_ENV: 'production' }), true);
    assert.equal(rateLimitEnabled({}), true);
    assert.equal(rateLimitEnabled({ NODE_ENV: 'test' }), false);
    assert.equal(rateLimitEnabled({ NODE_ENV: 'development', RATE_LIMIT_DISABLED: 'true' }), false);
    assert.equal(rateLimitEnabled({ RATE_LIMIT_DISABLED: 'TRUE' }), false);
  });

  it('cannot be switched off in production', () => {
    for (const flag of ['true', 'TRUE', 'True']) {
      assert.equal(rateLimitEnabled({ NODE_ENV: 'production', RATE_LIMIT_DISABLED: flag }), true);
    }
    assert.equal(rateLimitDisableRequested({ NODE_ENV: 'production', RATE_LIMIT_DISABLED: 'true' }), true);
    assert.equal(rateLimitDisableRequested({ NODE_ENV: 'production' }), false);
  });

  it('uses the installed store, so a shared store can replace the buckets', async () => {
    const calls = [];
    const shared = {
      kind: 'fake-shared',
      shared: true,
      hit(key, options) {
        calls.push({ key, options });
        return { allowed: calls.length < 2, count: calls.length, retryAfterMs: 5_000 };
      },
    };

    setRateLimitStore(shared);
    assert.equal(getRateLimitStore().kind, 'fake-shared');

    const { url } = await client(rateLimit({ name: 'shared', windowMs: 60_000, max: 99 }));

    const first = await fetch(`${url}/probe/YC-4821`);
    await first.text();
    const second = await fetch(`${url}/probe/YC-4821`);
    await second.text();

    assert.equal(first.status, 200);
    assert.equal(second.status, 429);
    assert.equal(second.headers.get('retry-after'), '5');
    assert.equal(calls.length, 2);
    assert.match(calls[0].key, /^shared:/);
    assert.equal(calls[0].options.max, 99);

    resetRateLimitStore();
    assert.equal(getRateLimitStore().kind, 'memory');
  });

  it('fails open when the store throws, instead of taking the API down', async () => {
    const { url } = await client(
      rateLimit({
        name: 'broken',
        store: {
          kind: 'broken',
          shared: true,
          hit() {
            throw new Error('store offline');
          },
        },
      }),
    );

    const res = await fetch(`${url}/probe/YC-4821`);
    assert.equal(res.status, 200);
    await res.text();
  });

  it('memory store drains its window so a client that backs off recovers', () => {
    const store = createMemoryRateLimitStore();
    const options = { windowMs: 1_000, max: 2 };

    assert.equal(store.hit('ip', { ...options, now: 0 }).allowed, true);
    assert.equal(store.hit('ip', { ...options, now: 10 }).allowed, true);

    const blocked = store.hit('ip', { ...options, now: 20 });
    assert.equal(blocked.allowed, false);
    assert.ok(blocked.retryAfterMs > 0);

    assert.equal(store.hit('ip', { ...options, now: 1_500 }).allowed, true);
  });

  it('blocks arrival check-in after 5 attempts per IP/reference (anti-brute-force)', async () => {
    // Simulate the two-layer arrival limiter wired in app.js:
    //   layer 1 — per-IP ceiling (generous)
    //   layer 2 — per-IP+reference cap (strict: max 5 per 15 min)
    const arrivalLimiter = [
      rateLimit({
        name: 'arrival-ip',
        windowMs: 15 * 60_000,
        max: 30,
        store: createMemoryRateLimitStore(),
      }),
      rateLimit({
        name: 'arrival-reference',
        windowMs: 15 * 60_000,
        max: 5,
        store: createMemoryRateLimitStore(),
        keyGenerator: arrivalReferenceKey,
      }),
    ];

    const app = express();
    app.use(express.json());
    // Both public arrival routes, same as appointmentsRoutes.js
    const handler = (_req, res) => res.status(200).json({ status: 'CHECKED_IN' });
    app.post('/api/appointments/arrive', arrivalLimiter, handler);
    app.post('/api/appointments/:reference/arrive', arrivalLimiter, handler);

    const instance = await new Promise((resolve) => {
      const server = app.listen(0, '127.0.0.1', () => {
        const { port } = server.address();
        resolve({ server, url: `http://127.0.0.1:${port}` });
      });
    });
    started.push(instance);
    const { url } = instance;

    // 5 attempts against the same reference should all succeed.
    const statuses = [];
    for (let i = 0; i < 6; i += 1) {
      const res = await fetch(`${url}/api/appointments/YC-4821/arrive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '0241234567' }),
      });
      statuses.push(res.status);
      if (res.status === 429) {
        const body = await res.json();
        assert.equal(body.error, TOO_MANY_REQUESTS_MESSAGE);
        assert.ok(Number(res.headers.get('retry-after')) > 0);
      } else {
        await res.json();
      }
    }

    assert.deepEqual(statuses, [200, 200, 200, 200, 200, 429],
      'requests 1-5 should succeed, request 6 should be rate-limited');

    // A different reference still has its own budget.
    const otherRef = await fetch(`${url}/api/appointments/arrive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reference: 'YC-9999', phone: '0241234567' }),
    });
    await otherRef.json();
    assert.equal(otherRef.status, 200,
      'a different reference should not be blocked');
  });
});

describe('reference normalisation in the per-reference limiter keys', () => {
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

  async function listen(app) {
    const instance = await new Promise((resolve) => {
      const server = app.listen(0, '127.0.0.1', () => {
        resolve({ server, url: `http://127.0.0.1:${server.address().port}` });
      });
    });
    started.push(instance);
    return instance.url;
  }

  it('builds the same key for every spelling of one reference', () => {
    const ip = '10.0.0.7';
    const arrivalKeys = [
      { ip, body: { reference: 'YC-4821' } },
      { ip, body: { reference: '  yc-4821\t' } },
      { ip, body: { referenceCode: ' YC-4821' } },
      { ip, body: {}, params: { reference: 'yc-4821 ' } },
    ].map(arrivalReferenceKey);
    assert.deepEqual(new Set(arrivalKeys), new Set([`${ip}|YC-4821`]));

    assert.equal(queueStatusReferenceKey({ ip, params: { reference: ' yc-4821 ' } }), `${ip}|YC-4821`);
  });

  it('gives whitespace and case variants of an arrival reference one shared budget', async () => {
    const limiter = rateLimit({
      name: 'arrival-reference',
      windowMs: 15 * 60_000,
      max: 5,
      store: createMemoryRateLimitStore(),
      keyGenerator: arrivalReferenceKey,
    });
    const app = express();
    app.use(express.json());
    const handler = (_req, res) => res.status(200).json({ ok: true });
    app.post('/api/appointments/arrive', limiter, handler);
    app.post('/api/appointments/:reference/arrive', limiter, handler);
    const url = await listen(app);

    const byBody = (reference) =>
      fetch(`${url}/api/appointments/arrive`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reference }),
      });
    const byPath = (reference) =>
      fetch(`${url}/api/appointments/${encodeURIComponent(reference)}/arrive`, { method: 'POST' });

    const statuses = [];
    for (const send of [
      () => byBody('YC-0001'),
      () => byBody(' YC-0001'),
      () => byBody('YC-0001 '),
      () => byBody('\tyc-0001'),
      () => byPath(' yc-0001 '),
    ]) {
      statuses.push((await send()).status);
    }
    assert.deepEqual(statuses, [200, 200, 200, 200, 200]);

    const blocked = await byBody('  YC-0001  ');
    assert.equal(blocked.status, 429);
    assert.equal((await blocked.json()).error, TOO_MANY_REQUESTS_MESSAGE);
    assert.ok(Number(blocked.headers.get('retry-after')) > 0);

    assert.equal((await byBody('YC-0002')).status, 200);
  });

  it('gives whitespace and case variants of a queue-status reference one shared budget', async () => {
    const limiter = rateLimit({
      name: 'queue-status-reference',
      windowMs: 60_000,
      max: 3,
      store: createMemoryRateLimitStore(),
      keyGenerator: queueStatusReferenceKey,
    });
    const app = express();
    app.get('/api/appointments/:reference/queue-status', limiter, (_req, res) => res.json({ ok: true }));
    const url = await listen(app);

    const poll = (reference) =>
      fetch(`${url}/api/appointments/${encodeURIComponent(reference)}/queue-status`);

    const statuses = [];
    for (const reference of ['YC-0001', ' yc-0001', 'yc-0001 ', 'YC-0001']) {
      statuses.push((await poll(reference)).status);
    }
    assert.deepEqual(statuses, [200, 200, 200, 429]);
  });
});

describe('public patient registration rate limiting', () => {
  /** @type {import('node:http').Server[]} */
  const servers = [];

  after(async () => {
    await Promise.all(
      servers.map(
        (server) =>
          new Promise((resolve, reject) => {
            server.close((err) => (err ? reject(err) : resolve()));
          }),
      ),
    );
  });

  async function startRegistration() {
    const staffAuth = createStaffAuthService({
      jwtSecret: 'rate-limit-test-staff-secret',
      demoPassword: DEMO_STAFF_PASSWORD,
    });
    const app = express();
    app.use(express.json());
    app.use('/api/auth', createAuthRouter(staffAuth));
    app.use(
      '/api/patients',
      createPatientsRouter(createPatientService(createMemoryStore()), {
        authenticate: staffAuth.authenticate,
        authenticateOptional: staffAuth.authenticateOptional,
        publicRegisterLimiter: rateLimit({
          name: 'patient-register-public',
          windowMs: 15 * 60_000,
          max: 10,
          store: createMemoryRateLimitStore(),
        }),
      }),
    );
    const server = await new Promise((resolve) => {
      const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
    });
    servers.push(server);
    return `http://127.0.0.1:${server.address().port}`;
  }

  it('allows 10 public registrations per IP per 15 minutes, without counting or limiting verified reception', async () => {
    const url = await startRegistration();
    const login = await fetch(`${url}/api/auth/staff-login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ identifier: 'abena.osei@yencare.gh', password: DEMO_STAFF_PASSWORD }),
    });
    const reception = (await login.json()).token;
    const forged = jwt.sign({ sub: 'x', staffId: 'stf_01', role: 'RECEPTIONIST' }, 'attacker-chosen-secret');
    const patient = { fullName: 'Efua Darko', studentIndex: '20620111', phoneNumber: '024 700 1122' };
    const register = (token) =>
      fetch(`${url}/api/patients`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(patient),
      });

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const res = await register(reception);
      assert.equal(res.status, attempt === 0 ? 201 : 200);
      await res.json();
    }

    const statuses = [];
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const res = await register(null);
      statuses.push(res.status);
      await res.json();
    }
    assert.deepEqual(statuses, Array(10).fill(200));

    for (const token of [null, forged]) {
      const blocked = await register(token);
      assert.equal(blocked.status, 429);
      assert.equal((await blocked.json()).error, TOO_MANY_REQUESTS_MESSAGE);
      assert.ok(Number(blocked.headers.get('retry-after')) > 0);
    }

    const desk = await register(reception);
    assert.equal(desk.status, 200);
    assert.equal((await desk.json()).fullName, 'Efua Darko');
  });
});
