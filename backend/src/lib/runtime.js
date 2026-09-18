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

/** Host secrets that must exist before the API accepts traffic. */
export const REQUIRED_PRODUCTION_SECRETS = Object.freeze([
  'JWT_SECRET',
  'MONGODB_URI',
  'MNOTIFY_API_KEY',
]);

/**
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {string[]}
 */
export function missingProductionSecrets(env = process.env) {
  if (!isProduction(env)) return [];
  return REQUIRED_PRODUCTION_SECRETS.filter((key) => !String(env[key] || '').trim());
}

/**
 * Fail closed in production when the host has not injected secrets.
 * Local `.env` is never deployed; Render dashboard env vars are required.
 *
 * @param {NodeJS.ProcessEnv} [env]
 */
export function assertProductionSecrets(env = process.env) {
  const missing = missingProductionSecrets(env);
  if (missing.length === 0) return;

  throw new Error(
    `Missing required production environment variables: ${missing.join(', ')}. Set them in the Render dashboard (Environment), then redeploy.`,
  );
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
