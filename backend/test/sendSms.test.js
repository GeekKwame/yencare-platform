import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { sendSms, assertProductionSmsConfig } from '../src/sms/sendSms.js';

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

  it('falls back to mock when mnotify is selected without a key', async () => {
    process.env.SMS_PROVIDER = 'mnotify';
    delete process.env.MNOTIFY_API_KEY;
    const result = await sendSms('+233536064409', 'Missing mNotify key');
    assert.equal(result.ok, true);
    assert.equal(result.provider, 'mock');
    process.env.SMS_PROVIDER = 'mock';
  });

  it('ignores Africa’s Talking and stays on mock locally', async () => {
    process.env.SMS_PROVIDER = 'africastalking';
    const result = await sendSms('+233551234567', 'AT is unused');
    assert.equal(result.ok, true);
    assert.equal(result.provider, 'mock');
    process.env.SMS_PROVIDER = 'mock';
  });

  it('requires mNotify in production', () => {
    assert.throws(
      () =>
        assertProductionSmsConfig({
          NODE_ENV: 'production',
          SMS_PROVIDER: 'mnotify',
        }),
      /MNOTIFY_API_KEY/,
    );
    assert.throws(
      () =>
        assertProductionSmsConfig({
          NODE_ENV: 'production',
          SMS_PROVIDER: 'africastalking',
          AT_API_KEY: 'unused',
        }),
      /SMS_PROVIDER must be mnotify/,
    );
    assert.doesNotThrow(() =>
      assertProductionSmsConfig({
        NODE_ENV: 'production',
        SMS_PROVIDER: 'mnotify',
        MNOTIFY_API_KEY: 'ak_test',
      }),
    );
  });

  it('throws when the message is empty', async () => {
    await assert.rejects(() => sendSms('+233241234567', '   '), /SMS message is required/);
  });

  it('refuses to send to more than one number', async () => {
    const result = await sendSms('+233241234567,+233247001122', 'Too many');
    assert.equal(result.ok, false);
    assert.match(result.error, /single Ghana phone number/);
  });
});
