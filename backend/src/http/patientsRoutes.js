import { Router } from 'express';
import { serializePatient } from '../patients/serialize.js';
import { asyncHandler } from './asyncHandler.js';

/**
 * @param {ReturnType<import('../patients/service.js').createPatientService>} patientService
 * @param {{ authenticateOptional?: import('express').RequestHandler }} [staffHttp]
 */
export function createPatientsRouter(patientService, staffHttp = null) {
  const router = Router();
  const authOptional = staffHttp?.authenticateOptional ?? ((req, res, next) => next());

  router.post('/', authOptional, asyncHandler(async (req, res) => {
    const { patient, created } = await patientService.registerOrLookup(req.body);
    res.status(created ? 201 : 200).json(serializePatient(patient, { isStaff: true }));
  }));

  router.get('/:identifier', authOptional, asyncHandler(async (req, res) => {
    const patient = await patientService.lookup(req.params.identifier);
    const isStaff = Boolean(req.staff);
    res.status(200).json(serializePatient(patient, { maskPrivate: !isStaff }));
  }));

  return router;
}
