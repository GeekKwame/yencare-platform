import mongoose from 'mongoose';

/**
 * Resolves the Clinician ObjectId string for an authenticated staff member.
 * Returns null if the staff member is not a doctor or cannot be resolved.
 *
 * @param {object} staff
 * @returns {Promise<string | null>}
 */
export async function resolveClinicianIdForStaff(staff) {
  if (!staff) return null;
  if (staff.clinicianId) return String(staff.clinicianId);
  if (staff.role !== 'DOCTOR') return null;

  if (mongoose.connection?.readyState === 1) {
    const { Clinician } = await import('../models/Clinician.js');
    const doc =
      (await Clinician.findOne({
        name: staff.name,
        ...(staff.clinicSite ? { clinicSite: staff.clinicSite } : {}),
      }).lean()) ||
      (await Clinician.findOne({ name: staff.name }).lean());

    if (doc?._id) {
      return String(doc._id);
    }
  }

  return null;
}
