import { normalizeGhanaPhone } from './normalizePhone.js';
import { sendViaMock } from './providers/mock.js';
import { sendViaAfricasTalking } from './providers/africastalking.js';
import { sendViaMnotify } from './providers/mnotify.js';

function resolveProvider() {
  const requested = (process.env.SMS_PROVIDER || 'mock').toLowerCase().trim();

  if (requested === 'mnotify') {
    if (process.env.MNOTIFY_API_KEY?.trim()) return 'mnotify';
    console.warn('[sms] SMS_PROVIDER=mnotify but MNOTIFY_API_KEY is missing; using mock fallback');
    return 'mock';
  }

  if (requested === 'africastalking') {
    if (process.env.AT_API_KEY?.trim()) return 'africastalking';
    console.warn(
      '[sms] SMS_PROVIDER=africastalking but AT_API_KEY is missing; using mock fallback',
    );
    return 'mock';
  }

  return 'mock';
}

/**
 * Send an SMS. Able & Emmanuella should import this and nothing else.
 *
 * Default is mock (offline). Set SMS_PROVIDER=mnotify and MNOTIFY_API_KEY
 * to deliver to a real Ghana number (uses mNotify credits / signup bonus).
 *
 * Invalid numbers and provider failures return `{ ok: false }` so a
 * booking can still succeed if SMS delivery fails.
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
    console.error('[sms]', error);
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
    console.error('[sms] invalid destination:', error);
    return {
      ok: false,
      provider: resolveProvider(),
      to: String(to),
      error,
    };
  }

  const body = String(message);
  const provider = resolveProvider();

  const attempt = async () => {
    if (provider === 'mnotify') {
      return await sendViaMnotify(phone, body);
    }
    if (provider === 'africastalking') {
      return await sendViaAfricasTalking(phone, body);
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
      console.error(`[sms] ${provider} send failed:`, error);
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
} from './normalizePhone.js';
