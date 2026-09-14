import { Router } from 'express';
import { asyncHandler } from './asyncHandler.js';

function toJson(doc) {
  if (!doc) return null;
  return typeof doc.toJSON === 'function' ? doc.toJSON() : doc;
}

/**
 * @param {{
 *   createAppointment: (data: object) => Promise<{ appointment: object, sms: object }>,
 *   findByReference?: (referenceCode: string) => Promise<object | null>,
 *   listAppointments?: (filters: object) => Promise<object[]>,
 *   updateStatus?: (idOrReference: string, status: string) => Promise<object>,
 * }} appointmentService
 */
export function createAppointmentsRouter(appointmentService) {
  const router = Router();

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      if (!appointmentService.listAppointments) {
        return res.status(501).json({ error: 'Listing appointments is not available' });
      }

      const appointments = await appointmentService.listAppointments({
        date: req.query.date,
        clinicSite: req.query.clinicSite || req.query.clinic,
      });

      res.status(200).json(appointments.map((doc) => toJson(doc)));
    }),
  );

  router.post(
    '/',
    asyncHandler(async (req, res) => {
      const result = await appointmentService.createAppointment(req.body);
      const appointmentJson = toJson(result.appointment) ?? result.appointment;

      res.status(201).json({
        ...appointmentJson,
        sms: result.sms,
      });
    }),
  );

  router.patch(
    '/:id/status',
    asyncHandler(async (req, res) => {
      if (!appointmentService.updateStatus) {
        return res.status(501).json({ error: 'Updating appointment status is not available' });
      }

      const status = req.body?.status;
      const appointment = await appointmentService.updateStatus(req.params.id, status);
      res.status(200).json(toJson(appointment));
    }),
  );

  router.get(
    '/:reference/queue-status',
    asyncHandler(async (req, res) => {
      if (!appointmentService.getQueueStatus) {
        return res.status(501).json({ error: 'Queue status is not available' });
      }

      const queueStatus = await appointmentService.getQueueStatus(req.params.reference);
      res.status(200).json(queueStatus);
    }),
  );

  router.get(
    '/:reference',
    asyncHandler(async (req, res) => {
      const ref = req.params.reference;
      const appointment = appointmentService.findByReference
        ? await appointmentService.findByReference(ref)
        : null;

      if (!appointment) {
        return res.status(404).json({ error: 'Appointment not found' });
      }

      res.status(200).json(toJson(appointment));
    }),
  );

  return router;
}
