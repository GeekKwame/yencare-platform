import mongoose from 'mongoose';
import {
  APPOINTMENT_STATUSES,
  BOOKING_TYPES,
  CLINIC_SITES,
  DATE_PATTERN,
  REFERENCE_CODE_PATTERN,
  TIME_PATTERN,
  VISIT_TYPES,
  isAllowedStatusTransition,
} from '../db/constants.js';
import { allocateReferenceCode } from '../utils/referenceCode.js';

const appointmentSchema = new mongoose.Schema(
  {
    referenceCode: {
      type: String,
      uppercase: true,
      match: [REFERENCE_CODE_PATTERN, 'referenceCode must look like YC-4821'],
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: [true, 'patientId is required'],
    },
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
    timeSlotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TimeSlot',
      default: null,
    },
    clinicSite: {
      type: String,
      required: [true, 'clinicSite is required'],
      enum: CLINIC_SITES,
    },
    visitType: {
      type: String,
      required: [true, 'visitType is required'],
      enum: VISIT_TYPES,
    },
    bookingType: {
      type: String,
      enum: BOOKING_TYPES,
      default: 'BOOKED',
    },
    status: {
      type: String,
      enum: APPOINTMENT_STATUSES,
      default: 'BOOKED',
    },
    appointmentDate: {
      type: String,
      required: [true, 'appointmentDate is required'],
      match: [DATE_PATTERN, 'appointmentDate must be YYYY-MM-DD'],
    },
    appointmentTime: {
      type: String,
      required: [true, 'appointmentTime is required'],
      match: [TIME_PATTERN, 'appointmentTime must be HH:mm'],
    },
    queueToken: {
      type: String,
      trim: true,
      default: undefined,
    },
    queueDate: {
      type: String,
      match: [DATE_PATTERN, 'queueDate must be YYYY-MM-DD'],
    },
    queueSequence: {
      type: Number,
      min: 1,
    },
    estimatedWaitMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },
    checkInTime: { type: Date, default: null },
    calledTime: { type: Date, default: null },
    completedTime: { type: Date, default: null },
    cancelledTime: { type: Date, default: null },
    cancelReason: { type: String, trim: true },
    staffChangeReason: { type: String, trim: true },
    staffChangedTime: { type: String, trim: true },
    reminderSentAt: { type: Date, default: null },
    notes: { type: String, trim: true },
  },
  { timestamps: true, collection: 'appointments' },
);

appointmentSchema.index({ referenceCode: 1 }, { unique: true, name: 'appointments_reference_unique' });
appointmentSchema.index(
  { clinicianId: 1, appointmentDate: 1, appointmentTime: 1 },
  {
    unique: true,
    name: 'appointments_clinician_active_slot_unique',
    partialFilterExpression: {
      status: { $in: ['BOOKED', 'CHECKED_IN', 'WAITING', 'CALLED', 'COMPLETED'] },
    },
  },
);
appointmentSchema.index(
  { appointmentDate: 1, clinicSite: 1, status: 1 },
  { name: 'appointments_day_site_status' },
);
appointmentSchema.index({ patientId: 1, appointmentDate: -1 }, { name: 'appointments_patient_date' });
appointmentSchema.index({ clinicianId: 1, appointmentDate: 1 }, { name: 'appointments_clinician_date' });
appointmentSchema.index({ timeSlotId: 1 }, { sparse: true, name: 'appointments_timeslot' });
appointmentSchema.index(
  { roomId: 1, queueDate: 1, queueSequence: 1 },
  {
    unique: true,
    sparse: true,
    name: 'appointments_room_day_queue_sequence_unique',
  },
);
appointmentSchema.index(
  { roomId: 1, appointmentDate: 1, status: 1 },
  { name: 'appointments_room_date_status' },
);

function stampStatusTimes(doc) {
  const now = new Date();
  switch (doc.status) {
    case 'CHECKED_IN':
    case 'WAITING':
      if (!doc.checkInTime) doc.checkInTime = now;
      break;
    case 'CALLED':
      if (!doc.calledTime) doc.calledTime = now;
      if (!doc.checkInTime) doc.checkInTime = now;
      break;
    case 'COMPLETED':
      if (!doc.completedTime) doc.completedTime = now;
      break;
    case 'CANCELLED':
    case 'NO_SHOW':
      if (!doc.cancelledTime) doc.cancelledTime = now;
      break;
    default:
      break;
  }
}

async function assertRefsExist(doc) {
  if (doc.constructor.db?.readyState !== 1) return;

  const { Patient } = await import('./Patient.js');
  const { Clinician } = await import('./Clinician.js');
  const { Room } = await import('./Room.js');
  const { TimeSlot } = await import('./TimeSlot.js');

  const checks = [
    [Patient, doc.patientId, 'Patient'],
    [Clinician, doc.clinicianId, 'Clinician'],
    [Room, doc.roomId, 'Room'],
  ];

  if (doc.timeSlotId) {
    checks.push([TimeSlot, doc.timeSlotId, 'TimeSlot']);
  }

  for (const [Model, id, label] of checks) {
    const found = await Model.exists({ _id: id });
    if (!found) {
      throw new Error(`${label} not found: ${id}`);
    }
  }
}

appointmentSchema.pre('validate', async function allocateCode() {
  if (!this.referenceCode) {
    this.referenceCode = await allocateReferenceCode(this.constructor);
  }
});

appointmentSchema.pre('save', async function enforceIntegrity() {
  if (!this.isNew && this.isModified('status') && this._originalStatus) {
    if (!isAllowedStatusTransition(this._originalStatus, this.status)) {
      throw new Error(`Illegal status transition: ${this._originalStatus} → ${this.status}`);
    }
  }

  stampStatusTimes(this);
  await assertRefsExist(this);
});

appointmentSchema.post('init', function rememberStatus() {
  this._originalStatus = this.status;
});

appointmentSchema.post('save', async function syncSlot(doc) {
  if (doc.constructor.db?.readyState !== 1 || !doc.timeSlotId) return;

  const { TimeSlot } = await import('./TimeSlot.js');
  const released = doc.status === 'CANCELLED' || doc.status === 'NO_SHOW';

  await TimeSlot.updateOne(
    { _id: doc.timeSlotId },
    released
      ? { $set: { isBooked: false, appointmentId: null } }
      : { $set: { isBooked: true, appointmentId: doc._id } },
  );
});

async function releaseLinkedSlot() {
  if (this.timeSlotId && this.constructor.db?.readyState === 1) {
    const { TimeSlot } = await import('./TimeSlot.js');
    await TimeSlot.updateOne(
      { _id: this.timeSlotId },
      { $set: { isBooked: false, appointmentId: null } },
    );
  }
}

appointmentSchema.pre('deleteOne', { document: true, query: false }, releaseLinkedSlot);
appointmentSchema.pre('findOneAndDelete', async function releaseFromQuery() {
  if (this.model.db?.readyState !== 1) return;
  const doc = await this.model.findOne(this.getFilter()).lean();
  if (!doc?.timeSlotId) return;
  const { TimeSlot } = await import('./TimeSlot.js');
  await TimeSlot.updateOne(
    { _id: doc.timeSlotId },
    { $set: { isBooked: false, appointmentId: null } },
  );
});

appointmentSchema.statics.findByReference = function findByReference(referenceCode) {
  return this.findOne({ referenceCode: String(referenceCode).toUpperCase() })
    .populate('patientId')
    .populate({ path: 'clinicianId', populate: { path: 'roomId' } })
    .populate('roomId')
    .populate('timeSlotId');
};

appointmentSchema.statics.populateQueue = function populateQueue(query) {
  return this.find(query)
    .populate('patientId', 'fullName phone studentIndex')
    .populate('clinicianId', 'name title specialty roomId')
    .populate('roomId', 'name clinicSite')
    .sort({ appointmentTime: 1, createdAt: 1 });
};

appointmentSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform(_doc, ret) {
    ret.id = String(ret._id);
    return ret;
  },
});

export const Appointment =
  mongoose.models.Appointment || mongoose.model('Appointment', appointmentSchema);
