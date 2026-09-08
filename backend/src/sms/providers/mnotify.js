import { toLocalGhanaPhone } from '../normalizePhone.js';

const QUICK_SMS_URL = 'https://api.mnotify.com/api/sms/quick';

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

  const recipient = toLocalGhanaPhone(to);
  const endpoint = process.env.MNOTIFY_API_URL?.trim() || QUICK_SMS_URL;
  const url = `${endpoint}?key=${encodeURIComponent(apiKey)}`;

  const response = await fetchImpl(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      recipient: [recipient],
      sender,
      message,
      is_schedule: false,
    }),
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

  if (!ok) {
    throw new Error(describeMnotifyError(response.status, data));
  }

  return {
    ok: true,
    provider: 'mnotify',
    to,
    messageId: data?.summary?._id ?? null,
    status: data.status ?? 'success',
    raw: data,
  };
}
