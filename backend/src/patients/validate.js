import { STUDENT_INDEX_PATTERN } from '../db/constants.js';
import { normalizeGhanaPhone } from '../sms/normalizePhone.js';
import { ValidationError } from './errors.js';

/**
 * @param {unknown} obj
 * @param {string[]} keys
 * @returns {string}
 */
function firstString(obj, keys) {
  if (!obj || typeof obj !== 'object') return '';
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
    const value = obj[key];
    if (value == null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return '';
}

/**
 * @param {string} raw
 * @returns {string}
 */
export function normalizeStudentIndex(raw) {
  const value = String(raw ?? '').replace(/\s+/g, '');
  if (!STUDENT_INDEX_PATTERN.test(value)) {
    throw new ValidationError('Please enter a valid student index number (e.g. 20612345)');
  }
  return value;
}

/**
 * @param {string} raw
 * @returns {string}
 */
export function normalizeFullName(raw) {
  const value = String(raw ?? '').trim().replace(/\s+/g, ' ');
  if (value.length < 2 || value.length > 120) {
    throw new ValidationError('Please enter your full name');
  }
  return value;
}

/**
 * @param {string} raw
 * @returns {string}
 */
export function normalizeNhis(raw) {
  const value = String(raw ?? '').trim();
  if (!value) return '';
  if (value.length > 20) {
    throw new ValidationError('NHIS number is too long');
  }
  return value;
}

/**
 * Classify a path/query identifier as a student index or Ghana phone.
 * Prototype P09 searches by index (`20612345`) or phone (`024 123 4567`).
 *
 * @param {string} raw
 * @returns {{ type: 'student_index', value: string } | { type: 'phone', value: string } | { type: 'invalid', error: string }}
 */
export function classifyIdentifier(raw) {
  const decoded = String(raw ?? '').trim();
  if (!decoded) {
    return { type: 'invalid', error: 'Identifier is required' };
  }

  const digits = decoded.replace(/\D/g, '');
  const looksLikePhone =
    decoded.includes('+') ||
    /\s/.test(decoded) ||
    (digits.startsWith('233') && digits.length === 12) ||
    (digits.startsWith('0') && digits.length === 10) ||
    (digits.length === 9 && /^[25]/.test(digits));

  if (looksLikePhone) {
    try {
      return { type: 'phone', value: normalizeGhanaPhone(decoded) };
    } catch {
      return {
        type: 'invalid',
        error: 'Please enter a valid Ghana phone number (e.g. 024 123 4567)',
      };
    }
  }

  if (STUDENT_INDEX_PATTERN.test(decoded.replace(/\s+/g, ''))) {
    return { type: 'student_index', value: decoded.replace(/\s+/g, '') };
  }

  try {
    return { type: 'phone', value: normalizeGhanaPhone(decoded) };
  } catch {
    return {
      type: 'invalid',
      error: 'Identifier must be a student index (e.g. 20612345) or Ghana phone number',
    };
  }
}

/**
 * Normalise POST /api/patients body. Accepts prototype/frontend camelCase
 * (`studentIndex`, `phoneNumber`) and the ticket's snake_case names.
 *
 * @param {unknown} body
 * @returns {{ fullName: string | null, studentIndex: string | null, phoneNumber: string | null, nhis: string | null }}
 */
export function parseRegisterInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ValidationError('Request body must be a JSON object');
  }

  const rawName = firstString(body, ['fullName', 'full_name', 'patientName']);
  const rawIndex = firstString(body, ['studentIndex', 'student_index']);
  const rawPhone = firstString(body, ['phoneNumber', 'phone_number', 'phone']);
  const rawNhis = firstString(body, ['nhis', 'nhisNumber', 'nhis_number']);

  /** @type {string | null} */
  let studentIndex = null;
  if (rawIndex) {
    studentIndex = normalizeStudentIndex(rawIndex);
  }

  /** @type {string | null} */
  let phoneNumber = null;
  if (rawPhone) {
    try {
      phoneNumber = normalizeGhanaPhone(rawPhone);
    } catch {
      throw new ValidationError('Please enter a valid Ghana phone number (e.g. 024 123 4567)');
    }
  }

  if (!studentIndex && !phoneNumber) {
    throw new ValidationError('Provide a student index number or a Ghana phone number');
  }

  return {
    fullName: rawName ? normalizeFullName(rawName) : null,
    studentIndex,
    phoneNumber,
    nhis: rawNhis ? normalizeNhis(rawNhis) : null,
  };
}
