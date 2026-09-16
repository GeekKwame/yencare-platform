const DEFAULT_STAGING_ORIGINS = [
  'https://yencare-platform.vercel.app',
];

const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

/**
 * @param {string | undefined} raw comma-separated origins
 * @returns {string[]}
 */
export function parseOriginList(raw) {
  return String(raw || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

/**
 * Preview and production hostnames for this Vercel project.
 * @param {string} origin
 */
export function isYencareVercelOrigin(origin) {
  try {
    const url = new URL(origin);
    return (
      url.protocol === 'https:' &&
      url.hostname.endsWith('.vercel.app') &&
      url.hostname.startsWith('yencare-platform')
    );
  } catch {
    return false;
  }
}

/**
 * @param {string | undefined} origin
 * @param {{
 *   allowed?: string[],
 *   allowVercelPreviews?: boolean,
 *   allowLocalhost?: boolean,
 * }} [options]
 */
export function isOriginAllowed(
  origin,
  {
    allowed = [],
    allowVercelPreviews = true,
    allowLocalhost = true,
  } = {},
) {
  if (!origin) return true;
  if (allowed.includes(origin)) return true;
  if (allowVercelPreviews && isYencareVercelOrigin(origin)) return true;
  if (allowLocalhost && LOCAL_ORIGIN.test(origin)) return true;
  return false;
}

/**
 * @param {NodeJS.ProcessEnv} [env]
 */
export function buildCorsOptions(env = process.env) {
  const allowed = [
    ...DEFAULT_STAGING_ORIGINS,
    ...parseOriginList(env.CORS_ORIGIN),
  ];
  const allowVercelPreviews = env.CORS_ALLOW_VERCEL_PREVIEWS !== 'false';
  const allowLocalhost = env.NODE_ENV !== 'production';

  return {
    origin(origin, callback) {
      callback(
        null,
        isOriginAllowed(origin, {
          allowed,
          allowVercelPreviews,
          allowLocalhost,
        }),
      );
    },
  };
}

export { DEFAULT_STAGING_ORIGINS };
