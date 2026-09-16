import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { connectDb, disconnectDb } from "./db/connection.js";
import { createApp } from "./http/app.js";
import { createMongoCatalog } from "./http/mongoCatalog.js";
import { Appointment } from "./models/Appointment.js";
import { createMongoPatientStore } from "./patients/mongoStore.js";
import { createPatientService } from "./patients/service.js";

import {
  listAppointments,
  lookupAppointment,
  updateAppointmentStatus,
  markPatientArrived,
  cancelAppointment,
  rescheduleAppointment,
} from "./services/appointmentOps.js";

import { createStaffAuthService } from "./auth/staffAuth.js";
import { createAppointment } from "./services/bookAppointment.js";
import { ensureOpenSlots } from "./services/generateSlots.js";
import { sendAppointmentReminders } from "./services/sendReminders.js";

import {
  advanceQueue,
  callNextPatient,
  getClinicActivity,
  getQueueStatus,
  markNoShow,
} from "./services/queueEngine.js";

const backendRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

dotenv.config({
  path: path.join(backendRoot, ".env"),
});

const port = Number(process.env.PORT || 4000);

if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET must be set in production");
}

await connectDb();

const staffAuth = createStaffAuthService({
  jwtSecret: process.env.JWT_SECRET,
});

if (staffAuth.usingDevSecret) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET must be set in production");
  }
  console.warn(
    "[staff-auth] JWT_SECRET is unset; using the local development secret",
  );
}

const shouldSeedDemo = process.env.STAFF_SEED_DEMO !== "false";
if (shouldSeedDemo) {
  try {
    const seeded = await staffAuth.seedDemoStaff();
    if (!seeded.skipped) {
      console.log(`[staff-auth] demo staff ready (${seeded.seeded} accounts)`);
    }
  } catch (err) {
    console.warn("[staff-auth] demo seed skipped:", err.message);
  }
}

const app = createApp({
  patientService: createPatientService(createMongoPatientStore()),
  staffAuth,

  catalog: createMongoCatalog(),

  appointmentService: {
    createAppointment,

    findByReference: (ref) => Appointment.findByReference(ref),

    lookupAppointment,

    listAppointments,

    updateStatus: updateAppointmentStatus,

    markPatientArrived,

    cancelAppointment,

    rescheduleAppointment,

    getQueueStatus,
  },

  queueService: {
    callNextPatient,
    advanceQueue,
    markNoShow,
    getQueueStatus,
    getClinicActivity,
  },

  opsService: {
    ensureOpenSlots,
    sendAppointmentReminders,
  },
});

const server = app.listen(port, () => {
  console.log(`[yencare] API listening on http://localhost:${port}`);
});

void ensureOpenSlots({ days: 14 })
  .then((result) => {
    if (result.created > 0) {
      console.log(`[yencare] open slots ready (${result.created} created)`);
    }
  })
  .catch((err) => {
    console.warn("[yencare] slot generation skipped:", err.message);
  });

async function shutdown(signal) {
  console.log(`[yencare] ${signal} received, shutting down`);

  await new Promise((resolve) => server.close(resolve));

  await disconnectDb();
}

process.on("SIGINT", () => {
  shutdown("SIGINT").finally(() => process.exit(0));
});

process.on("SIGTERM", () => {
  shutdown("SIGTERM").finally(() => process.exit(0));
});
