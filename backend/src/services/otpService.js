import mongoose from 'mongoose';
import { AppointmentOtp } from '../models/AppointmentOtp.js';
import { logger } from '../lib/logger.js';

export const DEFAULT_OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
export const MAX_OTP_ATTEMPTS = 5;

// In-memory store for fast lookup and offline / unit-test operation
const memoryOtps = new Map();

function normalizeRef(ref) {
  return String(ref || '').trim().toUpperCase();
}

function makeKeys(appointmentId, referenceCode, action = 'CANCEL') {
  const normAction = String(action || 'CANCEL').toUpperCase();
  const keys = [];
  if (appointmentId) {
    keys.push(`id:${String(appointmentId)}:${normAction}`);
  }
  if (referenceCode) {
    keys.push(`ref:${normalizeRef(referenceCode)}:${normAction}`);
  }
  return keys;
}

/**
 * Generate a 4-digit numeric verification code (1000 - 9999).
 *
 * @param {number} [length=4]
 * @returns {string} 4-digit numeric string
 */
export function generateOtpCode(length = 4) {
  if (length === 4) {
    const num = Math.floor(1000 + Math.random() * 9000);
    return String(num);
  }
  const min = 10 ** (length - 1);
  const max = 10 ** length - 1;
  const num = Math.floor(min + Math.random() * (max - min + 1));
  return String(num);
}

/**
 * Store an OTP token in memory and MongoDB (if connected).
 * Overwrites any pending unconsumed OTP for the same appointment and action.
 *
 * @param {{
 *   appointmentId: unknown,
 *   referenceCode?: string,
 *   action?: 'CANCEL' | 'RESCHEDULE',
 *   phone: string,
 *   code: string,
 *   ttlMs?: number,
 * }} options
 * @returns {Promise<{ appointmentId: string, referenceCode: string, code: string, expiresAt: Date }>}
 */
export async function storeOtp({
  appointmentId,
  referenceCode = '',
  action = 'CANCEL',
  phone,
  code,
  ttlMs = DEFAULT_OTP_EXPIRY_MS,
}) {
  const normAction = String(action || 'CANCEL').toUpperCase();
  const idStr = appointmentId ? String(appointmentId) : '';
  const refStr = normalizeRef(referenceCode);
  const expiresAt = new Date(Date.now() + ttlMs);

  const entry = {
    appointmentId: idStr,
    referenceCode: refStr,
    action: normAction,
    phone: String(phone || ''),
    code: String(code || '').trim(),
    expiresAt,
    attempts: 0,
    consumed: false,
    createdAt: new Date(),
  };

  // Cache in-memory under all aliases
  const keys = makeKeys(idStr, refStr, normAction);
  for (const key of keys) {
    memoryOtps.set(key, entry);
  }

  // Persist to MongoDB if connection is ready
  if (mongoose.connection?.readyState === 1 && AppointmentOtp) {
    try {
      await AppointmentOtp.deleteMany({
        $or: [
          ...(idStr && mongoose.isValidObjectId(idStr) ? [{ appointmentId: idStr }] : []),
          ...(refStr ? [{ referenceCode: refStr }] : []),
        ],
        action: normAction,
      });

      if (idStr && mongoose.isValidObjectId(idStr)) {
        await AppointmentOtp.create({
          appointmentId: idStr,
          referenceCode: refStr || undefined,
          action: normAction,
          phone: entry.phone,
          code: entry.code,
          expiresAt,
          attempts: 0,
          consumed: false,
        });
      }
    } catch (err) {
      logger.warn('could not persist OTP to database; relying on memory store', {
        subsystem: 'otp',
        referenceCode: refStr,
        err,
      });
    }
  }

  return {
    appointmentId: idStr,
    referenceCode: refStr,
    code: entry.code,
    expiresAt,
  };
}

/**
 * Find active OTP in memory or database.
 *
 * @param {{ appointmentId?: unknown, referenceCode?: string, action?: string }} options
 * @returns {Promise<object | null>}
 */
async function findOtpRecord({ appointmentId, referenceCode, action = 'CANCEL' }) {
  const normAction = String(action || 'CANCEL').toUpperCase();
  const idStr = appointmentId ? String(appointmentId) : '';
  const refStr = normalizeRef(referenceCode);

  const keys = makeKeys(idStr, refStr, normAction);
  for (const key of keys) {
    const found = memoryOtps.get(key);
    if (found) return found;
  }

  // Fallback to database
  if (mongoose.connection?.readyState === 1 && AppointmentOtp) {
    try {
      const query = {
        action: normAction,
        consumed: false,
        $or: [
          ...(idStr && mongoose.isValidObjectId(idStr) ? [{ appointmentId: idStr }] : []),
          ...(refStr ? [{ referenceCode: refStr }] : []),
        ],
      };
      const doc = await AppointmentOtp.findOne(query).sort({ createdAt: -1 });
      if (doc) {
        const entry = {
          appointmentId: String(doc.appointmentId),
          referenceCode: doc.referenceCode || '',
          action: doc.action,
          phone: doc.phone,
          code: doc.code,
          expiresAt: doc.expiresAt,
          attempts: doc.attempts || 0,
          consumed: doc.consumed || false,
          doc,
        };
        // Populate cache
        for (const key of keys) {
          memoryOtps.set(key, entry);
        }
        return entry;
      }
    } catch (err) {
      logger.warn('could not query OTP from database', { subsystem: 'otp', err });
    }
  }

  return null;
}

/**
 * Verify a supplied OTP code for an appointment action.
 *
 * @param {{
 *   appointmentId?: unknown,
 *   referenceCode?: string,
 *   action?: 'CANCEL' | 'RESCHEDULE',
 *   code: string,
 *   now?: Date,
 * }} options
 * @returns {Promise<{ ok: boolean, reason?: string, message: string }>}
 */
export async function verifyOtp({
  appointmentId,
  referenceCode,
  action = 'CANCEL',
  code,
  now = new Date(),
}) {
  const supplied = String(code || '').trim();
  if (!supplied) {
    return {
      ok: false,
      reason: 'MISSING_CODE',
      message: 'Verification code is required.',
    };
  }

  const record = await findOtpRecord({ appointmentId, referenceCode, action });

  if (!record || record.consumed) {
    return {
      ok: false,
      reason: 'NOT_FOUND',
      message: 'No active verification code found for this appointment. Please request a new code.',
    };
  }

  if (now.getTime() > new Date(record.expiresAt).getTime()) {
    return {
      ok: false,
      reason: 'EXPIRED',
      message: 'Verification code has expired. Please request a new code.',
    };
  }

  if (record.attempts >= MAX_OTP_ATTEMPTS) {
    return {
      ok: false,
      reason: 'MAX_ATTEMPTS',
      message: 'Too many incorrect attempts. Please request a new verification code.',
    };
  }

  if (supplied !== record.code) {
    record.attempts += 1;
    if (record.doc) {
      try {
        await AppointmentOtp.updateOne(
          { _id: record.doc._id },
          { $inc: { attempts: 1 } },
        );
      } catch {
        /* best effort */
      }
    }
    return {
      ok: false,
      reason: 'INVALID',
      message: 'Incorrect verification code. Please check the 4-digit code sent to your phone.',
    };
  }

  // Success: mark consumed so code cannot be reused
  record.consumed = true;
  if (record.doc) {
    try {
      await AppointmentOtp.updateOne(
        { _id: record.doc._id },
        { $set: { consumed: true } },
      );
    } catch {
      /* best effort */
    }
  }

  return {
    ok: true,
    message: 'Verification successful.',
  };
}

/**
 * Retrieve the latest OTP entry for testing purposes.
 *
 * @param {string} idOrReference
 * @param {'CANCEL' | 'RESCHEDULE'} [action='CANCEL']
 * @returns {object | null}
 */
export function getLatestOtpForTesting(idOrReference, action = 'CANCEL') {
  const normAction = String(action || 'CANCEL').toUpperCase();
  const raw = String(idOrReference || '').trim();
  const keys = [
    `id:${raw}:${normAction}`,
    `ref:${normalizeRef(raw)}:${normAction}`,
  ];
  for (const k of keys) {
    if (memoryOtps.has(k)) {
      return memoryOtps.get(k);
    }
  }
  return null;
}

/**
 * Clear in-memory OTP tokens (primarily for test cleanup).
 */
export function clearAllOtps() {
  memoryOtps.clear();
}
