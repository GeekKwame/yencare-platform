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

/**
 * Guard for endpoints shared by staff and patients: attaches `req.staff` when a
 * valid staff token is present and never rejects when it is absent. Callers
 * branch on `req.staff` themselves.
 *
 * @param {((roles?: string[]) => import('express').RequestHandler) | undefined} authenticateOptional
 * @param {string[]} [roles]
 */
export function optionalStaffGuard(authenticateOptional, roles = []) {
  if (typeof authenticateOptional !== 'function') {
    return (_req, _res, next) => next();
  }
  return authenticateOptional(roles);
}
