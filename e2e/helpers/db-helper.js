import { MongoClient, ObjectId } from 'mongodb';
import { accraParts, accraTodayIso } from '../../backend/src/lib/accraTime.js';

const URI = process.env.E2E_MONGODB_URI;

export const FIXTURE_TAG = 'e2eFixture';

export const dbSkipReason = URI
  ? null
  : 'set E2E_MONGODB_URI to a seeded e2e database (its name must contain "e2e" or "test")';

const CLINIC_SITE = 'students-clinic';
const CLINICIAN_NAME = 'Dr. Ama Serwaa';
const ROOM_NAME = 'Room 2';
const STUDENT_INDEX = '20615500';

const CATALOG_TIMES = new Set([
  '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '14:00', '14:30',
]);

const ACTIVE_SLOT_STATUSES = ['BOOKED', 'CHECKED_IN', 'WAITING', 'CALLED', 'COMPLETED'];

let client = null;

const created = { appointmentIds: [], slotIds: [], counterRestores: [] };

export async function getDb() {
  if (!client) {
    client = new MongoClient(URI, { serverSelectionTimeoutMS: 5000 });
    await client.connect();
  }
  const db = client.db();
  if (!/e2e|test/i.test(db.databaseName)) {
    throw new Error(
      `Refusing to seed fixtures into "${db.databaseName}": name must contain "e2e" or "test"`,
    );
  }
  return db;
}

let transactionSupport = null;

export async function supportsTransactions() {
  if (transactionSupport === null) {
    const db = await getDb();
    const hello = await db.admin().command({ hello: 1 });
    transactionSupport = Boolean(hello.setName || hello.msg === 'isdbgrid');
  }
  return transactionSupport;
}

export async function closeDb() {
  if (client) {
    await client.close();
    client = null;
  }
}

const pad = (n) => String(n).padStart(2, '0');

export function accraTimeFromNow(offsetMinutes, now = new Date()) {
  const { hour, minute } = accraParts(now);
  const total = hour * 60 + minute + offsetMinutes;
  if (total < 0 || total >= 24 * 60) {
    throw new Error(
      `offset ${offsetMinutes}m crosses the Accra day boundary — run this suite away from midnight`,
    );
  }
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

export function accraDateFromToday(dayOffset = 0, now = new Date()) {
  const [y, m, d] = accraTodayIso(now).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + dayOffset)).toISOString().slice(0, 10);
}

function plusMinutes(hhmm, minutes) {
  const [h, m] = hhmm.split(':').map(Number);
  const total = h * 60 + m + minutes;
  return `${pad(Math.floor(total / 60) % 24)}:${pad(total % 60)}`;
}

async function catalogRefs(db) {
  const [clinician, room, patient] = await Promise.all([
    db.collection('clinicians').findOne({ name: CLINICIAN_NAME, clinicSite: CLINIC_SITE }),
    db.collection('rooms').findOne({ name: ROOM_NAME, clinicSite: CLINIC_SITE }),
    db.collection('patients').findOne({ studentIndex: STUDENT_INDEX }),
  ]);
  if (!clinician || !room || !patient) {
    throw new Error('Seed data missing — run the migrate + seed scripts against E2E_MONGODB_URI');
  }
  return { clinician, room, patient };
}

export async function patientPhone() {
  const db = await getDb();
  const { patient } = await catalogRefs(db);
  return patient.phone;
}

async function freeTime(db, { clinicianId, roomId, date, desired }) {
  let time = desired;

  for (let attempt = 0; attempt < 15; attempt += 1) {
    if (!CATALOG_TIMES.has(time)) {
      const [slotTaken, apptTaken] = await Promise.all([
        db.collection('time_slots').findOne({
          date,
          startTime: time,
          $or: [{ clinicianId }, { roomId }],
        }),
        db.collection('appointments').findOne({
          clinicianId,
          appointmentDate: date,
          appointmentTime: time,
          status: { $in: ACTIVE_SLOT_STATUSES },
        }),
      ]);
      if (!slotTaken && !apptTaken) return time;
    }
    time = plusMinutes(time, 1);
  }

  throw new Error(`no free time found near ${desired} on ${date}`);
}

async function assertReferenceUnused(db, referenceCode) {
  const existing = await db.collection('appointments').findOne({ referenceCode });
  if (existing) {
    throw new Error(
      `reference ${referenceCode} is already in use — pick another fixture code`,
    );
  }
}

async function nextQueueSequence(db, roomId, queueDate) {
  const [highest] = await db.collection('appointments')
    .find({ roomId, queueDate })
    .sort({ queueSequence: -1 })
    .limit(1)
    .toArray();
  const counter = await db.collection('queue_counters').findOne({ roomId, queueDate });

  return Math.max(highest?.queueSequence || 0, counter?.nextSequence || 0) + 1;
}

export async function createAppointmentFixture({
  referenceCode,
  date,
  time: desiredTime,
  status = 'BOOKED',
  withSlot = true,
  queued = false,
  activeInRoom = false,
}) {
  const db = await getDb();
  const { clinician, room, patient } = await catalogRefs(db);
  await assertReferenceUnused(db, referenceCode);

  const time = await freeTime(db, {
    clinicianId: clinician._id,
    roomId: room._id,
    date,
    desired: desiredTime,
  });

  const now = new Date();
  const _id = new ObjectId();
  let timeSlotId = null;

  if (withSlot) {
    timeSlotId = new ObjectId();
    await db.collection('time_slots').insertOne({
      _id: timeSlotId,
      clinicianId: clinician._id,
      roomId: room._id,
      clinicSite: CLINIC_SITE,
      date,
      startTime: time,
      endTime: plusMinutes(time, 30),
      durationMinutes: 30,
      isBooked: true,
      appointmentId: _id,
      [FIXTURE_TAG]: true,
      createdAt: now,
      updatedAt: now,
    });
    created.slotIds.push(timeSlotId);
  }

  const sequence = queued ? await nextQueueSequence(db, room._id, date) : null;
  const queue = queued
    ? { queueToken: `B-${pad(sequence)}`, queueDate: date, queueSequence: sequence }
    : {};

  await db.collection('appointments').insertOne({
    _id,
    referenceCode,
    patientId: patient._id,
    clinicianId: clinician._id,
    roomId: room._id,
    timeSlotId,
    clinicSite: CLINIC_SITE,
    visitType: 'general-opd',
    bookingType: 'BOOKED',
    status,
    appointmentDate: date,
    appointmentTime: time,
    estimatedWaitMinutes: 0,
    checkInTime: status === 'BOOKED' ? null : now,
    calledTime: status === 'CALLED' ? now : null,
    completedTime: null,
    cancelledTime: null,
    ...queue,
    [FIXTURE_TAG]: true,
    createdAt: now,
    updatedAt: now,
  });
  created.appointmentIds.push(_id);

  if (activeInRoom) {
    const previous = await db.collection('queue_counters').findOne({
      roomId: room._id,
      queueDate: date,
    });
    created.counterRestores.push({
      roomId: room._id,
      queueDate: date,
      existed: Boolean(previous),
      activeAppointmentId: previous?.activeAppointmentId ?? null,
    });

    await db.collection('queue_counters').updateOne(
      { roomId: room._id, queueDate: date },
      {
        $set: { activeAppointmentId: _id, updatedAt: now },
        $setOnInsert: { nextSequence: queue.queueSequence ?? 1, createdAt: now },
      },
      { upsert: true },
    );
  }

  return {
    _id,
    referenceCode,
    timeSlotId,
    roomId: room._id,
    clinicianId: clinician._id,
    date,
    time,
    queueToken: queue.queueToken ?? null,
  };
}

export async function createFreeSlotFixture({ date, time: desiredTime }) {
  const db = await getDb();
  const { clinician, room } = await catalogRefs(db);

  const time = await freeTime(db, {
    clinicianId: clinician._id,
    roomId: room._id,
    date,
    desired: desiredTime,
  });

  const now = new Date();
  const _id = new ObjectId();

  await db.collection('time_slots').insertOne({
    _id,
    clinicianId: clinician._id,
    roomId: room._id,
    clinicSite: CLINIC_SITE,
    date,
    startTime: time,
    endTime: plusMinutes(time, 30),
    durationMinutes: 30,
    isBooked: false,
    appointmentId: null,
    [FIXTURE_TAG]: true,
    createdAt: now,
    updatedAt: now,
  });
  created.slotIds.push(_id);

  return { _id, date, time };
}

export async function getAppointment(referenceCode) {
  const db = await getDb();
  return db.collection('appointments').findOne({ referenceCode });
}

export async function getSlot(slotId) {
  const db = await getDb();
  return db.collection('time_slots').findOne({ _id: new ObjectId(String(slotId)) });
}

export async function getQueueCounter(roomId, queueDate) {
  const db = await getDb();
  return db.collection('queue_counters').findOne({ roomId, queueDate });
}

export async function cleanupCreatedFixtures() {
  if (!URI) return;
  const db = await getDb();

  for (const restore of created.counterRestores) {
    if (restore.existed) {
      await db.collection('queue_counters').updateOne(
        { roomId: restore.roomId, queueDate: restore.queueDate },
        { $set: { activeAppointmentId: restore.activeAppointmentId } },
      );
    } else {
      await db.collection('queue_counters').deleteOne({
        roomId: restore.roomId,
        queueDate: restore.queueDate,
      });
    }
  }

  if (created.appointmentIds.length > 0) {
    await db.collection('appointments').deleteMany({
      _id: { $in: created.appointmentIds },
      [FIXTURE_TAG]: true,
    });
  }
  if (created.slotIds.length > 0) {
    await db.collection('time_slots').deleteMany({
      _id: { $in: created.slotIds },
      [FIXTURE_TAG]: true,
    });
  }

  created.appointmentIds = [];
  created.slotIds = [];
  created.counterRestores = [];
}

export async function staffToken(request, credentials) {
  const response = await request.post('http://localhost:4000/api/auth/staff-login', {
    data: { identifier: credentials.staffId, password: credentials.password },
  });
  if (!response.ok()) {
    throw new Error(`staff login failed: ${response.status()}`);
  }
  return (await response.json()).token;
}
