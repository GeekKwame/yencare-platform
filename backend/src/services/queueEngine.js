import mongoose from 'mongoose';
import { CLINIC_SITES, DATE_PATTERN } from '../db/constants.js';
import {
  Appointment,
  QueueCounter,
  Room,
  Clinician,
  Patient,
  TimeSlot,
} from '../models/index.js';
import { NotFoundError, ValidationError } from '../patients/errors.js';
import { notifyPatientCalled } from './callPatient.js';
import { accraTodayIso, isClinicOpen } from '../lib/accraTime.js';
import { assertVisitIsToday, assertNoShowAllowed } from './visitDayGuard.js';
import { normalizeReferenceInput } from '../utils/referenceCode.js';

export const AVERAGE_CONSULT_DURATION_MINUTES = 15;

/**
 * Derives a clean letter prefix for a room (e.g. 'A', 'B', 'C').
 * Uses room.tokenPrefix if configured, or derives from room name/index.
 *
 * @param {{ tokenPrefix?: string, name?: string }} room
 * @returns {string}
 */
export function getRoomTokenPrefix(room) {
  if (room?.tokenPrefix && typeof room.tokenPrefix === 'string' && room.tokenPrefix.trim()) {
    return room.tokenPrefix.trim().toUpperCase();
  }

  const name = String(room?.name || '').trim();
  if (/gf7/i.test(name)) return 'C';

  const roomNumMatch = name.match(/room\s*(\d+)/i);
  if (roomNumMatch) {
    const num = parseInt(roomNumMatch[1], 10);
    if (num >= 1 && num <= 26) {
      return String.fromCharCode(64 + num); // Room 1 -> 'A', Room 2 -> 'B', etc.
    }
  }

  const firstLetter = name.replace(/[^a-zA-Z]/g, '').charAt(0).toUpperCase();
  return firstLetter || 'A';
}

/**
 * Returns the current clinic day as YYYY-MM-DD in Africa/Accra, so queue
 * numbering rolls over at Accra midnight rather than at 00:00 UTC. Ghana is
 * UTC+0 all year, so this is a clarity change today and correct if the platform
 * is ever run from another timezone.
 *
 * @param {string} [overrideDate]
 * @returns {string}
 */
export function getAccraQueueDate(overrideDate = null) {
  if (overrideDate) {
    if (!DATE_PATTERN.test(String(overrideDate))) {
      throw new ValidationError('overrideDate must be YYYY-MM-DD');
    }
    return String(overrideDate);
  }
  return accraTodayIso();
}

/**
 * Live queue, call-next, and corridor boards are scoped to the visit day
 * (`appointmentDate`), not createdAt. A booking made Monday for Tuesday only
 * appears on Tuesday's hospital board.
 *
 * @param {string} [clinicDay] YYYY-MM-DD
 */
export function liveClinicDayFilter(clinicDay = getAccraQueueDate()) {
  return { appointmentDate: clinicDay };
}

/**
 * Atomically generates and assigns an incremental daily queue token (e.g. A-01, B-04).
 * Non-colliding tokens reset every Accra calendar day per room.
 *
 * @param {import('../models/Appointment.js').Appointment} appointment
 * @param {{ dateOverride?: string }} [options]
 * @returns {Promise<{ queueToken: string, queueDate: string, queueSequence: number }>}
 */
export async function assignDailyQueueToken(appointment, { dateOverride = null } = {}) {
  if (appointment.queueToken && appointment.queueSequence && appointment.queueDate) {
    return {
      queueToken: appointment.queueToken,
      queueDate: appointment.queueDate,
      queueSequence: appointment.queueSequence,
    };
  }

  const roomId = appointment.roomId?._id || appointment.roomId;
  if (!roomId) {
    throw new ValidationError('Appointment must have a roomId to assign a queue token');
  }

  const room = await Room.findById(roomId);
  if (!room) {
    throw new NotFoundError(`Room not found: ${roomId}`);
  }

  const tokenPrefix = getRoomTokenPrefix(room);
  const queueDate = getAccraQueueDate(dateOverride);

  // Atomically increment the sequence for (roomId, queueDate)
  const counter = await QueueCounter.findOneAndUpdate(
    { roomId: room._id, queueDate },
    { $inc: { nextSequence: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  const sequence = counter.nextSequence;
  const queueToken = `${tokenPrefix}-${String(sequence).padStart(2, '0')}`;

  appointment.queueToken = queueToken;
  appointment.queueDate = queueDate;
  appointment.queueSequence = sequence;

  return { queueToken, queueDate, queueSequence: sequence };
}

function assertAppointmentForClinician(appointment, clinicianId, message) {
  if (!clinicianId) return;
  const ref = appointment?.clinicianId;
  const appointmentClinicianId = ref ? String(ref._id || ref) : null;
  if (appointmentClinicianId !== String(clinicianId)) {
    const err = new Error(message);
    err.status = 403;
    throw err;
  }
}

/**
 * Resolves an appointment by ObjectId or referenceCode.
 */
async function findAppointment(idOrReference) {
  const key = String(idOrReference || '').trim();
  if (!key) return null;

  if (mongoose.isValidObjectId(key)) {
    const found = await Appointment.findById(key)
      .populate('patientId')
      .populate('clinicianId')
      .populate('roomId');
    if (found) return found;
  }

  return Appointment.findByReference(key);
}

/**
 * Calls the next waiting patient in FIFO order for a specific room.
 *
 * @param {{ roomId?: string, clinicianId?: string, force?: boolean, completePrevious?: boolean }} params
 */
export async function callNextPatient({ roomId, clinicianId, force = false, completePrevious = false } = {}) {
  let targetRoomId = roomId;
  let clinicianDoc = null;

  if (clinicianId) {
    const { Clinician } = await import('../models/Clinician.js');
    clinicianDoc = await Clinician.findById(clinicianId);
    if (!clinicianDoc) {
      throw new NotFoundError(`Clinician not found: ${clinicianId}`);
    }
    if (!targetRoomId) {
      targetRoomId = clinicianDoc.roomId;
    }
  }

  if (!targetRoomId) {
    throw new ValidationError('roomId or clinicianId is required');
  }

  const room = await Room.findById(targetRoomId);
  if (!room) {
    throw new NotFoundError(`Room not found: ${targetRoomId}`);
  }

  const clinicDay = getAccraQueueDate();

  const scopeFilter = clinicianId ? { clinicianId } : { roomId: room._id };

  // Check if a patient is currently CALLED today (scoped to clinician when provided)
  const activeQuery = {
    ...scopeFilter,
    status: 'CALLED',
    ...liveClinicDayFilter(clinicDay),
  };

  const activeAppointment = await Appointment.findOne(activeQuery);

  if (activeAppointment) {
    if (completePrevious) {
      activeAppointment.status = 'COMPLETED';
      await activeAppointment.save();
    } else if (!force) {
      const holder = clinicianId ? 'You already have' : `Room ${room.name} currently has`;
      const err = new Error(
        `${holder} an active consultation for token ${activeAppointment.queueToken}. Advance or mark no-show before calling next patient.`,
      );
      err.status = 409;
      err.activeAppointment = activeAppointment;
      throw err;
    }
  }

  // Strict FIFO for today's visit day only — yesterday's waiters are closed out
  // Scoped to clinicianId so a booked doctor only calls their own booked patients
  const waiterQuery = {
    ...scopeFilter,
    status: 'WAITING',
    ...liveClinicDayFilter(clinicDay),
  };

  const nextAppointment = await Appointment.findOne(waiterQuery)
    .sort({ queueSequence: 1, checkInTime: 1, createdAt: 1 })
    .populate('patientId')
    .populate('clinicianId')
    .populate('roomId');

  if (!nextAppointment) {
    const doctorLabel = clinicianDoc?.name || null;
    return {
      appointment: null,
      message: doctorLabel
        ? `No waiting patients for ${doctorLabel}`
        : `No waiting patients for ${room.name}`,
      room,
    };
  }

  // Transition WAITING -> CALLED
  nextAppointment.status = 'CALLED';
  await nextAppointment.save();

  const calledRoom = nextAppointment.roomId?.name ? nextAppointment.roomId : room;

  // Track active appointment on QueueCounter
  const queueDate = nextAppointment.queueDate || getAccraQueueDate();
  await QueueCounter.updateOne(
    { roomId: calledRoom._id, queueDate },
    { $set: { activeAppointmentId: nextAppointment._id } },
    { upsert: true },
  );

  // Dispatch SMS non-blocking (failures never undo the CALLED transition)
  void notifyPatientCalled(nextAppointment, calledRoom);

  return {
    appointment: nextAppointment,
    queueToken: nextAppointment.queueToken,
    room: calledRoom,
    message: `Called token ${nextAppointment.queueToken} into ${calledRoom.name}`,
  };
}

/**
 * Advances an appointment through the strict state machine pipeline:
 * BOOKED -> CHECKED_IN -> WAITING -> CALLED -> COMPLETED.
 * Or if roomId is provided, advances the room's current CALLED patient to COMPLETED.
 *
 * @param {{ appointmentId?: string, referenceCode?: string, roomId?: string, callNext?: boolean, clinicianId?: string }} params
 */
export async function advanceQueue({ appointmentId, referenceCode, roomId, callNext = false, clinicianId = null } = {}) {
  const key = appointmentId || referenceCode;

  if (key) {
    const appointment = await findAppointment(key);
    if (!appointment) {
      throw new NotFoundError('Appointment not found');
    }
    if (['BOOKED', 'CHECKED_IN', 'WAITING'].includes(appointment.status)) {   
      assertVisitIsToday(appointment);                                        
    }

    assertAppointmentForClinician(
      appointment,
      clinicianId,
      'Doctors can only call or advance appointments booked for their consultation',
    );

    switch (appointment.status) {
      case 'BOOKED':
        appointment.status = 'CHECKED_IN';
        await appointment.save();
        break;

      case 'CHECKED_IN':
        appointment.status = 'WAITING';
        await assignDailyQueueToken(appointment);
        await appointment.save();
        break;

      case 'WAITING': {
        const room = await Room.findById(appointment.roomId);
        const active = await Appointment.findOne({
          roomId: appointment.roomId,
          status: 'CALLED',
          _id: { $ne: appointment._id },
          ...liveClinicDayFilter(appointment.appointmentDate || getAccraQueueDate()),
        });
        if (active) {
          const err = new Error(
            `Room ${room?.name || ''} currently has an active consultation. Cannot call this patient yet.`,
          );
          err.status = 409;
          throw err;
        }

        appointment.status = 'CALLED';
        await appointment.save();
        await QueueCounter.updateOne(
          { roomId: appointment.roomId, queueDate: appointment.queueDate || getAccraQueueDate() },
          { $set: { activeAppointmentId: appointment._id } },
          { upsert: true },
        );
        void notifyPatientCalled(appointment, room);
        break;
      }

      case 'CALLED':
        appointment.status = 'COMPLETED';
        await appointment.save();
        await QueueCounter.updateOne(
          { roomId: appointment.roomId, activeAppointmentId: appointment._id },
          { $set: { activeAppointmentId: null } },
        );
        break;

      default: {
        const err = new Error(`Cannot advance appointment in terminal status: ${appointment.status}`);
        err.status = 400;
        throw err;
      }
    }

    return {
      appointment,
      message: `Appointment ${appointment.referenceCode} advanced to ${appointment.status}`,
    };
  }

  if (roomId) {
    const room = await Room.findById(roomId);
    if (!room) {
      throw new NotFoundError(`Room not found: ${roomId}`);
    }

    const active = await Appointment.findOne({
      roomId: room._id,
      status: 'CALLED',
      ...liveClinicDayFilter(),
      ...(clinicianId ? { clinicianId } : {}),
    })
      .populate('patientId')
      .populate('clinicianId')
      .populate('roomId');

    if (!active) {
      throw new ValidationError(`No active consultation in ${room.name} to advance`);
    }

    active.status = 'COMPLETED';
    await active.save();

    await QueueCounter.updateOne(
      { roomId: room._id, activeAppointmentId: active._id },
      { $set: { activeAppointmentId: null } },
    );

    let nextResult = null;
    if (callNext) {
      nextResult = await callNextPatient({ roomId: room._id, clinicianId });
    }

    return {
      completedAppointment: active,
      nextAppointment: nextResult?.appointment || null,
      message: `Consultation in ${room.name} completed`,
    };
  }

  throw new ValidationError('appointmentId, referenceCode, or roomId is required');
}

/**
 * Transitions an appointment to NO_SHOW, releasing any linked slot and clearing active counter.
 *
 * @param {{ appointmentId?: string, referenceCode?: string, roomId?: string, reason?: string, clinicianId?: string | null }} params
 */
export async function markNoShow({ appointmentId, referenceCode, roomId, reason, clinicianId = null } = {}) {
  const key = appointmentId || referenceCode;
  let appointment = null;

  if (key) {
    appointment = await findAppointment(key);
  } else if (roomId) {
    appointment = await Appointment.findOne({
      roomId,
      status: 'CALLED',
      ...liveClinicDayFilter(),
      ...(clinicianId ? { clinicianId } : {}),
    })
      .populate('patientId')
      .populate('clinicianId')
      .populate('roomId');
  }

  if (!appointment) {
    throw new NotFoundError('Appointment not found to mark as no-show');
  }

  assertAppointmentForClinician(
    appointment,
    clinicianId,
    'Doctors can only manage consultations booked with them.',
  );

  if (['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(appointment.status)) {
    const err = new Error(`Cannot mark appointment in status ${appointment.status} as no-show`);
    err.status = 400;
    throw err;
  }
  assertNoShowAllowed(appointment);
  appointment.status = "NO_SHOW";
  if(reason) appointment.cancelReason = reason;


  try {
    await appointment.save();
  } catch (err) {
    const blocked =err?.name === 'ValidationError' || String(err?.message || '').startsWith('Illegal status transition');
    if(!blocked){
      throw err;
    }
    // Deliberate override: end-of-day closeout must work from any open status.
    await Appointment.updateOne({ _id: appointment._id }, {
      $set: { status: 'NO_SHOW', cancelledTime: new Date(), ...(reason ? { cancelReason: reason } : {}) },
    });
  }

  if (appointment.timeSlotId) {
    await TimeSlot.updateOne(
      { _id: appointment.timeSlotId },
      { $set: { isBooked: false, appointmentId: null } },
    );
  }

  // Clear active counter if this was the active appointment
  await QueueCounter.updateOne(
    { roomId: appointment.roomId, activeAppointmentId: appointment._id },
    { $set: { activeAppointmentId: null } },
  );

  return {
    appointment,
    message: `Appointment ${appointment.referenceCode} marked as no-show`,
  };
}

/**
 * Computes real-time queue position, dynamic estimated wait time, and room token.
 * Formula: (Remaining patients ahead) x (average consult duration 15 min).
 *
 * @param {string} referenceCode
 */
export async function getQueueStatus(referenceCode) {
  const ref = normalizeReferenceInput(referenceCode);
  if (!ref) {
    throw new ValidationError('referenceCode is required');
  }

  const appointment = await Appointment.findByReference(ref);
  if (!appointment) {
    throw new NotFoundError(`Appointment not found: ${ref}`);
  }

  const roomId = appointment.roomId?._id || appointment.roomId;
  const clinicDay = appointment.appointmentDate || getAccraQueueDate();

  // Identify the currently serving token in this room on the visit day
  const nowServing = await Appointment.findOne({
    roomId,
    status: 'CALLED',
    ...liveClinicDayFilter(clinicDay),
  });

  const roomToken = nowServing?.queueToken || (appointment.status === 'CALLED' ? appointment.queueToken : null);

  let position = null;
  let patientsAhead = 0;
  let estimatedWaitMinutes = 0;

  if (appointment.status === 'WAITING') {
    // Count how many WAITING patients are ahead of this patient in strict FIFO order
    const queryAhead = {
      roomId,
      status: 'WAITING',
      _id: { $ne: appointment._id },
      ...liveClinicDayFilter(clinicDay),
    };

    if (appointment.queueSequence) {
      queryAhead.queueSequence = { $lt: appointment.queueSequence };
    } else if (appointment.checkInTime) {
      queryAhead.checkInTime = { $lt: appointment.checkInTime };
    }

    const waitingAhead = await Appointment.countDocuments(queryAhead);
    // If a consultation is actively CALLED, the waiting patient must wait for that patient to finish
    const hasActiveConsultation = Boolean(nowServing);
    patientsAhead = waitingAhead + (hasActiveConsultation ? 1 : 0);
    position = waitingAhead + 1; // 1st in waiting line
    estimatedWaitMinutes = patientsAhead * AVERAGE_CONSULT_DURATION_MINUTES;
  } else if (appointment.status === 'CHECKED_IN') {
    // Patient is checked in but not yet marked WAITING
    const totalWaiting = await Appointment.countDocuments({
      roomId,
      status: 'WAITING',
      ...liveClinicDayFilter(clinicDay),
    });
    const hasActiveConsultation = Boolean(nowServing);
    patientsAhead = totalWaiting + (hasActiveConsultation ? 1 : 0);
    position = totalWaiting + 1;
    estimatedWaitMinutes = patientsAhead * AVERAGE_CONSULT_DURATION_MINUTES;
  } else if (appointment.status === 'CALLED') {
    position = 0;
    patientsAhead = 0;
    estimatedWaitMinutes = 0;
  } else {
    // BOOKED, COMPLETED, CANCELLED, NO_SHOW
    position = appointment.status === 'BOOKED' ? null : 0;
    patientsAhead = 0;
    estimatedWaitMinutes = 0;
  }

  return {
    referenceCode: appointment.referenceCode,
    status: appointment.status,
    queueToken: appointment.queueToken || null,
    position,
    patientsAhead,
    estimatedWaitMinutes,
    roomToken: roomToken || null,
    nowServingToken: nowServing?.queueToken || null,
    room: appointment.roomId
      ? {
          id: String(appointment.roomId._id || appointment.roomId),
          name: appointment.roomId.name || 'Room',
          clinicSite: appointment.roomId.clinicSite,
        }
      : null,
    clinician: appointment.clinicianId
      ? {
          id: String(appointment.clinicianId._id || appointment.clinicianId),
          name: appointment.clinicianId.name,
          title: appointment.clinicianId.title,
        }
      : null,
  };
}

/**
 * Public clinic-activity snapshot for the patient home / welcome screen.
 * Returns tokens and counts only — no patient names or phone numbers.
 *
 * @param {string} [clinicSite]
 */
export async function getClinicActivity(clinicSite = 'students-clinic') {
  const site = String(clinicSite || 'students-clinic').trim();
  if (!CLINIC_SITES.includes(site)) {
    throw new ValidationError(
      `clinicSite must be one of: ${CLINIC_SITES.join(', ')}`,
    );
  }

  const clinicDay = getAccraQueueDate();

  const called = await Appointment.find({
    clinicSite: site,
    status: 'CALLED',
    ...liveClinicDayFilter(clinicDay),
  })
    .populate('roomId', 'name clinicSite')
    .sort({ calledTime: 1, appointmentTime: 1 })
    .lean();

  const waiting = await Appointment.find({
    clinicSite: site,
    status: 'WAITING',
    ...liveClinicDayFilter(clinicDay),
  })
    .sort({ queueSequence: 1, checkInTime: 1, createdAt: 1 })
    .lean();

  const waitingCount = waiting.length;
  const waitingTokens = waiting
    .map((appointment) => appointment.queueToken)
    .filter(Boolean);

  const rooms = await Room.find({ clinicSite: site, status: 'active' }).lean();
  const clinicians = await Clinician.find({ clinicSite: site }).lean();
  const cliniciansByRoom = new Map(
    clinicians.map((clinician) => [
      String(clinician.roomId),
      clinician,
    ]),
  );

  const activeRooms = rooms.map((room) => {
    const serving = called.find(
      (appointment) =>
        String(appointment.roomId?._id || appointment.roomId) === String(room._id),
    );
    const clinician = cliniciansByRoom.get(String(room._id));
    return {
      room: room.name,
      name: room.name,
      doctorName: clinician?.name || 'Duty clinician',
      specialty: clinician?.specialty || '',
      status: serving ? 'in-consultation' : 'available',
      currentToken: serving?.queueToken || null,
      nowServingToken: serving?.queueToken || null,
    };
  });

  const nowServingToken = activeRooms.find((room) => room.currentToken)?.currentToken || null;
  const nowServingRoom = activeRooms.find((room) => room.currentToken)?.name || null;
  const estimatedWaitMinutes =
    waitingCount === 0 ? 0 : waitingCount * AVERAGE_CONSULT_DURATION_MINUTES;
  const demandLevel =
    waitingCount >= 6 ? 'high' : waitingCount <= 2 ? 'low' : 'normal';

  return {
    clinicSite: site,
    activityDate: clinicDay,
    isOpen: isClinicOpen(site),
    nowServingToken,
    nowServingRoom,
    waitingCount,
    waitingTokens,
    estimatedWaitMinutes,
    demandLevel,
    lastUpdated: new Date().toISOString(),
    rooms: activeRooms,
    activeRooms,
  };
}
