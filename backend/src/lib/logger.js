import { isTestRun } from './runtime.js';

/**
 * Minimal JSON-lines logger. One object per line so hosted log viewers
 * (Render, Fly, CloudWatch) can index level, message, and context without a
 * logging dependency.
 */

const LEVELS = Object.freeze({
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 100,
});

function defaultLevel(env = process.env) {
  const requested = String(env.LOG_LEVEL || '').trim().toLowerCase();
  if (requested && requested in LEVELS) return requested;
  // Test runs stay quiet so `node --test` output remains readable.
  return isTestRun(env) ? 'silent' : 'info';
}

let activeLevel = defaultLevel();

/** @param {keyof typeof LEVELS} level */
export function setLogLevel(level) {
  const next = String(level || '').trim().toLowerCase();
  if (!(next in LEVELS)) {
    throw new Error(`Unknown log level: ${level}`);
  }
  activeLevel = next;
  return activeLevel;
}

export function getLogLevel() {
  return activeLevel;
}

/**
 * Errors do not survive JSON.stringify, so unwrap them into plain fields.
 *
 * @param {unknown} value
 */
function serializeValue(value) {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      ...(value.status ? { status: value.status } : {}),
      ...(value.code ? { code: value.code } : {}),
      stack: value.stack,
    };
  }
  return value;
}

/**
 * @param {Record<string, unknown> | null | undefined} context
 * @returns {Record<string, unknown>}
 */
function serializeContext(context) {
  if (!context || typeof context !== 'object') return {};
  const out = {};
  for (const [key, value] of Object.entries(context)) {
    if (value === undefined) continue;
    out[key] = serializeValue(value);
  }
  return out;
}

/**
 * @param {keyof typeof LEVELS} level
 * @param {string} message
 * @param {Record<string, unknown>} [context]
 */
function write(level, message, context) {
  if (LEVELS[level] < LEVELS[activeLevel]) return;

  const line = {
    level,
    time: new Date().toISOString(),
    msg: String(message),
    ...serializeContext(context),
  };

  let payload;
  try {
    payload = JSON.stringify(line);
  } catch {
    payload = JSON.stringify({
      level,
      time: line.time,
      msg: line.msg,
      contextError: 'context could not be serialized',
    });
  }

  const sink = level === 'error' || level === 'warn' ? process.stderr : process.stdout;
  sink.write(`${payload}\n`);
}

export const logger = {
  debug: (message, context) => write('debug', message, context),
  info: (message, context) => write('info', message, context),
  warn: (message, context) => write('warn', message, context),
  error: (message, context) => write('error', message, context),

  /**
   * Logger bound to a fixed context, e.g. a request id or a subsystem name.
   *
   * @param {Record<string, unknown>} boundContext
   */
  child(boundContext = {}) {
    const bound = serializeContext(boundContext);
    return {
      debug: (message, context) => write('debug', message, { ...bound, ...context }),
      info: (message, context) => write('info', message, { ...bound, ...context }),
      warn: (message, context) => write('warn', message, { ...bound, ...context }),
      error: (message, context) => write('error', message, { ...bound, ...context }),
      child: (extra) => logger.child({ ...bound, ...extra }),
    };
  },
};

export { LEVELS as LOG_LEVELS };
