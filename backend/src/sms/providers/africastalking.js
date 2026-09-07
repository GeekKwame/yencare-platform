import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/**
 * Africa's Talking sandbox (free). Messages land in the web simulator,
 * not on a physical handset: https://simulator.africastalking.com:1517/
 */
export async function sendViaAfricasTalking(to, message) {
  const apiKey = process.env.AT_API_KEY;
  const username = process.env.AT_USERNAME || 'sandbox';

  if (!apiKey) {
    throw new Error('AT_API_KEY is not set');
  }

  const AfricasTalking = require('africastalking');
  const sms = AfricasTalking({ apiKey, username }).SMS;

  const options = {
    to: [to],
    message,
  };

  const senderId = process.env.AT_SENDER_ID?.trim();
  if (senderId) {
    options.senderId = senderId;
  }

  const response = await sms.send(options);
  const recipient = response?.SMSMessageData?.Recipients?.[0];

  if (!recipient) {
    return {
      ok: false,
      provider: 'africastalking',
      to,
      messageId: null,
      error: 'No recipient in Africa\'s Talking response',
      raw: response,
    };
  }

  const status = recipient.status ?? null;
  const statusCode = Number(recipient.statusCode);
  const ok =
    /^success$/i.test(String(status)) ||
    /^sent$/i.test(String(status)) ||
    (statusCode >= 100 && statusCode <= 102);

  return {
    ok,
    provider: 'africastalking',
    to,
    messageId: recipient.messageId ?? null,
    status,
    raw: response,
  };
}
