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

export const PATIENT_MATCH_FAILED_MESSAGE =
  "We couldn't confirm these details. Please check them, or see reception for help.";

export const INDEX_PHONE_CONFLICT_MESSAGE =
  'This student index and phone number belong to different patients';

const PATIENT_EDITOR_ROLES = Object.freeze(['RECEPTIONIST', 'ADMIN']);

/**
 * Patient registration / verification — prototype P02 (register) + P09 (lookup).
 *
 * POST is find-or-create: return the existing record when the index or phone
 * matches, otherwise insert. Only verified reception/admin may change an
 * existing record's phone, name or NHIS; a public caller must give the stored
 * phone to get the record back unchanged, otherwise a 409. GET is lookup-only.
 *
 * @param {PatientStore} store
 */
export function createPatientService(store) {
  return {
    /**
     * @param {unknown} body
     * @param {{ staff?: { role?: string } | null }} [context] verified `req.staff`, or null
     * @returns {Promise<{ patient: object, created: boolean }>}
     */
    async registerOrLookup(body, { staff = null } = {}) {
      const input = parseRegisterInput(body);
      const isEditor = PATIENT_EDITOR_ROLES.includes(staff?.role);
      if (!isEditor && !input.phoneNumber) {
        throw new ConflictError(PATIENT_MATCH_FAILED_MESSAGE);
      }
      const existing = await findExisting(store, input);
      if (existing.conflict || existing.patient) {
        return resolveExisting(store, existing, input, isEditor);
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
          if (raced.conflict || raced.patient) {
            return resolveExisting(store, raced, input, isEditor);
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

async function resolveExisting(store, existing, input, isEditor) {
  if (existing.conflict) {
    throw new ConflictError(isEditor ? INDEX_PHONE_CONFLICT_MESSAGE : PATIENT_MATCH_FAILED_MESSAGE);
  }
  if (isEditor) {
    return { patient: await syncExistingPatient(store, existing.patient, input), created: false };
  }

  const storedPhone = existing.patient.phoneNumber || existing.patient.phone || null;
  const storedIndex = existing.patient.studentIndex || null;
  if (
    input.phoneNumber !== storedPhone ||
    (input.studentIndex && storedIndex && input.studentIndex !== storedIndex)
  ) {
    throw new ConflictError(PATIENT_MATCH_FAILED_MESSAGE);
  }
  return { patient: existing.patient, created: false };
}

/**
 * Keep the on-file phone in sync with the number entered for this visit so
 * confirmation SMS goes to that patient, not a stale test/admin number.
 *
 * @param {PatientStore & { update?: Function }} store
 * @param {object} patient
 * @param {{ fullName: string | null, phoneNumber: string | null, nhis: string | null }} input
 */
async function syncExistingPatient(store, patient, input) {
  if (typeof store.update !== 'function') return patient;

  const storedPhone = patient.phoneNumber || patient.phone || null;
  const updates = {};
  if (input.fullName && input.fullName.trim() && input.fullName.trim() !== patient.fullName) {
    updates.fullName = input.fullName.trim();
  }
  if (input.phoneNumber && input.phoneNumber !== storedPhone) {
    updates.phoneNumber = input.phoneNumber;
  }
  if (input.nhis && input.nhis !== (patient.nhis ?? null)) {
    updates.nhis = input.nhis;
  }
  if (Object.keys(updates).length === 0) return patient;

  try {
    return (await store.update(patient.id, updates)) || patient;
  } catch (error) {
    if (isDuplicateKey(error)) {
      throw new ConflictError(INDEX_PHONE_CONFLICT_MESSAGE);
    }
    throw error;
  }
}

function isDuplicateKey(error) {
  return error?.code === 11000 || error?.code === '11000' || error?.code === '23505';
}
