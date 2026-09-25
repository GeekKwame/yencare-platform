import helmet from 'helmet';

import { logger } from '../lib/logger.js';
import { isProduction, isTestRun } from '../lib/runtime.js';
import { getRateLimitStore } from './rateLimitStore.js';

const HSTS_MAX_AGE_SECONDS = 31_536_000; // 1 year

/**
 * Helmet is configured twice so the HSTS-in-production behaviour of the old
 * hand-rolled headers is preserved even when NODE_ENV changes after import.
 *
 * @param {boolean} withHsts
 */
function buildHelmet(withHsts) {
  return helmet({
    // JSON API: there is no HTML for a CSP or COEP to protect, and both break
    // nothing here but add noise to every response.
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    // Browser clients live on other origins (Vercel) and read this API through
    // CORS, so an opt-in resource policy would only be a footgun.
    crossOriginResourcePolicy: false,
    frameguard: { action: 'deny' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    dnsPrefetchControl: { allow: false },
    hsts: withHsts ? { maxAge: HSTS_MAX_AGE_SECONDS, includeSubDomains: true } : false,
  });
}

const helmetProduction = buildHelmet(true);
const helmetDefault = buildHelmet(false);

/**
 * Baseline response headers: Helmet plus the Permissions-Policy Helmet does
 * not manage. Keeps X-Content-Type-Options: nosniff, X-Frame-Options: DENY,
 * and production-only HSTS exactly as before.
 */
export function securityHeaders(req, res, next) {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  const apply = isProduction() ? helmetProduction : helmetDefault;
  return apply(req, res, next);
}

export const TOO_MANY_REQUESTS_MESSAGE =
  'Too many requests. Please wait a moment and try again.';

/**
 * Rate limiting is on everywhere except test runs, where deterministic
 * request counts matter more than throttling. `RATE_LIMIT_DISABLED=true`
 * is an escape hatch for local load testing only: it is ignored in
 * production, where limits can be raised with the `*_RATE_MAX` variables
 * but never turned off.
 *
 * @param {NodeJS.ProcessEnv} [env]
 */
export function rateLimitEnabled(env = process.env) {
  if (isProduction(env)) return true;
  if (rateLimitDisableRequested(env)) return false;
  return !isTestRun(env);
}

export function rateLimitDisableRequested(env = process.env) {
  return String(env.RATE_LIMIT_DISABLED || '').toLowerCase() === 'true';
}

function clientKey(req) {
  return String(req.ip || req.socket?.remoteAddress || 'unknown');
}

/**
 * Per-IP rate limiter backed by the swappable store in `rateLimitStore.js`.
 *
 * @param {{
 *   windowMs?: number,
 *   max?: number,
 *   name?: string,
 *   keyGenerator?: (req: import('express').Request) => string,
 *   store?: import('./rateLimitStore.js').RateLimitStore,
 * }} [options]
 */
export function rateLimit({
  windowMs = 60_000,
  max = 40,
  name = 'general',
  keyGenerator = clientKey,
  store = null,
} = {}) {
  return async (req, res, next) => {
    const activeStore = store || getRateLimitStore();
    const key = `${name}:${keyGenerator(req)}`;

    let hit;
    try {
      hit = await activeStore.hit(key, { windowMs, max });
    } catch (err) {
      // A limiter outage must not become an API outage: fail open and shout.
      logger.error('rate limit store unavailable; allowing request', {
        subsystem: 'rate-limit',
        limiter: name,
        err,
      });
      return next();
    }

    if (!hit.allowed) {
      const retryAfterSeconds = Math.max(1, Math.ceil((hit.retryAfterMs || windowMs) / 1000));
      res.setHeader('Retry-After', String(retryAfterSeconds));
      logger.warn('rate limit exceeded', {
        subsystem: 'rate-limit',
        limiter: name,
        requestId: req.id,
        method: req.method,
        path: req.originalUrl || req.url,
      });
      return res.status(429).json({ error: TOO_MANY_REQUESTS_MESSAGE });
    }

    return next();
  };
}

const PROHIBITED_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Recursively inspects and sanitizes objects or arrays, removing keys that
 * begin with '$' (MongoDB operator injection vectors like $gt, $ne, $regex)
 * or contain '.' (dotted property path injection). Also strips dangerous
 * prototype pollution keys (__proto__, constructor, prototype).
 *
 * Mutates the object in-place and returns it for convenience.
 *
 * @template T
 * @param {T} value
 * @returns {T}
 */
export function sanitizeNoSql(value) {
  if (!value || typeof value !== 'object') {
    return value;
  }

  if (value instanceof Date || (typeof Buffer !== 'undefined' && Buffer.isBuffer(value))) {
    return value;
  }

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      value[i] = sanitizeNoSql(value[i]);
    }
    return value;
  }

  for (const key of Object.getOwnPropertyNames(value)) {
    if (PROHIBITED_KEYS.has(key) || key.startsWith('$') || key.includes('.')) {
      delete value[key];
    } else {
      value[key] = sanitizeNoSql(value[key]);
    }
  }

  return value;
}

/**
 * Global defense-in-depth Express middleware that recursively sanitizes
 * `req.body`, `req.query`, and `req.params` against NoSQL operator injection.
 *
 * Strips all operator keys (starting with '$' or containing '.') before
 * parameters reach application routes or database queries.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} _res
 * @param {import('express').NextFunction} next
 */
export function nosqlSanitizer(req, _res, next) {
  if (req.body && typeof req.body === 'object') {
    sanitizeNoSql(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    sanitizeNoSql(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    sanitizeNoSql(req.params);
  }
  return next();
}
