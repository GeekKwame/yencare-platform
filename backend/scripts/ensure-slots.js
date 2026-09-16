import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { connectDb, disconnectDb } from '../src/db/connection.js';
import { ensureOpenSlots } from '../src/services/generateSlots.js';

const backendRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(backendRoot, '.env') });

await connectDb();
try {
  const result = await ensureOpenSlots({ days: Number(process.env.SLOT_DAYS || 14) });
  console.log('[ensure-slots]', result);
} finally {
  await disconnectDb();
}
