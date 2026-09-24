import { logger } from '../lib/logger.js';
import { isProduction, isTestRun } from '../lib/runtime.js';

/**
 * Expected environment configuration schema for the YenCare backend API.
 */
export const REQUIRED_VARS = Object.freeze({
  PORT: {
    name: 'PORT',
    description: 'HTTP listening port for the Express application (default: 4000)',
    required: false,
    default: '4000',
    validate: (val) => {
      const num = Number(val);
      return Number.isInteger(num) && num > 0 && num <= 65535;
    },
    formatError: 'PORT must be an integer between 1 and 65535.',
  },
  MONGODB_URI: {
    name: 'MONGODB_URI',
    aliases: ['MONGO_URI'],
    description: 'MongoDB connection string (local mongod or Atlas cluster URI)',
    required: true,
    validate: (val) => {
      const s = String(val || '').trim();
      return s.startsWith('mongodb://') || s.startsWith('mongodb+srv://');
    },
    formatError: 'MONGODB_URI must begin with mongodb:// or mongodb+srv://',
  },
  JWT_SECRET: {
    name: 'JWT_SECRET',
    description: 'Cryptographic secret used to sign and verify staff JWT tokens',
    required: true,
    productionOnlyRequired: false,
    validate: (val, env) => {
      const s = String(val || '').trim();
      if (!s) return false;
      if (isProduction(env) && (s === 'change-me-in-staging' || s === 'yencare-dev-jwt-secret')) {
        return false;
      }
      return s.length >= 8;
    },
    formatError: 'JWT_SECRET must be at least 8 characters long and cannot use insecure defaults in production.',
  },
  MNOTIFY_API_KEY: {
    name: 'MNOTIFY_API_KEY',
    aliases: ['MNOTIFY_KEY'],
    description: 'mNotify Ghana SMS Gateway API v2 Key',
    required: false,
    requiredWhen: (env) => isProduction(env) || env.SMS_PROVIDER === 'mnotify',
    validate: (val) => Boolean(String(val || '').trim()),
    formatError: 'MNOTIFY_API_KEY is required in production or when SMS_PROVIDER=mnotify.',
  },
});

/**
 * Validates process environment against YenCare runtime requirements.
 *
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {{
 *   valid: boolean,
 *   errors: { variable: string, message: string, help: string }[],
 *   warnings: { variable: string, message: string }[],
 *   config: Record<string, any>
 * }}
 */
export function validateEnv(env = process.env) {
  const errors = [];
  const warnings = [];
  const inProd = isProduction(env);
  const inTest = isTestRun(env);

  // 1. Resolve PORT
  const rawPort = env.PORT || '4000';
  const portNum = Number(rawPort);
  if (!Number.isInteger(portNum) || portNum <= 0 || portNum > 65535) {
    errors.push({
      variable: 'PORT',
      message: `Invalid port "${rawPort}".`,
      help: 'Set PORT to a valid integer (e.g. 4000).',
    });
  }

  // 2. Resolve MONGODB_URI / MONGO_URI
  const mongoUri = String(env.MONGODB_URI || env.MONGO_URI || '').trim();
  if (!mongoUri) {
    // In test runs without MONGODB_TEST_URI, tests use memoryStore/mocks, but server boot requires it.
    errors.push({
      variable: 'MONGODB_URI (or MONGO_URI)',
      message: 'MongoDB connection string is missing.',
      help: 'Set MONGODB_URI=mongodb://127.0.0.1:27017/yencare or provide an Atlas connection string.',
    });
  } else if (!mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://')) {
    errors.push({
      variable: 'MONGODB_URI (or MONGO_URI)',
      message: 'Connection string has invalid protocol format.',
      help: 'Connection string must start with "mongodb://" or "mongodb+srv://".',
    });
  }

  // 3. Resolve JWT_SECRET
  const jwtSecret = String(env.JWT_SECRET || '').trim();
  if (!jwtSecret) {
    if (inProd) {
      errors.push({
        variable: 'JWT_SECRET',
        message: 'JWT secret is missing in production environment.',
        help: 'Provide a strong random secret (32+ chars) in Render / hosting environment.',
      });
    } else {
      warnings.push({
        variable: 'JWT_SECRET',
        message: 'JWT_SECRET is unset; falling back to insecure development secret.',
      });
    }
  } else if (inProd && (jwtSecret === 'change-me-in-staging' || jwtSecret === 'yencare-dev-jwt-secret')) {
    errors.push({
      variable: 'JWT_SECRET',
      message: 'Default development JWT_SECRET placeholder is forbidden in production.',
      help: 'Change JWT_SECRET in production environment settings.',
    });
  }

  // 4. Resolve MNOTIFY_API_KEY / MNOTIFY_KEY
  const mnotifyKey = String(env.MNOTIFY_API_KEY || env.MNOTIFY_KEY || '').trim();
  const smsProvider = String(env.SMS_PROVIDER || (inProd ? 'mnotify' : 'mock')).toLowerCase();

  if (inProd && smsProvider !== 'mnotify') {
    warnings.push({
      variable: 'SMS_PROVIDER',
      message: `Production expects SMS_PROVIDER=mnotify but got "${smsProvider}".`,
    });
  }

  if ((inProd || smsProvider === 'mnotify') && !mnotifyKey) {
    if (inProd) {
      errors.push({
        variable: 'MNOTIFY_API_KEY (or MNOTIFY_KEY)',
        message: 'mNotify API Key is required for live Ghana SMS in production.',
        help: 'Obtain an API key from https://www.mnotify.com/ and set MNOTIFY_API_KEY.',
      });
    } else {
      warnings.push({
        variable: 'MNOTIFY_API_KEY (or MNOTIFY_KEY)',
        message: 'SMS_PROVIDER is set to mnotify but MNOTIFY_API_KEY is missing. SMS fallback to mock will occur locally.',
      });
    }
  }

  // 5. Connection pool bounds check
  const minPool = Number(env.MONGO_MIN_POOL_SIZE || 10);
  const maxPool = Number(env.MONGO_MAX_POOL_SIZE || 50);
  if (minPool > maxPool) {
    errors.push({
      variable: 'MONGO_MIN_POOL_SIZE',
      message: `MONGO_MIN_POOL_SIZE (${minPool}) cannot be greater than MONGO_MAX_POOL_SIZE (${maxPool}).`,
      help: 'Adjust pool settings so min <= max (default: min 10, max 50).',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    config: {
      port: portNum || 4000,
      mongoUri: mongoUri || 'mongodb://127.0.0.1:27017/yencare',
      jwtSecret: jwtSecret || 'yencare-dev-jwt-secret',
      mnotifyKey: mnotifyKey || null,
      smsProvider,
      minPool,
      maxPool,
      isProduction: inProd,
      isTest: inTest,
    },
  };
}

/**
 * Formats diagnostic validation results into a human-readable banner.
 *
 * @param {{ variable: string, message: string, help?: string }[]} errors
 * @param {{ variable: string, message: string }[]} warnings
 * @returns {string}
 */
export function formatDiagnosticBanner(errors = [], warnings = []) {
  const lines = [
    '',
    '╔════════════════════════════════════════════════════════════════════════════════╗',
    '║                YENCARE BACKEND — STARTUP ENVIRONMENT VALIDATION                ║',
    '╚════════════════════════════════════════════════════════════════════════════════╝',
  ];

  if (errors.length > 0) {
    lines.push('');
    lines.push('  ❌ CRITICAL CONFIGURATION ERRORS:');
    for (const err of errors) {
      lines.push(`    • [${err.variable}]: ${err.message}`);
      if (err.help) {
        lines.push(`      ➜ Action: ${err.help}`);
      }
    }
  }

  if (warnings.length > 0) {
    lines.push('');
    lines.push('  ⚠️  WARNINGS:');
    for (const w of warnings) {
      lines.push(`    • [${w.variable}]: ${w.message}`);
    }
  }

  lines.push('');
  lines.push('  Please configure required environment variables in backend/.env or your host dashboard.');
  lines.push('──────────────────────────────────────────────────────────────────────────────────');
  lines.push('');

  return lines.join('\n');
}

/**
 * Halts server boot with diagnostic output if critical environment variables are missing.
 *
 * @param {NodeJS.ProcessEnv} [env]
 * @param {{ logWarnings?: boolean }} [options]
 * @throws {Error}
 */
export function assertValidEnv(env = process.env, { logWarnings = true } = {}) {
  const result = validateEnv(env);

  if (logWarnings && result.warnings.length > 0) {
    for (const w of result.warnings) {
      logger.warn(`Startup config warning: [${w.variable}] ${w.message}`, {
        subsystem: 'config',
        variable: w.variable,
      });
    }
  }

  if (!result.valid) {
    const banner = formatDiagnosticBanner(result.errors, result.warnings);
    const summary = result.errors.map((e) => `${e.variable}: ${e.message}`).join('; ');
    const err = new Error(`Environment validation failed on startup:\n${banner}\nSummary: ${summary}`);
    err.diagnostics = result.errors;
    throw err;
  }

  return result.config;
}
