import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  assertProductionSecrets,
  missingProductionSecrets,
} from '../src/lib/runtime.js';

describe('production host secrets', () => {
  it('does not require secrets outside production', () => {
    assert.deepEqual(missingProductionSecrets({}), []);
    assert.doesNotThrow(() => assertProductionSecrets({ NODE_ENV: 'development' }));
  });

  it('lists every missing Render secret in one error', () => {
    assert.deepEqual(missingProductionSecrets({ NODE_ENV: 'production' }), [
      'JWT_SECRET',
      'MONGODB_URI',
      'MNOTIFY_API_KEY',
    ]);
    assert.throws(
      () => assertProductionSecrets({ NODE_ENV: 'production' }),
      /JWT_SECRET, MONGODB_URI, MNOTIFY_API_KEY/,
    );
  });

  it('accepts a complete production environment', () => {
    assert.doesNotThrow(() =>
      assertProductionSecrets({
        NODE_ENV: 'production',
        JWT_SECRET: 'staging-secret',
        MONGODB_URI: 'mongodb+srv://example/yencare',
        MNOTIFY_API_KEY: 'ak_live',
      }),
    );
  });
});
