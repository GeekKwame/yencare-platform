import { Router } from 'express';
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

  router.post(
    '/call-next',
    callNextStaff,
    asyncHandler(async (req, res) => {
      const result = await queueService.callNextPatient(req.body || {});
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
      const result = await queueService.advanceQueue(req.body || {});
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
      const result = await queueService.markNoShow(req.body || {});
      res.status(200).json({
        ...result,
        appointment: toJson(result.appointment),
      });
    }),
  );

  return router;
}
