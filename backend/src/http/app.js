import cors from 'cors';
import express from 'express';
import { createAppointmentsRouter } from './appointmentsRoutes.js';
import { createAuthRouter } from './authRoutes.js';
import { createCatalogRouter } from './catalogRoutes.js';
import { buildCorsOptions } from './corsOrigins.js';
import { getHealthStatus } from './health.js';
import { createOpsRouter } from './opsRoutes.js';
import { createPatientsRouter } from './patientsRoutes.js';
import { createQueueRouter } from './queueRoutes.js';
import { requestId } from './requestId.js';
import { rateLimit, rateLimitEnabled, securityHeaders } from './security.js';
import { logger } from '../lib/logger.js';

const passthrough = (_req, _res, next) => next();

/**
 * Rate limiting is active in every environment except test runs; see
 * `rateLimitEnabled()`.
 *
 * @param {Parameters<typeof rateLimit>[0]} options
 */
function maybeRateLimit(options) {
  if (!rateLimitEnabled()) return passthrough;
  return rateLimit(options);
}

function envInt(name, fallback) {
  const parsed = Number.parseInt(String(process.env[name] ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Reference codes are only 4 digits (10,000 codes), so the endpoints that
 * accept one are throttled hard enough that scanning the space is impractical.
 */
function buildAppointmentLimiters() {
  // Patient lookups and cancel/reschedule are user-driven, never polled.
  const publicLookup = maybeRateLimit({
    name: 'appointment-lookup',
    windowMs: 60_000,
    max: envInt('PUBLIC_LOOKUP_RATE_MAX', 30),
  });

  // Queue status IS polled (P18 refreshes every 15s), and KNUST campus clients
  // share a handful of NAT'd IPs, so it gets two layers instead of one tight
  // per-IP cap: a generous per-IP ceiling that still bounds a scan, plus a
  // per-reference cap that stops one code being hammered.
  const queueStatus = [
    maybeRateLimit({
      name: 'queue-status-ip',
      windowMs: 60_000,
      max: envInt('QUEUE_STATUS_RATE_MAX', 120),
    }),
    maybeRateLimit({
      name: 'queue-status-reference',
      windowMs: 60_000,
      max: envInt('QUEUE_STATUS_REFERENCE_RATE_MAX', 30),
      keyGenerator: (req) =>
        `${req.ip || req.socket?.remoteAddress || 'unknown'}|${String(
          req.params?.reference || '',
        ).toUpperCase()}`,
    }),
  ];

  return { publicLookup, queueStatus };
}

/**
 * @param {{
 *   patientService: ReturnType<import('../patients/service.js').createPatientService>,
 *   catalog?: {
 *     listRooms: Function,
 *     listClinicians: Function,
 *     listTimeSlots: Function,
 *   },
 *   appointmentService?: {
 *     createAppointment: Function,
 *     findByReference?: Function,
 *     lookupAppointment?: Function,
 *     findActiveAppointmentForPatient?: Function,
 *     listAppointments?: Function,
 *     updateStatus?: Function,
 *     cancelAppointment?: Function,
 *     rescheduleAppointment?: Function,
 *     getQueueStatus?: Function,
 *   },
 *   queueService?: {
 *     callNextPatient: Function,
 *     advanceQueue: Function,
 *     markNoShow: Function,
 *     getQueueStatus?: Function,
 *     getClinicActivity?: Function,
 *   },
 *   staffAuth?: ReturnType<import('../auth/staffAuth.js').createStaffAuthService>,
 *   opsService?: {
 *     ensureOpenSlots?: Function,
 *     sendAppointmentReminders?: Function,
 *   },
 *   getHealth?: () => Promise<object>,
 * }} deps
 */
export function createApp({
  patientService,
  catalog,
  appointmentService,
  queueService,
  staffAuth,
  opsService,
  getHealth = getHealthStatus,
}) {
  const app = express();

  app.set('trust proxy', 1);
  app.use(requestId);
  app.use(securityHeaders);
  app.use(cors(buildCorsOptions()));
  app.use(express.json({ limit: '32kb' }));

  app.get('/health', async (_req, res) => {
    try {
      const health = await getHealth();
      res.status(health.ok ? 200 : 503).json(health);
    } catch {
      res.status(503).json({
        ok: false,
        service: 'yencare-api',
        db: 'unhealthy',
        readyState: 0,
        latencyMs: 0,
      });
    }
  });

  app.use(
    '/api/patients',
    maybeRateLimit({ name: 'patients', windowMs: 60_000, max: 30 }),
    createPatientsRouter(patientService),
  );

  if (staffAuth) {
    app.use(
      '/api/auth',
      maybeRateLimit({ name: 'auth', windowMs: 60_000, max: 20 }),
      createAuthRouter(staffAuth),
    );
  }

  const staffHttp = {
    authenticate: staffAuth?.authenticate,
    authenticateOptional: staffAuth?.authenticateOptional,
  };

  if (appointmentService) {
    const { publicLookup, queueStatus } = buildAppointmentLimiters();

    app.use(
      '/api/appointments',
      maybeRateLimit({ name: 'appointments', windowMs: 60_000, max: 60 }),
      createAppointmentsRouter(appointmentService, {
        ...staffHttp,
        publicLookupLimiter: publicLookup,
        queueStatusLimiter: queueStatus,
      }),
    );
  }

  if (queueService) {
    app.use('/api/queue', createQueueRouter(queueService, staffHttp));
  }

  if (catalog) {
    app.use('/api', createCatalogRouter(catalog));
  }

  if (opsService && staffAuth) {
    app.use('/api/ops', createOpsRouter(opsService, staffHttp));
  }

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  app.use((err, req, res, _next) => {
    // Every error response carries the request id so a failed booking can be
    // traced from the browser to the log line that explains it.
    const requestIdValue = req?.id;
    const trace = requestIdValue ? { requestId: requestIdValue } : {};

    const logContext = {
      subsystem: 'api',
      requestId: requestIdValue,
      method: req?.method,
      path: req?.originalUrl || req?.url,
      err,
    };

    if (err && err.status) {
      if (err.status >= 500) {
        logger.error('request failed', logContext);
      } else {
        logger.warn('request rejected', { ...logContext, status: err.status });
      }

      return res.status(err.status).json({
        error: err.message,
        ...(err.details ? { details: err.details } : {}),
        ...trace,
      });
    }

    if (
      err?.name === 'ValidationError' ||
      err?.name === 'CastError'
    ) {
      logger.warn('request rejected', { ...logContext, status: 400 });
      return res.status(400).json({ error: err.message, ...trace });
    }

    if (err?.code === 11000) {
      logger.warn('duplicate key rejected', { ...logContext, status: 409 });
      return res.status(409).json({
        error: 'This time slot is already booked',
        ...trace,
      });
    }

    if (err instanceof SyntaxError && 'body' in err) {
      logger.warn('invalid JSON body', { ...logContext, status: 400 });
      return res.status(400).json({
        error: 'Invalid JSON body',
        ...trace,
      });
    }

    logger.error('unhandled request error', logContext);

    return res.status(500).json({
      error: 'Internal server error',
      ...trace,
    });
  });

  return app;
}
