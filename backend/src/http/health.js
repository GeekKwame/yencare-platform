import mongoose from 'mongoose';

const READY_STATE = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

const PING_TIMEOUT_MS = 2500;

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('health ping timed out')), ms);
  });

  return Promise.race([promise, timeout]).finally(() => {
    clearTimeout(timer);
  });
}

async function pingMongo() {
  if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
    throw new Error('MongoDB is not connected');
  }

  await mongoose.connection.db.admin().ping();
}

/**
 * Readiness probe: process is up, plus MongoDB ping latency.
 *
 * @param {{ ping?: () => Promise<unknown> }} [deps]
 */
export async function getHealthStatus({ ping } = {}) {
  const started = Date.now();
  const readyState = mongoose.connection.readyState;
  let db = READY_STATE[readyState] || 'unknown';

  try {
    await withTimeout(Promise.resolve((ping || pingMongo)()), PING_TIMEOUT_MS);
    db = 'connected';
  } catch {
    if (readyState === 1) db = 'unhealthy';
  }

  const latencyMs = Date.now() - started;

  return {
    ok: db === 'connected',
    service: 'yencare-api',
    db,
    readyState,
    latencyMs,
  };
}
