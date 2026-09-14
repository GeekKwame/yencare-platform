import mongoose from 'mongoose';
import {
  APPOINTMENT_STATUSES,
  CLINIC_SITES,
  DATE_PATTERN,
} from '../db/constants.js';
import { Appointment } from '../models/Appointment.js';
import { NotFoundError, ValidationError } from '../patients/errors.js';
import { assignDailyQueueToken } from './queueEngine.js';

/**
 * @param {{ date?: string, clinicSite?: string, clinic?: string }} filters
 */
export async function listAppointments(filters = {}) {
  const clinicSite = filters.clinicSite || filters.clinic;
  const { date } = filters;
  const query = {};

  if (date != null && date !== '') {
    if (!DATE_PATTERN.test(String(date))) {
      throw new ValidationError('date must be YYYY-MM-DD');
    }
    query.appointmentDate = String(date);
  }

  if (clinicSite != null && clinicSite !== '') {
    if (!CLINIC_SITES.includes(clinicSite)) {
      throw new ValidationError(`clinicSite must be one of: ${CLINIC_SITES.join(', ')}`);
    }
    query.clinicSite = clinicSite;
  }

  return Appointment.populateQueue(query);
}

/**
 * @param {string} idOrReference
 * @param {string} status
 */
export async function updateAppointmentStatus(idOrReference, status) {
  if (!status || !APPOINTMENT_STATUSES.includes(status)) {
    throw new ValidationError(
      `status must be one of: ${APPOINTMENT_STATUSES.join(', ')}`,
    );
  }

  const key = String(idOrReference || '').trim();
  if (!key) {
    throw new ValidationError('Appointment id or reference is required');
  }

  let appointment = null;
  if (mongoose.isValidObjectId(key)) {
    appointment = await Appointment.findById(key)
      .populate('patientId', 'fullName phone studentIndex')
      .populate('clinicianId', 'name title specialty roomId')
      .populate('roomId', 'name clinicSite');
  }

  if (!appointment) {
    appointment = await Appointment.findByReference(key);
  }

  if (!appointment) {
    throw new NotFoundError('Appointment not found');
  }

  appointment.status = status;

  if (status === 'CHECKED_IN') {
    await assignDailyQueueToken(appointment);
  }

  try {
    await appointment.save();
  } catch (err) {
    if (String(err?.message || '').startsWith('Illegal status transition')) {
      throw new ValidationError(err.message);
    }
    throw err;
  }

  return appointment;
}
