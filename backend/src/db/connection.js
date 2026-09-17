import dns from 'node:dns';
import mongoose from 'mongoose';

import { logger } from '../lib/logger.js';

// Many local routers / ISPs on Windows refuse or fail SRV UDP lookups (_mongodb._tcp).
// Setting public fallback DNS servers ensures mongodb+srv:// resolves smoothly.
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // Continue with default DNS if restricted
}

const DEFAULT_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/yencare';

let listenersBound = false;
let shutdownBound = false;

function bindConnectionListeners() {
  if (listenersBound) return;
  listenersBound = true;

  mongoose.connection.on('connected', () => {
    logger.info('mongodb connected', { subsystem: 'db' });
  });

  mongoose.connection.on('error', (err) => {
    logger.error('mongodb connection error', { subsystem: 'db', err });
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('mongodb disconnected', { subsystem: 'db' });
  });

  mongoose.connection.on('reconnected', () => {
    logger.info('mongodb reconnected', { subsystem: 'db' });
  });
}

/**
 * Staging/production pool: keep sockets warm (min 10) without starving Atlas (max 50).
 * @param {NodeJS.ProcessEnv} [env]
 */
export function mongoPoolOptions(env = process.env) {
  const min = Number(env.MONGO_MIN_POOL_SIZE);
  const max = Number(env.MONGO_MAX_POOL_SIZE);
  const minPoolSize = Number.isFinite(min) && min > 0 ? min : 10;
  const maxPoolSize = Number.isFinite(max) && max > 0 ? max : 50;

  return {
    minPoolSize: Math.min(minPoolSize, maxPoolSize),
    maxPoolSize: Math.max(minPoolSize, maxPoolSize),
  };
}

/**
 * Connect with a warm pool and fail fast if Mongo is down.
 * Safe to call more than once — returns the existing connection when ready.
 */
export async function connectDb(uri = process.env.MONGODB_URI || DEFAULT_URI) {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  bindConnectionListeners();

  await mongoose.connect(uri, {
    ...mongoPoolOptions(),
    serverSelectionTimeoutMS: 15000,
    heartbeatFrequencyMS: 10000,
    retryWrites: true,
  });

  return mongoose.connection;
}

export async function disconnectDb() {
  if (mongoose.connection.readyState === 0) return;
  await mongoose.disconnect();
}

export function registerShutdownHooks() {
  if (shutdownBound) return;
  shutdownBound = true;

  const shutdown = async (signal) => {
    logger.info('closing MongoDB connection', { subsystem: 'db', signal });
    try {
      await disconnectDb();
    } finally {
      process.exit(0);
    }
  };

  process.once('SIGINT', () => {
    void shutdown('SIGINT');
  });
  process.once('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
}

export function getConnection() {
  return mongoose.connection;
}

export { mongoose };
