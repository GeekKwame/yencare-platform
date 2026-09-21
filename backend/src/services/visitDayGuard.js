import { accraParts, accraTodayIso } from '../lib/accraTime.js';
import { ValidationError } from '../patients/errors.js';

export const EARLY_WINDOW_MINUTES = 60;
export const LATE_GRACE_MINUTES = 15;

function toMinutes(hhmm) {
  const [hour, minute] = String(hhmm).split(':').map(Number);
  return hour * 60 + minute;
}

function toHhmm(totalMinutes) {
  const hour = (Math.floor(totalMinutes / 60)) % 24;
  const minute = totalMinutes % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function accraMinutesNow(now) {
  const { hour, minute } = accraParts(now);
  return hour * 60 + minute;
}

export function assertVisitIsToday(appointment, now = new Date()) {
  const date = appointment?.appointmentDate;
  if (!date) {
    throw new ValidationError('Appointment date is required');
  }

  const today = accraTodayIso(now);
  if (date === today) return;

  if (date > today) {
    throw new ValidationError(
      `This appointment is for ${date}. Check-in opens on the day of the visit.`,
    );
  }

  throw new ValidationError(
    `This appointment was on ${date} and has passed. Please book a new appointment or speak to reception.`,
  );
}

export function assertWithinArrivalWindow(appointment, now = new Date()) {
  const time = appointment?.appointmentTime;
  if (!time) {
    throw new ValidationError('Appointment time is required');
  }

  const offset = accraMinutesNow(now) - toMinutes(time);

  if (offset < -EARLY_WINDOW_MINUTES) {
    throw new ValidationError(
      `Check-in opens ${EARLY_WINDOW_MINUTES} minutes before your appointment time.`,
    );
  }

  if (offset > LATE_GRACE_MINUTES) {
    throw new ValidationError(
      'You are past your appointment time. Please see reception to move you to a later free slot today.',
    );
  }
}

export function assertSlotNotInPast(slot, now = new Date()) {
  const today = accraTodayIso(now);

  if (slot.date > today) return;
  if (slot.date === today && toMinutes(slot.startTime) >= accraMinutesNow(now)) return;

  throw new ValidationError('That time slot has already started. Please choose a later slot.');
}

export function assertNoShowAllowed(appointment, now = new Date()) {
  const date = appointment?.appointmentDate;
  if (!date) {
    throw new ValidationError('Appointment date is required');
  }

  const today = accraTodayIso(now);
  if (date < today) return;

  if (date > today) {
    throw new ValidationError(
      `This appointment is for ${date}. It cannot be marked as a no-show before the day of the visit.`,
    );
  }

  if (appointment.status !== 'BOOKED') return;

  const time = appointment?.appointmentTime;
  if (!time) {
    throw new ValidationError('Appointment time is required');
  }

  const graceEnds = toMinutes(time) + LATE_GRACE_MINUTES;
  if (accraMinutesNow(now) <= graceEnds) {
    throw new ValidationError(
      `The patient can still arrive until ${toHhmm(graceEnds)}. Mark as no-show after that.`,
    );
  }
}