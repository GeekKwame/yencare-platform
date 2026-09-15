/**
 * Offline / local fallback. Logs the message; never calls a paid API.
 */
export async function sendViaMock(to, message) {
  const messageId = `mock-${Date.now()}`;
  console.log(`[SMS mock] id=${messageId} to=${to}\n${message}\n`);
  return {
    ok: true,
    provider: 'mock',
    to,
    messageId,
  };
}
