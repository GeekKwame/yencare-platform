import { Router } from 'express';
import { resolveClinicianIdForStaff } from '../auth/clinicianResolver.js';
import { asyncHandler } from './asyncHandler.js';
import { staffGuard } from './staffGuard.js';

function toJson(doc) {
  if (!doc) return null;
  return typeof doc.toJSON === 'function' ? doc.toJSON() : doc;
}

/**
 * @param {{
 *   callNextPatient: Function,
 *   advanceQueue: Function,
 *   markNoShow: Function,
 *   getQueueStatus?: Function,
 *   getClinicActivity?: Function,
 * }} queueService
 * @param {{
 *   authenticate?: (roles?: string[]) => import('express').RequestHandler,
 * }} [options]
 */
export function createQueueRouter(queueService, { authenticate } = {}) {
  const router = Router();
  const callNextStaff = staffGuard(authenticate, ['DOCTOR', 'ADMIN']);
  const completeStaff = staffGuard(authenticate, ['DOCTOR']);
  const noShowStaff = staffGuard(authenticate, ['RECEPTIONIST', 'DOCTOR', 'ADMIN']);

  router.get(
    '/activity',
    asyncHandler(async (req, res) => {
      if (!queueService.getClinicActivity) {
        return res.status(501).json({
          error: 'Clinic activity is not available',
        });
      }

      const activity = await queueService.getClinicActivity(
        req.query.clinicSite || req.query.clinic || 'students-clinic',
      );
      res.status(200).json(activity);
    }),
  );

  router.post(
    '/call-next',
    callNextStaff,
    asyncHandler(async (req, res) => {
      let clinicianId = req.body?.clinicianId;

      if (req.staff?.role === 'DOCTOR') {
        const doctorClinicianId = await resolveClinicianIdForStaff(req.staff);
        if (doctorClinicianId) {
          if (clinicianId && String(clinicianId) !== String(doctorClinicianId)) {
            return res.status(403).json({
              error: 'Doctors can only call patients who booked a consultation with them.',
            });
          }
          clinicianId = doctorClinicianId;
        }
      }

      const result = await queueService.callNextPatient({
        ...(req.body || {}),
        ...(clinicianId ? { clinicianId } : {}),
      });
      res.status(200).json({
        ...result,
        appointment: toJson(result.appointment),
        room: toJson(result.room),
      });
    }),
  );

  router.post(
    '/advance',
    completeStaff,
    asyncHandler(async (req, res) => {
      let clinicianId = req.body?.clinicianId;

      if (req.staff?.role === 'DOCTOR') {
        const doctorClinicianId = await resolveClinicianIdForStaff(req.staff);
        if (doctorClinicianId) {
          if (clinicianId && String(clinicianId) !== String(doctorClinicianId)) {
            return res.status(403).json({
              error: 'Doctors can only advance appointments booked for their consultation.',
            });
          }
          clinicianId = doctorClinicianId;
        }
      }

      const result = await queueService.advanceQueue({
        ...(req.body || {}),
        ...(clinicianId ? { clinicianId } : {}),
      });
      res.status(200).json({
        ...result,
        appointment: toJson(result.appointment),
        completedAppointment: toJson(result.completedAppointment),
        nextAppointment: toJson(result.nextAppointment),
      });
    }),
  );

  router.post(
    '/no-show',
    noShowStaff,
    asyncHandler(async (req, res) => {
      let clinicianId = req.body?.clinicianId;

      if (req.staff?.role === 'DOCTOR') {
        const doctorClinicianId = await resolveClinicianIdForStaff(req.staff);
        if (doctorClinicianId) {
          if (clinicianId && String(clinicianId) !== String(doctorClinicianId)) {
            return res.status(403).json({
              error: 'Doctors can only manage consultations booked with them.',
            });
          }
          clinicianId = doctorClinicianId;
        }
      }

      const result = await queueService.markNoShow({
        ...(req.body || {}),
        ...(clinicianId ? { clinicianId } : {}),
      });
      res.status(200).json({
        ...result,
        appointment: toJson(result.appointment),
      });
    }),
  );

  return router;
}
