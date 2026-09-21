// src/services/callPatient.js
//
// Fires the "you are being called" SMS when staff call a patient into a
// consultation room. Queue call-next uses notifyPatientCalled() after the
// WAITING → CALLED transition. Staff that already have an appointment id
// should call callPatient(appointmentId) instead of setting status = CALLED
// directly, the same way bookAppointment.js wraps creation.

import mongoose from 'mongoose';
import { logger } from '../lib/logger.js';
import { Appointment } from '../models/Appointment.js';
import { Room } from '../models/Room.js';
import { NotFoundError, ValidationError } from '../patients/errors.js';
import { resolveSmsDestination } from '../patients/fields.js';
import { sendSms } from '../sms/sendSms.js';
import { assertVisitIsToday } from './visitDayGuard.js';

/**
 * @param {{ queueToken?: string, referenceCode?: string }} appointment
 * @param {{ name?: string } | null} [room]
 */
export function buildCalledSms(appointment, room) {
  const roomName = room?.name || 'the consultation room';
  const token = appointment?.queueToken;
  const reference = appointment?.referenceCode;

  const lines = [
    'YenCare Health',
    '',
    'It is your turn now',
    token
      ? `Token ${token} is now called to ${roomName}.`
      : `Please go to ${roomName}.`,
    'Please proceed inside immediately.',
  ];

  if (reference) {
    lines.push(`Booking ID: ${reference}`);
  }

  return lines.join('\n');
}

/**
 * SMS after a successful CALLED transition. Failures never undo the call —
 * the clinic dashboard is the source of truth.
 *
 * @param {object} appointment populated appointment (patientId may be a doc)
 * @param {{ name?: string } | null} [room]
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function notifyPatientCalled(appointment, room) {
  try {
    const patient =
      appointment?.patientId && typeof appointment.patientId === 'object'
        ? appointment.patientId
        : null;
    const phone = resolveSmsDestination(patient);
    if (!phone) {
      const error = 'Patient has no phone number on record';
      logger.error('cannot send called SMS: no phone on record', {
        subsystem: 'queue-call',
        referenceCode: appointment?.referenceCode || String(appointment?._id || ''),
      });
      return { ok: false, error };
    }

    const sms = await sendSms(phone, buildCalledSms(appointment, room));
    if (!sms.ok) {
      logger.error('called SMS not delivered', {
        subsystem: 'queue-call',
        referenceCode: appointment?.referenceCode,
        reason: sms.error,
      });
    }
    return sms;
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    logger.error('failed to dispatch called SMS', { subsystem: 'queue-call', err });
    return { ok: false, error };
  }
}

async function findAppointment(idOrReference) {
  const key = String(idOrReference || '').trim();
  if (!key) return null;

  if (mongoose.isValidObjectId(key)) {
    const found = await Appointment.findById(key)
      .populate('patientId')
      .populate('roomId');
    if (found) return found;
  }

  return Appointment.findByReference(key);
}

/**
 * @param {string} appointmentId Mongo appointment ID or YC reference code
 * @returns {Promise<{ appointment: object, sms: { ok: boolean, error?: string } }>}
 */
export async function callPatient(appointmentId) {
  const appointment = await findAppointment(appointmentId);
  if (!appointment) {
    throw new NotFoundError(`Appointment not found: ${appointmentId}`);
  }
  assertVisitIsToday(appointment);

  appointment.status = 'CALLED';
  try {
    await appointment.save();
  } catch (err) {
    if (String(err?.message || '').startsWith('Illegal status transition')) {
      throw new ValidationError(err.message);
    }
    throw err;
  }

  const room =
    appointment.roomId && typeof appointment.roomId === 'object'
      ? appointment.roomId
      : await Room.findById(appointment.roomId);

  const sms = await notifyPatientCalled(appointment, room);
  return { appointment, sms };
}
