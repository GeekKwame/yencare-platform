import mongoose from 'mongoose';
import { EventEmitter } from 'node:events';

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
import { AuditLog } from '../models/AuditLog.js';
import { normalizeGhanaPhone } from '../sms/normalizePhone.js';

import {
  NotFoundError,
  ValidationError,
} from '../patients/errors.js';

import { resolveSmsDestination } from '../patients/fields.js';
import { sendSms } from '../sms/sendSms.js';
import { assignDailyQueueToken, AVERAGE_CONSULT_DURATION_MINUTES } from './queueEngine.js';

// Used by the real-time layer to notify clients after a successful
// cancellation/reschedule transaction.
export const appointmentEvents = new EventEmitter();

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

function patientPhone(appointment) {
  const patient =
    appointment?.patientId && typeof appointment.patientId === 'object'
      ? appointment.patientId
      : null;
  return resolveSmsDestination(patient);
}

function notifyQuiet(phone, message) {
  if (!phone || !message) return;
  void sendSms(phone, message).then((result) => {
    if (!result?.ok) {
      console.error('[sms] notification failed:', result?.error || 'unknown error');
    }
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
      throw new ValidationError(
        `clinicSite must be one of: ${CLINIC_SITES.join(', ')}`,
      );
    }

    query.clinicSite = clinicSite;
  }

  return Appointment.populateQueue(query);
}

const ACTIVE_PATIENT_LOOKUP_STATUSES = [
  'BOOKED',
  'CHECKED_IN',
  'WAITING',
  'CALLED',
];

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

  const appointment = await populatedAppointment(
    Appointment.findOne({
      patientId: patient._id,
      status: { $in: ACTIVE_PATIENT_LOOKUP_STATUSES },
    }).sort({ appointmentDate: 1, appointmentTime: 1 }),
  );

  if (!appointment) {
    throw new NotFoundError('Appointment not found');
  }

  return appointment;
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
    const phone = patientPhone(appointment);
    notifyQuiet(
      phone,
      [
        'YɛnCare',
        '',
        `You are in the live queue at ${clinicSiteLabel(appointment.clinicSite)}.`,
        appointment.queueToken ? `Token: ${appointment.queueToken}` : null,
        appointment.estimatedWaitMinutes
          ? `Estimated wait: about ${appointment.estimatedWaitMinutes} minutes.`
          : null,
        `Ref: ${appointment.referenceCode}`,
      ]
        .filter(Boolean)
        .join('\n'),
    );
  }

  return appointment;
}

/**
 * Patient "I've arrived": BOOKED → CHECKED_IN without a queue token.
 * Reception later moves CHECKED_IN → WAITING and assigns the token.
 *
 * @param {string} referenceCode
 * @param {{ phone?: string }} [options]
 */
export async function markPatientArrived(referenceCode, { phone } = {}) {
  const ref = String(referenceCode || '').trim().toUpperCase();
  if (!ref) {
    throw new ValidationError('Appointment reference is required');
  }

  const appointment = await Appointment.findByReference(ref);
  if (!appointment) {
    throw new NotFoundError('Appointment not found');
  }

  if (phone) {
    const stored = patientPhone(appointment);
    if (!stored || !phonesMatch(stored, phone)) {
      throw new NotFoundError('Appointment not found');
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

  appointment.status = 'CHECKED_IN';
  try {
    await appointment.save();
  } catch (err) {
    if (String(err?.message || '').startsWith('Illegal status transition')) {
      throw new ValidationError(err.message);
    }
    throw err;
  }

  notifyQuiet(
    patientPhone(appointment),
    [
      'YɛnCare',
      '',
      `We've noted your arrival at ${clinicSiteLabel(appointment.clinicSite)}.`,
      `Present Ref ${appointment.referenceCode} at reception.`,
      'Reception will add you to the live queue.',
    ].join('\n'),
  );

  return appointment;
}

/**
 * Cancel an appointment and release its slot atomically.
 *
 * @param {string} idOrReference
 * @param {{ cancelReason?: string, performedBy?: string|null }} options
 */
export async function cancelAppointment(
  idOrReference,
  { cancelReason = '', performedBy = null } = {},
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

      // Lock the appointment for this transaction.
      const appointment = await Appointment.findOne(query)
        .session(session);

      if (!appointment) {
        throw new NotFoundError('Appointment not found');
      }

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

      // Audit stamp.
      await AuditLog.create(
        [
          {
            action: 'APPOINTMENT_CANCELLED',
            appointmentId: appointment._id,
            cancelledTime,
            cancelReason: cancelReason
              ? String(cancelReason).trim()
              : null,
            performedBy: performedBy || null,
          },
        ],
        { session },
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
    notifyQuiet(
      patientPhone(cancelled),
      [
        'YɛnCare',
        '',
        `Your appointment ${cancelled.referenceCode} on ${cancelled.appointmentDate} at ${formatHm(cancelled.appointmentTime)} has been cancelled.`,
        `KNUST ${clinicSiteLabel(cancelled.clinicSite)}`,
        'You can book again when you need care.',
      ].join('\n'),
    );

    return result;
  } finally {
    await session.endSession();
  }
}

/**
 * Reschedule an appointment by atomically swapping its old slot
 * with a new available slot.
 *
 * @param {string} idOrReference
 * @param {{ newSlotId: string, performedBy?: string|null, staffChangeReason?: string }} options
 */
export async function rescheduleAppointment(
  idOrReference,
  { newSlotId, performedBy = null, staffChangeReason = '' } = {},
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

      // Lock appointment.
      const appointment = await Appointment.findOne(query)
        .session(session);

      if (!appointment) {
        throw new NotFoundError('Appointment not found');
      }

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
              ...(staffChangeReason
                ? {
                    staffChangeReason: String(staffChangeReason).trim(),
                    staffChangedTime: appointment.appointmentTime,
                  }
                : {}),
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

      // Audit log.
      await AuditLog.create(
        [
          {
            action: 'APPOINTMENT_RESCHEDULED',
            appointmentId: appointment._id,
            oldSlotId: oldSlot._id,
            newSlotId: newSlot._id,
            rescheduledTime: new Date(),
            performedBy: performedBy || null,
          },
        ],
        { session },
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
    const reason = moved.staffChangeReason
      ? `\nReason: ${moved.staffChangeReason}`
      : '';
    notifyQuiet(
      patientPhone(moved),
      [
        'YɛnCare Update',
        '',
        'Your appointment has been updated.',
        `New: ${moved.appointmentDate}, ${formatHm(moved.appointmentTime)}`,
        `Ref: ${moved.referenceCode}${reason}`,
        clinicSiteLabel(moved.clinicSite),
      ].join('\n'),
    );

    return result;
  } finally {
    await session.endSession();
  }
}

