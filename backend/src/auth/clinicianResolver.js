import mongoose from 'mongoose';

/**
 * Resolves the Clinician ObjectId string for an authenticated staff member.
 * Returns null if the staff member is not a doctor or cannot be resolved.
 *
 * @param {object} staff
 * @returns {Promise<string | null>}
 */
export async function resolveClinicianIdForStaff(staff, options = {}) {
  if (!staff) return null;
  if (staff.role !== 'DOCTOR') return null;

  if (mongoose.connection?.readyState === 1) {
    const { Clinician } = await import('../models/Clinician.js');
    const targetSite = options.clinicSite || staff.clinicSite;
    const doc =
      (targetSite ? await Clinician.findOne({ name: staff.name, clinicSite: targetSite }).lean() : null) ||
      (staff.clinicianId ? await Clinician.findById(staff.clinicianId).lean() : null) ||
      (await Clinician.findOne({ name: staff.name }).lean());

    if (doc?._id) {
      return String(doc._id);
    }
  }

  if (staff.clinicianId) return String(staff.clinicianId);

  return null;
}

export async function resolveClinicianIdsForStaff(staff) {
  if (!staff || staff.role !== 'DOCTOR') return [];
  const ids = new Set();
  if (staff.clinicianId) ids.add(String(staff.clinicianId));

  if (mongoose.connection?.readyState === 1) {
    const { Clinician } = await import('../models/Clinician.js');
    const docs = await Clinician.find({ name: staff.name }).lean();
    for (const d of docs) {
      ids.add(String(d._id));
    }
  }

  return Array.from(ids);
}

export const UNLINKED_DOCTOR_MESSAGE =
  'Your staff account is not linked to a clinician. Ask an admin to link it.';

export async function resolveDoctorScope(staff, options = {}) {
  if (staff?.role !== 'DOCTOR') {
    return { isDoctor: false, clinicianId: null, clinicianIds: [] };
  }
  const clinicianIds = await resolveClinicianIdsForStaff(staff);
  const clinicianId = await resolveClinicianIdForStaff(staff, options);
  return { isDoctor: true, clinicianId, clinicianIds };
}
