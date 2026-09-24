import mongoose from 'mongoose';
import { CLINIC_SITES, STAFF_ROLES } from '../db/constants.js';

const staffUserSchema = new mongoose.Schema(
  {
    staffId: {
      type: String,
      required: [true, 'staffId is required'],
      trim: true,
      uppercase: false,
    },
    email: {
      type: String,
      required: [true, 'email is required'],
      trim: true,
      lowercase: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'passwordHash is required'],
    },
    name: {
      type: String,
      required: [true, 'name is required'],
      trim: true,
    },
    role: {
      type: String,
      required: [true, 'role is required'],
      enum: STAFF_ROLES,
    },
    assignedRoom: {
      type: String,
      trim: true,
      default: null,
    },
    clinicSite: {
      type: String,
      required: [true, 'clinicSite is required'],
      enum: CLINIC_SITES,
      default: 'students-clinic',
    },
    clinicianId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinician',
      default: null,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: 'staff_users',
  },
);

staffUserSchema.index({ email: 1 }, { unique: true, name: 'staff_users_email_unique' });
staffUserSchema.index({ staffId: 1 }, { unique: true, name: 'staff_users_staffId_unique' });
staffUserSchema.index({ role: 1, clinicSite: 1 }, { name: 'staff_users_role_site' });

staffUserSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform(_doc, ret) {
    ret.id = String(ret._id);
    delete ret.passwordHash;
    return ret;
  },
});

export const StaffUser =
  mongoose.models.StaffUser || mongoose.model('StaffUser', staffUserSchema);
