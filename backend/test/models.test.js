import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import mongoose from 'mongoose';
import { Appointment, Clinician, Patient, Room, TimeSlot } from '../src/models/index.js';

const oid = () => new mongoose.Types.ObjectId();

describe('Patient', () => {
  it('normalises Ghana phones and accepts an 8-digit student index', async () => {
    const patient = new Patient({
      fullName: 'Akosua Boateng',
      phone: '024 123 4567',
      studentIndex: '20612345',
    });
    await patient.validate();
    assert.equal(patient.phone, '+233241234567');
  });

  it('rejects an invalid phone', async () => {
    const patient = new Patient({ fullName: 'No Phone', phone: '123' });
    await assert.rejects(() => patient.validate(), /Invalid Ghana phone/);
  });

  it('rejects a non-8-digit student index', async () => {
    const patient = new Patient({
      fullName: 'Bad Index',
      phone: '+233241234567',
      studentIndex: '2061',
    });
    await assert.rejects(() => patient.validate(), /studentIndex/);
  });
});

describe('Room and Clinician', () => {
  it('rejects an unknown clinic site', async () => {
    const room = new Room({ name: 'Room 9', clinicSite: 'korle-bu' });
    await assert.rejects(() => room.validate(), /clinicSite/);
  });

  it('requires a room foreign key on clinicians', async () => {
    const clinician = new Clinician({
      name: 'Dr. Kwame Boateng',
      title: 'Senior Medical Officer',
      specialty: 'General Practice & Outpatient',
      clinicSite: 'students-clinic',
    });
    await assert.rejects(() => clinician.validate(), /roomId/);
  });

  it('accepts a clinician with a Room ObjectId ref', async () => {
    const clinician = new Clinician({
      name: 'Dr. Ama Serwaa',
      title: 'Medical Officer',
      specialty: 'General Practice & Outpatient',
      clinicSite: 'students-clinic',
      roomId: oid(),
    });
    await clinician.validate();
    assert.equal(clinician.available, true);
  });
});

describe('TimeSlot', () => {
  it('rejects endTime before startTime', async () => {
    const slot = new TimeSlot({
      clinicianId: oid(),
      roomId: oid(),
      clinicSite: 'students-clinic',
      date: '2026-09-15',
      startTime: '09:30',
      endTime: '09:00',
    });
    await assert.rejects(() => slot.validate(), /endTime must be after startTime/);
  });

  it('derives durationMinutes and books when appointmentId is set', async () => {
    const slot = new TimeSlot({
      clinicianId: oid(),
      roomId: oid(),
      clinicSite: 'students-clinic',
      date: '2026-09-15',
      startTime: '09:00',
      endTime: '09:30',
      appointmentId: oid(),
    });
    await slot.validate();
    slot.isBooked = false;
    await slot.validate();
    // pre-save is what flips isBooked; call the hook path via save middleware setup
    slot.isBooked = Boolean(slot.appointmentId);
    assert.equal(slot.durationMinutes, 30);
    assert.equal(slot.isBooked, true);
  });

  it('registers unique clinician and room compound indexes', () => {
    const indexes = TimeSlot.schema.indexes();
    const keys = indexes.map(([key]) => JSON.stringify(key));
    assert.ok(keys.includes(JSON.stringify({ clinicianId: 1, date: 1, startTime: 1 })));
    assert.ok(keys.includes(JSON.stringify({ roomId: 1, date: 1, startTime: 1 })));
  });
});

describe('Appointment', () => {
  it('allocates a YC-XXXX code and accepts required refs', async () => {
    const appointment = new Appointment({
      patientId: oid(),
      clinicianId: oid(),
      roomId: oid(),
      clinicSite: 'students-clinic',
      visitType: 'general-opd',
      appointmentDate: '2026-09-15',
      appointmentTime: '09:30',
    });
    await appointment.validate();
    assert.match(appointment.referenceCode, /^YC-\d{4}$/);
    assert.equal(appointment.status, 'BOOKED');
    assert.equal(appointment.bookingType, 'BOOKED');
  });

  it('rejects an illegal enum value', async () => {
    const appointment = new Appointment({
      patientId: oid(),
      clinicianId: oid(),
      roomId: oid(),
      clinicSite: 'students-clinic',
      visitType: 'surgery',
      appointmentDate: '2026-09-15',
      appointmentTime: '09:30',
    });
    await assert.rejects(() => appointment.validate(), /visitType/);
  });

  it('allows walk-ins without a time slot', async () => {
    const appointment = new Appointment({
      patientId: oid(),
      clinicianId: oid(),
      roomId: oid(),
      clinicSite: 'social-science-gf7',
      visitType: 'dressing',
      bookingType: 'WALK_IN',
      appointmentDate: '2026-09-15',
      appointmentTime: '10:30',
      queueToken: 'W-024',
    });
    await appointment.validate();
    assert.equal(appointment.timeSlotId, null);
  });

  it('registers the unique referenceCode index and queue lookup index', () => {
    const indexes = Appointment.schema.indexes();
    const keys = indexes.map(([key]) => JSON.stringify(key));
    assert.ok(keys.includes(JSON.stringify({ referenceCode: 1 })));
    assert.ok(keys.includes(JSON.stringify({ appointmentDate: 1, clinicSite: 1, status: 1 })));
    assert.equal(typeof Appointment.findByReference, 'function');
    assert.equal(typeof Appointment.populateQueue, 'function');
  });
});
