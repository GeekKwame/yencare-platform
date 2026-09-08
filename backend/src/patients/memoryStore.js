import { randomUUID } from 'node:crypto';

/**
 * In-memory patient store for tests. Same interface as the MongoDB store.
 *
 * @param {object[]} [seed]
 */
export function createMemoryStore(seed = []) {
  /** @type {Map<string, object>} */
  const rows = new Map();

  for (const patient of seed) {
    const row = clone(patient);
    rows.set(row.id, row);
  }

  return {
    /**
     * @param {string | null | undefined} studentIndex
     */
    async findByStudentIndex(studentIndex) {
      if (!studentIndex) return null;
      return clone([...rows.values()].find((row) => row.studentIndex === studentIndex) ?? null);
    },

    /**
     * @param {string | null | undefined} phoneNumber
     */
    async findByPhoneNumber(phoneNumber) {
      if (!phoneNumber) return null;
      return clone([...rows.values()].find((row) => row.phoneNumber === phoneNumber) ?? null);
    },

    /**
     * @param {{
     *   id?: string,
     *   fullName: string,
     *   studentIndex?: string | null,
     *   phoneNumber?: string | null,
     *   nhis?: string | null,
     * }} patient
     */
    async insert(patient) {
      if (patient.studentIndex) {
        const taken = [...rows.values()].some((row) => row.studentIndex === patient.studentIndex);
        if (taken) throw duplicateError('student_index');
      }
      if (patient.phoneNumber) {
        const taken = [...rows.values()].some((row) => row.phoneNumber === patient.phoneNumber);
        if (taken) throw duplicateError('phone_number');
      }

      const now = new Date().toISOString();
      const row = {
        id: patient.id || randomUUID(),
        fullName: patient.fullName,
        studentIndex: patient.studentIndex ?? null,
        phoneNumber: patient.phoneNumber ?? null,
        nhis: patient.nhis ?? null,
        createdAt: now,
        updatedAt: now,
      };
      rows.set(row.id, row);
      return clone(row);
    },
  };
}

function clone(value) {
  if (value == null) return null;
  return structuredClone(value);
}

function duplicateError(column) {
  const error = new Error(`duplicate key value violates unique constraint "${column}"`);
  error.code = 11000;
  return error;
}
