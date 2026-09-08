import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connectDb, disconnectDb } from './db/connection.js';
import { createApp } from './http/app.js';
import { createMongoPatientStore } from './patients/mongoStore.js';
import { createPatientService } from './patients/service.js';

const backendRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(backendRoot, '.env') });

const port = Number(process.env.PORT || 4000);

await connectDb();

const app = createApp({
  patientService: createPatientService(createMongoPatientStore()),
});

const server = app.listen(port, () => {
  console.log(`[yencare] API listening on http://localhost:${port}`);
});

async function shutdown(signal) {
  console.log(`[yencare] ${signal} received, shutting down`);
  await new Promise((resolve) => server.close(resolve));
  await disconnectDb();
}

process.on('SIGINT', () => {
  shutdown('SIGINT').finally(() => process.exit(0));
});
process.on('SIGTERM', () => {
  shutdown('SIGTERM').finally(() => process.exit(0));
});
