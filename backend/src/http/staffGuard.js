/**
 * When staff auth is wired into createApp, run the JWT gate.
 * HTTP tests that omit staffAuth stay open (legacy public behaviour).
 *
 * @param {((roles?: string[]) => import('express').RequestHandler) | undefined} authenticate
 * @param {string[]} [roles]
 */
export function staffGuard(authenticate, roles = []) {
  if (typeof authenticate !== 'function') {
    return (_req, _res, next) => next();
  }
  return authenticate(roles);
}
