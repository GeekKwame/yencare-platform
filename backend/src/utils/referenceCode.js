import { randomInt } from 'node:crypto';
import { REFERENCE_CODE_PATTERN } from '../db/constants.js';

const DIGITS = '0123456789';
/** Speakable set: no 0/1/I/O/L (easy to confuse on a phone). */
const SPEAKABLE = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

/**
 * Build a speakable `YC-XXXX` code. Default is 4 digits to match the product
 * examples (`YC-4821`, `YC-7913`).
 *
 * @param {{ prefix?: string, length?: number, charset?: 'digits' | 'speakable' }} [options]
 * @returns {string}
 */
export function generateReferenceCode({ prefix = 'YC', length = 4, charset = 'digits' } = {}) {
  const alphabet = charset === 'speakable' ? SPEAKABLE : DIGITS;
  let body = '';
  for (let i = 0; i < length; i += 1) {
    body += alphabet[randomInt(alphabet.length)];
  }
  return `${prefix}-${body}`;
}

export function isValidReferenceCode(code) {
  return typeof code === 'string' && REFERENCE_CODE_PATTERN.test(code);
}

/**
 * Allocate a code that `existsFn` has not seen. Retries on collision.
 *
 * @param {(code: string) => Promise<boolean> | boolean} [existsFn]
 * @param {{ prefix?: string, length?: number, charset?: 'digits' | 'speakable', maxAttempts?: number }} [options]
 * @returns {Promise<string>}
 */
export async function generateUniqueReferenceCode(existsFn, options = {}) {
  const maxAttempts = options.maxAttempts ?? 24;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const code = generateReferenceCode(options);
    const taken = existsFn ? await existsFn(code) : false;
    if (!taken) return code;
  }

  throw new Error(
    `Could not allocate a unique ${options.prefix ?? 'YC'} reference code after ${maxAttempts} attempts`,
  );
}

/**
 * Allocate a code against the Appointment collection when Mongo is connected;
 * otherwise return a freshly generated code (unit tests / dry-run).
 */
export async function allocateReferenceCode(AppointmentModel, options = {}) {
  const connected = AppointmentModel?.db?.readyState === 1;
  if (!connected) {
    return generateReferenceCode(options);
  }

  return generateUniqueReferenceCode(
    async (code) => Boolean(await AppointmentModel.exists({ referenceCode: code })),
    options,
  );
}
