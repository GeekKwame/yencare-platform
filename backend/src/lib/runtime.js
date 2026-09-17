/**
 * Runtime environment probes shared by logging, rate limiting, and boot guards.
 *
 * `node --test` sets NODE_TEST_CONTEXT in every test child process, so test
 * runs are detected without asking every developer to export NODE_ENV=test
 * (which is awkward on Windows shells).
 */

/** @param {NodeJS.ProcessEnv} [env] */
export function isProduction(env = process.env) {
  return env.NODE_ENV === 'production';
}

/** @param {NodeJS.ProcessEnv} [env] */
export function isTestRun(env = process.env) {
  return env.NODE_ENV === 'test' || Boolean(env.NODE_TEST_CONTEXT);
}

/**
 * Number of API instances this deployment runs, used by boot-time guards that
 * need to know whether process-local state is safe.
 *
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {number}
 */
export function instanceCount(env = process.env) {
  const raw = env.INSTANCE_COUNT ?? env.WEB_CONCURRENCY ?? '1';
  const parsed = Number.parseInt(String(raw), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}
