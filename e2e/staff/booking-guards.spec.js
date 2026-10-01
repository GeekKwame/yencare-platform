import { expect, test } from '@playwright/test';
import { ObjectId } from 'mongodb';
import { RECEPTIONIST } from '../helpers/auth-helper.js';
import { accraParts } from '../../backend/src/lib/accraTime.js';
import {
  accraDateFromToday,
  cleanupCreatedFixtures,
  closeDb,
  createFreeSlotFixture,
  dbSkipReason,
  FIXTURE_TAG,
  getDb,
  getSlot,
  staffToken,
} from '../helpers/db-helper.js';

const API = 'http://localhost:4000/api';

const MESSAGES = {
  walkInStaffOnly: 'Walk-ins can only be created by reception staff.',
  slotStarted: 'That time slot has already started. Please choose a later slot.',
  indexRequired: 'A KNUST student index is required to book online. Please see reception.',
  cap: 'You have reached the maximum of 2 active appointments. Please complete or cancel existing visits.',
};

const pad = (n) => String(n).padStart(2, '0');

function accraMinutesNow() {
  const { hour, minute } = accraParts(new Date());
  return hour * 60 + minute;
}

const created = { patientIds: [], appointmentIds: [], slotIds: [] };

function uniqueDigits(testInfo, testDigit, n = 0) {
  return `${testInfo.repeatEachIndex % 10}${testDigit}${n}`;
}

async function students() {
  const db = await getDb();
  const [clinician, room] = await Promise.all([
    db.collection('clinicians').findOne({ name: 'Dr. Ama Serwaa', clinicSite: 'students-clinic' }),
    db.collection('rooms').findOne({ name: 'Room 2', clinicSite: 'students-clinic' }),
  ]);
  return { clinician, room };
}

async function hospital() {
  const db = await getDb();
  const [clinician, room] = await Promise.all([
    db.collection('clinicians').findOne({ name: 'Dr. Kwame Boateng', clinicSite: 'knust-hospital' }),
    db.collection('rooms').findOne({ name: 'OPD Room 1', clinicSite: 'knust-hospital' }),
  ]);
  if (!clinician || !room) throw new Error('Seed data missing: KNUST Hospital clinician/room');
  return { clinician, room };
}

async function insertPatient({ digits, studentIndex = null }) {
  const db = await getDb();
  const now = new Date();
  const _id = new ObjectId();
  await db.collection('patients').insertOne({
    _id,
    fullName: `Booking Guard ${digits}`,
    phone: `+2332099${digits.padStart(5, '0')}`,
    ...(studentIndex ? { studentIndex } : {}),
    [FIXTURE_TAG]: true,
    createdAt: now,
    updatedAt: now,
  });
  created.patientIds.push(_id);
  return _id;
}

async function insertActiveAppointment({ patientId, referenceCode, date, time }) {
  const db = await getDb();
  const { clinician, room } = await hospital();
  const now = new Date();
  const _id = new ObjectId();
  await db.collection('appointments').insertOne({
    _id,
    referenceCode,
    patientId,
    clinicianId: clinician._id,
    roomId: room._id,
    timeSlotId: null,
    clinicSite: 'knust-hospital',
    visitType: 'general-opd',
    bookingType: 'BOOKED',
    status: 'BOOKED',
    appointmentDate: date,
    appointmentTime: time,
    [FIXTURE_TAG]: true,
    createdAt: now,
    updatedAt: now,
  });
  created.appointmentIds.push(_id);
  return _id;
}

async function hospitalSlot({ date, time: desired }) {
  const db = await getDb();
  const { clinician, room } = await hospital();
  let [h, m] = desired.split(':').map(Number);
  for (let attempt = 0; attempt < 15; attempt += 1) {
    const time = `${pad(h)}:${pad(m)}`;
    const taken = await db.collection('time_slots').findOne({
      date,
      startTime: time,
      $or: [{ clinicianId: clinician._id }, { roomId: room._id }],
    });
    if (!taken && m % 30 !== 0) {
      const now = new Date();
      const _id = new ObjectId();
      await db.collection('time_slots').insertOne({
        _id,
        clinicianId: clinician._id,
        roomId: room._id,
        clinicSite: 'knust-hospital',
        date,
        startTime: time,
        endTime: `${pad(h)}:${pad(Math.min(m + 20, 59))}`,
        durationMinutes: 20,
        isBooked: false,
        appointmentId: null,
        [FIXTURE_TAG]: true,
        createdAt: now,
        updatedAt: now,
      });
      created.slotIds.push(_id);
      return { _id, date, time, clinicianId: clinician._id, roomId: room._id };
    }
    m += 1;
    if (m === 60) {
      m = 0;
      h += 1;
    }
  }
  throw new Error(`no free KNUST Hospital slot near ${desired} on ${date}`);
}

async function studentsSlot({ date, time }) {
  const { clinician, room } = await students();
  const slot = await createFreeSlotFixture({ date, time });
  return { ...slot, clinicianId: clinician._id, roomId: room._id };
}

function nextWeekday() {
  for (let offset = 1; offset <= 3; offset += 1) {
    const date = accraDateFromToday(offset);
    const day = new Date(`${date}T12:00:00Z`).getUTCDay();
    if (day >= 1 && day <= 5) return date;
  }
  throw new Error('no weekday in the next three days');
}

function bookingBody(slot, { patientId, clinicSite, ...extra }) {
  return {
    patientId: String(patientId),
    clinicianId: String(slot.clinicianId),
    roomId: String(slot.roomId),
    timeSlotId: String(slot._id),
    clinicSite,
    visitType: 'general-opd',
    appointmentDate: slot.date,
    appointmentTime: slot.time,
    ...extra,
  };
}

async function book(request, body, token) {
  const response = await request.post(`${API}/appointments`, {
    data: body,
    ...(token ? { headers: { authorization: `Bearer ${token}` } } : {}),
  });
  return { status: response.status(), json: await response.json() };
}

async function appointmentsFor(patientId) {
  const db = await getDb();
  return db.collection('appointments').countDocuments({ patientId });
}

test.describe('booking guards (API)', () => {
  test.skip(Boolean(dbSkipReason), dbSkipReason ?? '');
  test.skip(({ browserName }) => browserName !== 'chromium', 'server-side rules: run once, in chromium');

  test.afterEach(async () => {
    const db = await getDb();
    if (created.patientIds.length > 0) {
      await db.collection('appointments').deleteMany({ patientId: { $in: created.patientIds } });
      await db.collection('patients').deleteMany({ _id: { $in: created.patientIds }, [FIXTURE_TAG]: true });
    }
    if (created.appointmentIds.length > 0) {
      await db.collection('appointments').deleteMany({ _id: { $in: created.appointmentIds } });
    }
    if (created.slotIds.length > 0) {
      await db.collection('time_slots').deleteMany({ _id: { $in: created.slotIds }, [FIXTURE_TAG]: true });
    }
    created.patientIds = [];
    created.appointmentIds = [];
    created.slotIds = [];
    await cleanupCreatedFixtures();
  });

  test.afterAll(async () => {
    await closeDb();
  });

  test('1 · a walk-in needs a verified reception token', async ({ request }, testInfo) => {
    const digits = uniqueDigits(testInfo, 1);
    const repeat = testInfo.repeatEachIndex % 10;
    const patientId = await insertPatient({ digits });
    const slot = await studentsSlot({ date: accraDateFromToday(0), time: `09:${pad(5 + repeat * 5)}` });
    const body = bookingBody(slot, { patientId, clinicSite: 'students-clinic', bookingType: 'WALK_IN' });

    const anonymous = await book(request, body);
    expect(anonymous.status).toBe(403);
    expect(anonymous.json.error).toBe(MESSAGES.walkInStaffOnly);
    expect(await appointmentsFor(patientId)).toBe(0);
    expect((await getSlot(slot._id)).isBooked).toBe(false);

    const desk = await book(request, body, await staffToken(request, RECEPTIONIST));
    expect(desk.status).toBe(201);
    expect(desk.json.bookingType).toBe('WALK_IN');
    expect(String(desk.json.timeSlotId)).toBe(String(slot._id));
  });

  test('2 · an already-started slot today is refused, a later one is booked', async ({ request }, testInfo) => {
    const now = accraMinutesNow();
    test.skip(
      now < 30 || now > 23 * 60 + 30,
      'skipped near Accra midnight: needs a slot at 00:05 that has started and one at 23:40 that has not',
    );

    const repeat = testInfo.repeatEachIndex % 10;
    const patientId = await insertPatient({ digits: uniqueDigits(testInfo, 2) });
    const today = accraDateFromToday(0);

    const started = await hospitalSlot({ date: today, time: `00:${pad(5 + repeat)}` });
    const refused = await book(request, bookingBody(started, { patientId, clinicSite: 'knust-hospital' }));
    expect(refused.status).toBe(400);
    expect(refused.json.error).toBe(MESSAGES.slotStarted);
    expect((await getSlot(started._id)).isBooked).toBe(false);
    expect(await appointmentsFor(patientId)).toBe(0);

    const later = await hospitalSlot({ date: today, time: `23:${pad(40 + repeat)}` });
    const accepted = await book(request, bookingBody(later, { patientId, clinicSite: 'knust-hospital' }));
    expect(accepted.status).toBe(201);
    expect(String(accepted.json.timeSlotId)).toBe(String(later._id));
  });

  test("3 · Students' Clinic online bookings need an index on the patient record; KNUST Hospital does not", async ({ request }, testInfo) => {
    const repeat = testInfo.repeatEachIndex % 10;
    const patientId = await insertPatient({ digits: uniqueDigits(testInfo, 3) });

    const clinicSlot = await studentsSlot({ date: nextWeekday(), time: `10:${pad(5 + repeat * 5)}` });
    const refused = await book(
      request,
      bookingBody(clinicSlot, { patientId, clinicSite: 'students-clinic', studentIndex: '20699991' }),
    );
    expect(refused.status).toBe(400);
    expect(refused.json.error).toBe(MESSAGES.indexRequired);
    expect((await getSlot(clinicSlot._id)).isBooked).toBe(false);

    const hospitalBooking = await hospitalSlot({ date: accraDateFromToday(1), time: `10:${pad(7 + repeat * 5)}` });
    const accepted = await book(request, bookingBody(hospitalBooking, { patientId, clinicSite: 'knust-hospital' }));
    expect(accepted.status).toBe(201);
  });

  test('4 · the active-booking cap counts the patient record, not the request body', async ({ request }, testInfo) => {
    const repeat = testInfo.repeatEachIndex % 10;
    const day = nextWeekday();

    const atCap = await insertPatient({ digits: uniqueDigits(testInfo, 4, 0), studentIndex: `2068${uniqueDigits(testInfo, 4, 0)}0` });
    const [first] = await Promise.all([
      insertActiveAppointment({
        patientId: atCap,
        referenceCode: `YC-8${uniqueDigits(testInfo, 4, 1)}`,
        date: accraDateFromToday(0),
        time: `06:${pad(11 + repeat * 5)}`,
      }),
      insertActiveAppointment({
        patientId: atCap,
        referenceCode: `YC-8${uniqueDigits(testInfo, 4, 2)}`,
        date: accraDateFromToday(2),
        time: `06:${pad(12 + repeat * 5)}`,
      }),
    ]);

    const capSlot = await studentsSlot({ date: day, time: `11:${pad(5 + repeat * 5)}` });
    for (const extra of [{}, { studentIndex: '20699992' }, { appointmentId: String(first) }]) {
      const refused = await book(request, bookingBody(capSlot, { patientId: atCap, clinicSite: 'students-clinic', ...extra }));
      expect(refused.status, JSON.stringify(extra)).toBe(409);
      expect(refused.json.error).toBe(MESSAGES.cap);
    }
    expect((await getSlot(capSlot._id)).isBooked).toBe(false);
    expect(await appointmentsFor(atCap)).toBe(2);

    const belowCap = await insertPatient({ digits: uniqueDigits(testInfo, 4, 3), studentIndex: `2068${uniqueDigits(testInfo, 4, 3)}0` });
    await insertActiveAppointment({
      patientId: belowCap,
      referenceCode: `YC-8${uniqueDigits(testInfo, 4, 4)}`,
      date: accraDateFromToday(1),
      time: `06:${pad(13 + repeat * 5)}`,
    });
    const openSlot = await studentsSlot({ date: day, time: `12:${pad(5 + repeat * 5)}` });
    const accepted = await book(request, bookingBody(openSlot, { patientId: belowCap, clinicSite: 'students-clinic' }));
    expect(accepted.status).toBe(201);
    expect(await appointmentsFor(belowCap)).toBe(2);
  });
});
