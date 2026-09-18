import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { connectDb, disconnectDb } from "./db/connection.js";
import { createApp } from "./http/app.js";
import { createMongoCatalog } from "./http/mongoCatalog.js";
import { assertEventBusFitsDeployment } from "./lib/eventBus.js";
import { logger } from "./lib/logger.js";
import { assertProductionSecrets } from "./lib/runtime.js";
import { Appointment } from "./models/Appointment.js";
import { createMongoPatientStore } from "./patients/mongoStore.js";
import { createPatientService } from "./patients/service.js";

import {
  listAppointments,
  lookupAppointment,
  findActiveAppointmentForPatient,
  findActiveAppointmentsForPatient,
  updateAppointmentStatus,
  markPatientArrived,
  cancelAppointment,
  rescheduleAppointment,
} from "./services/appointmentOps.js";

import { createStaffAuthService } from "./auth/staffAuth.js";
import { createAppointment } from "./services/bookAppointment.js";
import { ensureOpenSlots } from "./services/generateSlots.js";
import { sendAppointmentReminders } from "./services/sendReminders.js";
import { closeMissedAppointments } from "./services/closeMissedAppointments.js";
import { assertProductionSmsConfig } from "./sms/sendSms.js";

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
  // Render injects dashboard env vars into process.env. Do not let a missing
  // .env file look like a failed secret load in production logs.
  quiet: true,
});

const port = Number(process.env.PORT || 4000);

// Last-resort handlers: a rejected promise or a thrown error that reaches the
// top of the stack must be logged with context instead of vanishing.
process.on("unhandledRejection", (reason) => {
  logger.error("unhandled promise rejection", {
    subsystem: "process",
    err: reason instanceof Error ? reason : new Error(String(reason)),
  });
});

process.on("uncaughtException", (err) => {
  logger.error("uncaught exception; exiting", { subsystem: "process", err });
  // The process state is undefined after an uncaught exception; let the
  // supervisor restart us rather than serve requests from a broken process.
  process.exit(1);
});

assertProductionSecrets();
assertProductionSmsConfig();

// Refuses to boot in production when this deployment runs several instances on
// the process-local real-time bus; warns loudly everywhere else.
assertEventBusFitsDeployment();

await connectDb();

const staffAuth = createStaffAuthService({
  jwtSecret: process.env.JWT_SECRET,
});

if (staffAuth.usingDevSecret) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET must be set in production");
  }
  logger.warn("JWT_SECRET is unset; using the local development secret", {
    subsystem: "staff-auth",
  });
}

const shouldSeedDemo =
  process.env.NODE_ENV === "production"
    ? process.env.STAFF_SEED_DEMO === "true"
    : process.env.STAFF_SEED_DEMO !== "false";
if (shouldSeedDemo) {
  try {
    const seeded = await staffAuth.seedDemoStaff();
    if (!seeded.skipped) {
      logger.info("demo staff ready", {
        subsystem: "staff-auth",
        accounts: seeded.seeded,
      });
    }
  } catch (err) {
    logger.warn("demo staff seed skipped", { subsystem: "staff-auth", err });
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

    findActiveAppointmentForPatient,

    findActiveAppointmentsForPatient,

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
    closeMissedAppointments,
  },
});

const server = app.listen(port, () => {
  logger.info("API listening", { subsystem: "yencare", port });
});

void ensureOpenSlots({ days: 14 })
  .then((result) => {
    if (result.created > 0) {
      logger.info("open slots ready", {
        subsystem: "yencare",
        created: result.created,
      });
    }
  })
  .catch((err) => {
    logger.warn("slot generation skipped", { subsystem: "yencare", err });
  });

const SLOT_GEN_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const slotTimer = setInterval(() => {
  ensureOpenSlots({ days: 14 }).catch((err) => {
    logger.warn("rolling slot generation error", { subsystem: "yencare", err });
  });
}, SLOT_GEN_INTERVAL_MS);

function runReminders() {
  sendAppointmentReminders()
    .then((result) => {
      if (result.sent > 0 || result.failed > 0) {
        logger.info("appointment reminders processed", {
          subsystem: "yencare",
          appointmentDate: result.appointmentDate,
          sent: result.sent,
          failed: result.failed,
        });
      }
    })
    .catch((err) => {
      logger.warn("reminder send skipped", { subsystem: "yencare", err });
    });
}

void runReminders();
const REMINDER_INTERVAL_MS = 6 * 60 * 60 * 1000;
const reminderTimer = setInterval(runReminders, REMINDER_INTERVAL_MS);

function runMissedCloseout() {
  closeMissedAppointments()
    .then((result) => {
      if (result.marked > 0 || result.failed > 0) {
        logger.info("missed appointments closed", {
          subsystem: "yencare",
          today: result.today,
          scanned: result.scanned,
          marked: result.marked,
          failed: result.failed,
        });
      }
    })
    .catch((err) => {
      logger.warn("missed-appointment closeout skipped", { subsystem: "yencare", err });
    });
}

void runMissedCloseout();
const CLOSE_MISSED_INTERVAL_MS = 15 * 60 * 1000;
const closeMissedTimer = setInterval(runMissedCloseout, CLOSE_MISSED_INTERVAL_MS);

async function shutdown(signal) {
  logger.info("shutting down", { subsystem: "yencare", signal });

  clearInterval(slotTimer);
  clearInterval(reminderTimer);
  clearInterval(closeMissedTimer);
  await new Promise((resolve) => server.close(resolve));

  await disconnectDb();
}


process.on("SIGINT", () => {
  shutdown("SIGINT").finally(() => process.exit(0));
});

process.on("SIGTERM", () => {
  shutdown("SIGTERM").finally(() => process.exit(0));
});
