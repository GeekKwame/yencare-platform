export const CLINIC_SITES = Object.freeze(['students-clinic', 'knust-hospital']);

export const VISIT_TYPES = Object.freeze(['general-opd', 'follow-up', 'dressing', 'other']);

export const BOOKING_TYPES = Object.freeze(['BOOKED', 'WALK_IN']);

export const APPOINTMENT_STATUSES = Object.freeze([
  'BOOKED',
  'CHECKED_IN',
  'WAITING',
  'CALLED',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
]);

/** Statuses that still occupy a clinician/date/time slot. */
export const ACTIVE_SLOT_STATUSES = Object.freeze([
  'BOOKED',
  'CHECKED_IN',
  'WAITING',
  'CALLED',
  'COMPLETED',
]);

export const ROOM_STATUSES = Object.freeze(['active', 'maintenance', 'inactive']);

export const STAFF_ROLES = Object.freeze(['RECEPTIONIST', 'DOCTOR', 'ADMIN']);

export const VERIFICATION_STATUSES = Object.freeze([
  'PENDING',
  'VERIFIED',
  'FAILED',
  'EXEMPT',
]);

export const VERIFICATION_METHODS = Object.freeze([
  'STUDENT_ID_CARD',
  'PHYSICAL_ID_CARD',
  'STAFF_OVERRIDE',
]);

export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export const REFERENCE_CODE_PATTERN = /^YC-\d{4}$/;

export const STUDENT_INDEX_PATTERN = /^\d{8}$/;

/** Allowed status changes after an appointment already exists. */
export const STATUS_TRANSITIONS = Object.freeze({
  BOOKED: Object.freeze(['CHECKED_IN', 'CANCELLED', 'NO_SHOW']),
  CHECKED_IN: Object.freeze(['WAITING', 'CANCELLED', 'NO_SHOW']),
  WAITING: Object.freeze(['CALLED', 'NO_SHOW', 'CANCELLED']),
  CALLED: Object.freeze(['COMPLETED', 'WAITING', 'NO_SHOW']),
  COMPLETED: Object.freeze([]),
  CANCELLED: Object.freeze([]),
  NO_SHOW: Object.freeze([]),
});

export function isAllowedStatusTransition(from, to) {
  if (from === to) return true;
  return (STATUS_TRANSITIONS[from] ?? []).includes(to);
}

export function minutesBetween(startTime, endTime) {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  return eh * 60 + em - (sh * 60 + sm);
}
