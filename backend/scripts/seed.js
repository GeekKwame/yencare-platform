import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { connectDb, disconnectDb } from '../src/db/connection.js';
import { Patient, Room, Clinician, TimeSlot, Appointment, StaffUser } from '../src/models/index.js';
import { DEMO_STAFF, DEMO_STAFF_PASSWORD } from '../src/auth/staffAuth.js';
import bcrypt from 'bcryptjs';

const backendRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(backendRoot, '.env') });

const DEMO_DATE = '2026-09-15';

const ROOMS = [
  { name: 'Room 1', clinicSite: 'students-clinic', floor: 'Ground Floor', status: 'active', tokenPrefix: 'A' },
  { name: 'Room 2', clinicSite: 'students-clinic', floor: 'Ground Floor', status: 'active', tokenPrefix: 'B' },
  { name: 'Consultation Room GF7', clinicSite: 'social-science-gf7', floor: 'Ground Floor', status: 'active', tokenPrefix: 'C' },
];

const CLINICIANS = [
  {
    name: 'Dr. Kwame Boateng',
    title: 'Senior Medical Officer',
    specialty: 'General Practice & Outpatient',
    roomName: 'Room 1',
    clinicSite: 'students-clinic',
    available: true,
  },
  {
    name: 'Dr. Ama Serwaa',
    title: 'Medical Officer',
    specialty: 'General Practice & Outpatient',
    roomName: 'Room 2',
    clinicSite: 'students-clinic',
    available: true,
  },
];

const PATIENTS = [
  { fullName: 'Akosua Boateng', phone: '+233241234567', studentIndex: '20612345' },
  { fullName: 'Yaw Boateng', phone: '+233245550000', studentIndex: '20615500' },
  { fullName: 'Kweku Mensah', phone: '+233244441122', studentIndex: '20619022' },
  { fullName: 'Ama Agyei', phone: '+233207778899', studentIndex: '20617711' },
  { fullName: 'Kojo Asante', phone: '+233501112233', studentIndex: '20618800' },
];

const OPEN_SLOTS = [
  { clinician: 'Dr. Kwame Boateng', startTime: '11:00', endTime: '11:30' },
  { clinician: 'Dr. Kwame Boateng', startTime: '11:30', endTime: '12:00' },
  { clinician: 'Dr. Ama Serwaa', startTime: '11:00', endTime: '11:30' },
  { clinician: 'Dr. Ama Serwaa', startTime: '11:30', endTime: '12:00' },
];

async function upsertRoom(data) {
  return Room.findOneAndUpdate(
    { clinicSite: data.clinicSite, name: data.name },
    { $set: data },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

async function upsertPatient(data) {
  return Patient.findOneAndUpdate(
    { phone: data.phone },
    { $set: data },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

async function upsertClinician(data, roomsByKey) {
  const room = roomsByKey.get(`${data.clinicSite}:${data.roomName}`);
  if (!room) throw new Error(`Seed room missing for ${data.name}`);
  const { roomName, ...rest } = data;
  void roomName;
  return Clinician.findOneAndUpdate(
    { name: data.name, clinicSite: data.clinicSite },
    { $set: { ...rest, roomId: room._id } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

async function upsertSlot({ clinician, room, clinicSite, date, startTime, endTime, appointmentId = null }) {
  return TimeSlot.findOneAndUpdate(
    { clinicianId: clinician._id, date, startTime },
    {
      $set: {
        clinicianId: clinician._id,
        roomId: room._id,
        clinicSite,
        date,
        startTime,
        endTime,
        appointmentId,
        isBooked: Boolean(appointmentId),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

async function upsertAppointment(data) {
  return Appointment.findOneAndUpdate(
    { referenceCode: data.referenceCode },
    { $set: data },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

export async function seed({ dryRun = false } = {}) {
  if (dryRun) {
    console.log('[seed] dry-run: would upsert KNUST rooms, clinicians, slots, and demo appointments');
    return { ok: true, dryRun: true };
  }

  await connectDb();

  const roomsByKey = new Map();
  for (const room of ROOMS) {
    const doc = await upsertRoom(room);
    roomsByKey.set(`${doc.clinicSite}:${doc.name}`, doc);
    console.log(`[seed] room ${doc.name} @ ${doc.clinicSite}`);
  }

  const cliniciansByName = new Map();
  for (const clinician of CLINICIANS) {
    const doc = await upsertClinician(clinician, roomsByKey);
    cliniciansByName.set(doc.name, doc);
    console.log(`[seed] clinician ${doc.name}`);
  }

  const patientsByIndex = new Map();
  for (const patient of PATIENTS) {
    const doc = await upsertPatient(patient);
    patientsByIndex.set(doc.studentIndex, doc);
    console.log(`[seed] patient ${doc.fullName}`);
  }

  const kwame = cliniciansByName.get('Dr. Kwame Boateng');
  const ama = cliniciansByName.get('Dr. Ama Serwaa');
  const room1 = roomsByKey.get('students-clinic:Room 1');
  const room2 = roomsByKey.get('students-clinic:Room 2');

  const booked = [
    {
      referenceCode: 'YC-2001',
      patient: patientsByIndex.get('20619022'),
      clinician: kwame,
      room: room1,
      startTime: '09:00',
      endTime: '09:30',
      status: 'CALLED',
      visitType: 'general-opd',
      queueToken: '#2',
      notes: 'In consultation Room 1',
    },
    {
      referenceCode: 'YC-4821',
      patient: patientsByIndex.get('20612345'),
      clinician: kwame,
      room: room1,
      startTime: '09:30',
      endTime: '10:00',
      status: 'BOOKED',
      visitType: 'general-opd',
      notes: 'General consultation',
    },
    {
      referenceCode: 'YC-2002',
      patient: patientsByIndex.get('20617711'),
      clinician: ama,
      room: room2,
      startTime: '08:30',
      endTime: '09:00',
      status: 'CALLED',
      visitType: 'follow-up',
      queueToken: '#1',
      notes: 'In consultation Room 2',
    },
    {
      referenceCode: 'YC-4822',
      patient: patientsByIndex.get('20615500'),
      clinician: ama,
      room: room2,
      startTime: '10:00',
      endTime: '10:30',
      status: 'BOOKED',
      visitType: 'general-opd',
      notes: 'Demo no-show candidate',
    },
    {
      referenceCode: 'YC-3104',
      patient: patientsByIndex.get('20618800'),
      clinician: kwame,
      room: room1,
      startTime: '10:30',
      endTime: '11:00',
      status: 'WAITING',
      visitType: 'dressing',
      bookingType: 'WALK_IN',
      queueToken: 'W-024',
      notes: 'Walk-in dressing',
    },
  ];

  for (const row of booked) {
    const isWalkIn = row.bookingType === 'WALK_IN';
    const slot = isWalkIn
      ? null
      : await upsertSlot({
          clinician: row.clinician,
          room: row.room,
          clinicSite: 'students-clinic',
          date: DEMO_DATE,
          startTime: row.startTime,
          endTime: row.endTime,
        });

    const appointment = await upsertAppointment({
      referenceCode: row.referenceCode,
      patientId: row.patient._id,
      clinicianId: row.clinician._id,
      roomId: row.room._id,
      timeSlotId: slot?._id ?? null,
      clinicSite: 'students-clinic',
      visitType: row.visitType,
      bookingType: row.bookingType ?? 'BOOKED',
      status: row.status,
      appointmentDate: DEMO_DATE,
      appointmentTime: row.startTime,
      queueToken: row.queueToken,
      notes: row.notes,
      estimatedWaitMinutes: row.status === 'BOOKED' ? 30 : 0,
    });

    if (slot) {
      await TimeSlot.updateOne(
        { _id: slot._id },
        { $set: { appointmentId: appointment._id, isBooked: true } },
      );
    }
    console.log(`[seed] appointment ${appointment.referenceCode}`);
  }

  for (const open of OPEN_SLOTS) {
    const clinician = cliniciansByName.get(open.clinician);
    const room = clinician.name === 'Dr. Ama Serwaa' ? room2 : room1;
    await upsertSlot({
      clinician,
      room,
      clinicSite: 'students-clinic',
      date: DEMO_DATE,
      startTime: open.startTime,
      endTime: open.endTime,
    });
    console.log(`[seed] open slot ${clinician.name} ${open.startTime}`);
  }

  const passwordHash = bcrypt.hashSync(DEMO_STAFF_PASSWORD, 8);
  for (const person of DEMO_STAFF) {
    await StaffUser.findOneAndUpdate(
      { email: person.email },
      {
        $set: {
          ...person,
          passwordHash,
          active: true,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    console.log(`[seed] staff ${person.name} (${person.role})`);
  }

  return { ok: true, dryRun: false };
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCli) {
  const dryRun = process.argv.includes('--dry-run');
  try {
    const result = await seed({ dryRun });
    console.log('[seed] done', result);
    if (!dryRun) await disconnectDb();
    process.exit(0);
  } catch (err) {
    console.error('[seed] failed', err);
    if (!dryRun) await disconnectDb();
    process.exit(1);
  }
}
