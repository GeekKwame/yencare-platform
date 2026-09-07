import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { normalizeGhanaPhone } from '../src/sms/normalizePhone.js';

describe('normalizeGhanaPhone', () => {
  it('keeps E.164 numbers', () => {
    assert.equal(normalizeGhanaPhone('+233241234567'), '+233241234567');
  });

  it('converts local 0-prefixed numbers and strips spaces', () => {
    assert.equal(normalizeGhanaPhone('024 123 4567'), '+233241234567');
    assert.equal(normalizeGhanaPhone('0241234567'), '+233241234567');
  });

  it('converts 9-digit numbers without a leading 0', () => {
    assert.equal(normalizeGhanaPhone('241234567'), '+233241234567');
    assert.equal(normalizeGhanaPhone('551234567'), '+233551234567');
  });

  it('accepts digits-only 233 country code', () => {
    assert.equal(normalizeGhanaPhone('233241234567'), '+233241234567');
  });

  it('rejects empty and invalid values', () => {
    assert.throws(() => normalizeGhanaPhone(''), /required/);
    assert.throws(() => normalizeGhanaPhone('123'), /Invalid Ghana phone/);
  });
});
