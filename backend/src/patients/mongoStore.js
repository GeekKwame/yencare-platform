import { Patient } from '../models/Patient.js';

/**
 * Persist patients through the existing Mongoose `Patient` model
 * (`phone`, `studentIndex`, `nhisNumber`).
 */
export function createMongoPatientStore() {
  return {
    /**
     * @param {string | null | undefined} studentIndex
     */
    async findByStudentIndex(studentIndex) {
      if (!studentIndex) return null;
      const doc = await Patient.findOne({ studentIndex }).exec();
      return toRecord(doc);
    },

    /**
     * @param {string | null | undefined} phoneNumber E.164
     */
    async findByPhoneNumber(phoneNumber) {
      if (!phoneNumber) return null;
      const doc = await Patient.findOne({ phone: phoneNumber }).exec();
      return toRecord(doc);
    },

    /**
     * @param {{
     *   fullName: string,
     *   studentIndex?: string | null,
     *   phoneNumber: string,
     *   nhis?: string | null,
     * }} patient
     */
    async insert(patient) {
      const doc = await Patient.create({
        fullName: patient.fullName,
        phone: patient.phoneNumber,
        studentIndex: patient.studentIndex || undefined,
        nhisNumber: patient.nhis || undefined,
      });
      return toRecord(doc);
    },
  };
}

function toRecord(doc) {
  if (!doc) return null;
  const json = typeof doc.toJSON === 'function' ? doc.toJSON() : doc;
  return {
    id: String(json.id || json._id),
    fullName: json.fullName,
    studentIndex: json.studentIndex ?? null,
    phoneNumber: json.phone ?? null,
    nhis: json.nhisNumber ?? null,
    createdAt: json.createdAt ?? null,
    updatedAt: json.updatedAt ?? null,
  };
}
