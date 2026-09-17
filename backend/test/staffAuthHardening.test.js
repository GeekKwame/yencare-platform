import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';
import mongoose from 'mongoose';

import {
  createStaffAuthService,
  demoStaffAllowed,
  DEMO_STAFF_PASSWORD,
  STAFF_AUTH_UNAVAILABLE_MESSAGE,
} from '../src/auth/staffAuth.js';
import { createApp } from '../src/http/app.js';
import { StaffUser } from '../src/models/StaffUser.js';
import { createMemoryStore } from '../src/patients/memoryStore.js';
import { createPatientService } from '../src/patients/service.js';

const TEST_SECRET = 'test-staff-jwt-secret';

function startApp() {
  const staffAuth = createStaffAuthService({
    jwtSecret: TEST_SECRET,
    demoPassword: DEMO_STAFF_PASSWORD,
  });

  const app = createApp({
    patientService: createPatientService(createMemoryStore()),
    staffAuth,
  });

  return new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, url: `http://127.0.0.1:${port}`, staffAuth });
    });
  });
}

/**
 * Pretends Mongo is connected and answers `StaffUser.findOne` with `respond`,
 * so the fail-closed path can be exercised without a database.
 */
async function withFakeMongo(respond, run) {
  const realFindOne = StaffUser.findOne;
  const descriptor = Object.getOwnPropertyDescriptor(mongoose.connection, 'readyState');

  Object.defineProperty(mongoose.connection, 'readyState', {
    value: 1,
    configurable: true,
  });
  StaffUser.findOne = respond;

  try {
    return await run();
  } finally {
    StaffUser.findOne = realFindOne;
    delete mongoose.connection.readyState;
    if (descriptor) {
      Object.defineProperty(mongoose.connection, 'readyState', descriptor);
    }
  }
}

describe('staff auth demo-account policy', () => {
  it('never allows in-memory demo accounts in production', () => {
    assert.equal(demoStaffAllowed({ NODE_ENV: 'production' }), false);
    assert.equal(
      demoStaffAllowed({ NODE_ENV: 'production', STAFF_SEED_DEMO: 'true' }),
      false,
    );
  });

  it('allows demo accounts locally unless seeding is switched off', () => {
    assert.equal(demoStaffAllowed({}), true);
    assert.equal(demoStaffAllowed({ NODE_ENV: 'development' }), true);
    assert.equal(demoStaffAllowed({ STAFF_SEED_DEMO: 'false' }), false);
  });
});

describe('staff auth fails closed on database errors', () => {
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

  async function client() {
    const instance = await startApp();
    started.push(instance);
    return instance;
  }

  async function login(url, password = DEMO_STAFF_PASSWORD) {
    return fetch(`${url}/api/auth/staff-login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ identifier: 'abena.osei@yencare.gh', password }),
    });
  }

  it('answers 503 instead of falling back to demo accounts when Mongo errors', async () => {
    const { url } = await client();

    const res = await withFakeMongo(
      () => {
        throw new Error('connection reset by peer');
      },
      () => login(url),
    );

    assert.equal(res.status, 503);
    assert.equal((await res.json()).error, STAFF_AUTH_UNAVAILABLE_MESSAGE);
  });

  it('does not fall back to demo accounts when Mongo answers with no user', async () => {
    const { url } = await client();

    const res = await withFakeMongo(
      async () => null,
      () => login(url),
    );

    assert.equal(res.status, 401);
    assert.match((await res.json()).error, /invalid staff credentials/i);
  });

  it('keeps the local demo-account experience when there is no database', async () => {
    const { url } = await client();

    const res = await login(url);
    assert.equal(res.status, 200);
    assert.equal((await res.json()).staff.role, 'RECEPTIONIST');
  });

  it('still exposes seedDemoStaff for local seeding', async () => {
    const { staffAuth } = await client();
    const result = await staffAuth.seedDemoStaff();
    assert.equal(result.ok, true);
    assert.equal(result.skipped, true);
  });
});

describe('POST /api/auth/staff-refresh', () => {
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

  async function client() {
    const instance = await startApp();
    started.push(instance);
    return instance;
  }

  it('exchanges a valid token for one with a fresh expiry', async () => {
    const { url, staffAuth } = await client();

    const loginRes = await fetch(`${url}/api/auth/staff-login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        identifier: 'kojo.mensah@yencare.gh',
        password: DEMO_STAFF_PASSWORD,
      }),
    });
    const { token } = await loginRes.json();
    const before = staffAuth.verifyToken(token);

    const res = await fetch(`${url}/api/auth/staff-refresh`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.staff.role, 'ADMIN');
    assert.ok(body.token);

    const after = staffAuth.verifyToken(body.token);
    assert.ok(after.exp >= before.exp);
    assert.equal(after.staffId, before.staffId);

    // The refreshed token is usable.
    const me = await fetch(`${url}/api/auth/staff-me`, {
      headers: { authorization: `Bearer ${body.token}` },
    });
    assert.equal(me.status, 200);
  });

  it('rejects a missing or invalid token', async () => {
    const { url } = await client();

    const missing = await fetch(`${url}/api/auth/staff-refresh`, { method: 'POST' });
    assert.equal(missing.status, 401);

    const invalid = await fetch(`${url}/api/auth/staff-refresh`, {
      method: 'POST',
      headers: { authorization: 'Bearer not-a-token' },
    });
    assert.equal(invalid.status, 401);
  });
});
