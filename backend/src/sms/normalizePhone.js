/**
 * Normalise Ghana phone numbers to E.164 (`+233XXXXXXXXX`).
 *
 * Accepts UI values such as `024 123 4567`, `241234567`, `233241234567`,
 * or `+233241234567`. Throws if the value is empty or not a Ghana mobile.
 *
 * @param {string} raw
 * @returns {string}
 */
export function normalizeGhanaPhone(raw) {
  if (raw == null || String(raw).trim() === '') {
    throw new Error('Phone number is required');
  }

  const digits = String(raw).replace(/\D/g, '');

  if (digits.startsWith('233') && digits.length === 12) {
    return `+${digits}`;
  }

  if (digits.startsWith('0') && digits.length === 10) {
    return `+233${digits.slice(1)}`;
  }

  // Local 9-digit mobile without the leading 0 (24 / 20 / 50 / 53 / 54 / 55 / 59 …)
  if (digits.length === 9 && /^[25]/.test(digits)) {
    return `+233${digits}`;
  }

  throw new Error(`Invalid Ghana phone: ${raw}`);
}
