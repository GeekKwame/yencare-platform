import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';
import express from 'express';

import {
  createMemoryRateLimitStore,
  getRateLimitStore,
  resetRateLimitStore,
  setRateLimitStore,
} from '../src/http/rateLimitStore.js';
import { rateLimit, rateLimitEnabled, TOO_MANY_REQUESTS_MESSAGE } from '../src/http/security.js';

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
    assert.equal(
      rateLimitEnabled({ NODE_ENV: 'production', RATE_LIMIT_DISABLED: 'true' }),
      false,
    );
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
        keyGenerator: (req) =>
          `${req.ip || req.socket?.remoteAddress || 'unknown'}|${String(
            req.body?.reference || req.body?.referenceCode || req.params?.reference || '',
          ).toUpperCase()}`,
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
