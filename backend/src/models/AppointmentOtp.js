import mongoose from 'mongoose';

const appointmentOtpSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true,
      index: true,
    },
    referenceCode: {
      type: String,
      uppercase: true,
      index: true,
    },
    action: {
      type: String,
      enum: ['CANCEL', 'RESCHEDULE'],
      default: 'CANCEL',
    },
    phone: {
      type: String,
      required: true,
    },
    code: {
      type: String,
      required: true,
      match: [/^\d{4}$/, 'OTP code must be 4 digits'],
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
    attempts: {
      type: Number,
      default: 0,
    },
    consumed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: 'appointment_otps',
  },
);

export const AppointmentOtp =
  mongoose.models.AppointmentOtp ||
  mongoose.model('AppointmentOtp', appointmentOtpSchema);
