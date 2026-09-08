import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  generateReferenceCode,
  generateUniqueReferenceCode,
  isValidReferenceCode,
} from '../src/utils/referenceCode.js';

describe('generateReferenceCode', () => {
  it('emits YC-XXXX 4-digit codes by default', () => {
    for (let i = 0; i < 20; i += 1) {
      const code = generateReferenceCode();
      assert.match(code, /^YC-\d{4}$/);
      assert.equal(isValidReferenceCode(code), true);
    }
  });

  it('supports a custom prefix and speakable charset', () => {
    const code = generateReferenceCode({ prefix: 'W', length: 3, charset: 'speakable' });
    assert.match(code, /^W-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{3}$/);
  });

  it('produces high uniqueness over a modest sample', () => {
    const codes = new Set();
    let guard = 0;
    while (codes.size < 50 && guard < 200) {
      codes.add(generateReferenceCode());
      guard += 1;
    }
    assert.equal(codes.size, 50);
  });
});

describe('generateUniqueReferenceCode', () => {
  it('retries until the code is free', async () => {
    const reserved = new Set();
    let attempts = 0;
    const first = generateReferenceCode();
    reserved.add(first);

    const code = await generateUniqueReferenceCode((candidate) => {
      attempts += 1;
      if (attempts === 1) return true;
      return reserved.has(candidate);
    });

    assert.match(code, /^YC-\d{4}$/);
    assert.ok(attempts >= 2);
  });

  it('throws after the collision budget is exhausted', async () => {
    await assert.rejects(
      () => generateUniqueReferenceCode(() => true, { maxAttempts: 3 }),
      /Could not allocate/,
    );
  });
});
