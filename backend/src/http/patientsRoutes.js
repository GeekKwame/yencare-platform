import { Router } from 'express';
import { serializePatient } from '../patients/serialize.js';
import { asyncHandler } from './asyncHandler.js';
import { optionalStaffGuard, staffGuard } from './staffGuard.js';

/**
 * @param {ReturnType<import('../patients/service.js').createPatientService>} patientService
 * @param {{
 *   authenticate?: (roles?: string[]) => import('express').RequestHandler,
 *   authenticateOptional?: (roles?: string[]) => import('express').RequestHandler,
 * }} [options]
 */
export function createPatientsRouter(patientService, { authenticate, authenticateOptional } = {}) {
  const router = Router();
  const maybeDeskStaff = optionalStaffGuard(authenticateOptional, ['RECEPTIONIST', 'ADMIN']);
  const deskStaff = staffGuard(authenticate, ['RECEPTIONIST', 'ADMIN']);

  router.post('/', maybeDeskStaff, asyncHandler(async (req, res) => {
    const { patient, created } = await patientService.registerOrLookup(req.body, {
      staff: req.staff || null,
    });
    res.status(created ? 201 : 200).json(serializePatient(patient, { maskNhis: !req.staff }));
  }));

  router.get('/:identifier', deskStaff, asyncHandler(async (req, res) => {
    const patient = await patientService.lookup(req.params.identifier);
    res.status(200).json(serializePatient(patient));
  }));

  return router;
}
