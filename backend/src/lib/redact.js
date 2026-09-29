const SENSITIVE_QUERY_KEY = /phone|index|studentid|nhis|otp|token|password/i;
const INDEX_LIKE = /^\d{8}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const REDACTED = '[redacted]';

function isPhoneLike(value) {
  const text = String(value).trim();
  if (ISO_DATE.test(text)) return false;
  return /^\+?\d{9,13}$/.test(text.replace(/[\s().-]/g, ''));
}

function redactSegment(segment) {
  let decoded = segment;
  try {
    decoded = decodeURIComponent(segment);
  } catch {
    return REDACTED;
  }
  return isPhoneLike(decoded) || INDEX_LIKE.test(decoded) ? REDACTED : segment;
}

export function redactUrl(value) {
  if (typeof value !== 'string' || value === '') return value;

  const hashAt = value.indexOf('#');
  const withoutHash = hashAt === -1 ? value : value.slice(0, hashAt);
  const queryAt = withoutHash.indexOf('?');
  const path = queryAt === -1 ? withoutHash : withoutHash.slice(0, queryAt);
  const query = queryAt === -1 ? '' : withoutHash.slice(queryAt + 1);

  const safePath = path.split('/').map(redactSegment).join('/');
  if (!query) return safePath;

  const safeQuery = query
    .split('&')
    .map((pair) => {
      const eq = pair.indexOf('=');
      const rawKey = eq === -1 ? pair : pair.slice(0, eq);
      let key = rawKey;
      try {
        key = decodeURIComponent(rawKey.replace(/\+/g, ' '));
      } catch {
        return `${rawKey}=${REDACTED}`;
      }
      if (eq === -1) return rawKey;
      if (SENSITIVE_QUERY_KEY.test(key)) return `${rawKey}=${REDACTED}`;
      return `${rawKey}=${redactSegment(pair.slice(eq + 1))}`;
    })
    .join('&');

  return `${safePath}?${safeQuery}`;
}

export function maskPhoneLike(value) {
  if (typeof value !== 'string' || !isPhoneLike(value)) return value;
  const digits = value.replace(/\D/g, '');
  return `${'*'.repeat(Math.max(0, digits.length - 3))}${digits.slice(-3)}`;
}

const URL_KEYS = new Set(['path', 'url', 'originalUrl']);
const PHONE_KEYS = new Set(['phone', 'phoneNumber', 'to']);

export function redactLogValue(key, value) {
  if (URL_KEYS.has(key)) return redactUrl(value);
  if (PHONE_KEYS.has(key)) return maskPhoneLike(value);
  return value;
}
