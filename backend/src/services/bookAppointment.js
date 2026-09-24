// src/services/bookAppointment.js
//
// Wraps Appointment.create(...) so SMS dispatch is guaranteed to fire on
// every successful appointment creation, regardless of which route calls it.
// Booking routes should call createAppointment(data) instead of calling
// Appointment.create(data) directly.

import { accraTodayIso, clinicHoursLabel, isClinicOpenAt } from '../lib/accraTime.js';
import { logger } from '../lib/logger.js';
import { Appointment } from '../models/Appointment.js';
import { Patient } from '../models/Patient.js';
import { TimeSlot } from '../models/TimeSlot.js';
import { ConflictError, ValidationError } from '../patients/errors.js';
import { resolvePatientPhone, resolveSmsDestination, bookingSmsDestinations } from '../patients/fields.js';
import { sendSms } from '../sms/sendSms.js';
import { appointmentEvents } from './appointmentOps.js';

export const MAX_ACTIVE_STUDENT_BOOKINGS = 2;

export const STUDENT_BOOKING_CAP_MESSAGE =
  'You have reached the maximum of 2 active appointments. Please complete or cancel existing visits.';

export const ACTIVE_STUDENT_BOOKING_STATUSES = Object.freeze([
  'BOOKED',
  'CHECKED_IN',
  'WAITING',
  'CALLED',
]);

function slotTakenError(message = 'This time slot is already booked') {
  const err = new Error(message);
  err.status = 409;
  return err;
}

const clinicLabels = {
  'students-clinic': "KNUST Students' Clinic",
  'knust-hospital': 'KNUST Hospital',
};

/**
 * Opening hours are enforced here, not only in the UI, so the API cannot accept
 * a Students' Clinic booking on a Sunday. Hours come from `accraTime.js`.
 *
 * Staff walk-ins are exempt on purpose: reception is physically at the desk with
 * the patient in front of them and is the authority on whether the clinic is open.
 *
 * @param {{ clinicSite?: string, appointmentDate?: string, appointmentTime?: string }} payload
 * @throws {ValidationError}
 */
export function assertWithinClinicHours(payload) {
  const clinicSite = payload.clinicSite;
  const date = payload.appointmentDate;
  const time = payload.appointmentTime;

  // Missing date/time is a schema-level problem; let Mongoose report it.
  if (!date || !time) return;

  if (isClinicOpenAt(clinicSite, date, time)) return;

  const site = clinicLabels[clinicSite] || 'This clinic';

  throw new ValidationError(
    `${site} is open ${clinicHoursLabel(clinicSite)}. Please choose a time within opening hours.`,
  );
}

/**
 * Atomically claim an open catalog slot so two concurrent books cannot share it.
 *
 * @param {object} payload
 * @param {{ requireSlot?: boolean, takenMessage?: string }} [options]
 *   `requireSlot: false` returns null instead of throwing when the catalog has
 *   no slot at all for this clinician/date/time — the unscheduled walk-in case.
 * @returns {Promise<object | null>}
 */
export async function claimOpenSlot(payload, { requireSlot = true, takenMessage } = {}) {
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

  if (!existing && !requireSlot) return null;

  throw slotTakenError(
    existing
      ? takenMessage || 'This time slot is already booked'
      : 'That consultation slot is no longer available',
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
 * Count active (non-completed, non-cancelled) upcoming appointments for a studentIndex.
 *
 * @param {string} studentIndex 8-digit student index number
 * @param {{ minDate?: string, patientId?: unknown, excludeAppointmentId?: unknown }} [options]
 * @returns {Promise<number>}
 */
export async function countActiveBookingsForStudent(
  studentIndex,
  { minDate = accraTodayIso(), patientId, excludeAppointmentId } = {},
) {
  if (!studentIndex) return 0;
  const normalizedIndex = String(studentIndex).trim().replace(/\s+/g, '');
  if (!normalizedIndex) return 0;

  let patientIds = [];
  try {
    if (typeof Patient.find === 'function') {
      const docs = await Patient.find({ studentIndex: normalizedIndex }, '_id');
      if (Array.isArray(docs)) {
        patientIds = docs.map((doc) => doc._id || doc.id).filter(Boolean);
      }
    }
  } catch (err) {
    logger.warn('could not query patients by studentIndex for booking cap', {
      subsystem: 'booking-policy',
      studentIndex: normalizedIndex,
      err,
    });
  }

  if (patientId && !patientIds.some((id) => String(id) === String(patientId))) {
    patientIds.push(patientId);
  }

  const query = {
    status: { $in: [...ACTIVE_STUDENT_BOOKING_STATUSES] },
  };

  if (minDate) {
    query.appointmentDate = { $gte: minDate };
  }

  if (excludeAppointmentId) {
    query._id = { $ne: excludeAppointmentId };
  }

  const orConditions = [];
  if (patientIds.length > 0) {
    orConditions.push({ patientId: patientIds.length === 1 ? patientIds[0] : { $in: patientIds } });
  }
  orConditions.push({ studentIndex: normalizedIndex });

  if (orConditions.length === 1) {
    Object.assign(query, orConditions[0]);
  } else {
    query.$or = orConditions;
  }

  if (typeof Appointment.countDocuments === 'function') {
    return await Appointment.countDocuments(query);
  }

  if (typeof Appointment.find === 'function') {
    const results = await Appointment.find(query);
    return Array.isArray(results) ? results.length : 0;
  }

  return 0;
}

/**
 * Enforce the active booking policy per studentIndex:
 * Caps active (BOOKED, CHECKED_IN, WAITING) appointments on future dates at 2.
 * Rejects requests with HTTP 409 if the student already has 2 active upcoming bookings.
 *
 * @param {object} payload
 * @param {{ minDate?: string }} [options]
 * @throws {ConflictError} if the student already has 2 active upcoming bookings.
 */
export async function assertStudentBookingCap(payload, { minDate = accraTodayIso() } = {}) {
  let studentIndex = payload.studentIndex
    ? String(payload.studentIndex).trim().replace(/\s+/g, '')
    : null;

  let patientDoc = null;
  if (!studentIndex && payload.patientId) {
    try {
      patientDoc = await Patient.findById(payload.patientId);
      if (patientDoc?.studentIndex) {
        studentIndex = String(patientDoc.studentIndex).trim().replace(/\s+/g, '');
      }
    } catch {
      // Patient lookup failure will be handled downstream if patient does not exist
    }
  }

  if (!studentIndex && payload.patient?.studentIndex) {
    studentIndex = String(payload.patient.studentIndex).trim().replace(/\s+/g, '');
  }

  // Non-student bookings have no studentIndex; booking cap policy does not apply.
  if (!studentIndex) {
    return { studentIndex: null, activeCount: 0, patient: patientDoc };
  }

  const activeCount = await countActiveBookingsForStudent(studentIndex, {
    minDate,
    patientId: payload.patientId,
    excludeAppointmentId: payload._id || payload.appointmentId,
  });

  if (activeCount >= MAX_ACTIVE_STUDENT_BOOKINGS) {
    const err = new ConflictError(STUDENT_BOOKING_CAP_MESSAGE);
    err.code = 'STUDENT_BOOKING_CAP_EXCEEDED';
    throw err;
  }

  return { studentIndex, activeCount, patient: patientDoc };
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
  const isScheduledAgainstClinician = Boolean(
    payload.timeSlotId ||
      (payload.clinicianId && payload.appointmentDate && payload.appointmentTime),
  );
  let claimedSlot = null;

  // Enforce student booking cap policy before reserving any slot.
  const { patient: preloadedPatient } = await assertStudentBookingCap(payload);
  delete payload.studentIndex;

  if (!isWalkIn) {
    assertWithinClinicHours(payload);
    claimedSlot = await claimOpenSlot(payload);
    payload.timeSlotId = claimedSlot._id;
  } else if (isScheduledAgainstClinician) {
    // Walk-ins use the same atomic claim as online bookings, so two concurrent
    // walk-ins can no longer be handed the same clinician slot. `requireSlot:
    // false` keeps unscheduled walk-ins working: when the catalog has no slot
    // for that clinician/date/time nothing is claimed and the appointment is
    // created without a timeSlotId, exactly as before.
    claimedSlot = await claimOpenSlot(payload, {
      requireSlot: false,
      takenMessage: 'This time slot is already booked for this clinician',
    });

    if (claimedSlot) {
      payload.timeSlotId = claimedSlot._id;
    } else if (payload.clinicianId && payload.appointmentDate && payload.appointmentTime) {
      // No catalog slot to claim. The unique partial index on
      // (clinicianId, appointmentDate, appointmentTime) is the real guard here;
      // this lookup only exists to return the friendlier 409 first.
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

  const patient = preloadedPatient || (await Patient.findById(appointment.patientId));
  if (!patient) {
    logger.error('appointment created but patient not found for SMS', {
      subsystem: 'booking',
      patientId: String(appointment.patientId),
      referenceCode: appointment.referenceCode,
    });
    return { appointment, sms: { ok: false, error: 'Patient not found for SMS' } };
  }

  const destinations = bookingSmsDestinations(patient, requestedPhone);
  const phone = destinations[0] || resolveSmsDestination(patient, requestedPhone);
  if (!phone) {
    logger.error('appointment created but patient has no usable Ghana phone for SMS', {
      subsystem: 'booking',
      patientId: String(appointment.patientId),
      referenceCode: appointment.referenceCode,
    });
    return { appointment, sms: { ok: false, error: 'Patient has no phone number on record' } };
  }

  const storedPhone = resolvePatientPhone(patient);
  if (storedPhone !== phone) {
    try {
      patient.phone = phone;
      await patient.save();
    } catch (err) {
      logger.warn('could not update stored patient phone before SMS', {
        subsystem: 'booking',
        patientId: String(appointment.patientId),
        err,
      });
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
    logger.info('sending booking confirmation SMS', {
      subsystem: 'booking',
      referenceCode: appointment.referenceCode,
      to: maskPhone(destination),
    });
    sms = await sendSms(destination, message);
    if (sms.ok) break;
    logger.error('booking confirmation SMS not delivered', {
      subsystem: 'booking',
      referenceCode: appointment.referenceCode,
      reason: sms.error,
    });
  }

  return { appointment, sms };
}

function maskPhone(phone) {
  const value = String(phone);
  if (value.length <= 4) return value;
  return `${value.slice(0, -4).replace(/\d/g, '*')}${value.slice(-4)}`;
}
