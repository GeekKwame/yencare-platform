import { randomUUID } from 'node:crypto';

export const REQUEST_ID_HEADER = 'X-Request-Id';

// Only reuse a caller-supplied id when it is short and boring, so it is safe to
// echo in a header and to index in logs.
const SAFE_REQUEST_ID = /^[A-Za-z0-9._:-]{8,128}$/;

/**
 * Assigns `req.id`, echoes it as the `X-Request-Id` response header, and lets a
 * trusted upstream proxy propagate its own id so one request can be traced
 * across the edge, the API, and the error handler.
 *
 * @type {import('express').RequestHandler}
 */
export function requestId(req, res, next) {
  const incoming = String(req.headers['x-request-id'] || '').trim();
  const id = SAFE_REQUEST_ID.test(incoming) ? incoming : randomUUID();

  req.id = id;
  res.setHeader(REQUEST_ID_HEADER, id);

  next();
}
