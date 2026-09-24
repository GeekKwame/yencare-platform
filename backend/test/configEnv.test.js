import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  assertValidEnv,
  formatDiagnosticBanner,
  validateEnv,
} from '../src/config/env.js';

describe('Startup Environment Validator (config/env.js)', () => {
  const validDevEnv = {
    PORT: '4000',
    MONGODB_URI: 'mongodb://127.0.0.1:27017/yencare',
    JWT_SECRET: 'local-dev-jwt-secret-very-secure',
    SMS_PROVIDER: 'mock',
  };

  const validProdEnv = {
    NODE_ENV: 'production',
    PORT: '4000',
    MONGODB_URI: 'mongodb+srv://user:pass@cluster.mongodb.net/yencare',
    JWT_SECRET: 'production-strong-secret-key-32-chars',
    SMS_PROVIDER: 'mnotify',
    MNOTIFY_API_KEY: 'mnotify_api_key_valid_123',
    MONGO_MIN_POOL_SIZE: '10',
    MONGO_MAX_POOL_SIZE: '50',
  };

  describe('validateEnv', () => {
    it('accepts a complete, valid development environment', () => {
      const res = validateEnv(validDevEnv);
      assert.equal(res.valid, true);
      assert.equal(res.errors.length, 0);
      assert.equal(res.config.port, 4000);
      assert.equal(res.config.mongoUri, 'mongodb://127.0.0.1:27017/yencare');
      assert.equal(res.config.jwtSecret, 'local-dev-jwt-secret-very-secure');
    });

    it('accepts MONGO_URI as an alias for MONGODB_URI', () => {
      const res = validateEnv({
        PORT: '4000',
        MONGO_URI: 'mongodb://localhost:27017/yencare_test',
        JWT_SECRET: 'dev-secret-valid',
      });
      assert.equal(res.valid, true);
      assert.equal(res.config.mongoUri, 'mongodb://localhost:27017/yencare_test');
    });

    it('accepts MNOTIFY_KEY as an alias for MNOTIFY_API_KEY', () => {
      const res = validateEnv({
        ...validProdEnv,
        MNOTIFY_API_KEY: undefined,
        MNOTIFY_KEY: 'mnotify_alt_key_456',
      });
      assert.equal(res.valid, true);
      assert.equal(res.config.mnotifyKey, 'mnotify_alt_key_456');
    });

    it('rejects an invalid port number', () => {
      const res = validateEnv({
        ...validDevEnv,
        PORT: 'invalid-port',
      });
      assert.equal(res.valid, false);
      assert.ok(res.errors.some((e) => e.variable === 'PORT'));
    });

    it('rejects a missing or malformed MongoDB connection string', () => {
      const missing = validateEnv({
        ...validDevEnv,
        MONGODB_URI: '',
      });
      assert.equal(missing.valid, false);
      assert.ok(missing.errors.some((e) => e.variable.includes('MONGODB_URI')));

      const badProto = validateEnv({
        ...validDevEnv,
        MONGODB_URI: 'http://localhost:27017/yencare',
      });
      assert.equal(badProto.valid, false);
      assert.ok(badProto.errors.some((e) => e.message.includes('protocol format')));
    });

    it('rejects missing JWT_SECRET in production', () => {
      const res = validateEnv({
        ...validProdEnv,
        JWT_SECRET: '',
      });
      assert.equal(res.valid, false);
      assert.ok(res.errors.some((e) => e.variable === 'JWT_SECRET'));
    });

    it('rejects insecure default placeholder JWT_SECRET in production', () => {
      const res = validateEnv({
        ...validProdEnv,
        JWT_SECRET: 'change-me-in-staging',
      });
      assert.equal(res.valid, false);
      assert.ok(res.errors.some((e) => e.variable === 'JWT_SECRET' && e.message.includes('forbidden')));
    });

    it('rejects missing MNOTIFY_API_KEY in production', () => {
      const res = validateEnv({
        ...validProdEnv,
        MNOTIFY_API_KEY: '',
      });
      assert.equal(res.valid, false);
      assert.ok(res.errors.some((e) => e.variable.includes('MNOTIFY')));
    });

    it('rejects inverted connection pool boundaries', () => {
      const res = validateEnv({
        ...validDevEnv,
        MONGO_MIN_POOL_SIZE: '100',
        MONGO_MAX_POOL_SIZE: '10',
      });
      assert.equal(res.valid, false);
      assert.ok(res.errors.some((e) => e.variable === 'MONGO_MIN_POOL_SIZE'));
    });
  });

  describe('formatDiagnosticBanner', () => {
    it('produces formatted ASCII box containing errors and action items', () => {
      const banner = formatDiagnosticBanner(
        [{ variable: 'MONGODB_URI', message: 'Missing', help: 'Set MONGODB_URI' }],
        [{ variable: 'JWT_SECRET', message: 'Using default' }],
      );
      assert.ok(banner.includes('YENCARE BACKEND — STARTUP ENVIRONMENT VALIDATION'));
      assert.ok(banner.includes('CRITICAL CONFIGURATION ERRORS'));
      assert.ok(banner.includes('[MONGODB_URI]: Missing'));
      assert.ok(banner.includes('Set MONGODB_URI'));
      assert.ok(banner.includes('[JWT_SECRET]: Using default'));
    });
  });

  describe('assertValidEnv', () => {
    it('returns config object when environment is valid', () => {
      const config = assertValidEnv(validDevEnv, { logWarnings: false });
      assert.equal(config.port, 4000);
      assert.equal(config.mongoUri, 'mongodb://127.0.0.1:27017/yencare');
    });

    it('halts and throws detailed Error when critical environment variables are missing', () => {
      assert.throws(
        () => assertValidEnv({ NODE_ENV: 'production' }, { logWarnings: false }),
        (err) => {
          assert.ok(err instanceof Error);
          assert.ok(err.message.includes('Environment validation failed on startup'));
          assert.ok(err.message.includes('CRITICAL CONFIGURATION ERRORS'));
          assert.ok(Array.isArray(err.diagnostics));
          assert.ok(err.diagnostics.length >= 2);
          return true;
        },
      );
    });
  });
});
