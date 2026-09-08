import mongoose from 'mongoose';
import { CLINIC_SITES } from '../db/constants.js';

const clinicianSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'name is required'],
      trim: true,
    },
    title: {
      type: String,
      required: [true, 'title is required'],
      trim: true,
    },
    specialty: {
      type: String,
      required: [true, 'specialty is required'],
      trim: true,
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
    available: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true, collection: 'clinicians' },
);

clinicianSchema.index({ clinicSite: 1, available: 1 }, { name: 'clinicians_site_available' });
clinicianSchema.index({ roomId: 1 }, { name: 'clinicians_room' });

clinicianSchema.virtual('room', {
  ref: 'Room',
  localField: 'roomId',
  foreignField: '_id',
  justOne: true,
});

clinicianSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform(_doc, ret) {
    ret.id = String(ret._id);
    return ret;
  },
});

export const Clinician = mongoose.models.Clinician || mongoose.model('Clinician', clinicianSchema);
