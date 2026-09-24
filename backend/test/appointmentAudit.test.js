import assert from 'node:assert/strict';
import { after, beforeEach, describe, it } from 'node:test';
import mongoose from 'mongoose';

import { createStaffAuthService, DEMO_STAFF_PASSWORD } from '../src/auth/staffAuth.js';
import { createApp } from '../src/http/app.js';
import { createMemoryStore } from '../src/patients/memoryStore.js';
import { createPatientService } from '../src/patients/service.js';
import {
  AuditLog,
  clearAuditLogs,
  getRecentAuditLogs,
  recordAuditLog,
} from '../src/models/AuditLog.js';

const TEST_SECRET = 'audit-test-staff-jwt-secret';

function startTestApp(appointmentService) {
  const staffAuth = createStaffAuthService({
    jwtSecret: TEST_SECRET,
    demoPassword: DEMO_STAFF_PASSWORD,
  });

  const app = createApp({
    patientService: createPatientService(createMemoryStore()),
    appointmentService: {
      createAppointment: async () => ({ appointment: {}, sms: {} }),
      ...appointmentService,
    },
    staffAuth,
  });

  return new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, url: `http://127.0.0.1:${port}` });
    });
  });
}

describe('AuditLog Model Schema & In-Memory Auditing', () => {
  beforeEach(() => {
    clearAuditLogs();
  });

  it('AuditLog schema captures actorType, actorId, actingUserId, oldDate, oldTime, newDate, newTime, and reason', () => {
    const doc = new AuditLog({
      action: 'APPOINTMENT_CANCELLED',
      appointmentId: new mongoose.Types.ObjectId(),
      actorType: 'PATIENT',
      actorId: '20612345',
      actingUserId: '20612345',
      oldDate: '2026-09-25',
      oldTime: '10:00',
      newDate: null,
      newTime: null,
      reason: 'Cancelled by patient via self-service',
      changeReason: 'Cancelled by patient via self-service',
    });

    assert.equal(doc.action, 'APPOINTMENT_CANCELLED');
    assert.equal(doc.actorType, 'PATIENT');
    assert.equal(doc.actorId, '20612345');
    assert.equal(doc.actingUserId, '20612345');
    assert.equal(doc.oldDate, '2026-09-25');
    assert.equal(doc.oldTime, '10:00');
    assert.equal(doc.newDate, null);
    assert.equal(doc.newTime, null);
    assert.equal(doc.reason, 'Cancelled by patient via self-service');
  });

  it('AuditLog schema rejects invalid actorType', () => {
    const doc = new AuditLog({
      action: 'APPOINTMENT_CANCELLED',
      appointmentId: new mongoose.Types.ObjectId(),
      actorType: 'UNKNOWN_ROLE',
    });

    const err = doc.validateSync();
    assert.ok(err, 'Validation should fail for invalid actorType');
    assert.ok(err.errors.actorType, 'actorType should have validation error');
  });

  it('recordAuditLog stores audit records in memory buffer and allows querying', async () => {
    const appointmentId = new mongoose.Types.ObjectId();

    await recordAuditLog({
      action: 'APPOINTMENT_CANCELLED',
      appointmentId,
      actorType: 'PATIENT',
      actorId: '68bf2c0e9c1a2b0012345670',
      actingUserId: '68bf2c0e9c1a2b0012345670',
      oldDate: '2026-09-25',
      oldTime: '09:00',
      newDate: null,
      newTime: null,
      reason: 'Sick leave',
    });

    await recordAuditLog({
      action: 'APPOINTMENT_RESCHEDULED',
      appointmentId,
      actorType: 'STAFF',
      actorId: 'REC-001',
      actingUserId: 'REC-001',
      oldDate: '2026-09-25',
      oldTime: '09:00',
      newDate: '2026-09-28',
      newTime: '11:30',
      reason: 'Patient requested afternoon slot',
    });

    const logs = getRecentAuditLogs({ appointmentId });
    assert.equal(logs.length, 2);

    const cancelLog = logs.find((l) => l.action === 'APPOINTMENT_CANCELLED');
    assert.ok(cancelLog);
    assert.equal(cancelLog.actorType, 'PATIENT');
    assert.equal(cancelLog.actorId, '68bf2c0e9c1a2b0012345670');
    assert.equal(cancelLog.oldDate, '2026-09-25');
    assert.equal(cancelLog.oldTime, '09:00');
    assert.equal(cancelLog.newDate, null);
    assert.equal(cancelLog.newTime, null);
    assert.equal(cancelLog.reason, 'Sick leave');

    const rescheduleLog = logs.find((l) => l.action === 'APPOINTMENT_RESCHEDULED');
    assert.ok(rescheduleLog);
    assert.equal(rescheduleLog.actorType, 'STAFF');
    assert.equal(rescheduleLog.actorId, 'REC-001');
    assert.equal(rescheduleLog.oldDate, '2026-09-25');
    assert.equal(rescheduleLog.oldTime, '09:00');
    assert.equal(rescheduleLog.newDate, '2026-09-28');
    assert.equal(rescheduleLog.newTime, '11:30');
    assert.equal(rescheduleLog.reason, 'Patient requested afternoon slot');
  });
});

describe('Cancellation & Reschedule HTTP Audit Parameter Resolution', () => {
  /** @type {{ server: import('node:http').Server }[]} */
  const started = [];

  beforeEach(() => {
    clearAuditLogs();
  });

  after(async () => {
    await Promise.all(
      started.map(
        ({ server }) =>
          new Promise((resolve, reject) => {
            server.close((err) => (err ? reject(err) : resolve()));
          }),
      ),
    );
  });

  async function client(mockService) {
    const instance = await startTestApp(mockService);
    started.push(instance);
    return instance;
  }

  async function getStaffToken(url, identifier = 'abena.osei@yencare.gh') {
    const res = await fetch(`${url}/api/auth/staff-login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        identifier,
        password: DEMO_STAFF_PASSWORD,
      }),
    });
    assert.equal(res.status, 200);
    return (await res.json()).token;
  }

  it('cancellation by patient via self-service resolves actorType: PATIENT and provided reason', async () => {
    let capturedOptions = null;
    const service = {
      cancelAppointment: async (id, options) => {
        capturedOptions = options;
        return {
          appointment: { id, status: 'CANCELLED' },
          releasedSlotId: '68bf2c0e9c1a2b0099999999',
          cancelledTime: new Date().toISOString(),
          sms: { ok: true },
        };
      },
    };

    const { url } = await client(service);
    const res = await fetch(`${url}/api/appointments/YC-4821/cancel`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        cancelReason: 'Class schedule conflict',
        otpCode: '4829',
      }),
    });

    assert.equal(res.status, 200);
    assert.ok(capturedOptions);
    assert.equal(capturedOptions.actorType, 'PATIENT');
    assert.equal(capturedOptions.actorIsStaff, false);
    assert.equal(capturedOptions.actorId, null);
    assert.equal(capturedOptions.cancelReason, 'Class schedule conflict');
    assert.equal(capturedOptions.reason, 'Class schedule conflict');
  });

  it('cancellation by staff via portal resolves actorType: STAFF and acting staffId from auth token', async () => {
    let capturedOptions = null;
    const service = {
      cancelAppointment: async (id, options) => {
        capturedOptions = options;
        return {
          appointment: { id, status: 'CANCELLED' },
          releasedSlotId: '68bf2c0e9c1a2b0099999999',
          cancelledTime: new Date().toISOString(),
          sms: { ok: true },
        };
      },
    };

    const { url } = await client(service);
    const token = await getStaffToken(url, 'abena.osei@yencare.gh');

    const res = await fetch(`${url}/api/appointments/YC-4821/cancel`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        cancelReason: 'Doctor on emergency surgery',
      }),
    });

    assert.equal(res.status, 200);
    assert.ok(capturedOptions);
    assert.equal(capturedOptions.actorType, 'STAFF');
    assert.equal(capturedOptions.actorIsStaff, true);
    // Abena Osei's staffId is REC-001
    assert.equal(capturedOptions.actorId, 'stf_01');
    assert.equal(capturedOptions.actingUserId, 'stf_01');
    assert.equal(capturedOptions.cancelReason, 'Doctor on emergency surgery');
  });

  it('reschedule by patient via self-service resolves actorType: PATIENT and coordinates', async () => {
    let capturedOptions = null;
    const service = {
      rescheduleAppointment: async (id, options) => {
        capturedOptions = options;
        return {
          appointment: { id, status: 'BOOKED' },
          oldSlotId: 'slot-1',
          newSlotId: options.newSlotId,
          sms: { ok: true },
        };
      },
    };

    const { url } = await client(service);
    const res = await fetch(`${url}/api/appointments/YC-4821/reschedule`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        newSlotId: '68bf2c0e9c1a2b0099999998',
        otpCode: '4829',
      }),
    });

    assert.equal(res.status, 200);
    assert.ok(capturedOptions);
    assert.equal(capturedOptions.actorType, 'PATIENT');
    assert.equal(capturedOptions.actorIsStaff, false);
    assert.equal(capturedOptions.newSlotId, '68bf2c0e9c1a2b0099999998');
  });

  it('reschedule by desk staff via portal resolves actorType: STAFF, actingUserId, and reason', async () => {
    let capturedOptions = null;
    const service = {
      rescheduleAppointment: async (id, options) => {
        capturedOptions = options;
        return {
          appointment: { id, status: 'BOOKED' },
          oldSlotId: 'slot-1',
          newSlotId: options.newSlotId,
          sms: { ok: true },
        };
      },
    };

    const { url } = await client(service);
    const token = await getStaffToken(url, 'abena.osei@yencare.gh');

    const res = await fetch(`${url}/api/appointments/YC-4821/reschedule`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        newSlotId: '68bf2c0e9c1a2b0099999998',
        staffChangeReason: 'Shifted per patient request at reception desk',
      }),
    });

    assert.equal(res.status, 200);
    assert.ok(capturedOptions);
    assert.equal(capturedOptions.actorType, 'STAFF');
    assert.equal(capturedOptions.actorIsStaff, true);
    assert.equal(capturedOptions.actorId, 'stf_01');
    assert.equal(capturedOptions.actingUserId, 'stf_01');
    assert.equal(capturedOptions.staffChangeReason, 'Shifted per patient request at reception desk');
    assert.equal(capturedOptions.reason, 'Shifted per patient request at reception desk');
  });
});

describe('Audit Record Creation for Cancellation and Reschedule Workflows', () => {
  beforeEach(() => {
    clearAuditLogs();
  });

  it('verifies audit record creation for patient cancellation via self-service', async () => {
    const appointmentId = new mongoose.Types.ObjectId();

    await recordAuditLog({
      action: 'APPOINTMENT_CANCELLED',
      appointmentId,
      actorType: 'PATIENT',
      actorId: '20612345',
      actingUserId: '20612345',
      oldDate: '2026-09-25',
      oldTime: '10:00',
      newDate: null,
      newTime: null,
      reason: 'Cancelled by patient via self-service',
      cancelledTime: new Date(),
    });

    const logs = getRecentAuditLogs({ appointmentId, action: 'APPOINTMENT_CANCELLED' });
    assert.equal(logs.length, 1);
    const log = logs[0];
    assert.equal(log.actorType, 'PATIENT');
    assert.equal(log.actorId, '20612345');
    assert.equal(log.actingUserId, '20612345');
    assert.equal(log.oldDate, '2026-09-25');
    assert.equal(log.oldTime, '10:00');
    assert.equal(log.newDate, null);
    assert.equal(log.newTime, null);
    assert.equal(log.reason, 'Cancelled by patient via self-service');
  });

  it('verifies audit record creation for staff cancellation via portal', async () => {
    const appointmentId = new mongoose.Types.ObjectId();

    await recordAuditLog({
      action: 'APPOINTMENT_CANCELLED',
      appointmentId,
      actorType: 'STAFF',
      actorId: 'stf_01',
      actingUserId: 'stf_01',
      oldDate: '2026-09-25',
      oldTime: '10:00',
      newDate: null,
      newTime: null,
      reason: 'Clinician emergency absence',
      cancelledTime: new Date(),
    });

    const logs = getRecentAuditLogs({ appointmentId, action: 'APPOINTMENT_CANCELLED' });
    assert.equal(logs.length, 1);
    const log = logs[0];
    assert.equal(log.actorType, 'STAFF');
    assert.equal(log.actorId, 'stf_01');
    assert.equal(log.actingUserId, 'stf_01');
    assert.equal(log.oldDate, '2026-09-25');
    assert.equal(log.oldTime, '10:00');
    assert.equal(log.newDate, null);
    assert.equal(log.newTime, null);
    assert.equal(log.reason, 'Clinician emergency absence');
  });

  it('verifies audit record creation with coordinate tracking for reschedule', async () => {
    const appointmentId = new mongoose.Types.ObjectId();

    await recordAuditLog({
      action: 'APPOINTMENT_RESCHEDULED',
      appointmentId,
      actorType: 'STAFF',
      actorId: 'stf_01',
      actingUserId: 'stf_01',
      oldDate: '2026-09-25',
      oldTime: '09:00',
      newDate: '2026-09-28',
      newTime: '11:00',
      reason: 'Patient called reception to reschedule to Monday morning',
      rescheduledTime: new Date(),
    });

    const logs = getRecentAuditLogs({ appointmentId, action: 'APPOINTMENT_RESCHEDULED' });
    assert.equal(logs.length, 1);
    const log = logs[0];
    assert.equal(log.actorType, 'STAFF');
    assert.equal(log.actorId, 'stf_01');
    assert.equal(log.actingUserId, 'stf_01');
    assert.equal(log.oldDate, '2026-09-25');
    assert.equal(log.oldTime, '09:00');
    assert.equal(log.newDate, '2026-09-28');
    assert.equal(log.newTime, '11:00');
    assert.equal(log.reason, 'Patient called reception to reschedule to Monday morning');
  });
});
