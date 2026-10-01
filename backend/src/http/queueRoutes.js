import { Router } from 'express';
import { resolveDoctorScope, UNLINKED_DOCTOR_MESSAGE } from '../auth/clinicianResolver.js';
import { asyncHandler } from './asyncHandler.js';
import { staffGuard } from './staffGuard.js';

function toJson(doc) {
  if (!doc) return null;
  return typeof doc.toJSON === 'function' ? doc.toJSON() : doc;
}

async function queueClinicianScope(req, res, mismatchMessage) {
  const requested = req.body?.clinicianId;
  const scope = await resolveDoctorScope(req.staff);

  if (!scope.isDoctor) {
    return requested ? { clinicianId: requested } : {};
  }

  const allowedIds = scope.clinicianIds?.length ? scope.clinicianIds : (scope.clinicianId ? [String(scope.clinicianId)] : []);

  if (allowedIds.length === 0) {
    res.status(403).json({ error: UNLINKED_DOCTOR_MESSAGE });
    return null;
  }

  if (requested && !allowedIds.includes(String(requested))) {
    res.status(403).json({ error: mismatchMessage });
    return null;
  }

  return { clinicianId: requested || scope.clinicianId };
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
      const scope = await queueClinicianScope(
        req,
        res,
        'Doctors can only call patients who booked a consultation with them.',
      );
      if (!scope) return;

      const result = await queueService.callNextPatient({ ...(req.body || {}), ...scope });
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
      const scope = await queueClinicianScope(
        req,
        res,
        'Doctors can only advance appointments booked for their consultation.',
      );
      if (!scope) return;

      const result = await queueService.advanceQueue({ ...(req.body || {}), ...scope });
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
      const scope = await queueClinicianScope(
        req,
        res,
        'Doctors can only manage consultations booked with them.',
      );
      if (!scope) return;

      const result = await queueService.markNoShow({ ...(req.body || {}), ...scope });
      res.status(200).json({
        ...result,
        appointment: toJson(result.appointment),
      });
    }),
  );

  return router;
}
