import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { connectDb, disconnectDb } from '../src/db/connection.js';
import { closeMissedAppointments } from '../src/services/closeMissedAppointments.js';

const backendRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(backendRoot, '.env') });

await connectDb();
try {
  const result = await closeMissedAppointments();
  console.log('[close-missed]', result);
} finally {
  await disconnectDb();
}
