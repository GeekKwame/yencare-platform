import mongoose from 'mongoose';
import { CLINIC_SITES, ROOM_STATUSES } from '../db/constants.js';

const roomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'name is required'],
      trim: true,
    },
    clinicSite: {
      type: String,
      required: [true, 'clinicSite is required'],
      enum: CLINIC_SITES,
    },
    floor: {
      type: String,
      trim: true,
      default: 'Ground Floor',
    },
    status: {
      type: String,
      enum: ROOM_STATUSES,
      default: 'active',
    },
  },
  { timestamps: true, collection: 'rooms' },
);

roomSchema.index(
  { clinicSite: 1, name: 1 },
  { unique: true, name: 'rooms_site_name_unique' },
);

roomSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform(_doc, ret) {
    ret.id = String(ret._id);
    return ret;
  },
});

export const Room = mongoose.models.Room || mongoose.model('Room', roomSchema);
