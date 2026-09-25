/**
 * Normalise Ghana mobile numbers to E.164 (`+233XXXXXXXXX`).
 *
 * Accepts the forms students actually type:
 *   024 123 4567, 241234567, +233241234567, 233241234567,
 *   +233 0 24 123 4567 (extra 0 after country code), 00233241234567
 *
 * @param {string} raw
 * @returns {string}
 */
export function normalizeGhanaPhone(raw) {
  if (raw == null || String(raw).trim() === '') {
    throw new Error('Phone number is required');
  }

  const national = ghanaNationalNumber(raw);
  if (!national) {
    throw new Error(`Invalid Ghana phone: ${raw}`);
  }

  return `+233${national}`;
}

/**
 * 9-digit national mobile number (no leading 0, no country code).
 * Ghana mobiles: 20/23–27 and 50/53–57/59.
 *
 * @param {unknown} raw
 * @returns {string | null}
 */
export function ghanaNationalNumber(raw) {
  let digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return null;

  while (digits.startsWith('00')) {
    digits = digits.slice(2);
  }

  // +233 0 24 123 4567  →  2330241234567
  if (digits.startsWith('2330') && digits.length === 13) {
    digits = `233${digits.slice(4)}`;
  }

  // 0 233 24 123 4567
  if (digits.startsWith('0233') && digits.length === 13) {
    digits = digits.slice(1);
  }

  let national = null;
  if (digits.startsWith('233') && digits.length === 12) {
    national = digits.slice(3);
  } else if (digits.startsWith('0') && digits.length === 10) {
    national = digits.slice(1);
  } else if (digits.length === 9) {
    national = digits;
  }

  if (!national || !isGhanaMobileNational(national)) {
    return null;
  }

  return national;
}

function isGhanaMobileNational(national) {
  return /^(2[0-9]|5[0-9])\d{7}$/.test(national);
}

/** mNotify expects local numbers such as `0241234567`. */
export function toLocalGhanaPhone(raw) {
  const e164 = normalizeGhanaPhone(raw);
  return `0${e164.slice(4)}`;
}

/** International digits without plus, e.g. `233241234567`. */
export function toMsisdnGhanaPhone(raw) {
  return normalizeGhanaPhone(raw).slice(1);
}

/**
 * Mask Ghana phone number for public display (e.g. `+233 24 **** 567`).
 * Protects patient privacy in public lookup endpoints.
 *
 * @param {unknown} raw
 * @returns {string}
 */
export function maskPhone(raw) {
  if (raw == null) return '';
  const str = String(raw).trim();
  if (!str) return '';
  if (str.includes('*')) return str;

  const national = ghanaNationalNumber(str);
  if (national) {
    const network = national.slice(0, 2);
    const last3 = national.slice(-3);
    return `+233 ${network} **** ${last3}`;
  }

  // Fallback if raw phone contains digits
  const digits = str.replace(/\D/g, '');
  if (digits.length >= 7) {
    const prefix = digits.length >= 9 ? digits.slice(-9, -7) : digits.slice(0, 2);
    const last3 = digits.slice(-3);
    return `+233 ${prefix} **** ${last3}`;
  }

  return '****';
}

/**
 * Mask KNUST 8-digit student index number for public display (e.g. `2061****`).
 * Protects student privacy in public lookup and queue endpoints.
 *
 * @param {unknown} raw
 * @returns {string}
 */
export function maskStudentIndex(raw) {
  if (raw == null) return '';
  const str = String(raw).trim();
  if (!str) return '';
  if (str.includes('*')) return str;

  if (str.length >= 8) {
    return `${str.slice(0, 4)}****`;
  }
  if (str.length > 4) {
    return `${str.slice(0, 4)}${'*'.repeat(str.length - 4)}`;
  }
  return '****';
}

export const maskGhanaPhone = maskPhone;
