import { Router } from 'express';
import { asyncHandler } from './asyncHandler.js';

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
 */
export function createQueueRouter(queueService) {
  const router = Router();

  router.post(
    '/call-next',
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
