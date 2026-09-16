import { toLocalGhanaPhone, toMsisdnGhanaPhone } from '../normalizePhone.js';

const QUICK_SMS_URL = 'https://api.mnotify.com/api/sms/quick';

function resolveQuickSmsUrl() {
  const configured = process.env.MNOTIFY_API_URL?.trim();
  if (!configured) return QUICK_SMS_URL;
  if (/\/sms\/group/i.test(configured)) {
    console.warn(
      '[sms] MNOTIFY_API_URL points at group SMS; using quick SMS so only the patient is messaged',
    );
    return QUICK_SMS_URL;
  }
  return configured;
}

function describeMnotifyError(status, data) {
  const detail =
    typeof data === 'string' ? data : data?.message || data?.status || JSON.stringify(data ?? {});
  return `mNotify ${status}: ${detail}`;
}

/**
 * Send via mNotify Quick SMS (real Ghana handsets). Uses the ~50 free
 * signup credits, then paid units. Docs: https://readthedocs.mnotify.com/
 */
export async function sendViaMnotify(to, message, { fetchImpl = fetch } = {}) {
  const apiKey = process.env.MNOTIFY_API_KEY?.trim();
  const sender = (process.env.MNOTIFY_SENDER_ID || 'YenCare').trim().slice(0, 11);

  if (!apiKey) {
    throw new Error('MNOTIFY_API_KEY is not set');
  }

  const local = toLocalGhanaPhone(to);
  const msisdn = toMsisdnGhanaPhone(to);
  const endpoint = resolveQuickSmsUrl();
  const url = `${endpoint}?key=${encodeURIComponent(apiKey)}`;

  const payload = (recipient) => ({
    recipient: [recipient],
    sender,
    message,
    is_schedule: false,
    schedule_date: '',
  });

  const post = async (recipient) => {
    const response = await fetchImpl(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload(recipient)),
    });

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    const ok =
      response.ok &&
      (data?.status === 'success' || data?.code === '2000' || data?.code === 2000);

    return { ok, status: response.status, data };
  };

  let result = await post(local);
  if (!result.ok && local !== msisdn) {
    result = await post(msisdn);
  }

  if (!result.ok) {
    throw new Error(describeMnotifyError(result.status, result.data));
  }

  return {
    ok: true,
    provider: 'mnotify',
    to,
    messageId: result.data?.summary?._id ?? null,
    status: result.data.status ?? 'success',
    raw: result.data,
  };
}
