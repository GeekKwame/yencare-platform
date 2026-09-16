import { Router } from 'express';

import { asyncHandler } from './asyncHandler.js';
import { appointmentEvents } from '../services/appointmentOps.js';
import { staffGuard } from './staffGuard.js';

function toJson(doc) {
  if (!doc) return null;

  return typeof doc.toJSON === 'function' ? doc.toJSON() : doc;
}

/**
 * @param {{
 *   createAppointment: (data: object) => Promise<{ appointment: object, sms: object }>,
 *   findByReference?: (referenceCode: string) => Promise<object | null>,
 *   lookupAppointment?: (query: object) => Promise<object>,
 *   listAppointments?: (filters: object) => Promise<object[]>,
 *   updateStatus?: (idOrReference: string, status: string) => Promise<object>,
 *   markPatientArrived?: (reference: string, options: object) => Promise<object>,
 *   cancelAppointment?: (idOrReference: string, options: object) => Promise<object>,
 *   rescheduleAppointment?: (idOrReference: string, options: object) => Promise<object>,
 *   getQueueStatus?: (reference: string) => Promise<object>,
 * }} appointmentService
 * @param {{
 *   authenticate?: (roles?: string[]) => import('express').RequestHandler,
 * }} [options]
 */
export function createAppointmentsRouter(appointmentService, { authenticate } = {}) {
  const router = Router();
  const anyStaff = staffGuard(authenticate);
  const deskStaff = staffGuard(authenticate, ['RECEPTIONIST', 'ADMIN']);

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

      res.status(200).json(toJson(appointment));
    }),
  );

  // POST /api/appointments/:reference/arrive
  // Public patient arrival — BOOKED → CHECKED_IN, no queue token.
  router.post(
    '/:reference/arrive',
    asyncHandler(async (req, res) => {
      if (!appointmentService.markPatientArrived) {
        return res.status(501).json({
          error: 'Arrival check-in is not available',
        });
      }

      const appointment = await appointmentService.markPatientArrived(
        req.params.reference,
        { phone: req.body?.phone || req.body?.phoneNumber },
      );

      res.status(200).json(toJson(appointment));
    }),
  );

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
  router.patch(
    '/:id/cancel',
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
      });
    }),
  );

  // PATCH /api/appointments/:id/reschedule
  router.patch(
    '/:id/reschedule',
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
      });
    }),
  );

  // GET /api/appointments/:reference/queue-status
  router.get(
    '/:reference/queue-status',
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
        toJson(appointment),
      );
    }),
  );

  return router;
}
