import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';
import { mongoPoolOptions } from '../src/db/connection.js';
import { createApp } from '../src/http/app.js';
import {
  isOriginAllowed,
  isYencareVercelOrigin,
  parseOriginList,
} from '../src/http/corsOrigins.js';
import { getHealthStatus } from '../src/http/health.js';
import { createMemoryStore } from '../src/patients/memoryStore.js';
import { createPatientService } from '../src/patients/service.js';

function startApp(overrides = {}) {
  const app = createApp({
    patientService: createPatientService(createMemoryStore()),
    ...overrides,
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

describe('staging CORS, pool, and health', () => {
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

  it('defaults the Mongo pool to min 10 / max 50', () => {
    assert.deepEqual(mongoPoolOptions({}), {
      minPoolSize: 10,
      maxPoolSize: 50,
    });
    assert.deepEqual(
      mongoPoolOptions({
        MONGO_MIN_POOL_SIZE: '10',
        MONGO_MAX_POOL_SIZE: '50',
      }),
      { minPoolSize: 10, maxPoolSize: 50 },
    );
  });

  it('allows the staging Vercel origin and blocks unknown sites', () => {
    const staging = 'https://yencare-platform.vercel.app';
    const preview = 'https://yencare-platform-on21x60d6.vercel.app';
    assert.equal(isYencareVercelOrigin(staging), true);
    assert.equal(isYencareVercelOrigin(preview), true);
    assert.equal(
      isOriginAllowed(staging, {
        allowed: [staging],
        allowVercelPreviews: true,
        allowLocalhost: false,
      }),
      true,
    );
    assert.equal(
      isOriginAllowed('https://evil.example', {
        allowed: [staging],
        allowVercelPreviews: true,
        allowLocalhost: false,
      }),
      false,
    );
    assert.deepEqual(parseOriginList(`${staging}, ${preview}`), [
      staging,
      preview,
    ]);
  });

  it('GET /health includes database state and latency', async () => {
    const instance = await startApp({
      getHealth: async () => ({
        ok: true,
        service: 'yencare-api',
        db: 'connected',
        readyState: 1,
        latencyMs: 4,
      }),
    });
    started.push(instance);

    const res = await fetch(`${instance.url}/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.equal(body.service, 'yencare-api');
    assert.equal(body.db, 'connected');
    assert.equal(typeof body.latencyMs, 'number');
  });

  it('GET /health returns 503 when MongoDB is down', async () => {
    const health = await getHealthStatus({
      ping: async () => {
        throw new Error('not connected');
      },
    });
    assert.equal(health.ok, false);
    assert.notEqual(health.db, 'connected');
    assert.equal(typeof health.latencyMs, 'number');

    const instance = await startApp({
      getHealth: async () => health,
    });
    started.push(instance);

    const res = await fetch(`${instance.url}/health`);
    assert.equal(res.status, 503);
    assert.equal((await res.json()).ok, false);
  });

  it('CORS allows the Vercel staging origin and rejects others', async () => {
    const instance = await startApp();
    started.push(instance);
    const staging = 'https://yencare-platform.vercel.app';

    const allowed = await fetch(`${instance.url}/health`, {
      headers: { Origin: staging },
    });
    assert.equal(allowed.headers.get('access-control-allow-origin'), staging);

    const blocked = await fetch(`${instance.url}/health`, {
      headers: { Origin: 'https://evil.example' },
    });
    assert.equal(blocked.headers.get('access-control-allow-origin'), null);
  });
});
