import {
  APPOINTMENT_STATUSES,
  BOOKING_TYPES,
  CLINIC_SITES,
  ROOM_STATUSES,
  VISIT_TYPES,
} from './constants.js';

const objectId = { bsonType: 'objectId' };
const optionalObjectId = { bsonType: ['objectId', 'null'] };
const optionalString = { bsonType: ['string', 'null'] };
const optionalDate = { bsonType: ['date', 'null'] };
const optionalInt = { bsonType: ['int', 'double', 'long', 'null'] };

export const COLLECTION_SPECS = [
  {
    name: 'patients',
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['fullName', 'phone'],
        properties: {
          fullName: { bsonType: 'string', minLength: 2, maxLength: 120 },
          phone: { bsonType: 'string', pattern: '^\\+233\\d{9}$' },
          studentIndex: { bsonType: ['string', 'null'], pattern: '^\\d{8}$' },
          nhisNumber: optionalString,
        },
      },
    },
    indexes: [
      { keys: { phone: 1 }, options: { unique: true, name: 'patients_phone_unique' } },
      {
        keys: { studentIndex: 1 },
        options: { unique: true, sparse: true, name: 'patients_studentIndex_unique' },
      },
    ],
  },
  {
    name: 'rooms',
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['name', 'clinicSite'],
        properties: {
          name: { bsonType: 'string', minLength: 1 },
          clinicSite: { enum: [...CLINIC_SITES] },
          floor: optionalString,
          status: { enum: [...ROOM_STATUSES] },
        },
      },
    },
    indexes: [
      { keys: { clinicSite: 1, name: 1 }, options: { unique: true, name: 'rooms_site_name_unique' } },
    ],
  },
  {
    name: 'clinicians',
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['name', 'title', 'specialty', 'roomId', 'clinicSite'],
        properties: {
          name: { bsonType: 'string', minLength: 1 },
          title: { bsonType: 'string' },
          specialty: { bsonType: 'string' },
          roomId: objectId,
          clinicSite: { enum: [...CLINIC_SITES] },
          available: { bsonType: 'bool' },
        },
      },
    },
    indexes: [
      { keys: { clinicSite: 1, available: 1 }, options: { name: 'clinicians_site_available' } },
      { keys: { roomId: 1 }, options: { name: 'clinicians_room' } },
    ],
  },
  {
    name: 'time_slots',
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['clinicianId', 'roomId', 'clinicSite', 'date', 'startTime', 'endTime'],
        properties: {
          clinicianId: objectId,
          roomId: objectId,
          clinicSite: { enum: [...CLINIC_SITES] },
          date: { bsonType: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
          startTime: { bsonType: 'string', pattern: '^([01]\\d|2[0-3]):[0-5]\\d$' },
          endTime: { bsonType: 'string', pattern: '^([01]\\d|2[0-3]):[0-5]\\d$' },
          durationMinutes: { bsonType: ['int', 'double', 'long'] },
          isBooked: { bsonType: 'bool' },
          appointmentId: optionalObjectId,
        },
      },
    },
    indexes: [
      {
        keys: { clinicianId: 1, date: 1, startTime: 1 },
        options: { unique: true, name: 'timeslots_clinician_datetime_unique' },
      },
      {
        keys: { roomId: 1, date: 1, startTime: 1 },
        options: { unique: true, name: 'timeslots_room_datetime_unique' },
      },
      {
        keys: { date: 1, clinicSite: 1, isBooked: 1 },
        options: { name: 'timeslots_day_availability' },
      },
    ],
  },
  {
    name: 'appointments',
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: [
          'referenceCode',
          'patientId',
          'clinicianId',
          'roomId',
          'clinicSite',
          'visitType',
          'appointmentDate',
          'appointmentTime',
        ],
        properties: {
          referenceCode: { bsonType: 'string', pattern: '^YC-\\d{4}$' },
          patientId: objectId,
          clinicianId: objectId,
          roomId: objectId,
          timeSlotId: optionalObjectId,
          clinicSite: { enum: [...CLINIC_SITES] },
          visitType: { enum: [...VISIT_TYPES] },
          bookingType: { enum: [...BOOKING_TYPES] },
          status: { enum: [...APPOINTMENT_STATUSES] },
          appointmentDate: { bsonType: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
          appointmentTime: { bsonType: 'string', pattern: '^([01]\\d|2[0-3]):[0-5]\\d$' },
          queueToken: optionalString,
          estimatedWaitMinutes: optionalInt,
          checkInTime: optionalDate,
          calledTime: optionalDate,
          completedTime: optionalDate,
          cancelledTime: optionalDate,
          cancelReason: optionalString,
          staffChangeReason: optionalString,
          staffChangedTime: optionalString,
          reminderSentAt: optionalDate,
          notes: optionalString,
        },
      },
    },
    indexes: [
      { keys: { referenceCode: 1 }, options: { unique: true, name: 'appointments_reference_unique' } },
      {
        keys: { clinicianId: 1, appointmentDate: 1, appointmentTime: 1 },
        options: {
          unique: true,
          name: 'appointments_clinician_active_slot_unique',
          partialFilterExpression: {
            status: { $in: ['BOOKED', 'CHECKED_IN', 'WAITING', 'CALLED', 'COMPLETED'] },
          },
        },
      },
      {
        keys: { appointmentDate: 1, clinicSite: 1, status: 1 },
        options: { name: 'appointments_day_site_status' },
      },
      { keys: { patientId: 1, appointmentDate: -1 }, options: { name: 'appointments_patient_date' } },
      { keys: { clinicianId: 1, appointmentDate: 1 }, options: { name: 'appointments_clinician_date' } },
      { keys: { timeSlotId: 1 }, options: { sparse: true, name: 'appointments_timeslot' } },
    ],
  },
  {
    name: 'staff_users',
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['staffId', 'email', 'passwordHash', 'name', 'role', 'clinicSite'],
        properties: {
          staffId: { bsonType: 'string', minLength: 3 },
          email: { bsonType: 'string', minLength: 5 },
          passwordHash: { bsonType: 'string', minLength: 10 },
          name: { bsonType: 'string', minLength: 2 },
          role: { enum: ['RECEPTIONIST', 'DOCTOR', 'ADMIN'] },
          assignedRoom: optionalString,
          clinicSite: { enum: [...CLINIC_SITES] },
          active: { bsonType: 'bool' },
        },
      },
    },
    indexes: [
      { keys: { email: 1 }, options: { unique: true, name: 'staff_users_email_unique' } },
      { keys: { staffId: 1 }, options: { unique: true, name: 'staff_users_staffId_unique' } },
      { keys: { role: 1, clinicSite: 1 }, options: { name: 'staff_users_role_site' } },
    ],
  },
];

export function findConflictingIndexes(specs = COLLECTION_SPECS) {
  const conflicts = [];
  for (const spec of specs) {
    const names = new Set();
    const keySignatures = new Set();
    for (const index of spec.indexes) {
      if (names.has(index.options.name)) {
        conflicts.push(`${spec.name}: duplicate index name ${index.options.name}`);
      }
      names.add(index.options.name);
      const signature = JSON.stringify(index.keys);
      if (keySignatures.has(signature)) {
        conflicts.push(`${spec.name}: duplicate index keys ${signature}`);
      }
      keySignatures.add(signature);
    }
  }
  return conflicts;
}
