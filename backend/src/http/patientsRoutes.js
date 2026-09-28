import { Router } from 'express';
import { serializePatient } from '../patients/serialize.js';
import { asyncHandler } from './asyncHandler.js';
import { optionalStaffGuard, staffGuard } from './staffGuard.js';

const passthrough = (_req, _res, next) => next();

/**
 * @param {ReturnType<import('../patients/service.js').createPatientService>} patientService
 * @param {{
 *   authenticate?: (roles?: string[]) => import('express').RequestHandler,
 *   authenticateOptional?: (roles?: string[]) => import('express').RequestHandler,
 *   publicRegisterLimiter?: import('express').RequestHandler,
 * }} [options]
 */
export function createPatientsRouter(
  patientService,
  { authenticate, authenticateOptional, publicRegisterLimiter = passthrough } = {},
) {
  const router = Router();
  const maybeDeskStaff = optionalStaffGuard(authenticateOptional, ['RECEPTIONIST', 'ADMIN']);
  const deskStaff = staffGuard(authenticate, ['RECEPTIONIST', 'ADMIN']);
  const limitPublic = (req, res, next) =>
    req.staff ? next() : publicRegisterLimiter(req, res, next);

  router.post('/', maybeDeskStaff, limitPublic, asyncHandler(async (req, res) => {
    const { patient, created } = await patientService.registerOrLookup(req.body, {
      staff: req.staff || null,
    });
    if (!req.staff) {
      return res.status(200).json({ id: patient.id });
    }
    res.status(created ? 201 : 200).json(serializePatient(patient));
  }));

  router.get('/:identifier', deskStaff, asyncHandler(async (req, res) => {
    const patient = await patientService.lookup(req.params.identifier);
    res.status(200).json(serializePatient(patient));
  }));

  return router;
}
