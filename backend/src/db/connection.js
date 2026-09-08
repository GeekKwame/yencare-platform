import dns from 'node:dns';
import mongoose from 'mongoose';

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
    console.log('[db] connected');
  });

  mongoose.connection.on('error', (err) => {
    console.error('[db] connection error', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[db] disconnected');
  });

  mongoose.connection.on('reconnected', () => {
    console.log('[db] reconnected');
  });
}

/**
 * Connect with a modest pool and fail fast if Mongo is down.
 * Safe to call more than once — returns the existing connection when ready.
 */
export async function connectDb(uri = process.env.MONGODB_URI || DEFAULT_URI) {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  bindConnectionListeners();

  await mongoose.connect(uri, {
    maxPoolSize: 10,
    minPoolSize: 1,
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
    console.log(`[db] ${signal} received, closing MongoDB connection`);
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
