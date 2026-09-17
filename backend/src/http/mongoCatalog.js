import { Clinician, Room, TimeSlot } from '../models/index.js';

/** Live Mongo catalog used by GET /api/rooms, /clinicians, /time-slots. */
export function createMongoCatalog() {
  return {
    async listRooms() {
      return Room.find().sort({ clinicSite: 1, name: 1 }).exec();
    },

    async listClinicians() {
      return Clinician.find()
        .populate('roomId', 'name clinicSite floor status')
        .sort({ clinicSite: 1, name: 1 })
        .exec();
    },

    /**
     * @param {{ date?: string, fromDate?: string, clinicSite?: string, clinicianId?: string, available?: string }} filters
     */
    async listTimeSlots(filters = {}) {
      const query = {};
      if (filters.date) {
        query.date = filters.date;
      } else if (filters.fromDate) {
        query.date = { $gte: filters.fromDate };
      }
      if (filters.clinicSite) query.clinicSite = filters.clinicSite;
      if (filters.clinicianId) query.clinicianId = filters.clinicianId;
      if (filters.available === 'true') query.isBooked = false;
      if (filters.available === 'false') query.isBooked = true;

      return TimeSlot.find(query)
        .populate('clinicianId', 'name title specialty roomId')
        .populate('roomId', 'name clinicSite')
        .sort({ date: 1, startTime: 1 })
        .exec();
    },
  };
}
