// src/services/bookAppointment.js
//
// Wraps Appointment.create(...) so SMS dispatch is guaranteed to fire on
// every successful appointment creation, regardless of which route calls it.
// Booking routes should call createAppointment(data) instead of calling
// Appointment.create(data) directly.

import { Appointment } from '../models/Appointment.js';
import { Patient } from '../models/Patient.js';
import { sendSms } from '../sms/sendSms.js';

/**
 * @param {object} data - fields matching the Appointment schema
 *   (patientId, clinicianId, roomId, clinicSite, visitType,
 *    appointmentDate "YYYY-MM-DD", appointmentTime "HH:mm", timeSlotId?)
 * @returns {Promise<{ appointment: object, sms: { ok: boolean, error?: string } }>}
 */
export async function createAppointment(data) {
  // 1. Create the appointment. If this throws (validation, duplicate
  //    referenceCode, illegal slot, etc.), no SMS is sent — nothing to confirm.
  const appointment = await Appointment.create(data);

  // 2. Look up the patient's phone number for the confirmation text.
  const patient = await Patient.findById(appointment.patientId);
  if (!patient) {
    console.error('[booking] Appointment created but patient not found for SMS:', appointment.patientId);
    return { appointment, sms: { ok: false, error: 'Patient not found for SMS' } };
  }

  // Resilient to either field name — Able's Appointment.js populate() call
  // expects `phone`, but the patients API response used `phoneNumber`.
  // Rather than depend on that being resolved/renamed correctly everywhere,
  // accept whichever field is actually present so this never silently
  // breaks if the Patient schema changes or the two don't match.
  const phone = patient.phone ?? patient.phoneNumber;
  if (!phone) {
    console.error(
      '[booking] Appointment created but patient has no phone field (checked "phone" and "phoneNumber"):',
      appointment.patientId,
    );
    return { appointment, sms: { ok: false, error: 'Patient has no phone number on record' } };
  }

  // 3. Dispatch the confirmation SMS. A failure here never undoes the
  //    booking — the web confirmation is the source of truth.
  const message = [
    'YenCare Health',
    '',
    'Appointment Confirmed',
    `${appointment.appointmentDate}, ${appointment.appointmentTime}`,
    `Booking ID: ${appointment.referenceCode}`,
    `Arrive by ${appointment.appointmentTime}`,
  ].join('\n');

  const sms = await sendSms(phone, message);
  if (!sms.ok) {
    console.error('[booking] SMS not delivered for', appointment.referenceCode, ':', sms.error);
  }

  return { appointment, sms };
}