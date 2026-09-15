// AuditLog.js
//Appointment audit log model
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
      type: mongoose.Schema.Types.ObjectId,
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

export const AuditLog =
  mongoose.models.AuditLog ||
  mongoose.model('AuditLog', auditLogSchema);