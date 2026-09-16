import { Router } from 'express';
import { asyncHandler } from './asyncHandler.js';
import { staffGuard } from './staffGuard.js';

/**
 * Admin operations: rolling slots and appointment reminders.
 */
export function createOpsRouter(
  { ensureOpenSlots, sendAppointmentReminders } = {},
  { authenticate } = {},
) {
  const router = Router();
  const adminOnly = staffGuard(authenticate, ['ADMIN']);

  router.post(
    '/ensure-slots',
    adminOnly,
    asyncHandler(async (req, res) => {
      if (!ensureOpenSlots) {
        return res.status(501).json({ error: 'Slot generation is not available' });
      }
      const days = Number(req.body?.days || 14);
      const result = await ensureOpenSlots({ days });
      res.status(200).json(result);
    }),
  );

  router.post(
    '/send-reminders',
    adminOnly,
    asyncHandler(async (req, res) => {
      if (!sendAppointmentReminders) {
        return res.status(501).json({ error: 'Reminders are not available' });
      }
      const result = await sendAppointmentReminders({
        date: req.body?.date,
      });
      res.status(200).json(result);
    }),
  );

  return router;
}
