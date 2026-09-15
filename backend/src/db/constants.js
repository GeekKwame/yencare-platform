export const CLINIC_SITES = ['students-clinic', 'social-science-gf7'];
export const ROOM_STATUSES = ['OPEN', 'CLOSED', 'MAINTENANCE'];
export const VISIT_TYPES = ['general-opd', 'dressing'];
export const BOOKING_TYPES = ['BOOKED', 'WALK_IN'];
export const APPOINTMENT_STATUSES = [
  'BOOKED',
  'CHECKED_IN',
  'WAITING',
  'CALLED',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
];

export const STUDENT_INDEX_PATTERN = /^\d{8}$/;
export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
export const REFERENCE_CODE_PATTERN = /^YC-\d{4}$/;

export const STATUS_TRANSITIONS = {
  BOOKED: ['CHECKED_IN', 'CANCELLED', 'NO_SHOW'],
  CHECKED_IN: ['WAITING', 'CANCELLED', 'NO_SHOW'],
  WAITING: ['CALLED', 'CANCELLED', 'NO_SHOW'],
  CALLED: ['COMPLETED', 'NO_SHOW'],
  COMPLETED: [],
  CANCELLED: ['NO_SHOW'],
  NO_SHOW: [],
};

export function isAllowedStatusTransition(from, to) {
  return from === to || STATUS_TRANSITIONS[from]?.includes(to) === true;
}

export function minutesBetween(startTime, endTime) {
  const [startHours, startMinutes] = startTime.split(':').map(Number);
  const [endHours, endMinutes] = endTime.split(':').map(Number);
  return endHours * 60 + endMinutes - (startHours * 60 + startMinutes);
}
