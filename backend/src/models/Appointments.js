
import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema(
  {
    reference: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    patientName: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
      match: /^\+233[0-9]{9}$/,
    },

    doctor: {
      type: String,
      required: true,
      trim: true,
    },

    startsAt: {
      type: Date,
      required: true,
    },

    status: {
      type: String,
      enum: [
        'BOOKED',
        'WAITING',
        'CALLED',
        'COMPLETED',
        'CANCELLED',
      ],
      default: 'BOOKED',
    },

    queueToken: {
      type: String,
      default: null,
    },

    estimatedWaitMinutes: {
      type: Number,
      default: null,
    },

    room: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

/*
 * Prevent two active appointments from using
 * the same doctor's date and time slot.
 *
 * Cancelled appointments do not block the slot.
 */
appointmentSchema.index(
  { doctor: 1, startsAt: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $ne: 'CANCELLED' },
    },
  }
);

const Appointment = mongoose.model('Appointment', appointmentSchema);

export default Appointment;
