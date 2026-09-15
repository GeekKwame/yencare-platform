// src/services/bookAppointment.js
//
// Wraps Appointment.create(...) so SMS dispatch is guaranteed to fire on
// every successful appointment creation, regardless of which route calls it.
// Booking routes should call createAppointment(data) instead of calling
// Appointment.create(data) directly.

import { Appointment } from '../models/Appointment.js';
import { Patient } from '../models/Patient.js';
import { TimeSlot } from '../models/TimeSlot.js';
import { resolvePatientPhone, resolveSmsDestination } from '../patients/fields.js';
import { sendSms } from '../sms/sendSms.js';

/**
 * @param {object} data - fields matching the Appointment schema
 *   (patientId, clinicianId, roomId, clinicSite, visitType,
 *    appointmentDate "YYYY-MM-DD", appointmentTime "HH:mm", timeSlotId?)
 *   Optional `phone` / `phoneNumber` is the SMS destination for this booking.
 * @returns {Promise<{ appointment: object, sms: { ok: boolean, error?: string } }>}
 */
export async function createAppointment(data) {
  const payload = { ...data };
  const requestedPhone = payload.phone ?? payload.phoneNumber ?? null;
  delete payload.phone;
  delete payload.phoneNumber;

  // Double-booking check: prevent booking a clinician who already has an active appointment
  if (payload.clinicianId && payload.appointmentDate && payload.appointmentTime) {
    const existing = await Appointment.findOne({
      clinicianId: payload.clinicianId,
      appointmentDate: payload.appointmentDate,
      appointmentTime: payload.appointmentTime,
      status: { $nin: ['CANCELLED', 'NO_SHOW'] },
    });

    if (existing) {
      const err = new Error('This time slot is already booked for this clinician');
      err.status = 409;
      throw err;
    }
  }

  // Resolve and verify TimeSlot if available
  if (!payload.timeSlotId && payload.clinicianId && payload.appointmentDate && payload.appointmentTime) {
    const matchingSlot = await TimeSlot.findOne({
      clinicianId: payload.clinicianId,
      date: payload.appointmentDate,
      startTime: payload.appointmentTime,
    });
    if (matchingSlot) {
      if (matchingSlot.isBooked && matchingSlot.appointmentId) {
        const linkedActive = await Appointment.findOne({
          _id: matchingSlot.appointmentId,
          status: { $nin: ['CANCELLED', 'NO_SHOW'] },
        });
        if (linkedActive) {
          const err = new Error('This time slot is already booked');
          err.status = 409;
          throw err;
        }
      }
      payload.timeSlotId = matchingSlot._id;
    }
  } else if (payload.timeSlotId) {
    const matchingSlot = await TimeSlot.findById(payload.timeSlotId);
    if (matchingSlot?.isBooked && matchingSlot.appointmentId) {
      const linkedActive = await Appointment.findOne({
        _id: matchingSlot.appointmentId,
        status: { $nin: ['CANCELLED', 'NO_SHOW'] },
      });
      if (linkedActive) {
        const err = new Error('This time slot is already booked');
        err.status = 409;
        throw err;
      }
    }
  }

  // 1. Create the appointment. If this throws (validation, duplicate
  //    referenceCode, illegal slot, etc.), no SMS is sent — nothing to confirm.
  const appointment = await Appointment.create(payload);

  // 2. Look up the patient's phone number for the confirmation text.
  const patient = await Patient.findById(appointment.patientId);
  if (!patient) {
    console.error('[booking] Appointment created but patient not found for SMS:', appointment.patientId);
    return { appointment, sms: { ok: false, error: 'Patient not found for SMS' } };
  }

  // Prefer the number entered for this booking so SMS never goes to a
  // stale admin/test number left on a reused student-index record.
  const phone = resolveSmsDestination(patient, requestedPhone);
  if (!phone) {
    console.error(
      '[booking] Appointment created but patient has no phone field (checked "phone" and "phoneNumber"):',
      appointment.patientId,
    );
    return { appointment, sms: { ok: false, error: 'Patient has no phone number on record' } };
  }

  const storedPhone = resolvePatientPhone(patient);
  if (phone && storedPhone !== phone) {
    try {
      patient.phone = phone;
      await patient.save();
    } catch (err) {
      console.warn(
        '[booking] Could not update stored patient phone before SMS:',
        err instanceof Error ? err.message : err,
      );
    }
  }

  // 3. Dispatch the confirmation SMS to this patient only. A failure here
  //    never undoes the booking — the web confirmation is the source of truth.
  const message = [
    'YenCare Health',
    '',
    'Appointment Confirmed',
    `${appointment.appointmentDate}, ${appointment.appointmentTime}`,
    `Booking ID: ${appointment.referenceCode}`,
    `Arrive by ${appointment.appointmentTime}`,
  ].join('\n');

  console.info(
    '[booking] Sending confirmation SMS to patient',
    maskPhone(phone),
    'for',
    appointment.referenceCode,
  );
  const sms = await sendSms(phone, message);
  if (!sms.ok) {
    console.error('[booking] SMS not delivered for', appointment.referenceCode, ':', sms.error);
  }

  return { appointment, sms };
}

function maskPhone(phone) {
  const value = String(phone);
  if (value.length <= 4) return value;
  return `${value.slice(0, -4).replace(/\d/g, '*')}${value.slice(-4)}`;
}