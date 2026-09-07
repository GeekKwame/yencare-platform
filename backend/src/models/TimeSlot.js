import mongoose from 'mongoose';
import { CLINIC_SITES, DATE_PATTERN, TIME_PATTERN, minutesBetween } from '../db/constants.js';

const timeSlotSchema = new mongoose.Schema(
  {
    clinicianId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinician',
      required: [true, 'clinicianId is required'],
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: [true, 'roomId is required'],
    },
    clinicSite: {
      type: String,
      required: [true, 'clinicSite is required'],
      enum: CLINIC_SITES,
    },
    date: {
      type: String,
      required: [true, 'date is required'],
      match: [DATE_PATTERN, 'date must be YYYY-MM-DD'],
    },
    startTime: {
      type: String,
      required: [true, 'startTime is required'],
      match: [TIME_PATTERN, 'startTime must be HH:mm'],
    },
    endTime: {
      type: String,
      required: [true, 'endTime is required'],
      match: [TIME_PATTERN, 'endTime must be HH:mm'],
    },
    durationMinutes: {
      type: Number,
      default: 30,
      min: 5,
      max: 180,
    },
    isBooked: {
      type: Boolean,
      default: false,
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      default: null,
    },
  },
  { timestamps: true, collection: 'time_slots' },
);

timeSlotSchema.index(
  { clinicianId: 1, date: 1, startTime: 1 },
  { unique: true, name: 'timeslots_clinician_datetime_unique' },
);
timeSlotSchema.index(
  { roomId: 1, date: 1, startTime: 1 },
  { unique: true, name: 'timeslots_room_datetime_unique' },
);
timeSlotSchema.index({ date: 1, clinicSite: 1, isBooked: 1 }, { name: 'timeslots_day_availability' });

timeSlotSchema.pre('validate', function syncDuration(next) {
  if (this.startTime && this.endTime) {
    const minutes = minutesBetween(this.startTime, this.endTime);
    if (minutes <= 0) {
      next(new Error('endTime must be after startTime'));
      return;
    }
    this.durationMinutes = minutes;
  }
  next();
});

timeSlotSchema.pre('save', function syncBookedFlag(next) {
  this.isBooked = Boolean(this.appointmentId);
  next();
});

timeSlotSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform(_doc, ret) {
    ret.id = String(ret._id);
    return ret;
  },
});

export const TimeSlot = mongoose.models.TimeSlot || mongoose.model('TimeSlot', timeSlotSchema);
