// src/services/callPatient.js
//
// Fires the "you are being called" SMS when staff call a patient into a
// consultation room. Wraps the status change to CALLED so the notification
// is guaranteed to dispatch, the same way bookAppointment.js wraps creation.
//
// Staff routes should call callPatient(appointmentId) instead of setting
// status = 'CALLED' directly.

import { Appointment } from '../models/Appointment.js';
import { Patient } from '../models/Patient.js';
import { Room } from '../models/Room.js';
import { sendSms } from '../sms/sendSms.js';
import mongoose from 'mongoose';

/**
 * @param {string} appointmentId Mongo appointment ID or YC reference code
 * @returns {Promise<{ appointment: object, sms: { ok: boolean, error?: string } }>}
 */
export async function callPatient(appointmentId) {
  const appointment = mongoose.isValidObjectId(appointmentId)
    ? await Appointment.findById(appointmentId)
    : await Appointment.findByReference(appointmentId);
  if (!appointment) {
    throw new Error(`Appointment not found: ${appointmentId}`);
  }

  // The model's pre-save hook rejects illegal transitions (e.g. COMPLETED
  // back to CALLED) and stamps calledTime for us, so we just set and save.
  // If the transition isn't allowed, surface that clearly instead of
  // crashing — whatever rules Able's constants.js defines, this adapts to
  // them rather than needing to know them in advance.
  appointment.status = 'CALLED';
  try {
    await appointment.save();
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error('[call] Could not move appointment to CALLED:', error);
    return { appointment, sms: { ok: false, error } };
  }

  const patient = await Patient.findById(appointment.patientId);
  if (!patient) {
    console.error('[call] Patient not found for SMS:', appointment.patientId);
    return { appointment, sms: { ok: false, error: 'Patient not found for SMS' } };
  }

  const phone = patient.phone;
  if (!phone) {
    console.error('[call] Patient has no phone number on record:', appointment.patientId);
    return { appointment, sms: { ok: false, error: 'Patient has no phone number on record' } };
  }

  // Room name for the text, e.g. "Room 2". Falls back gracefully if the
  // room lookup fails so the patient still gets told to come in.
  const room = await Room.findById(appointment.roomId);
  const roomLine = room?.name ? `Please go to ${room.name}` : 'Please go to reception';

  const message = [
    'YenCare Health',
    '',
    'It is your turn now',
    roomLine,
    `Booking ID: ${appointment.referenceCode}`,
  ].join('\n');
  console.info('[call] SMS message for', appointment.referenceCode, `:\n${message}`);

  // An SMS failure never undoes the call — staff have already called the
  // patient in the room, and the dashboard is the source of truth.
  const sms = await sendSms(phone, message);
  if (!sms.ok) {
    console.error('[call] SMS not delivered for', appointment.referenceCode, ':', sms.error);
  }

  return { appointment, sms };
}