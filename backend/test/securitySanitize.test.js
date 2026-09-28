import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';

import { createApp } from '../src/http/app.js';
import { nosqlSanitizer, sanitizeNoSql } from '../src/http/security.js';
import { createMemoryStore } from '../src/patients/memoryStore.js';
import { createPatientService } from '../src/patients/service.js';
import { createStaffAuthService } from '../src/auth/staffAuth.js';
import { maskPhone, maskStudentIndex } from '../src/sms/normalizePhone.js';

describe('sanitizeNoSql unit tests', () => {
  it('strips top-level MongoDB operator keys starting with $', () => {
    const payload = {
      $gt: '',
      $ne: null,
      $regex: '.*',
      $where: 'sleep(5000)',
      validField: 'safeValue',
    };
    const sanitized = sanitizeNoSql(payload);
    assert.deepEqual(sanitized, { validField: 'safeValue' });
    assert.equal(sanitized.$gt, undefined);
    assert.equal(sanitized.$ne, undefined);
    assert.equal(sanitized.$regex, undefined);
    assert.equal(sanitized.$where, undefined);
  });

  it('strips keys containing dotted property paths', () => {
    const payload = {
      'patient.phone': '0241234567',
      'user.role': 'ADMIN',
      validKey: 'ok',
    };
    const sanitized = sanitizeNoSql(payload);
    assert.deepEqual(sanitized, { validKey: 'ok' });
    assert.equal(sanitized['patient.phone'], undefined);
    assert.equal(sanitized['user.role'], undefined);
  });

  it('strips prototype pollution keys', () => {
    const payload = JSON.parse(
      '{"__proto__": {"polluted": true}, "constructor": "malicious", "prototype": "malicious", "studentIndex": "20612345"}'
    );
    const sanitized = sanitizeNoSql(payload);
    assert.equal(Object.prototype.hasOwnProperty.call(sanitized, '__proto__'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(sanitized, 'constructor'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(sanitized, 'prototype'), false);
    assert.equal(sanitized.studentIndex, '20612345');
  });

  it('recursively sanitizes deeply nested objects', () => {
    const payload = {
      query: {
        filter: {
          $or: [{ studentIndex: '20612345' }, { $gt: '' }],
          target: { $ne: null },
          name: 'Akosua',
        },
      },
    };
    const sanitized = sanitizeNoSql(payload);
    assert.deepEqual(sanitized, {
      query: {
        filter: {
          name: 'Akosua',
          target: {},
        },
      },
    });
  });

  it('recursively sanitizes objects inside arrays', () => {
    const payload = [
      { $gt: '5', valid: true },
      { 'nested.key': 'bad', count: 10 },
      'primitiveString',
      42,
    ];
    const sanitized = sanitizeNoSql(payload);
    assert.deepEqual(sanitized, [
      { valid: true },
      { count: 10 },
      'primitiveString',
      42,
    ]);
  });

  it('handles primitives, null, and undefined without errors', () => {
    assert.equal(sanitizeNoSql(null), null);
    assert.equal(sanitizeNoSql(undefined), undefined);
    assert.equal(sanitizeNoSql('test-string'), 'test-string');
    assert.equal(sanitizeNoSql(12345), 12345);
    assert.equal(sanitizeNoSql(true), true);
  });
});

describe('nosqlSanitizer middleware unit tests', () => {
  it('sanitizes req.body, req.query, and req.params in place and calls next()', () => {
    const req = {
      body: { $gt: '', username: 'student' },
      query: { 'search.name': 'Kofi', ref: 'YC-4821' },
      params: { id: '123' },
    };
    let nextCalled = false;
    nosqlSanitizer(req, {}, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.deepEqual(req.body, { username: 'student' });
    assert.deepEqual(req.query, { ref: 'YC-4821' });
    assert.deepEqual(req.params, { id: '123' });
  });

  it('tolerates missing or non-object req properties gracefully', () => {
    const req = { body: null, query: undefined };
    let nextCalled = false;
    nosqlSanitizer(req, {}, () => {
      nextCalled = true;
    });
    assert.equal(nextCalled, true);
  });
});

describe('HTTP End-to-End NoSQL Operator Sanitization & Privacy Guards', () => {
  /** @type {{ server: import('node:http').Server }[]} */
  const started = [];

  after(async () => {
    await Promise.all(
      started.map(
        ({ server }) =>
          new Promise((resolve, reject) => {
            server.close((err) => (err ? reject(err) : resolve()));
          }),
      ),
    );
  });

  async function client(overrides = {}) {
    const staffAuth = createStaffAuthService({
      jwtSecret: 'test-secret-at-least-32-chars-long-12345',
      demoPassword: 'TestPassword123!',
    });

    let receivedBody = null;
    let receivedQuery = null;

    const app = createApp({
      patientService: createPatientService(createMemoryStore()),
      appointmentService: {
        createAppointment: async (payload) => {
          receivedBody = payload;
          return {
            appointment: {
              id: 'app-001',
              referenceCode: 'YC-4821',
              status: 'BOOKED',
            },
            sms: { ok: true },
          };
        },
        lookupAppointment: async (criteria) => {
          receivedQuery = criteria;
          return {
            id: 'app-001',
            referenceCode: 'YC-4821',
            status: 'BOOKED',
            studentIndex: '20612345',
            patientId: {
              fullName: 'Kofi Mensah',
              phone: '+233241234567',
              studentIndex: '20612345',
            },
          };
        },
        findByReference: async () => ({
          id: 'app-001',
          referenceCode: 'YC-4821',
          status: 'BOOKED',
          studentIndex: '20612345',
          patientId: {
            fullName: 'Kofi Mensah',
            phone: '+233241234567',
            studentIndex: '20612345',
          },
        }),
        ...overrides,
      },
      staffAuth,
    });

    const instance = await new Promise((resolve) => {
      const server = app.listen(0, '127.0.0.1', () => {
        const { port } = server.address();
        resolve({ server, url: `http://127.0.0.1:${port}` });
      });
    });

    started.push(instance);
    return {
      ...instance,
      getReceivedBody: () => receivedBody,
      getReceivedQuery: () => receivedQuery,
    };
  }

  it('strips NoSQL operators from JSON request body before route processing', async () => {
    const { url, getReceivedBody } = await client();

    const payload = {
      fullName: 'Akosua Mensah',
      phone: '0241234567',
      studentIndex: '20612345',
      $gt: '',
      $where: 'sleep(1000)',
      'malicious.field': 'injected',
    };

    const res = await fetch(`${url}/api/appointments`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });

    // Request should reach handler with operator keys stripped
    const received = getReceivedBody();
    assert.ok(received);
    assert.equal(received.$gt, undefined);
    assert.equal(received.$where, undefined);
    assert.equal(received['malicious.field'], undefined);
    assert.equal(received.fullName, 'Akosua Mensah');
  });

  it('masks student index (2061****) and phone in public appointment lookup', async () => {
    const { url } = await client();

    const res = await fetch(
      `${url}/api/appointments/lookup?reference=YC-4821`,
      { headers: { 'x-booking-phone': '0241234567' } },
    );
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.referenceCode, 'YC-4821');
    assert.equal(body.maskedPhone, '+233 24 **** 567');
    assert.equal(body.patientId.phone, '+233 24 **** 567');

    // Student index privacy verification:
    assert.equal(body.studentIndex, '2061****');
    assert.equal(body.patientId.studentIndex, '2061****');
    assert.notEqual(JSON.stringify(body).includes('20612345'), true);
  });

  it('masks student index (2061****) and phone in public reference GET', async () => {
    const { url } = await client();

    const res = await fetch(
      `${url}/api/appointments/YC-4821`,
      { headers: { 'x-booking-phone': '0241234567' } },
    );
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.referenceCode, 'YC-4821');
    assert.equal(body.studentIndex, '2061****');
    assert.equal(body.patientId.studentIndex, '2061****');
    assert.equal(body.patientId.phone, '+233 24 **** 567');
  });
});

describe('maskStudentIndex helper tests', () => {
  it('masks 8-digit student index preserving first 4 digits', () => {
    assert.equal(maskStudentIndex('20612345'), '2061****');
    assert.equal(maskStudentIndex('20620111'), '2062****');
  });

  it('returns empty string for null, undefined, or empty', () => {
    assert.equal(maskStudentIndex(null), '');
    assert.equal(maskStudentIndex(undefined), '');
    assert.equal(maskStudentIndex(''), '');
  });

  it('preserves already masked index strings', () => {
    assert.equal(maskStudentIndex('2061****'), '2061****');
  });
});
