import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { sendViaMnotify } from '../src/sms/providers/mnotify.js';

describe('sendViaMnotify', () => {
  const previousKey = process.env.MNOTIFY_API_KEY;
  const previousSender = process.env.MNOTIFY_SENDER_ID;

  before(() => {
    process.env.MNOTIFY_API_KEY = 'test-key';
    process.env.MNOTIFY_SENDER_ID = 'YenCare';
  });

  after(() => {
    if (previousKey === undefined) delete process.env.MNOTIFY_API_KEY;
    else process.env.MNOTIFY_API_KEY = previousKey;
    if (previousSender === undefined) delete process.env.MNOTIFY_SENDER_ID;
    else process.env.MNOTIFY_SENDER_ID = previousSender;
  });

  it('posts a local Ghana number to the quick SMS endpoint', async () => {
    const calls = [];
    const fetchImpl = async (url, options) => {
      calls.push({ url, options });
      return {
        ok: true,
        status: 200,
        json: async () => ({
          status: 'success',
          code: '2000',
          summary: { _id: 'campaign-1' },
        }),
      };
    };

    const result = await sendViaMnotify('+233241234567', 'YɛnCare test', { fetchImpl });
    assert.equal(result.ok, true);
    assert.equal(result.provider, 'mnotify');
    assert.equal(result.messageId, 'campaign-1');
    assert.match(calls[0].url, /api\.mnotify\.com\/api\/sms\/quick\?key=test-key/);
    assert.deepEqual(JSON.parse(calls[0].options.body), {
      recipient: ['0241234567'],
      sender: 'YenCare',
      message: 'YɛnCare test',
      is_schedule: false,
      schedule_date: '',
    });
    assert.equal(JSON.parse(calls[0].options.body).recipient.length, 1);
  });

  it('does not use the group SMS endpoint even if MNOTIFY_API_URL is misconfigured', async () => {
    const previousUrl = process.env.MNOTIFY_API_URL;
    process.env.MNOTIFY_API_URL = 'https://api.mnotify.com/api/sms/group';
    const calls = [];
    try {
      await sendViaMnotify('+233241234567', 'YɛnCare test', {
        fetchImpl: async (url, options) => {
          calls.push({ url, options });
          return {
            ok: true,
            status: 200,
            json: async () => ({ status: 'success', code: '2000', summary: { _id: 'campaign-2' } }),
          };
        },
      });
    } finally {
      if (previousUrl === undefined) delete process.env.MNOTIFY_API_URL;
      else process.env.MNOTIFY_API_URL = previousUrl;
    }

    assert.match(calls[0].url, /\/api\/sms\/quick\?/);
    assert.equal(JSON.parse(calls[0].options.body).recipient.length, 1);
  });
});
