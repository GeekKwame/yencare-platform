import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { sendSms } from '../src/sms/sendSms.js';

describe('sendSms mock fallback', () => {
  const previousProvider = process.env.SMS_PROVIDER;
  const previousKey = process.env.AT_API_KEY;

  before(() => {
    process.env.SMS_PROVIDER = 'mock';
    delete process.env.AT_API_KEY;
  });

  after(() => {
    process.env.SMS_PROVIDER = previousProvider;
    if (previousKey === undefined) {
      delete process.env.AT_API_KEY;
    } else {
      process.env.AT_API_KEY = previousKey;
    }
  });

  it('sends via mock and returns ok', async () => {
    const result = await sendSms('0241234567', 'YɛnCare test');
    assert.equal(result.ok, true);
    assert.equal(result.provider, 'mock');
    assert.equal(result.to, '+233241234567');
    assert.match(result.messageId, /^mock-/);
  });

  it('falls back to mock when africastalking is selected without a key', async () => {
    process.env.SMS_PROVIDER = 'africastalking';
    delete process.env.AT_API_KEY;
    const result = await sendSms('+233551234567', 'Missing key');
    assert.equal(result.ok, true);
    assert.equal(result.provider, 'mock');
    process.env.SMS_PROVIDER = 'mock';
  });

  it('throws when the message is empty', async () => {
    await assert.rejects(() => sendSms('+233241234567', '   '), /SMS message is required/);
  });
});
