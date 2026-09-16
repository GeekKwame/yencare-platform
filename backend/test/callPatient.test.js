import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildCalledSms } from '../src/services/callPatient.js';

describe('buildCalledSms', () => {
  it('includes turn copy, token, room, and booking id', () => {
    const message = buildCalledSms(
      { queueToken: 'A-02', referenceCode: 'YC-4821' },
      { name: 'Room 1' },
    );

    assert.match(message, /It is your turn now/);
    assert.match(message, /Token A-02 is now called to Room 1/);
    assert.match(message, /Booking ID: YC-4821/);
    assert.match(message, /Please proceed inside immediately/);
  });

  it('falls back when token and room name are missing', () => {
    const message = buildCalledSms({ referenceCode: 'YC-1001' }, null);
    assert.match(message, /Please go to the consultation room/);
    assert.match(message, /Booking ID: YC-1001/);
  });
});
