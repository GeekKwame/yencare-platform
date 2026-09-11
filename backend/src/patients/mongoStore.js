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

    /**
     * @param {string} id
     * @param {{ fullName?: string, phoneNumber?: string | null, nhis?: string | null }} fields
     */
    async update(id, fields) {
      if (!id) return null;
      const $set = {};
      if (fields.fullName != null) $set.fullName = fields.fullName;
      if (fields.phoneNumber !== undefined) $set.phone = fields.phoneNumber;
      if (fields.nhis !== undefined) $set.nhisNumber = fields.nhis || undefined;
      if (Object.keys($set).length === 0) {
        const doc = await Patient.findById(id).exec();
        return toRecord(doc);
      }

      const doc = await Patient.findByIdAndUpdate(id, { $set }, { new: true, runValidators: true }).exec();
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
