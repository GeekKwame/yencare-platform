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
 * }} appointmentService
 */
export function createAppointmentsRouter(appointmentService) {
  const router = Router();

  router.post('/', asyncHandler(async (req, res) => {
    const result = await appointmentService.createAppointment(req.body);
    const appointmentJson = toJson(result.appointment) ?? result.appointment;

    res.status(201).json({
      ...appointmentJson,
      sms: result.sms,
    });
  }));

  router.get('/:reference', asyncHandler(async (req, res) => {
    const ref = req.params.reference;
    const appointment = appointmentService.findByReference
      ? await appointmentService.findByReference(ref)
      : null;

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.status(200).json(toJson(appointment));
  }));

  return router;
}
