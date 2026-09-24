// AuditLog.js
// Appointment audit log model
import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      trim: true,
    },

    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true,
      index: true,
    },

    actorType: {
      type: String,
      enum: ['PATIENT', 'STAFF'],
      required: true,
      default: 'PATIENT',
      index: true,
    },

    actorId: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },

    actingUserId: {
      type: String,
      trim: true,
      default: null,
    },

    oldDate: {
      type: String,
      trim: true,
      default: null,
    },

    oldTime: {
      type: String,
      trim: true,
      default: null,
    },

    newDate: {
      type: String,
      trim: true,
      default: null,
    },

    newTime: {
      type: String,
      trim: true,
      default: null,
    },

    reason: {
      type: String,
      trim: true,
      default: null,
    },

    changeReason: {
      type: String,
      trim: true,
      default: null,
    },

    oldSlotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TimeSlot',
      default: null,
    },

    newSlotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TimeSlot',
      default: null,
    },

    cancelledTime: {
      type: Date,
      default: null,
    },

    cancelReason: {
      type: String,
      trim: true,
      default: null,
    },

    rescheduledTime: {
      type: Date,
      default: null,
    },

    performedBy: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'audit_logs',
  },
);

auditLogSchema.index({
  appointmentId: 1,
  createdAt: -1,
});

auditLogSchema.index({
  actorType: 1,
  createdAt: -1,
});

export const AuditLog =
  mongoose.models.AuditLog ||
  mongoose.model('AuditLog', auditLogSchema);

// In-memory buffer for testing, fast verification, and fallback
const memoryAuditLogs = [];

/**
 * Record an audit log entry to memory and MongoDB (if available).
 *
 * @param {object} data
 * @param {import('mongoose').ClientSession | null} [session=null]
 * @returns {Promise<object>}
 */
export async function recordAuditLog(data, session = null) {
  const entry = {
    action: data.action,
    appointmentId: data.appointmentId,
    actorType: data.actorType || 'PATIENT',
    actorId: data.actorId || data.actingUserId || null,
    actingUserId: data.actingUserId || data.actorId || null,
    oldDate: data.oldDate || null,
    oldTime: data.oldTime || null,
    newDate: data.newDate || null,
    newTime: data.newTime || null,
    reason: data.reason || data.changeReason || data.cancelReason || null,
    changeReason: data.changeReason || data.reason || null,
    cancelReason: data.cancelReason || data.reason || null,
    oldSlotId: data.oldSlotId || null,
    newSlotId: data.newSlotId || null,
    cancelledTime: data.cancelledTime || null,
    rescheduledTime: data.rescheduledTime || null,
    performedBy: data.performedBy || data.actorId || null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  memoryAuditLogs.unshift(entry);
  if (memoryAuditLogs.length > 500) {
    memoryAuditLogs.pop();
  }

  if (mongoose.connection?.readyState === 1 && AuditLog) {
    try {
      const options = session ? { session } : {};
      await AuditLog.create([entry], options);
    } catch {
      /* fallback to memory store */
    }
  }

  return entry;
}

/**
 * Retrieve recent audit logs matching query options.
 *
 * @param {{ appointmentId?: unknown, action?: string, actorType?: string }} [filter]
 * @returns {object[]}
 */
export function getRecentAuditLogs({ appointmentId = null, action = null, actorType = null } = {}) {
  let logs = [...memoryAuditLogs];
  if (appointmentId) {
    const idStr = String(appointmentId);
    logs = logs.filter((l) => String(l.appointmentId) === idStr);
  }
  if (action) {
    logs = logs.filter((l) => l.action === action);
  }
  if (actorType) {
    logs = logs.filter((l) => l.actorType === actorType);
  }
  return logs;
}

/**
 * Clear recent audit logs buffer (primarily for test cleanup).
 */
export function clearAuditLogs() {
  memoryAuditLogs.length = 0;
}