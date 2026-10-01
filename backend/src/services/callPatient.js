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

/**
 * @param {{ referenceCode?: string, clinicSite?: string }} appointment
 * @param {{ room?: { name?: string, clinicSite?: string }, clinician?: { name?: string, clinicSite?: string } }} [context]
 * @returns {string}
 */
export function buildVisitCompletedSms(appointment, { room, clinician } = {}) {
  const clinicianDoc = clinician || appointment?.clinicianId;
  const clinicianName =
    typeof clinicianDoc === 'object' && clinicianDoc?.name
      ? clinicianDoc.name
      : typeof clinicianDoc === 'string' && clinicianDoc
        ? clinicianDoc
        : null;

  const site =
    appointment?.clinicSite ||
    room?.clinicSite ||
    clinicianDoc?.clinicSite ||
    'students-clinic';

  const siteLabel =
    site === 'knust-hospital'
      ? 'KNUST Hospital'
      : "KNUST Students' Clinic";

  const consultLine = clinicianName
    ? `Your consultation with ${clinicianName} at ${siteLabel} is complete.`
    : `Your consultation at ${siteLabel} is complete.`;

  const lines = [
    'YenCare Health',
    '',
    'Visit completed',
    consultLine,
    'Please proceed to the pharmacy for prescribed medications or laboratory for tests.',
  ];

  if (appointment?.referenceCode) {
    lines.push(`Booking ID: ${appointment.referenceCode}`);
  }

  return lines.join('\n');
}

/**
 * SMS after a doctor finishes consultation and completes the visit.
 * Failures never undo the COMPLETED transition.
 *
 * @param {object} appointment populated appointment (patientId may be a doc)
 * @param {{ room?: object, clinician?: object }} [options]
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function notifyPatientCompleted(appointment, { room, clinician } = {}) {
  try {
    let patient =
      appointment?.patientId && typeof appointment.patientId === 'object'
        ? appointment.patientId
        : null;

    if (!patient && appointment?.patientId) {
      const patientId = appointment.patientId?._id || appointment.patientId;
      try {
        const { Patient } = await import('../models/Patient.js');
        patient = await Patient.findById(patientId).select('fullName phone studentIndex');
      } catch (err) {
        logger.warn('could not reload patient for visit completion SMS', {
          subsystem: 'queue-complete',
          err,
        });
      }
    }

    const phone = resolveSmsDestination(patient);
    if (!phone) {
      const error = 'Patient has no phone number on record';
      logger.error('cannot send visit completion SMS: no phone on record', {
        subsystem: 'queue-complete',
        referenceCode: appointment?.referenceCode || String(appointment?._id || ''),
      });
      return { ok: false, error };
    }

    let clinicianObj = clinician || appointment?.clinicianId;
    if (clinicianObj && typeof clinicianObj !== 'object') {
      try {
        const { Clinician } = await import('../models/Clinician.js');
        clinicianObj = await Clinician.findById(clinicianObj).select('name title clinicSite');
      } catch {
        /* best effort */
      }
    }

    const message = buildVisitCompletedSms(appointment, { room, clinician: clinicianObj });
    const sms = await sendSms(phone, message);
    if (!sms.ok) {
      logger.error('visit completion SMS not delivered', {
        subsystem: 'queue-complete',
        referenceCode: appointment?.referenceCode,
        reason: sms.error,
      });
    }
    return sms;
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    logger.error('failed to dispatch visit completion SMS', { subsystem: 'queue-complete', err });
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
