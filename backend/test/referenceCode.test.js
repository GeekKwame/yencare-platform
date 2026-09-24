import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';
import { Appointment } from '../src/models/Appointment.js';
import { markPatientArrived } from '../src/services/appointmentOps.js';
import { getQueueStatus } from '../src/services/queueEngine.js';
import {
  generateReferenceCode,
  generateUniqueReferenceCode,
  isValidReferenceCode,
  normalizeReferenceInput,
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

describe('normalizeReferenceInput', () => {
  it('trims surrounding whitespace and uppercases', () => {
    for (const raw of ['YC-4821', ' yc-4821', 'yc-4821 ', '\tYc-4821\n', '  YC-4821  ']) {
      assert.equal(normalizeReferenceInput(raw), 'YC-4821', JSON.stringify(raw));
    }
  });

  it('turns missing input into an empty string', () => {
    for (const raw of [undefined, null, '', '   ']) {
      assert.equal(normalizeReferenceInput(raw), '');
    }
  });
});

describe('reference lookups use the same normalisation as the limiter keys', () => {
  afterEach(() => mock.restoreAll());

  function query(value) {
    const chain = {
      populate: () => chain,
      then: (resolve, reject) => Promise.resolve(value).then(resolve, reject),
    };
    return chain;
  }

  it('Appointment.findByReference looks up the trimmed, uppercased code', async () => {
    let filter = null;
    mock.method(Appointment, 'findOne', (f) => {
      filter = f;
      return query(null);
    });

    await Appointment.findByReference('  yc-4821\t');
    assert.deepEqual(filter, { referenceCode: 'YC-4821' });
  });

  it('markPatientArrived and getQueueStatus look up the normalised reference', async () => {
    const seen = [];
    mock.method(Appointment, 'findByReference', async (ref) => {
      seen.push(ref);
      return null;
    });

    await assert.rejects(() => markPatientArrived(' yc-4821 '), { status: 404 });
    await assert.rejects(() => getQueueStatus('\tyc-4821 '), { status: 404 });
    assert.deepEqual(seen, ['YC-4821', 'YC-4821']);
  });
});
