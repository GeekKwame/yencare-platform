import { normalizeGhanaPhone } from './normalizePhone.js';
import { sendViaMock } from './providers/mock.js';
import { sendViaAfricasTalking } from './providers/africastalking.js';

/**
 * Send an SMS. Able & Emmanuella should import this and nothing else.
 *
 * Default is mock (offline, free). Set SMS_PROVIDER=africastalking and
 * AT_API_KEY to hit the free Africa's Talking sandbox simulator.
 *
 * Invalid numbers throw. Provider failures return `{ ok: false }` so a
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

  const phone = normalizeGhanaPhone(to);
  const body = String(message);
  const requested = (process.env.SMS_PROVIDER || 'mock').toLowerCase().trim();
  const useAfricaTalking = requested === 'africastalking' && Boolean(process.env.AT_API_KEY);

  if (requested === 'africastalking' && !process.env.AT_API_KEY) {
    console.warn(
      '[sms] SMS_PROVIDER=africastalking but AT_API_KEY is missing; using mock fallback',
    );
  }

  const provider = useAfricaTalking ? 'africastalking' : 'mock';

  try {
    if (useAfricaTalking) {
      return await sendViaAfricasTalking(phone, body);
    }
    return await sendViaMock(phone, body);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`[sms] ${provider} send failed:`, error);
    return {
      ok: false,
      provider,
      to: phone,
      error,
    };
  }
}

export { normalizeGhanaPhone } from './normalizePhone.js';
