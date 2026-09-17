import { Router } from 'express';
import { asyncHandler } from './asyncHandler.js';

/**
 * @param {ReturnType<import('../auth/staffAuth.js').createStaffAuthService>} staffAuth
 */
export function createAuthRouter(staffAuth) {
  const router = Router();

  router.post(
    '/staff-login',
    asyncHandler(async (req, res) => {
      const result = await staffAuth.login({
        identifier: req.body?.identifier,
        email: req.body?.email,
        staffId: req.body?.staffId,
        password: req.body?.password,
      });

      res.status(200).json(result);
    }),
  );

  // Swaps a still-valid staff token for one with a fresh expiry so a
  // receptionist is not signed out mid-shift. Expired tokens must sign in again.
  router.post(
    '/staff-refresh',
    staffAuth.authenticate(),
    asyncHandler(async (req, res) => {
      const result = await staffAuth.refresh(
        String(req.headers.authorization || '').replace(/^Bearer\s+/i, ''),
      );

      res.status(200).json(result);
    }),
  );

  router.get(
    '/staff-me',
    staffAuth.authenticate(),
    asyncHandler(async (req, res) => {
      const staff = await staffAuth.readStaffFromToken(
        String(req.headers.authorization || '').replace(/^Bearer\s+/i, ''),
      );
      res.status(200).json({ staff });
    }),
  );

  return router;
}
