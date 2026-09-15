import { Router } from 'express';
import { asyncHandler } from './asyncHandler.js';

function toJson(doc) {
  if (!doc) return null;
  return typeof doc.toJSON === 'function' ? doc.toJSON() : doc;
}

/**
 * Read-only clinic catalog so booking/Postman can copy real ObjectIds.
 *
 * @param {{
 *   listRooms: () => Promise<object[]>,
 *   listClinicians: () => Promise<object[]>,
 *   listTimeSlots: (filters: Record<string, string>) => Promise<object[]>,
 * }} catalog
 */
export function createCatalogRouter(catalog) {
  const router = Router();

  router.get('/rooms', asyncHandler(async (_req, res) => {
    const rooms = await catalog.listRooms();
    res.json(rooms.map(toJson));
  }));

  router.get('/clinicians', asyncHandler(async (_req, res) => {
    const clinicians = await catalog.listClinicians();
    res.json(clinicians.map(toJson));
  }));

  router.get('/time-slots', asyncHandler(async (req, res) => {
    const filters = {};
    if (typeof req.query.date === 'string') filters.date = req.query.date;
    if (typeof req.query.clinicSite === 'string') filters.clinicSite = req.query.clinicSite;
    if (typeof req.query.available === 'string') filters.available = req.query.available;
    const slots = await catalog.listTimeSlots(filters);
    res.json(slots.map(toJson));
  }));

  return router;
}
