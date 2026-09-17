import { logger } from '../../lib/logger.js';

/**
 * Offline / local fallback. Logs the message; never calls a paid API.
 */
export async function sendViaMock(to, message) {
  const messageId = `mock-${Date.now()}`;
  logger.info('mock SMS dispatched', {
    subsystem: 'sms',
    provider: 'mock',
    messageId,
    to,
    body: message,
  });
  return {
    ok: true,
    provider: 'mock',
    to,
    messageId,
  };
}
