import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { connectDb, disconnectDb } from '../src/db/connection.js';
import { sendAppointmentReminders } from '../src/services/sendReminders.js';

const backendRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(backendRoot, '.env') });

await connectDb();
try {
  const result = await sendAppointmentReminders();
  console.log('[reminders]', result);
} finally {
  await disconnectDb();
}
