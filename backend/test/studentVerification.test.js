import assert from 'node:assert/strict';
import { after, afterEach, describe, it } from 'node:test';
import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

import { createStaffAuthService, DEMO_STAFF_PASSWORD } from '../src/auth/staffAuth.js';
import { createApp } from '../src/http/app.js';
import { Appointment } from '../src/models/Appointment.js';
import { createMemoryStore } from '../src/patients/memoryStore.js';
import { createPatientService } from '../src/patients/service.js';
import {
  updateAppointmentStatus,
  verifyStudentStatus,
  lookupAppointment,
} from '../src/services/appointmentOps.js';
import { getQueueStatus } from '../src/services/queueEngine.js';
import { accraTodayIso } from '../src/lib/accraTime.js';

const TEST_SECRET = 'student-verification-test-secret';
const TODAY = accraTodayIso();

const patientId = new mongoose.Types.ObjectId();
const clinicianId = new mongoose.Types.ObjectId();
const roomId = new mongoose.Types.ObjectId();
const appointmentId = new mongoose.Types.ObjectId();

function makeBooking(overrides = {}) {
  const doc = {
    _id: appointmentId,
    id: String(appointmentId),
    referenceCode: 'YC-4821',
    status: 'BOOKED',
    verificationStatus: 'PENDING',
    appointmentDate: TODAY,
    appointmentTime: '10:00',
    clinicSite: 'students-clinic',
    visitType: 'general-opd',
    bookingType: 'BOOKED',
    notes: 'General consult',
    queueToken: null,
    roomId: { _id: roomId, id: String(roomId), name: 'Room 1', clinicSite: 'students-clinic' },
    clinicianId: { _id: clinicianId, id: String(clinicianId), name: 'Dr. Kwame Boateng' },
    patientId: {
      _id: patientId,
      id: String(patientId),
      fullName: 'Akosua Boateng',
      phone: '+233241234567',
      studentIndex: '20612345',
    },
    save: async function () {
      return this;
    },
    toJSON: function () {
      return {
        id: String(this._id),
        referenceCode: this.referenceCode,
        status: this.status,
        verificationStatus: this.verificationStatus,
        verifiedAt: this.verifiedAt || null,
        verifiedBy: this.verifiedBy || null,
        verificationMethod: this.verificationMethod || null,
        verificationFailureReason: this.verificationFailureReason || null,
        appointmentDate: this.appointmentDate,
        appointmentTime: this.appointmentTime,
        clinicSite: this.clinicSite,
        patientId: this.patientId,
        queueToken: this.queueToken || null,
      };
    },
    ...overrides,
  };
  return doc;
}

import { Room } from '../src/models/Room.js';
import { QueueCounter } from '../src/models/QueueCounter.js';

const originals = {
  findById: Appointment.findById,
  findByReference: Appointment.findByReference,
  countDocuments: Appointment.countDocuments,
  roomFindById: Room.findById,
  queueCounterFindOneAndUpdate: QueueCounter.findOneAndUpdate,
};

let currentBooking = makeBooking();

function stubAppointments(doc = currentBooking) {
  Appointment.findById = () => ({
    populate: function () {
      return this;
    },
    then: (resolve) => Promise.resolve(doc).then(resolve),
  });
  Appointment.findByReference = async (ref) =>
    ref === doc.referenceCode ? doc : null;
  Appointment.countDocuments = async () => 0;
  Room.findById = async () => ({
    _id: roomId,
    name: 'Consultation Room 1',
    clinicSite: 'students-clinic',
  });
  QueueCounter.findOneAndUpdate = async () => ({
    nextSequence: 5,
  });
}

function restoreAppointments() {
  Appointment.findById = originals.findById;
  Appointment.findByReference = originals.findByReference;
  Appointment.countDocuments = originals.countDocuments;
  Room.findById = originals.roomFindById;
  QueueCounter.findOneAndUpdate = originals.queueCounterFindOneAndUpdate;
}

const servers = [];

async function startApp(customOps = {}) {
  const app = createApp({
    patientService: createPatientService(createMemoryStore()),
    appointmentService: {
      createAppointment: async () => ({ appointment: {}, sms: {} }),
      lookupAppointment,
      findByReference: (ref) => Appointment.findByReference(ref),
      getQueueStatus,
      updateStatus: updateAppointmentStatus,
      verifyStudentStatus,
      ...customOps,
    },
    staffAuth: createStaffAuthService({
      jwtSecret: TEST_SECRET,
      demoPassword: DEMO_STAFF_PASSWORD,
    }),
  });
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  servers.push(server);
  return `http://127.0.0.1:${server.address().port}`;
}

function receptionistToken() {
  return jwt.sign(
    { sub: 'stf_01', staffId: 'stf_01', name: 'Abena Osei', role: 'RECEPTIONIST' },
    TEST_SECRET,
  );
}

function doctorToken() {
  return jwt.sign(
    { sub: 'doc_01', staffId: 'doc_01', name: 'Dr. Kwame', role: 'DOCTOR' },
    TEST_SECRET,
  );
}

describe('Student Status Verification at Clinic Arrival', () => {
  afterEach(() => {
    restoreAppointments();
  });

  after(async () => {
    await Promise.all(
      servers.map((s) => new Promise((resolve) => s.close(resolve))),
    );
  });

  it('1. Receptionist can verify student with matching student index', async () => {
    currentBooking = makeBooking();
    stubAppointments(currentBooking);
    const url = await startApp();

    const res = await fetch(
      `${url}/api/appointments/${appointmentId}/verify-student`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${receptionistToken()}`,
        },
        body: JSON.stringify({
          studentIndex: '20612345',
          method: 'STUDENT_ID_CARD',
        }),
      },
    );

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.verificationStatus, 'VERIFIED');
    assert.equal(data.status, 'CHECKED_IN');
    assert.equal(data.verifiedBy, 'Abena Osei');
    assert.ok(data.verifiedAt);
    assert.equal(data.verificationMethod, 'STUDENT_ID_CARD');
  });

  it('2. Verification fails when provided student index does not match appointment record', async () => {
    currentBooking = makeBooking();
    stubAppointments(currentBooking);
    const url = await startApp();

    const res = await fetch(
      `${url}/api/appointments/${appointmentId}/verify-student`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${receptionistToken()}`,
        },
        body: JSON.stringify({
          studentIndex: '20699999', // Different index
          method: 'STUDENT_ID_CARD',
        }),
      },
    );

    assert.equal(res.status, 400);
    const data = await res.json();
    assert.match(data.error, /does not match/i);
    assert.equal(currentBooking.verificationStatus, 'PENDING');
  });

  it('3. Verification fails when student index format is invalid (not 8 digits)', async () => {
    currentBooking = makeBooking();
    stubAppointments(currentBooking);
    const url = await startApp();

    const res = await fetch(
      `${url}/api/appointments/${appointmentId}/verify-student`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${receptionistToken()}`,
        },
        body: JSON.stringify({
          studentIndex: '1234',
        }),
      },
    );

    assert.equal(res.status, 400);
    const data = await res.json();
    assert.match(data.error, /8-digit/i);
  });

  it('4. Unauthenticated caller is rejected with 401', async () => {
    currentBooking = makeBooking();
    stubAppointments(currentBooking);
    const url = await startApp();

    const res = await fetch(
      `${url}/api/appointments/${appointmentId}/verify-student`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentIndex: '20612345',
        }),
      },
    );

    assert.equal(res.status, 401);
  });

  it('5. Doctor role cannot verify student (desk staff only: 403 Forbidden)', async () => {
    currentBooking = makeBooking();
    stubAppointments(currentBooking);
    const url = await startApp();

    const res = await fetch(
      `${url}/api/appointments/${appointmentId}/verify-student`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${doctorToken()}`,
        },
        body: JSON.stringify({
          studentIndex: '20612345',
        }),
      },
    );

    assert.equal(res.status, 403);
  });

  it('6. Verification is rejected if appointment is on a different date', async () => {
    currentBooking = makeBooking({ appointmentDate: '2099-12-31' });
    stubAppointments(currentBooking);
    const url = await startApp();

    const res = await fetch(
      `${url}/api/appointments/${appointmentId}/verify-student`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${receptionistToken()}`,
        },
        body: JSON.stringify({
          studentIndex: '20612345',
        }),
      },
    );

    assert.equal(res.status, 400);
    const data = await res.json();
    assert.match(data.error, /day of the visit/i);
  });

  it('7. Cannot check in to queue (WAITING) if student verification failed', async () => {
    currentBooking = makeBooking({ verificationStatus: 'FAILED', verificationFailureReason: 'ID discrepancy' });
    stubAppointments(currentBooking);
    const url = await startApp();

    const res = await fetch(
      `${url}/api/appointments/${appointmentId}/status`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${receptionistToken()}`,
        },
        body: JSON.stringify({
          status: 'WAITING',
        }),
      },
    );

    assert.equal(res.status, 400);
    const data = await res.json();
    assert.match(data.error, /verification failed/i);
  });

  it('8. Enqueue flag verifies student and enters queue in one step', async () => {
    currentBooking = makeBooking({ status: 'CHECKED_IN', verificationStatus: 'PENDING' });
    stubAppointments(currentBooking);
    const url = await startApp();

    const res = await fetch(
      `${url}/api/appointments/${appointmentId}/verify-student`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${receptionistToken()}`,
        },
        body: JSON.stringify({
          studentIndex: '20612345',
          enqueue: true,
        }),
      },
    );

    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.verificationStatus, 'VERIFIED');
    assert.equal(data.status, 'WAITING');
    assert.ok(data.queueToken);
  });

  it('9. Marking verification failure records status and reason', async () => {
    currentBooking = makeBooking();
    stubAppointments(currentBooking);
    const url = await startApp();

    const res = await fetch(
      `${url}/api/appointments/${appointmentId}/verify-student`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${receptionistToken()}`,
        },
        body: JSON.stringify({
          action: 'FAIL',
          reason: 'No physical student ID card produced',
        }),
      },
    );

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.verificationStatus, 'FAILED');
    assert.equal(data.verificationFailureReason, 'No physical student ID card produced');
  });
});
