/**
 * Swappable storage for the rate limiter.
 *
 * The default store keeps sliding windows in this process's memory, which means
 * each API instance enforces its own quota. A shared store (Redis INCR/EXPIRE,
 * Memcached, Postgres) can be installed with `setRateLimitStore()` at boot as
 * long as it implements `hit()`; no route or middleware changes are needed.
 */

/**
 * @typedef {object} RateLimitHit
 * @property {boolean} allowed
 * @property {number} count Requests recorded in the current window.
 * @property {number} retryAfterMs Milliseconds until the window frees up (0 when allowed).
 */

/**
 * @typedef {object} RateLimitStore
 * @property {string} kind
 * @property {boolean} shared True when every API instance shares the counters.
 * @property {(key: string, options: { windowMs: number, max: number, now?: number }) => RateLimitHit | Promise<RateLimitHit>} hit
 * @property {(key?: string) => void} [reset]
 */

/** @returns {RateLimitStore} */
export function createMemoryRateLimitStore() {
  /** @type {Map<string, number[]>} */
  const buckets = new Map();

  return {
    kind: 'memory',
    shared: false,

    hit(key, { windowMs, max, now = Date.now() }) {
      const recent = (buckets.get(key) || []).filter((stamp) => now - stamp < windowMs);
      const allowed = recent.length < max;

      // Blocked requests are not recorded, so a client that backs off is let
      // back in as soon as its window drains.
      if (allowed) recent.push(now);

      if (recent.length === 0) buckets.delete(key);
      else buckets.set(key, recent);

      const oldest = recent[0] ?? now;

      return {
        allowed,
        count: recent.length,
        retryAfterMs: allowed ? 0 : Math.max(0, windowMs - (now - oldest)),
      };
    },

    reset(key) {
      if (key === undefined) buckets.clear();
      else buckets.delete(key);
    },
  };
}

let activeStore = createMemoryRateLimitStore();

/**
 * @param {RateLimitStore} store
 * @returns {RateLimitStore}
 */
export function setRateLimitStore(store) {
  if (typeof store?.hit !== 'function') {
    throw new Error('Rate limit store must implement hit()');
  }

  activeStore = store;
  return activeStore;
}

/** @returns {RateLimitStore} */
export function getRateLimitStore() {
  return activeStore;
}

/** Restores the built-in in-memory store. Used by tests. */
export function resetRateLimitStore() {
  activeStore = createMemoryRateLimitStore();
  return activeStore;
}
