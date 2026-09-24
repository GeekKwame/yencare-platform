import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { maskPhone, normalizeGhanaPhone, toLocalGhanaPhone } from '../src/sms/normalizePhone.js';

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

  it('strips an extra 0 after the country code', () => {
    assert.equal(normalizeGhanaPhone('+2330241234567'), '+233241234567');
    assert.equal(normalizeGhanaPhone('2330541234567'), '+233541234567');
  });

  it('strips a leading 00 international prefix', () => {
    assert.equal(normalizeGhanaPhone('00233241234567'), '+233241234567');
  });

  it('accepts Telecel and AirtelTigo prefixes', () => {
    assert.equal(normalizeGhanaPhone('0201234567'), '+233201234567');
    assert.equal(normalizeGhanaPhone('0501234567'), '+233501234567');
    assert.equal(normalizeGhanaPhone('0271234567'), '+233271234567');
    assert.equal(normalizeGhanaPhone('0571234567'), '+233571234567');
  });

  it('rejects empty and invalid values', () => {
    assert.throws(() => normalizeGhanaPhone(''), /required/);
    assert.throws(() => normalizeGhanaPhone('123'), /Invalid Ghana phone/);
  });
});

describe('toLocalGhanaPhone', () => {
  it('converts E.164 to a 0-prefixed local number for mNotify', () => {
    assert.equal(toLocalGhanaPhone('+233241234567'), '0241234567');
    assert.equal(toLocalGhanaPhone('0551234567'), '0551234567');
  });
});

describe('maskPhone', () => {
  it('masks E.164 Ghana phone numbers to +233 XX **** XXX', () => {
    assert.equal(maskPhone('+233241234567'), '+233 24 **** 567');
  });

  it('masks local 0-prefixed Ghana phone numbers', () => {
    assert.equal(maskPhone('0241234567'), '+233 24 **** 567');
    assert.equal(maskPhone('024 123 4567'), '+233 24 **** 567');
    assert.equal(maskPhone('055 987 6543'), '+233 55 **** 543');
    assert.equal(maskPhone('020 888 9999'), '+233 20 **** 999');
  });

  it('handles empty or null gracefully', () => {
    assert.equal(maskPhone(''), '');
    assert.equal(maskPhone(null), '');
    assert.equal(maskPhone(undefined), '');
  });
});
