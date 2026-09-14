import mongoose from 'mongoose';

const queueCounterSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
    },
    queueDate: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    nextSequence: {
      type: Number,
      default: 0,
      min: 0,
    },
    activeAppointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      default: null,
    },
  },
  { timestamps: true, collection: 'queue_counters' },
);

queueCounterSchema.index(
  { roomId: 1, queueDate: 1 },
  { unique: true, name: 'queue_counters_room_day_unique' },
);

export const QueueCounter =
  mongoose.models.QueueCounter ||
  mongoose.model('QueueCounter', queueCounterSchema);