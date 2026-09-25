import { logger } from '../lib/logger.js';
import { normalizeGhanaPhone } from './normalizePhone.js';
import { sendViaMock } from './providers/mock.js';
import { sendViaMnotify } from './providers/mnotify.js';

function isProduction() {
  return process.env.NODE_ENV === 'production';
}

export function assertProductionSmsConfig(env = process.env) {
  if (env.NODE_ENV !== 'production') return;

  const requested = (env.SMS_PROVIDER || 'mnotify').toLowerCase().trim();
  if (requested !== 'mnotify') {
    throw new Error('SMS_PROVIDER must be mnotify in production');
  }
  if (!env.MNOTIFY_API_KEY?.trim()) {
    throw new Error('MNOTIFY_API_KEY must be set in production');
  }
}

export function resolveProvider() {
  const requested = (process.env.SMS_PROVIDER || 'mock').toLowerCase().trim();

  if (isProduction()) {
    return 'mnotify';
  }

  if (requested === 'mnotify') {
    if (process.env.MNOTIFY_API_KEY?.trim()) return 'mnotify';
    logger.warn('SMS_PROVIDER=mnotify but MNOTIFY_API_KEY is missing; using mock fallback', {
      subsystem: 'sms',
    });
    return 'mock';
  }

  if (requested && requested !== 'mock') {
    logger.warn('unsupported SMS provider requested; using mock', {
      subsystem: 'sms',
      requested,
    });
  }

  return 'mock';
}

/**
 * Send an SMS via mNotify (live) or mock (local).
 *
 * Production requires SMS_PROVIDER=mnotify and MNOTIFY_API_KEY.
 * Local default is mock so bookings still work without credits.
 *
 * @param {string} to Ghana phone (024…, 241234567, or +233…)
 * @param {string} message SMS body
 * @returns {Promise<{ ok: boolean, provider: string, to: string, messageId?: string|null, error?: string }>}
 */
export async function sendSms(to, message) {
  if (message == null || String(message).trim() === '') {
    throw new Error('SMS message is required');
  }

  if (String(to).includes(',') || String(to).includes(';')) {
    const error = 'SMS must be sent to a single Ghana phone number';
    logger.error(error, { subsystem: 'sms' });
    return {
      ok: false,
      provider: resolveProvider(),
      to: String(to),
      error,
    };
  }

  let phone;
  try {
    phone = normalizeGhanaPhone(to);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    logger.error('invalid SMS destination', { subsystem: 'sms', reason: error });
    return {
      ok: false,
      provider: resolveProvider(),
      to: String(to),
      error,
    };
  }

  const body = String(message);
  const provider = resolveProvider();

  if (isProduction() && !process.env.MNOTIFY_API_KEY?.trim()) {
    const error = 'MNOTIFY_API_KEY is not set';
    logger.error(error, { subsystem: 'sms' });
    return { ok: false, provider: 'mnotify', to: phone, error };
  }

  const attempt = async () => {
    if (provider === 'mnotify') {
      return await sendViaMnotify(phone, body);
    }
    return await sendViaMock(phone, body);
  };

  try {
    let result = await attempt();
    if (!result?.ok) {
      result = await attempt();
    }
    return result;
  } catch (err) {
    try {
      return await attempt();
    } catch (retryErr) {
      const error = retryErr instanceof Error ? retryErr.message : String(retryErr);
      logger.error('SMS send failed', { subsystem: 'sms', provider, reason: error });
      return {
        ok: false,
        provider,
        to: phone,
        error,
      };
    }
  }
}

export {
  normalizeGhanaPhone,
  toLocalGhanaPhone,
  ghanaNationalNumber,
  maskPhone,
  maskGhanaPhone,
  maskStudentIndex,
} from './normalizePhone.js';
