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
import { ConflictError, ForbiddenError, ValidationError } from '../patients/errors.js';
import { resolvePatientPhone, resolveSmsDestination, bookingSmsDestinations } from '../patients/fields.js';
import { sendSms } from '../sms/sendSms.js';
import { appointmentEvents } from './appointmentOps.js';
import { assertSlotNotInPast } from './visitDayGuard.js';

export const MAX_ACTIVE_STUDENT_BOOKINGS = 2;

export const STUDENT_BOOKING_CAP_MESSAGE =
  'You have reached the maximum of 2 active appointments. Please complete or cancel existing visits.';

export const ACTIVE_STUDENT_BOOKING_STATUSES = Object.freeze([
  'BOOKED',
  'CHECKED_IN',
  'WAITING',
  'CALLED',
]);

export const WALK_IN_STAFF_ONLY_MESSAGE = 'Walk-ins can only be created by reception staff.';

export const STUDENT_INDEX_REQUIRED_MESSAGE =
  'A KNUST student index is required to book online. Please see reception.';

/**
 * Sites whose online bookings must belong to a patient with a student index on
 * record. KNUST Hospital also serves non-students, so it is not listed.
 */
const STUDENT_INDEX_REQUIRED_SITES = Object.freeze(['students-clinic']);

/** Roles allowed to admit a walk-in. Doctors are not: walk-ins go through the desk. */
const WALK_IN_STAFF_ROLES = Object.freeze(['RECEPTIONIST', 'ADMIN']);

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
 * Refuse a catalog slot that has already started, judged by the slot record's
 * own date and start time rather than the client's copy. Read-only, so it runs
 * before `claimOpenSlot` and a refused booking never touches the slot. A slot
 * that cannot be found is left for `claimOpenSlot` to report. The slot could
 * start between this check and the claim; that window is seconds wide.
 *
 * @param {object} payload
 * @param {Date} now
 * @throws {ValidationError}
 */
async function assertRequestedSlotNotStarted(payload, now) {
  let slot = null;
  if (payload.timeSlotId) {
    slot = await TimeSlot.findById(payload.timeSlotId);
  } else if (payload.clinicianId && payload.appointmentDate && payload.appointmentTime) {
    slot = await TimeSlot.findOne({
      clinicianId: payload.clinicianId,
      date: payload.appointmentDate,
      startTime: payload.appointmentTime,
    });
  }

  if (slot) {
    assertSlotNotInPast({ date: slot.date, startTime: slot.startTime }, now);
  }
}

/**
 * Count a patient's active appointments (BOOKED, CHECKED_IN, WAITING, CALLED)
 * from `minDate` onwards. Appointments are matched by `patientId` only — they
 * carry no student index of their own. When the patient has a student index,
 * every patient record holding it is counted together (the index is unique, so
 * this is normally the one record).
 *
 * @param {string | null} studentIndex 8-digit index from the Patient record, or null
 * @param {{ minDate?: string, patientId?: unknown }} [options]
 * @returns {Promise<number>}
 */
export async function countActiveBookingsForStudent(
  studentIndex,
  { minDate = accraTodayIso(), patientId } = {},
) {
  const normalizedIndex = studentIndex ? String(studentIndex).trim().replace(/\s+/g, '') : '';

  const patientIds = [];
  if (normalizedIndex) {
    try {
      const docs = await Patient.find({ studentIndex: normalizedIndex }, '_id');
      for (const doc of Array.isArray(docs) ? docs : []) {
        if (doc?._id) patientIds.push(doc._id);
      }
    } catch (err) {
      logger.warn('could not query patients by studentIndex for booking cap', {
        subsystem: 'booking-policy',
        studentIndex: normalizedIndex,
        err,
      });
    }
  }

  if (patientId && !patientIds.some((id) => String(id) === String(patientId))) {
    patientIds.push(patientId);
  }

  if (patientIds.length === 0) return 0;

  const query = {
    patientId: patientIds.length === 1 ? patientIds[0] : { $in: patientIds },
    status: { $in: [...ACTIVE_STUDENT_BOOKING_STATUSES] },
  };

  if (minDate) {
    query.appointmentDate = { $gte: minDate };
  }

  return Appointment.countDocuments(query);
}

/**
 * Enforce the active booking policy: at most 2 active appointments from today
 * onwards, counted per patient (and per student index when the patient has one).
 *
 * The student index comes only from the Patient record — a `studentIndex` in the
 * request body is ignored, as is any appointment id the body names, so a caller
 * cannot steer the count.
 *
 * Index-less patients (allowed at KNUST Hospital) are capped by patientId.
 * Known limitation: each new phone number registers a new patient record with
 * its own budget, so an index-less patient can dodge the cap that way.
 *
 * @param {object} payload
 * @param {{ minDate?: string, requireStudentIndex?: boolean }} [options]
 *   `requireStudentIndex` refuses a patient with no index on record (online
 *   Students' Clinic bookings).
 * @throws {ValidationError} if an index is required and the patient has none.
 * @throws {ConflictError} if the patient already has 2 active upcoming bookings.
 */
export async function assertStudentBookingCap(
  payload,
  { minDate = accraTodayIso(), requireStudentIndex = false } = {},
) {
  let patientDoc = null;
  if (payload.patientId) {
    try {
      patientDoc = await Patient.findById(payload.patientId);
    } catch {
      // An unusable patientId is reported by Appointment validation downstream.
    }
  }

  const studentIndex = patientDoc?.studentIndex
    ? String(patientDoc.studentIndex).trim().replace(/\s+/g, '')
    : null;

  if (requireStudentIndex && !studentIndex) {
    throw new ValidationError(STUDENT_INDEX_REQUIRED_MESSAGE);
  }

  const activeCount = await countActiveBookingsForStudent(studentIndex, {
    minDate,
    patientId: payload.patientId,
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
 * @param {{ staff?: { role?: string } | null, now?: Date }} [context]
 *   `staff` is the verified staff identity (`req.staff`) or null. It is the only
 *   thing that can make a booking a walk-in; `bookingType` in the body cannot.
 *   `now` is injectable for tests.
 * @returns {Promise<{ appointment: object, sms: { ok: boolean, error?: string } }>}
 */
export async function createAppointment(data, { staff = null, now = new Date() } = {}) {
  const payload = { ...data };
  const requestedPhone = payload.phone ?? payload.phoneNumber ?? null;
  delete payload.phone;
  delete payload.phoneNumber;

  // A walk-in skips opening hours and the booking cap, so it must be admitted
  // by verified desk staff. Anyone else asking for one is refused outright.
  const isDeskStaff = WALK_IN_STAFF_ROLES.includes(staff?.role);
  const isWalkIn = payload.bookingType === 'WALK_IN' && isDeskStaff;
  if (payload.bookingType === 'WALK_IN' && !isWalkIn) {
    throw new ForbiddenError(WALK_IN_STAFF_ONLY_MESSAGE);
  }

  const isScheduledAgainstClinician = Boolean(
    payload.timeSlotId ||
      (payload.clinicianId && payload.appointmentDate && payload.appointmentTime),
  );
  let claimedSlot = null;

  // Public-booking checks, all before any slot is claimed. Order matters: a
  // closed day or an already-started slot reports that reason, so the booking
  // cap runs last and never masks them. Staff walk-ins skip all three:
  // reception is admitting the patient in person.
  let preloadedPatient = null;
  if (!isWalkIn) {
    assertWithinClinicHours(payload);
    await assertRequestedSlotNotStarted(payload, now);
    ({ patient: preloadedPatient } = await assertStudentBookingCap(payload, {
      minDate: accraTodayIso(now),
      // Online Students' Clinic bookings must belong to a student. Desk staff
      // booking on a patient's behalf are trusted and still capped.
      requireStudentIndex:
        !isDeskStaff && STUDENT_INDEX_REQUIRED_SITES.includes(payload.clinicSite),
    }));
  }
  delete payload.studentIndex;

  if (!isWalkIn) {
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
