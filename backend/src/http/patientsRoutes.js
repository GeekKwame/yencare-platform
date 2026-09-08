import { Router } from 'express';
import { serializePatient } from '../patients/serialize.js';

/**
 * @param {ReturnType<import('../patients/service.js').createPatientService>} patientService
 */
export function createPatientsRouter(patientService) {
  const router = Router();

  router.post('/', asyncHandler(async (req, res) => {
    const { patient, created } = await patientService.registerOrLookup(req.body);
    res.status(created ? 201 : 200).json(serializePatient(patient));
  }));

  router.get('/:identifier', asyncHandler(async (req, res) => {
    const patient = await patientService.lookup(req.params.identifier);
    res.status(200).json(serializePatient(patient));
  }));

  return router;
}

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
