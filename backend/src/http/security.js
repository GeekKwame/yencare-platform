const buckets = new Map();

/**
 * Minimal production headers without extra dependencies.
 */
export function securityHeaders(_req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
}

/**
 * In-memory IP rate limiter for public booking/lookup routes.
 *
 * @param {{ windowMs?: number, max?: number }} [options]
 */
export function rateLimit({ windowMs = 60_000, max = 40 } = {}) {
  return (req, res, next) => {
    const key = String(req.ip || req.socket?.remoteAddress || 'unknown');
    const now = Date.now();
    const recent = (buckets.get(key) || []).filter((stamp) => now - stamp < windowMs);

    if (recent.length >= max) {
      res.setHeader('Retry-After', String(Math.ceil(windowMs / 1000)));
      return res.status(429).json({
        error: 'Too many requests. Please wait a moment and try again.',
      });
    }

    recent.push(now);
    buckets.set(key, recent);
    next();
  };
}
