import mongoose from 'mongoose';

import {
  APPOINTMENT_STATUSES,
  CLINIC_SITES,
  DATE_PATTERN,
  REFERENCE_CODE_PATTERN,
  STUDENT_INDEX_PATTERN,
} from '../db/constants.js';

import { Appointment } from '../models/Appointment.js';
import { Patient } from '../models/Patient.js';
import { TimeSlot } from '../models/TimeSlot.js';
import { QueueCounter } from '../models/QueueCounter.js';
import { AuditLog, recordAuditLog } from '../models/AuditLog.js';
import { normalizeGhanaPhone, maskPhone } from '../sms/normalizePhone.js';
import {
  generateOtpCode,
  storeOtp,
  verifyOtp,
  DEFAULT_OTP_EXPIRY_MS,
  getLatestOtpForTesting,
} from './otpService.js';

import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../patients/errors.js';

import { createEventBusFacade } from '../lib/eventBus.js';
import { logger } from '../lib/logger.js';
import { accraTodayIso } from '../lib/accraTime.js';
import { bookingSmsDestinations, resolveSmsDestination } from '../patients/fields.js';
import { sendSms } from '../sms/sendSms.js';
import { normalizeReferenceInput } from '../utils/referenceCode.js';
import { assignDailyQueueToken, AVERAGE_CONSULT_DURATION_MINUTES } from './queueEngine.js';
import { assertVisitIsToday, assertWithinArrivalWindow, assertSlotNotInPast, assertNoShowAllowed } from './visitDayGuard.js';

// Used by the real-time layer to notify clients after a successful
// cancellation/reschedule transaction. Backed by the pluggable event bus so a
// shared (cross-replica) implementation can be installed at boot.
export const appointmentEvents = createEventBusFacade();

function clinicSiteLabel(clinicSite) {
  return clinicSite === 'knust-hospital'
    ? 'KNUST Hospital'
    : "KNUST Students' Clinic";
}

function formatHm(hhmm) {
  if (!hhmm || !/^\d{2}:\d{2}$/.test(hhmm)) return hhmm || '';
  const [hour, minute] = hhmm.split(':').map(Number);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const hour12 = ((hour + 11) % 12) + 1;
  return `${hour12}:${String(minute).padStart(2, '0')} ${suffix}`;
}

function asPatientDoc(value) {
  if (!value || typeof value !== 'object') return null;
  if (value instanceof mongoose.Types.ObjectId) return null;
  if (value._bsontype === 'ObjectId') return null;
  return value;
}

function patientPhone(appointment) {
  return resolveSmsDestination(asPatientDoc(appointment?.patientId));
}

export function buildWaitingSms(appointment) {
  return [
    'YenCare Health',
    '',
    `You are in the live queue at ${clinicSiteLabel(appointment.clinicSite)}.`,
    appointment.queueToken ? `Token: ${appointment.queueToken}` : null,
    appointment.estimatedWaitMinutes
      ? `Estimated wait: about ${appointment.estimatedWaitMinutes} minutes.`
      : null,
    `Booking ID: ${appointment.referenceCode}`,
  ]
    .filter(Boolean)
    .join('\n');
}

export function buildArrivalSms(appointment) {
  return [
    'YenCare Health',
    '',
    `We've noted your arrival at ${clinicSiteLabel(appointment.clinicSite)}.`,
    `Present Booking ID ${appointment.referenceCode} at reception.`,
    'Reception will add you to the live queue.',
  ].join('\n');
}

export function buildCancelSms(appointment) {
  return [
    'YenCare Health',
    '',
    `Your appointment ${appointment.referenceCode} on ${appointment.appointmentDate} at ${formatHm(appointment.appointmentTime)} has been cancelled.`,
    clinicSiteLabel(appointment.clinicSite),
    'You can book again when you need care.',
  ].join('\n');
}

export function buildRescheduleSms(appointment) {
  const reason = appointment.staffChangeReason
    ? `Reason: ${appointment.staffChangeReason}`
    : null;
  return [
    'YenCare Health',
    '',
    'Appointment updated',
    `New: ${appointment.appointmentDate}, ${formatHm(appointment.appointmentTime)}`,
    `Booking ID: ${appointment.referenceCode}`,
    reason,
    clinicSiteLabel(appointment.clinicSite),
  ]
    .filter(Boolean)
    .join('\n');
}

export function buildCancelOtpSms(appointment, code) {
  return [
    'YenCare Health',
    '',
    `Your cancellation verification code for appointment ${appointment.referenceCode} is: ${code}`,
    'This code expires in 10 minutes.',
    'Do not share this code with anyone.',
  ].join('\n');
}

export function buildRescheduleOtpSms(appointment, code) {
  return [
    'YenCare Health',
    '',
    `Your rescheduling verification code for appointment ${appointment.referenceCode} is: ${code}`,
    'This code expires in 10 minutes.',
    'Do not share this code with anyone.',
  ].join('\n');
}

function patientIdOf(appointment) {
  const raw = appointment?.patientId;
  if (!raw) return null;
  if (raw instanceof mongoose.Types.ObjectId || raw._bsontype === 'ObjectId') {
    return raw;
  }
  if (typeof raw === 'object') return raw._id || null;
  return raw;
}

async function smsDestinationsForAppointment(appointment, requestedPhone) {
  let patient = asPatientDoc(appointment?.patientId);
  if (!resolveSmsDestination(patient, requestedPhone)) {
    const id = patientIdOf(appointment);
    if (id) {
      try {
        patient = await Patient.findById(id).select('fullName phone studentIndex');
      } catch (err) {
        logger.warn('could not reload patient for SMS', {
          subsystem: 'sms',
          referenceCode: appointment?.referenceCode,
          err,
        });
      }
    }
  }
  return bookingSmsDestinations(patient, requestedPhone);
}

/**
 * Booking confirmation already awaits SMS; cancel/reschedule used to fire-and-forget
 * a Unicode body that mNotify often drops. Same GSM-safe copy and destination
 * fallback as createAppointment: try the proven request phone, then the record.
 *
 * Delivery failure never undoes the appointment change.
 *
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function sendAppointmentSms({
  appointment,
  requestedPhone,
  message,
  kind,
}) {
  try {
    const destinations = await smsDestinationsForAppointment(
      appointment,
      requestedPhone,
    );
    if (destinations.length === 0) {
      const error = 'Patient has no phone number on record';
      logger.error(`cannot send ${kind} SMS: no phone on record`, {
        subsystem: 'sms',
        referenceCode: appointment?.referenceCode || String(appointment?._id || ''),
      });
      return { ok: false, error };
    }

    let sms = { ok: false, error: 'SMS was not sent' };
    for (const destination of destinations) {
      sms = await sendSms(destination, message);
      if (sms.ok) return sms;
      logger.error(`${kind} SMS not delivered`, {
        subsystem: 'sms',
        referenceCode: appointment?.referenceCode,
        reason: sms.error,
      });
    }
    return sms;
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    logger.error(`failed to dispatch ${kind} SMS`, { subsystem: 'sms', err });
    return { ok: false, error };
  }
}

function notifyQuiet(appointment, message, kind) {
  void sendAppointmentSms({
    appointment,
    message,
    kind,
  });
}

function phonesMatch(left, right) {
  try {
    return normalizeGhanaPhone(left) === normalizeGhanaPhone(right);
  } catch {
    const digits = (value) => String(value || '').replace(/\D/g, '').slice(-9);
    const a = digits(left);
    const b = digits(right);
    return a.length === 9 && a === b;
  }
}

/**
 * Deliberately identical for "no such reference" and "wrong phone" so the
 * 4-digit YC-XXXX space cannot be probed for real appointments.
 */
export const OWNERSHIP_CHECK_FAILED_MESSAGE =
  'We could not verify this appointment with that phone number. Check the reference code and the phone number used to book, or speak to reception.';

export const PHONE_REQUIRED_MESSAGE =
  'Enter the phone number used to book this appointment to change it.';

export const LIVE_QUEUE_LOCKED_MESSAGE =
  'You are already in the live queue for today. Please speak to reception to cancel or change this appointment.';

/**
 * Proof of ownership for patient-initiated changes.
 *
 * Authenticated staff skip the check: reception is physically present and
 * authoritative. Everyone else must supply the phone number the appointment was
 * booked with.
 *
 * @param {object | null} appointment Appointment with a populated `patientId`.
 * @param {{ actorIsStaff?: boolean, phone?: unknown }} [context]
 * @throws {ForbiddenError}
 */
export function assertAppointmentOwnership(appointment, { actorIsStaff = false, phone = null } = {}) {
  if (actorIsStaff) return;

  const supplied = String(phone ?? '').trim();
  if (!supplied) {
    throw new ForbiddenError(PHONE_REQUIRED_MESSAGE);
  }

  let normalized;
  try {
    normalized = normalizeGhanaPhone(supplied);
  } catch {
    throw new ForbiddenError(OWNERSHIP_CHECK_FAILED_MESSAGE);
  }

  // A missing appointment is reported exactly like a wrong phone number.
  const stored = appointment ? patientPhone(appointment) : null;
  if (!stored || !phonesMatch(stored, normalized)) {
    throw new ForbiddenError(OWNERSHIP_CHECK_FAILED_MESSAGE);
  }
}

export const OTP_REQUIRED_MESSAGE =
  'A valid OTP verification code (otpCode) is required to cancel this appointment unless initiated by staff.';

/**
 * Proof of OTP verification for patient-initiated cancellation.
 * Staff skip the check; unauthenticated patients must provide a valid 4-digit OTP code.
 *
 * @param {object | null} appointment
 * @param {{ actorIsStaff?: boolean, otpCode?: unknown, phone?: unknown }} [context]
 * @throws {ForbiddenError}
 */
export async function assertAppointmentCancelOtp(
  appointment,
  { actorIsStaff = false, otpCode = null, phone = null } = {},
) {
  if (actorIsStaff) return;

  const code = String(otpCode ?? '').trim();
  if (!code) {
    throw new ForbiddenError(OTP_REQUIRED_MESSAGE);
  }

  const verification = await verifyOtp({
    appointmentId: appointment?._id,
    referenceCode: appointment?.referenceCode,
    action: 'CANCEL',
    code,
  });

  if (!verification.ok) {
    throw new ForbiddenError(verification.message);
  }
}

export const RESCHEDULE_OTP_REQUIRED_MESSAGE =
  'A valid OTP verification code (otpCode) is required to reschedule this appointment unless initiated by staff.';

/**
 * Proof of OTP verification or ownership for reschedule.
 * Staff skip the check; patients provide otpCode or registered phone.
 */
export async function assertAppointmentRescheduleOtp(
  appointment,
  { actorIsStaff = false, otpCode = null, phone = null } = {},
) {
  if (actorIsStaff) return;

  const code = String(otpCode ?? '').trim();
  if (code) {
    const verification = await verifyOtp({
      appointmentId: appointment?._id,
      referenceCode: appointment?.referenceCode,
      action: 'RESCHEDULE',
      code,
    });

    if (!verification.ok) {
      throw new ForbiddenError(verification.message);
    }
    return;
  }

  // If a masked phone was sent (e.g. from public lookup), require OTP verification code
  if (phone && String(phone).includes('*')) {
    throw new ForbiddenError(RESCHEDULE_OTP_REQUIRED_MESSAGE);
  }

  // Fall back to phone ownership check if unmasked phone was supplied
  assertAppointmentOwnership(appointment, { actorIsStaff, phone });
}

/**
 * Send a 4-digit SMS OTP code for appointment cancellation.
 *
 * @param {string} idOrReference
 * @returns {Promise<{ message: string, referenceCode: string, maskedPhone: string, expiresInMinutes: number, sms: object }>}
 */
export async function requestCancelOtp(idOrReference) {
  const key = String(idOrReference || '').trim();
  if (!key) {
    throw new ValidationError('Appointment id or reference is required');
  }

  const query = mongoose.isValidObjectId(key)
    ? { _id: key }
    : { referenceCode: key.toUpperCase() };

  let appointment = null;
  if (typeof Appointment.findOne === 'function') {
    appointment = await Appointment.findOne(query).populate(
      'patientId',
      'fullName phone studentIndex',
    );
  }

  if (!appointment) {
    throw new NotFoundError('Appointment not found');
  }

  assertNotInLiveQueue(appointment);

  if (
    appointment.status === 'CHECKED_IN' ||
    appointment.status === 'CALLED' ||
    appointment.status === 'COMPLETED'
  ) {
    throw new ValidationError(
      `Appointment cannot be cancelled when status is ${appointment.status}`,
    );
  }

  if (appointment.status === 'CANCELLED') {
    throw new ValidationError('Appointment is already cancelled');
  }

  const destinations = await smsDestinationsForAppointment(appointment);
  if (!destinations || destinations.length === 0) {
    throw new ValidationError('Patient has no phone number on record for OTP verification');
  }
  const phone = destinations[0];

  const code = generateOtpCode();

  await storeOtp({
    appointmentId: appointment._id,
    referenceCode: appointment.referenceCode,
    action: 'CANCEL',
    phone,
    code,
  });

  const sms = await sendSms(phone, buildCancelOtpSms(appointment, code));

  const response = {
    message: 'Cancellation verification code sent via SMS',
    referenceCode: appointment.referenceCode,
    maskedPhone: maskPhone(phone),
    expiresInMinutes: 10,
    sms,
  };

  if (process.env.NODE_ENV === 'test') {
    response.testOtp = code;
  }

  return response;
}

/**
 * Send a 4-digit SMS OTP code for appointment rescheduling.
 *
 * @param {string} idOrReference
 * @returns {Promise<{ message: string, referenceCode: string, maskedPhone: string, expiresInMinutes: number, sms: object }>}
 */
export async function requestRescheduleOtp(idOrReference) {
  const key = String(idOrReference || '').trim();
  if (!key) {
    throw new ValidationError('Appointment id or reference is required');
  }

  const query = mongoose.isValidObjectId(key)
    ? { _id: key }
    : { referenceCode: key.toUpperCase() };

  let appointment = null;
  if (typeof Appointment.findOne === 'function') {
    appointment = await Appointment.findOne(query).populate(
      'patientId',
      'fullName phone studentIndex',
    );
  }

  if (!appointment) {
    throw new NotFoundError('Appointment not found');
  }

  assertNotInLiveQueue(appointment);

  if (
    appointment.status === 'CHECKED_IN' ||
    appointment.status === 'CALLED' ||
    appointment.status === 'COMPLETED' ||
    appointment.status === 'CANCELLED'
  ) {
    throw new ValidationError(
      `Appointment cannot be rescheduled when status is ${appointment.status}`,
    );
  }

  const destinations = await smsDestinationsForAppointment(appointment);
  if (!destinations || destinations.length === 0) {
    throw new ValidationError('Patient has no phone number on record for OTP verification');
  }
  const phone = destinations[0];

  const code = generateOtpCode();

  await storeOtp({
    appointmentId: appointment._id,
    referenceCode: appointment.referenceCode,
    action: 'RESCHEDULE',
    phone,
    code,
  });

  const sms = await sendSms(phone, buildRescheduleOtpSms(appointment, code));

  const response = {
    message: 'Reschedule verification code sent via SMS',
    referenceCode: appointment.referenceCode,
    maskedPhone: maskPhone(phone),
    expiresInMinutes: 10,
    sms,
  };

  if (process.env.NODE_ENV === 'test') {
    response.testOtp = code;
  }

  return response;
}

/**
 * Once a queue token has been handed out the patient is standing in the live
 * queue, so self-service cancel/reschedule would strand that token. Reception
 * can still fix mistakes.
 *
 * @param {{ status?: string }} appointment
 * @param {{ actorIsStaff?: boolean }} [context]
 * @throws {ValidationError}
 */
export function assertNotInLiveQueue(appointment, { actorIsStaff = false } = {}) {
  if (actorIsStaff) return;
  if (appointment?.status === 'WAITING') {
    throw new ValidationError(LIVE_QUEUE_LOCKED_MESSAGE);
  }
}

/**
 * Staff roster date: the visit day (`appointmentDate`), never createdAt.
 * Omitting date defaults to Accra today so the dashboard cannot dump every
 * historical booking onto one board.
 *
 * @param {string | undefined} date
 * @param {Date} [now]
 * @returns {string}
 */
export function resolveRosterDate(date, now = new Date()) {
  if (date != null && date !== '') {
    if (!DATE_PATTERN.test(String(date))) {
      throw new ValidationError('date must be YYYY-MM-DD');
    }
    return String(date);
  }
  return accraTodayIso(now);
}

/**
 * @param {{ date?: string, clinicSite?: string, clinic?: string }} filters
 */
export async function listAppointments(filters = {}) {
  const clinicSite = filters.clinicSite || filters.clinic;
  const query = {
    appointmentDate: resolveRosterDate(filters.date),
  };

  if (clinicSite != null && clinicSite !== '') {
    if (!CLINIC_SITES.includes(clinicSite)) {
      throw new ValidationError(
        `clinicSite must be one of: ${CLINIC_SITES.join(', ')}`,
      );
    }

    query.clinicSite = clinicSite;
  }

  if (filters.clinicianId) {
    query.clinicianId = filters.clinicianId;
  }

  return Appointment.populateQueue(query);
}

/** Statuses a patient can still turn up for. */
export const ACTIVE_PATIENT_LOOKUP_STATUSES = Object.freeze([
  'BOOKED',
  'CHECKED_IN',
  'WAITING',
  'CALLED',
]);

/**
 * Statuses that make a reference a historical record rather than a live
 * appointment. Kept retrievable (cancellation history is legitimate) but
 * flagged so no client can present a dead reference as if it were live.
 */
export const HISTORICAL_APPOINTMENT_STATUSES = Object.freeze([
  'CANCELLED',
  'NO_SHOW',
  'COMPLETED',
]);

/** @param {{ status?: string } | null | undefined} appointment */
export function isHistoricalAppointment(appointment) {
  return HISTORICAL_APPOINTMENT_STATUSES.includes(String(appointment?.status || ''));
}

function normalizeReferenceCode(raw) {
  const compact = String(raw || '').replace(/\s+/g, '').toUpperCase();
  if (/^YC\d{4}$/.test(compact)) {
    return `YC-${compact.slice(2)}`;
  }
  return compact;
}

function populatedAppointment(query) {
  return query
    .populate('patientId')
    .populate({ path: 'clinicianId', populate: { path: 'roomId' } })
    .populate('roomId')
    .populate('timeSlotId');
}

/**
 * Public patient lookup used by Find Appointment (P09).
 * Search with exactly one of reference, student index, or Ghana phone.
 *
 * @param {{ reference?: string, studentIndex?: string, phone?: string }} query
 */
export async function lookupAppointment({
  reference,
  studentIndex,
  phone,
} = {}) {
  const refRaw = String(reference || '').trim();
  const indexRaw = String(studentIndex || '').trim();
  const phoneRaw = String(phone || '').trim();
  const provided = [refRaw, indexRaw, phoneRaw].filter(Boolean);

  if (provided.length === 0) {
    throw new ValidationError(
      'Provide a reference code, student index, or phone number',
    );
  }

  if (provided.length > 1) {
    throw new ValidationError(
      'Search with one of reference, student index, or phone number',
    );
  }

  if (refRaw) {
    const ref = normalizeReferenceCode(refRaw);
    if (!REFERENCE_CODE_PATTERN.test(ref)) {
      throw new ValidationError(
        'Please enter a valid reference code (e.g. YC-4821)',
      );
    }

    const appointment = await Appointment.findByReference(ref);
    if (!appointment) {
      throw new NotFoundError('Appointment not found');
    }
    return appointment;
  }

  let patient = null;

  if (indexRaw) {
    const index = indexRaw.replace(/\s+/g, '');
    if (!STUDENT_INDEX_PATTERN.test(index)) {
      throw new ValidationError(
        'Please enter a valid student index number (e.g. 20612345)',
      );
    }
    patient = await Patient.findOne({ studentIndex: index });
  } else {
    let e164;
    try {
      e164 = normalizeGhanaPhone(phoneRaw);
    } catch {
      throw new ValidationError(
        'Please enter a valid Ghana phone number (e.g. 024 123 4567)',
      );
    }
    patient = await Patient.findOne({ phone: e164 });
  }

  if (!patient) {
    throw new NotFoundError('Appointment not found');
  }

  const appointment = await findActiveAppointmentForPatient(patient);

  if (!appointment) {
    throw new NotFoundError('Appointment not found');
  }

  return appointment;
}

/**
 * @param {unknown} value Patient id, patient document, or appointment document.
 * @returns {{ patientId: unknown, excludeAppointmentId: unknown }}
 */
function resolvePatientRef(value) {
  if (!value) return { patientId: null, excludeAppointmentId: null };

  if (typeof value === 'string' || value instanceof mongoose.Types.ObjectId) {
    return { patientId: value, excludeAppointmentId: null };
  }

  if (typeof value !== 'object') {
    return { patientId: null, excludeAppointmentId: null };
  }

  // Appointment document (patientId may be populated or a raw id).
  if (value.patientId) {
    const raw = value.patientId;
    return {
      patientId: typeof raw === 'object' ? raw._id ?? null : raw,
      excludeAppointmentId: value._id ?? null,
    };
  }

  // Patient document.
  return { patientId: value._id ?? null, excludeAppointmentId: null };
}

/**
 * The patient's current live appointment: the earliest active one by date then
 * time on or after today. Used both by the phone/student-index lookup and by
 * the `supersededBy` field on historical references.
 *
 * @param {unknown} patientOrAppointment Patient id, patient doc, or appointment doc.
 * @param {{ minDate?: string | null }} [options] Defaults to accraTodayIso()
 * @returns {Promise<object | null>}
 */
export async function findActiveAppointmentForPatient(
  patientOrAppointment,
  { minDate = accraTodayIso() } = {},
) {
  const { patientId, excludeAppointmentId } = resolvePatientRef(patientOrAppointment);
  if (!patientId) return null;

  const filter = {
    patientId,
    status: { $in: [...ACTIVE_PATIENT_LOOKUP_STATUSES] },
  };

  if (minDate) {
    filter.appointmentDate = { $gte: minDate };
  }

  if (excludeAppointmentId) {
    filter._id = { $ne: excludeAppointmentId };
  }

  return populatedAppointment(
    Appointment.findOne(filter).sort({ appointmentDate: 1, appointmentTime: 1 }),
  );
}

/**
 * All active upcoming appointments for a patient (today onwards), sorted by date and time.
 *
 * @param {unknown} patientOrAppointment
 * @param {{ minDate?: string | null }} [options] Defaults to accraTodayIso()
 * @returns {Promise<object[]>}
 */
export async function findActiveAppointmentsForPatient(
  patientOrAppointment,
  { minDate = accraTodayIso() } = {},
) {
  const { patientId, excludeAppointmentId } = resolvePatientRef(patientOrAppointment);
  if (!patientId) return [];

  const filter = {
    patientId,
    status: { $in: [...ACTIVE_PATIENT_LOOKUP_STATUSES] },
  };

  if (minDate) {
    filter.appointmentDate = { $gte: minDate };
  }

  if (excludeAppointmentId) {
    filter._id = { $ne: excludeAppointmentId };
  }

  return populatedAppointment(
    Appointment.find(filter).sort({ appointmentDate: 1, appointmentTime: 1 }),
  );
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

  if (['CHECKED_IN', 'WAITING', 'CALLED'].includes(status)) {
    assertVisitIsToday(appointment);
  }
  if (status === 'NO_SHOW') {
    assertNoShowAllowed(appointment);
  }

  if (status === 'WAITING' && appointment.status === 'BOOKED') {
    appointment.status = 'CHECKED_IN';
    try {
      await appointment.save();
    } catch (err) {
      if (String(err?.message || '').startsWith('Illegal status transition')) {
        throw new ValidationError(err.message);
      }
      throw err;
    }
    appointment._originalStatus = 'CHECKED_IN';
  }

  appointment.status = status;

  // Prototype: token is assigned when reception puts the student in the live queue.
  if (status === 'WAITING') {
    await assignDailyQueueToken(appointment);
    const roomId = appointment.roomId?._id || appointment.roomId;
    const waitingAhead = await Appointment.countDocuments({
      roomId,
      status: 'WAITING',
      _id: { $ne: appointment._id },
    });
    appointment.estimatedWaitMinutes =
      (waitingAhead + 1) * AVERAGE_CONSULT_DURATION_MINUTES;
  }

  try {
    await appointment.save();
  } catch (err) {
    if (
      String(err?.message || '').startsWith(
        'Illegal status transition',
      )
    ) {
      throw new ValidationError(err.message);
    }

    throw err;
  }

  if (status === 'WAITING') {
    notifyQuiet(appointment, buildWaitingSms(appointment), 'queue');
  }

  if (status === 'NO_SHOW') {
    if (appointment.timeSlotId) {
      await TimeSlot.updateOne(
        { _id: appointment.timeSlotId },
        { $set: { isBooked: false, appointmentId: null } },
      );
    }
    const roomId = appointment.roomId?._id || appointment.roomId;
    if (roomId) {
      await QueueCounter.updateOne(
        { roomId, activeAppointmentId: appointment._id },
        { $set: { activeAppointmentId: null } },
      );
    }
  }

  return appointment;
}

/**
 * Patient "I've arrived": BOOKED → CHECKED_IN without a queue token.
 * Reception later moves CHECKED_IN → WAITING and assigns the token.
 *
 * @param {string} referenceCode
 * @param {{ phone?: string, actorIsStaff?:boolean }} [options]
 */
export async function markPatientArrived(referenceCode, { phone, actorIsStaff = false } = {}) {
  const key = normalizeReferenceInput(referenceCode);
  if (!key) {
    throw new ValidationError('Appointment reference is required');
  }

  let appointment = null;
  if (/^[a-fA-F0-9]{24}$/.test(key)) {
    appointment = await Appointment.findById(key)
      .populate('patientId')
      .populate({ path: 'clinicianId', populate: { path: 'roomId' } })
      .populate('roomId')
      .populate('timeSlotId');
  }
  if (!appointment) {
    appointment = await Appointment.findByReference(key);
  }
  if (!appointment) {
    throw new NotFoundError('Appointment not found');
  }

  // The patient already has the YC code on screen. A phone mismatch must not
  // look like a missing route (generic 404) and block check-in.
  if (phone) {
    const stored = patientPhone(appointment);
    if (stored && !phonesMatch(stored, phone)) {
      logger.warn('arrival phone did not match record; continuing with reference', {
        subsystem: 'arrival',
        referenceCode: appointment.referenceCode,
      });
    }
  }

  if (appointment.status === 'CHECKED_IN') {
    return appointment;
  }

  if (appointment.status !== 'BOOKED') {
    throw new ValidationError(
      `Arrival can only be recorded when status is BOOKED (current: ${appointment.status})`,
    );
  }

  assertVisitIsToday(appointment);
  if (!actorIsStaff) assertWithinArrivalWindow(appointment);

  appointment.status = 'CHECKED_IN';
  try {
    await appointment.save();
  } catch (err) {
    if (String(err?.message || '').startsWith('Illegal status transition')) {
      throw new ValidationError(err.message);
    }
    throw err;
  }

  notifyQuiet(appointment, buildArrivalSms(appointment), 'arrival');

  return appointment;
}

/**
 * Cancel an appointment and release its slot atomically.
 *
 * @param {string} idOrReference
 * @param {{
 *   cancelReason?: string,
 *   performedBy?: string|null,
 *   actorIsStaff?: boolean,
 *   phone?: string|null,
 * }} options
 */
export async function cancelAppointment(
  idOrReference,
  {
    cancelReason = '',
    reason = '',
    changeReason = '',
    performedBy = null,
    actorIsStaff = false,
    actorType = null,
    actorId = null,
    actingUserId = null,
    phone = null,
    otpCode = null,
  } = {},
) {
  const key = String(idOrReference || '').trim();

  if (!key) {
    throw new ValidationError(
      'Appointment id or reference is required',
    );
  }

  const session = await mongoose.startSession();

  let result = null;

  try {
    await session.withTransaction(async () => {
      const query = mongoose.isValidObjectId(key)
        ? { _id: key }
        : { referenceCode: key.toUpperCase() };

      // Lock the appointment for this transaction. The patient is populated so
      // ownership can be proven against the phone on record.
      const appointment = await Appointment.findOne(query)
        .populate('patientId', 'fullName phone studentIndex')
        .session(session);

      // Runs before the 404 so an unauthenticated caller cannot tell a wrong
      // OTP code apart from a reference that does not exist.
      await assertAppointmentCancelOtp(appointment, { actorIsStaff, otpCode, phone });

      if (!appointment) {
        throw new NotFoundError('Appointment not found');
      }

      assertNotInLiveQueue(appointment, { actorIsStaff });

      if (
        appointment.status === 'CHECKED_IN' ||
        appointment.status === 'CALLED' ||
        appointment.status === 'COMPLETED'
      ) {
        throw new ValidationError(
          `Appointment cannot be cancelled when status is ${appointment.status}`,
        );
      }

      // Prevent cancelling twice and releasing the same slot twice.
      if (appointment.status === 'CANCELLED') {
        throw new ValidationError(
          'Appointment is already cancelled',
        );
      }

      if (!appointment.timeSlotId) {
        throw new ValidationError(
          'Appointment has no linked time slot',
        );
      }

      // Lock the slot too.
      const slot = await TimeSlot.findOne({
        _id: appointment.timeSlotId,
      }).session(session);

      if (!slot) {
        throw new NotFoundError('Time slot not found');
      }

      // The slot must still belong to this appointment.
      if (
        !slot.isBooked ||
        !slot.appointmentId ||
        String(slot.appointmentId) !== String(appointment._id)
      ) {
        throw new ValidationError(
          'Appointment slot is already released or belongs to another appointment',
        );
      }

      const cancelledTime = new Date();

      // Update the appointment inside the same transaction.
      const updatedAppointment =
        await Appointment.findOneAndUpdate(
          {
            _id: appointment._id,
            status: {
              $nin: [
                'CANCELLED',
                'CHECKED_IN',
                'CALLED',
                'COMPLETED',
              ],
            },
          },
          {
            $set: {
              status: 'CANCELLED',
              cancelledTime,
              cancelReason: cancelReason
                ? String(cancelReason).trim()
                : null,
              estimatedWaitMinutes: 0,
            },
            // Releasing the slot must also drop any queue token, otherwise the
            // live queue keeps a phantom entry for a cancelled patient.
            $unset: {
              queueToken: '',
              queueDate: '',
              queueSequence: '',
            },
          },
          {
            new: true,
            session,
            runValidators: true,
          },
        )
          .populate('patientId', 'fullName phone studentIndex')
          .populate(
            'clinicianId',
            'name title specialty roomId',
          )
          .populate('roomId', 'name clinicSite')
          .populate('timeSlotId');

      if (!updatedAppointment) {
        throw new ValidationError(
          'Appointment could not be cancelled because its status changed',
        );
      }

      // Release only THIS appointment's slot.
      const released = await TimeSlot.updateOne(
        {
          _id: slot._id,
          isBooked: true,
          appointmentId: appointment._id,
        },
        {
          $set: {
            isBooked: false,
            appointmentId: null,
          },
        },
        { session },
      );

      if (released.modifiedCount !== 1) {
        throw new ValidationError(
          'Time slot could not be released because it has already changed',
        );
      }

      const finalActorType = actorType || (actorIsStaff ? 'STAFF' : 'PATIENT');
      const finalActorId =
        actorId ||
        actingUserId ||
        performedBy ||
        (finalActorType === 'STAFF'
          ? null
          : appointment.patientId?.studentIndex ||
            patientPhone(appointment) ||
            (appointment.patientId?._id
              ? String(appointment.patientId._id)
              : 'PATIENT_SELF_SERVICE'));

      const finalReason = String(
        reason ||
          cancelReason ||
          changeReason ||
          (finalActorType === 'PATIENT'
            ? 'Cancelled by patient via self-service'
            : 'Cancelled by staff via portal'),
      ).trim();

      const oldDate = appointment.appointmentDate || slot?.date || null;
      const oldTime = appointment.appointmentTime || slot?.startTime || null;

      // Comprehensive audit log.
      await recordAuditLog(
        {
          action: 'APPOINTMENT_CANCELLED',
          appointmentId: appointment._id,
          actorType: finalActorType,
          actorId: finalActorId,
          actingUserId: finalActorId,
          oldDate,
          oldTime,
          newDate: null,
          newTime: null,
          reason: finalReason,
          changeReason: finalReason,
          cancelReason: finalReason,
          cancelledTime,
          performedBy: finalActorId,
        },
        session,
      );

      result = {
        appointment: updatedAppointment,
        releasedSlotId: slot._id,
        cancelledTime,
      };
    });

    // Only notify clients after MongoDB commits successfully.
    appointmentEvents.emit('slotReleased', {
      slotId: String(result.releasedSlotId),
      appointmentId: String(result.appointment._id),
      isBooked: false,
      releasedAt: result.cancelledTime,
    });

    const cancelled = result.appointment;
    const sms = await sendAppointmentSms({
      appointment: cancelled,
      requestedPhone: phone,
      message: buildCancelSms(cancelled),
      kind: 'cancel',
    });

    return { ...result, sms };
  } finally {
    await session.endSession();
  }
}

/**
 * Reschedule an appointment by atomically swapping its old slot
 * with a new available slot.
 *
 * @param {string} idOrReference
 * @param {{
 *   newSlotId: string,
 *   performedBy?: string|null,
 *   staffChangeReason?: string,
 *   actorIsStaff?: boolean,
 *   phone?: string|null,
 * }} options
 */
export async function rescheduleAppointment(
  idOrReference,
  {
    newSlotId,
    performedBy = null,
    staffChangeReason = '',
    changeReason = '',
    reason = '',
    actorIsStaff = false,
    actorType = null,
    actorId = null,
    actingUserId = null,
    phone = null,
    otpCode = null,
  } = {},
) {
  const key = String(idOrReference || '').trim();

  if (!key) {
    throw new ValidationError(
      'Appointment id or reference is required',
    );
  }

  if (!newSlotId || !mongoose.isValidObjectId(newSlotId)) {
    throw new ValidationError(
      'A valid newSlotId is required',
    );
  }

  const session = await mongoose.startSession();

  let result = null;

  try {
    await session.withTransaction(async () => {
      const query = mongoose.isValidObjectId(key)
        ? { _id: key }
        : { referenceCode: key.toUpperCase() };

      // Lock appointment. Patient is populated for the ownership check.
      const appointment = await Appointment.findOne(query)
        .populate('patientId', 'fullName phone studentIndex')
        .session(session);

      // Before the 404, so an invalid code and an unknown reference look identical.
      await assertAppointmentRescheduleOtp(appointment, { actorIsStaff, otpCode, phone });

      if (!appointment) {
        throw new NotFoundError('Appointment not found');
      }

      assertNotInLiveQueue(appointment, { actorIsStaff });

      if (
        appointment.status === 'CHECKED_IN' ||
        appointment.status === 'CALLED' ||
        appointment.status === 'COMPLETED' ||
        appointment.status === 'CANCELLED'
      ) {
        throw new ValidationError(
          `Appointment cannot be rescheduled when status is ${appointment.status}`,
        );
      }

      if (!appointment.timeSlotId) {
        throw new ValidationError(
          'Appointment has no current time slot',
        );
      }

      if (
        String(appointment.timeSlotId) === String(newSlotId)
      ) {
        throw new ValidationError(
          'New time slot must be different from the current time slot',
        );
      }

      // Lock old slot.
      const oldSlot = await TimeSlot.findOne({
        _id: appointment.timeSlotId,
      }).session(session);

      if (!oldSlot) {
        throw new NotFoundError(
          'Current time slot not found',
        );
      }

      // Lock new slot.
      const newSlot = await TimeSlot.findOne({
        _id: newSlotId,
      }).session(session);

      if (!newSlot) {
        throw new NotFoundError('New time slot not found');
      }
      assertSlotNotInPast(newSlot);

      // New slot must be completely free.
      if (newSlot.isBooked || newSlot.appointmentId) {
        throw new ValidationError(
          'The selected time slot is already booked',
        );
      }

      // Old slot must still belong to this appointment.
      if (
        !oldSlot.isBooked ||
        !oldSlot.appointmentId ||
        String(oldSlot.appointmentId) !== String(appointment._id)
      ) {
        throw new ValidationError(
          'Current time slot is no longer linked to this appointment',
        );
      }

      // Reschedule within the same clinician.
      if (
        String(newSlot.clinicianId) !==
        String(appointment.clinicianId)
      ) {
        throw new ValidationError(
          'New time slot must belong to the same clinician',
        );
      }

      // Reserve the new slot first.
      const reserved = await TimeSlot.updateOne(
        {
          _id: newSlot._id,
          isBooked: false,
          appointmentId: null,
        },
        {
          $set: {
            isBooked: true,
            appointmentId: appointment._id,
          },
        },
        { session },
      );

      if (reserved.modifiedCount !== 1) {
        throw new ValidationError(
          'The new time slot became unavailable',
        );
      }

      // Release the old slot.
      const released = await TimeSlot.updateOne(
        {
          _id: oldSlot._id,
          isBooked: true,
          appointmentId: appointment._id,
        },
        {
          $set: {
            isBooked: false,
            appointmentId: null,
          },
        },
        { session },
      );

      if (released.modifiedCount !== 1) {
        throw new ValidationError(
          'The old time slot could not be released',
        );
      }

      // A queued patient who is moved to another slot is no longer standing in
      // today's queue, so reception's override also takes them out of it.
      const wasQueued = appointment.status === 'WAITING';

      // Move the appointment to the new slot.
      const updatedAppointment =
        await Appointment.findOneAndUpdate(
          {
            _id: appointment._id,
            timeSlotId: oldSlot._id,
            status: {
              $nin: [
                'CHECKED_IN',
                'CALLED',
                'COMPLETED',
                'CANCELLED',
              ],
            },
          },
          {
            $set: {
              timeSlotId: newSlot._id,
              appointmentDate: newSlot.date,
              appointmentTime: newSlot.startTime,
              roomId: newSlot.roomId,
              clinicSite: newSlot.clinicSite,
              estimatedWaitMinutes: 0,
              // Deliberate staff override of the WAITING → * state machine:
              // the patient is expected on the new date, not in today's queue.
              ...(wasQueued ? { status: 'BOOKED', checkInTime: null } : {}),
              ...(staffChangeReason
                ? {
                  staffChangeReason: String(staffChangeReason).trim(),
                  staffChangedTime: appointment.appointmentTime,
                }
                : {}),
            },
            // A moved appointment must not keep today's queue token: the old
            // token would otherwise sit in the live queue for a patient who is
            // no longer expected today.
            $unset: {
              queueToken: '',
              queueDate: '',
              queueSequence: '',
            },
          },
          {
            new: true,
            session,
            runValidators: true,
          },
        )
          .populate('patientId', 'fullName phone studentIndex')
          .populate(
            'clinicianId',
            'name title specialty roomId',
          )
          .populate('roomId', 'name clinicSite')
          .populate('timeSlotId');

      if (!updatedAppointment) {
        throw new ValidationError(
          'Appointment could not be rescheduled because its state changed',
        );
      }

      const finalActorType = actorType || (actorIsStaff ? 'STAFF' : 'PATIENT');
      const finalActorId =
        actorId ||
        actingUserId ||
        performedBy ||
        (finalActorType === 'STAFF'
          ? null
          : appointment.patientId?.studentIndex ||
            patientPhone(appointment) ||
            (appointment.patientId?._id
              ? String(appointment.patientId._id)
              : 'PATIENT_SELF_SERVICE'));

      const finalReason = String(
        reason ||
          changeReason ||
          staffChangeReason ||
          (finalActorType === 'PATIENT'
            ? 'Rescheduled by patient via self-service'
            : 'Rescheduled by staff via portal'),
      ).trim();

      const oldDate = appointment.appointmentDate || oldSlot.date || null;
      const oldTime = appointment.appointmentTime || oldSlot.startTime || null;
      const newDate = newSlot.date;
      const newTime = newSlot.startTime;

      // Comprehensive audit log.
      await recordAuditLog(
        {
          action: 'APPOINTMENT_RESCHEDULED',
          appointmentId: appointment._id,
          actorType: finalActorType,
          actorId: finalActorId,
          actingUserId: finalActorId,
          oldDate,
          oldTime,
          newDate,
          newTime,
          reason: finalReason,
          changeReason: finalReason,
          oldSlotId: oldSlot._id,
          newSlotId: newSlot._id,
          rescheduledTime: new Date(),
          performedBy: finalActorId,
        },
        session,
      );

      result = {
        appointment: updatedAppointment,
        oldSlotId: oldSlot._id,
        newSlotId: newSlot._id,
      };
    });

    // Notify clients only after the transaction commits.
    appointmentEvents.emit('slotReleased', {
      slotId: String(result.oldSlotId),
      appointmentId: String(result.appointment._id),
      isBooked: false,
      releasedAt: new Date(),
    });

    appointmentEvents.emit('slotBooked', {
      slotId: String(result.newSlotId),
      appointmentId: String(result.appointment._id),
      isBooked: true,
      bookedAt: new Date(),
    });

    const moved = result.appointment;
    const sms = await sendAppointmentSms({
      appointment: moved,
      requestedPhone: phone,
      message: buildRescheduleSms(moved),
      kind: 'reschedule',
    });

    return { ...result, sms };
  } finally {
    await session.endSession();
  }
}

