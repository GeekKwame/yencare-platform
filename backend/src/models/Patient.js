import mongoose from 'mongoose';
import { STUDENT_INDEX_PATTERN } from '../db/constants.js';
import { normalizeGhanaPhone } from '../sms/normalizePhone.js';

function emptyToUndefined(value) {
  if (value == null) return undefined;
  const trimmed = String(value).trim();
  return trimmed === '' ? undefined : trimmed;
}

const patientSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'fullName is required'],
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    phone: {
      type: String,
      required: [true, 'phone is required'],
      set(value) {
        try {
          return normalizeGhanaPhone(value);
        } catch {
          return value;
        }
      },
      validate: {
        validator(value) {
          try {
            normalizeGhanaPhone(value);
            return true;
          } catch {
            return false;
          }
        },
        message: (props) => `Invalid Ghana phone: ${props.value}`,
      },
    },
    studentIndex: {
      type: String,
      trim: true,
      set: emptyToUndefined,
      validate: {
        validator(value) {
          return value == null || STUDENT_INDEX_PATTERN.test(value);
        },
        message: 'studentIndex must be 8 digits',
      },
    },
    nhisNumber: {
      type: String,
      trim: true,
      set: emptyToUndefined,
    },
  },
  { timestamps: true, collection: 'patients' },
);

patientSchema.index({ phone: 1 }, { unique: true, name: 'patients_phone_unique' });
patientSchema.index(
  { studentIndex: 1 },
  { unique: true, sparse: true, name: 'patients_studentIndex_unique' },
);

patientSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform(_doc, ret) {
    ret.id = String(ret._id);
    return ret;
  },
});

export const Patient = mongoose.models.Patient || mongoose.model('Patient', patientSchema);
