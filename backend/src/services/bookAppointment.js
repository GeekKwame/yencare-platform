// src/services/bookAppointment.js
//
// Wraps Appointment.create(...) so SMS dispatch is guaranteed to fire on
// every successful appointment creation, regardless of which route calls it.
// Booking routes should call createAppointment(data) instead of calling
// Appointment.create(data) directly.

import { Appointment } from '../models/Appointment.js';
import { Patient } from '../models/Patient.js';
import { TimeSlot } from '../models/TimeSlot.js';
import { resolvePatientPhone, resolveSmsDestination, bookingSmsDestinations } from '../patients/fields.js';
import { sendSms } from '../sms/sendSms.js';
import { appointmentEvents } from './appointmentOps.js';

function slotTakenError(message = 'This time slot is already booked') {
  const err = new Error(message);
  err.status = 409;
  return err;
}

/**
 * Atomically claim an open catalog slot so two concurrent books cannot share it.
 * Walk-ins have no catalog slot and skip this step.
 */
export async function claimOpenSlot(payload) {
  const baseFilter = payload.timeSlotId
    ? { _id: payload.timeSlotId }
    : {
        clinicianId: payload.clinicianId,
        date: payload.appointmentDate,
        startTime: payload.appointmentTime,
      };

  const claimed = await TimeSlot.findOneAndUpdate(
    { ...baseFilter, isBooked: { $ne: true } },
    { $set: { isBooked: true } },
    { new: true },
  );

  if (claimed) return claimed;

  const existing = payload.timeSlotId
    ? await TimeSlot.findById(payload.timeSlotId)
    : await TimeSlot.findOne({
        clinicianId: payload.clinicianId,
        date: payload.appointmentDate,
        startTime: payload.appointmentTime,
      });

  throw slotTakenError(
    existing ? 'This time slot is already booked' : 'That consultation slot is no longer available',
  );
}

async function releaseClaimedSlot(slotId) {
  if (!slotId) return;
  await TimeSlot.updateOne(
    { _id: slotId, appointmentId: null },
    { $set: { isBooked: false, appointmentId: null } },
  );
}

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

  const isWalkIn = payload.bookingType === 'WALK_IN';
  let claimedSlot = null;

  if (!isWalkIn) {
    claimedSlot = await claimOpenSlot(payload);
    payload.timeSlotId = claimedSlot._id;
  } else if (payload.clinicianId && payload.appointmentDate && payload.appointmentTime) {
    const existing = await Appointment.findOne({
      clinicianId: payload.clinicianId,
      appointmentDate: payload.appointmentDate,
      appointmentTime: payload.appointmentTime,
      status: { $nin: ['CANCELLED', 'NO_SHOW'] },
    });
    if (existing) {
      throw slotTakenError('This time slot is already booked for this clinician');
    }
  }

  let appointment;
  try {
    appointment = await Appointment.create(payload);
  } catch (err) {
    if (claimedSlot) {
      await releaseClaimedSlot(claimedSlot._id);
    }
    if (err?.code === 11000) {
      throw slotTakenError();
    }
    throw err;
  }

  if (appointment.timeSlotId) {
    appointmentEvents.emit('slotBooked', {
      timeSlotId: String(appointment.timeSlotId),
      date: appointment.appointmentDate,
      startTime: appointment.appointmentTime,
      clinicianId: String(appointment.clinicianId),
    });
  }

  const patient = await Patient.findById(appointment.patientId);
  if (!patient) {
    console.error('[booking] Appointment created but patient not found for SMS:', appointment.patientId);
    return { appointment, sms: { ok: false, error: 'Patient not found for SMS' } };
  }

  const destinations = bookingSmsDestinations(patient, requestedPhone);
  const phone = destinations[0] || resolveSmsDestination(patient, requestedPhone);
  if (!phone) {
    console.error(
      '[booking] Appointment created but patient has no usable Ghana phone for SMS:',
      appointment.patientId,
    );
    return { appointment, sms: { ok: false, error: 'Patient has no phone number on record' } };
  }

  const storedPhone = resolvePatientPhone(patient);
  if (storedPhone !== phone) {
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

  const message = [
    'YenCare Health',
    '',
    'Appointment Confirmed',
    `${appointment.appointmentDate}, ${appointment.appointmentTime}`,
    `Booking ID: ${appointment.referenceCode}`,
    'Please arrive 15 minutes early.',
  ].join('\n');

  let sms = { ok: false, error: 'SMS was not sent' };
  for (const destination of destinations.length > 0 ? destinations : [phone]) {
    console.info(
      '[booking] Sending confirmation SMS to patient',
      maskPhone(destination),
      'for',
      appointment.referenceCode,
    );
    sms = await sendSms(destination, message);
    if (sms.ok) break;
    console.error('[booking] SMS not delivered for', appointment.referenceCode, ':', sms.error);
  }

  return { appointment, sms };
}

function maskPhone(phone) {
  const value = String(phone);
  if (value.length <= 4) return value;
  return `${value.slice(0, -4).replace(/\d/g, '*')}${value.slice(-4)}`;
}
