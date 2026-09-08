import { randomUUID } from 'node:crypto';
import { ConflictError, NotFoundError, ValidationError } from './errors.js';
import { classifyIdentifier, parseRegisterInput } from './validate.js';

/**
 * @typedef {{
 *   findByStudentIndex: (studentIndex: string | null | undefined) => Promise<object | null>,
 *   findByPhoneNumber: (phoneNumber: string | null | undefined) => Promise<object | null>,
 *   insert: (patient: object) => Promise<object>,
 * }} PatientStore
 */

/**
 * Patient registration / verification — prototype P02 (register) + P09 (lookup).
 *
 * POST is find-or-create: return the existing record when the index or phone
 * matches, otherwise insert. GET is lookup-only.
 *
 * @param {PatientStore} store
 */
export function createPatientService(store) {
  return {
    /**
     * @param {unknown} body
     * @returns {Promise<{ patient: object, created: boolean }>}
     */
    async registerOrLookup(body) {
      const input = parseRegisterInput(body);
      const existing = await findExisting(store, input);
      if (existing.conflict) {
        throw new ConflictError(
          'This student index and phone number belong to different patients',
        );
      }
      if (existing.patient) {
        return { patient: existing.patient, created: false };
      }

      if (!input.fullName) {
        throw new ValidationError('Please enter your full name');
      }
      if (!input.phoneNumber) {
        throw new ValidationError('Please enter a valid Ghana phone number (e.g. 024 123 4567)');
      }

      try {
        const patient = await store.insert({
          id: randomUUID(),
          fullName: input.fullName,
          studentIndex: input.studentIndex,
          phoneNumber: input.phoneNumber,
          nhis: input.nhis,
        });
        return { patient, created: true };
      } catch (error) {
        if (isDuplicateKey(error)) {
          const raced = await findExisting(store, input);
          if (raced.patient) {
            return { patient: raced.patient, created: false };
          }
        }
        throw error;
      }
    },

    /**
     * @param {string} identifier student index or Ghana phone
     */
    async lookup(identifier) {
      const classified = classifyIdentifier(identifier);
      if (classified.type === 'invalid') {
        throw new ValidationError(classified.error);
      }

      const patient =
        classified.type === 'student_index'
          ? await store.findByStudentIndex(classified.value)
          : await store.findByPhoneNumber(classified.value);

      if (!patient) {
        throw new NotFoundError('Patient not found');
      }

      return patient;
    },
  };
}

/**
 * @param {PatientStore} store
 * @param {{ studentIndex: string | null, phoneNumber: string | null }} input
 */
async function findExisting(store, input) {
  const byIndex = input.studentIndex
    ? await store.findByStudentIndex(input.studentIndex)
    : null;
  const byPhone = input.phoneNumber
    ? await store.findByPhoneNumber(input.phoneNumber)
    : null;

  if (byIndex && byPhone && byIndex.id !== byPhone.id) {
    return { conflict: true, patient: null };
  }

  return { conflict: false, patient: byIndex || byPhone || null };
}

function isDuplicateKey(error) {
  return error?.code === 11000 || error?.code === '11000' || error?.code === '23505';
}
