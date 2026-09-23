import { Router } from 'express';

import { logger } from '../lib/logger.js';
import { asyncHandler } from './asyncHandler.js';
import {
  appointmentEvents,
  isHistoricalAppointment,
} from '../services/appointmentOps.js';
import { optionalStaffGuard, staffGuard } from './staffGuard.js';

const ALL_STAFF_ROLES = ['RECEPTIONIST', 'DOCTOR', 'ADMIN'];

const passthrough = (_req, _res, next) => next();

function toJson(doc) {
  if (!doc) return null;

  return typeof doc.toJSON === 'function' ? doc.toJSON() : doc;
}

/**
 * Serialized appointment plus the two additive reference-lookup fields:
 *
 *   isHistorical  — true for CANCELLED / NO_SHOW / COMPLETED
 *   supersededBy  — the patient's current active appointment in the same
 *                   serialized shape, or null
 *
 * The appointment itself stays at the top level so existing consumers are
 * unaffected. `supersededBy` is always shallow: its own `supersededBy` is null,
 * which makes unbounded recursion structurally impossible.
 *
 * @param {object} appointmentService
 * @param {object | null} doc
 * @param {import('express').Request} [req]
 */
async function toLookupJson(appointmentService, doc, req) {
  const json = toJson(doc);
  if (!json) return null;

  const isHistorical = isHistoricalAppointment(json);
  let supersededBy = null;

  if (isHistorical && typeof appointmentService.findActiveAppointmentForPatient === 'function') {
    try {
      const active = toJson(await appointmentService.findActiveAppointmentForPatient(doc));
      if (active) {
        supersededBy = { ...active, isHistorical: false, supersededBy: null };
      }
    } catch (err) {
      // The historical flag is the load-bearing part of this response; do not
      // fail the whole lookup because the follow-up query failed.
      logger.error('could not resolve superseding appointment', {
        subsystem: 'appointments',
        requestId: req?.id,
        referenceCode: json.referenceCode,
        err,
      });
    }
  }

  let activeAppointments = null;
  if (typeof appointmentService.findActiveAppointmentsForPatient === 'function') {
    try {
      const all = await appointmentService.findActiveAppointmentsForPatient(doc);
      if (Array.isArray(all) && all.length > 0) {
        activeAppointments = all.map((item) => toJson(item));
      }
    } catch (err) {
      logger.warn('could not resolve active appointments list', {
        subsystem: 'appointments',
        requestId: req?.id,
        referenceCode: json.referenceCode,
        err,
      });
    }
  }

  return { ...json, isHistorical, supersededBy, activeAppointments };
}

/**
 * @param {{
 *   createAppointment: (data: object) => Promise<{ appointment: object, sms: object }>,
 *   findByReference?: (referenceCode: string) => Promise<object | null>,
 *   lookupAppointment?: (query: object) => Promise<object>,
 *   findActiveAppointmentForPatient?: (appointment: object) => Promise<object | null>,
 *   listAppointments?: (filters: object) => Promise<object[]>,
 *   updateStatus?: (idOrReference: string, status: string) => Promise<object>,
 *   markPatientArrived?: (reference: string, options: object) => Promise<object>,
 *   cancelAppointment?: (idOrReference: string, options: object) => Promise<object>,
 *   rescheduleAppointment?: (idOrReference: string, options: object) => Promise<object>,
 *   getQueueStatus?: (reference: string) => Promise<object>,
 * }} appointmentService
 * @param {{
 *   authenticate?: (roles?: string[]) => import('express').RequestHandler,
 *   authenticateOptional?: (roles?: string[]) => import('express').RequestHandler,
 *   publicLookupLimiter?: import('express').RequestHandler | import('express').RequestHandler[],
 *   queueStatusLimiter?: import('express').RequestHandler | import('express').RequestHandler[],
 *   arrivalLimiter?: import('express').RequestHandler | import('express').RequestHandler[],
 * }} [options]
 */
export function createAppointmentsRouter(
  appointmentService,
  {
    authenticate,
    authenticateOptional,
    // Reference-code endpoints are enumerable, so the app wires strict per-IP
    // limiters here. Unlimited by default to keep the router self-contained.
    publicLookupLimiter = passthrough,
    queueStatusLimiter = passthrough,
    arrivalLimiter = passthrough,
  } = {},
) {
  const router = Router();
  const anyStaff = staffGuard(authenticate);
  const deskStaff = staffGuard(authenticate, ['RECEPTIONIST', 'ADMIN']);
  // Cancel/reschedule serve both reception and patients: staff are recognised
  // here, everyone else has to prove ownership with their phone number.
  const maybeStaff = optionalStaffGuard(authenticateOptional, ALL_STAFF_ROLES);

  // GET /api/appointments
  router.get(
    '/',
    anyStaff,
    asyncHandler(async (req, res) => {
      if (!appointmentService.listAppointments) {
        return res.status(501).json({
          error: 'Listing appointments is not available',
        });
      }

      const appointments = await appointmentService.listAppointments({
        date: req.query.date,
        clinicSite:
          req.query.clinicSite || req.query.clinic,
      });

      res.status(200).json(
        appointments.map((doc) => toJson(doc)),
      );
    }),
  );

  // POST /api/appointments
  router.post(
    '/',
    asyncHandler(async (req, res) => {
      const result =
        await appointmentService.createAppointment(
          req.body,
        );

      const appointmentJson =
        toJson(result.appointment) ??
        result.appointment;

      res.status(201).json({
        ...appointmentJson,
        sms: result.sms,
      });
    }),
  );

  // GET /api/appointments/events
  //
  // Server-Sent Events endpoint for real-time slot updates.
  router.get('/events', (req, res) => {
    res.setHeader(
      'Content-Type',
      'text/event-stream',
    );
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders();
    }

    // Tell the client that the connection is alive.
    res.write(': connected\n\n');

    const sendEvent = (eventName, payload) => {
      res.write(
        `event: ${eventName}\n` +
        `data: ${JSON.stringify(payload)}\n\n`,
      );
    };

    const onSlotReleased = (payload) => {
      sendEvent('slotReleased', payload);
    };

    const onSlotBooked = (payload) => {
      sendEvent('slotBooked', payload);
    };

    appointmentEvents.on(
      'slotReleased',
      onSlotReleased,
    );

    appointmentEvents.on(
      'slotBooked',
      onSlotBooked,
    );

    // Keep the connection alive.
    const heartbeat = setInterval(() => {
      res.write(': heartbeat\n\n');
    }, 30000);

    req.on('close', () => {
      clearInterval(heartbeat);

      appointmentEvents.off(
        'slotReleased',
        onSlotReleased,
      );

      appointmentEvents.off(
        'slotBooked',
        onSlotBooked,
      );

      res.end();
    });
  });

  // GET /api/appointments/lookup
  // Public patient search by YC reference, student index, or Ghana phone.
  router.get(
    '/lookup',
    publicLookupLimiter,
    asyncHandler(async (req, res) => {
      if (!appointmentService.lookupAppointment) {
        return res.status(501).json({
          error: 'Appointment lookup is not available',
        });
      }

      const appointment = await appointmentService.lookupAppointment({
        reference: req.query.reference,
        studentIndex: req.query.studentIndex || req.query.studentId,
        phone: req.query.phone || req.query.phoneNumber,
      });

      if (!appointment) {
        return res.status(404).json({
          error: 'Appointment not found',
        });
      }

      res.status(200).json(
        await toLookupJson(appointmentService, appointment, req),
      );
    }),
  );

  // POST /api/appointments/arrive  (body: { reference, phone })
  // POST /api/appointments/:reference/arrive
  // Public patient arrival — BOOKED → CHECKED_IN, no queue token.
  // The static /arrive path is registered first so a missing trailing segment
  // cannot fall through the catch-all as `{ error: 'Not found' }`.
  const recordArrival = asyncHandler(async (req, res) => {
    if (!appointmentService.markPatientArrived) {
      return res.status(501).json({
        error: 'Arrival check-in is not available',
      });
    }

    const reference =
      req.body?.reference ||
      req.body?.referenceCode ||
      req.params?.reference;

    const appointment = await appointmentService.markPatientArrived(
      reference,
      { phone: req.body?.phone || req.body?.phoneNumber },
    );

    res.status(200).json(toJson(appointment));
  });

  router.post('/arrive', arrivalLimiter, recordArrival);
  router.post('/:reference/arrive', arrivalLimiter, recordArrival);

  // PATCH /api/appointments/:id/status
  router.patch(
    '/:id/status',
    deskStaff,
    asyncHandler(async (req, res) => {
      if (!appointmentService.updateStatus) {
        return res.status(501).json({
          error:
            'Updating appointment status is not available',
        });
      }

      const status = req.body?.status;

      const appointment =
        await appointmentService.updateStatus(
          req.params.id,
          status,
        );

      res.status(200).json(toJson(appointment));
    }),
  );

  // PATCH /api/appointments/:id/cancel
  //
  // Staff (valid JWT) may cancel without a phone number. Patients must send the
  // phone number the appointment was booked with; the service verifies it
  // against the appointment's patient and answers 403 otherwise.
  router.patch(
    '/:id/cancel',
    publicLookupLimiter,
    maybeStaff,
    asyncHandler(async (req, res) => {
      if (!appointmentService.cancelAppointment) {
        return res.status(501).json({
          error:
            'Cancelling appointments is not available',
        });
      }

      const result =
        await appointmentService.cancelAppointment(
          req.params.id,
          {
            cancelReason: req.body?.cancelReason,
            actorIsStaff: Boolean(req.staff),
            phone:
              req.body?.phone ||
              req.body?.phoneNumber ||
              null,
            performedBy:
              req.user?._id ||
              req.user?.id ||
              null,
          },
        );

      res.status(200).json({
        message:
          'Appointment cancelled successfully',
        appointment: toJson(result.appointment),
        releasedSlotId: result.releasedSlotId,
        cancelledTime: result.cancelledTime,
        sms: result.sms,
      });
    }),
  );

  // PATCH /api/appointments/:id/reschedule
  //
  // Same ownership rule as cancel: staff token, or the booking phone number.
  router.patch(
    '/:id/reschedule',
    publicLookupLimiter,
    maybeStaff,
    asyncHandler(async (req, res) => {
      if (!appointmentService.rescheduleAppointment) {
        return res.status(501).json({
          error:
            'Rescheduling appointments is not available',
        });
      }

      const result =
        await appointmentService.rescheduleAppointment(
          req.params.id,
          {
            newSlotId: req.body?.newSlotId,
            staffChangeReason: req.body?.staffChangeReason,
            actorIsStaff: Boolean(req.staff),
            phone:
              req.body?.phone ||
              req.body?.phoneNumber ||
              null,
            performedBy:
              req.user?._id ||
              req.user?.id ||
              null,
          },
        );

      res.status(200).json({
        message:
          'Appointment rescheduled successfully',
        appointment: toJson(result.appointment),
        oldSlotId: result.oldSlotId,
        newSlotId: result.newSlotId,
        sms: result.sms,
      });
    }),
  );

  // GET /api/appointments/:reference/queue-status
  router.get(
    '/:reference/queue-status',
    queueStatusLimiter,
    asyncHandler(async (req, res) => {
      if (!appointmentService.getQueueStatus) {
        return res.status(501).json({
          error: 'Queue status is not available',
        });
      }

      const queueStatus =
        await appointmentService.getQueueStatus(
          req.params.reference,
        );

      res.status(200).json(queueStatus);
    }),
  );

  // GET /api/appointments/:reference
  router.get(
    '/:reference',
    publicLookupLimiter,
    asyncHandler(async (req, res) => {
      const ref = req.params.reference;

      const appointment =
        appointmentService.findByReference
          ? await appointmentService.findByReference(ref)
          : null;

      if (!appointment) {
        return res.status(404).json({
          error: 'Appointment not found',
        });
      }

      res.status(200).json(
        await toLookupJson(appointmentService, appointment, req),
      );
    }),
  );

  return router;
}
