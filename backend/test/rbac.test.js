import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import express from 'express';
import {
  createStaffAuthService,
  DEMO_STAFF_PASSWORD,
  hasPermission,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  rolesWithPermission,
} from '../src/auth/staffAuth.js';

describe('Centralized RBAC Permissions Matrix (staffAuth.js)', () => {
  describe('hasPermission helper', () => {
    it('grants APPOINTMENTS_CHECKIN to RECEPTIONIST and ADMIN, but denies DOCTOR', () => {
      assert.equal(hasPermission({ role: 'RECEPTIONIST' }, 'APPOINTMENTS_CHECKIN'), true);
      assert.equal(hasPermission({ role: 'ADMIN' }, 'APPOINTMENTS_CHECKIN'), true);
      assert.equal(hasPermission({ role: 'DOCTOR' }, 'APPOINTMENTS_CHECKIN'), false);
    });

    it('grants QUEUE_CALL_NEXT to DOCTOR and ADMIN, but denies RECEPTIONIST', () => {
      assert.equal(hasPermission({ role: 'DOCTOR' }, 'QUEUE_CALL_NEXT'), true);
      assert.equal(hasPermission({ role: 'ADMIN' }, 'QUEUE_CALL_NEXT'), true);
      assert.equal(hasPermission({ role: 'RECEPTIONIST' }, 'QUEUE_CALL_NEXT'), false);
    });

    it('restricts QUEUE_ADVANCE and QUEUE_COMPLETE strictly to DOCTOR', () => {
      assert.equal(hasPermission({ role: 'DOCTOR' }, 'QUEUE_ADVANCE'), true);
      assert.equal(hasPermission({ role: 'DOCTOR' }, 'QUEUE_COMPLETE'), true);
      assert.equal(hasPermission({ role: 'ADMIN' }, 'QUEUE_ADVANCE'), false);
      assert.equal(hasPermission({ role: 'RECEPTIONIST' }, 'QUEUE_ADVANCE'), false);
    });

    it('restricts OPS_ADMIN strictly to ADMIN', () => {
      assert.equal(hasPermission({ role: 'ADMIN' }, 'OPS_ADMIN'), true);
      assert.equal(hasPermission({ role: 'DOCTOR' }, 'OPS_ADMIN'), false);
      assert.equal(hasPermission({ role: 'RECEPTIONIST' }, 'OPS_ADMIN'), false);
    });

    it('handles lowercase and mixed-case roles gracefully', () => {
      assert.equal(hasPermission({ role: 'receptionist' }, 'APPOINTMENTS_CHECKIN'), true);
      assert.equal(hasPermission({ role: 'Doctor' }, 'QUEUE_CALL_NEXT'), true);
    });

    it('fails closed and returns false for invalid users or unknown permissions', () => {
      assert.equal(hasPermission(null, 'APPOINTMENTS_CHECKIN'), false);
      assert.equal(hasPermission({}, 'APPOINTMENTS_CHECKIN'), false);
      assert.equal(hasPermission({ role: 'PATIENT' }, 'APPOINTMENTS_CHECKIN'), false);
      assert.equal(hasPermission({ role: 'RECEPTIONIST' }, 'UNKNOWN_PERMISSION'), false);
    });
  });

  describe('rolesWithPermission helper', () => {
    it('returns exact list of roles possessing a permission', () => {
      const checkinRoles = rolesWithPermission(PERMISSIONS.APPOINTMENTS_CHECKIN);
      assert.deepEqual(checkinRoles.sort(), ['ADMIN', 'RECEPTIONIST']);

      const doctorAdvanceRoles = rolesWithPermission(PERMISSIONS.QUEUE_ADVANCE);
      assert.deepEqual(doctorAdvanceRoles, ['DOCTOR']);
    });
  });

  describe('authenticate middleware with RBAC permissions', () => {
    async function startTestApp() {
      const auth = createStaffAuthService({ jwtSecret: 'test-rbac-secret' });
      const app = express();
      app.use(express.json());

      app.post('/api/auth/login', async (req, res, next) => {
        try {
          const out = await auth.login(req.body);
          res.json(out);
        } catch (e) {
          next(e);
        }
      });

      // Protected with permission requirement
      app.post(
        '/api/test/checkin',
        auth.authenticate({ permission: 'APPOINTMENTS_CHECKIN' }),
        (req, res) => {
          res.json({ ok: true, staff: req.staff });
        },
      );

      // Protected with string permission
      app.post(
        '/api/test/advance',
        auth.authenticate('QUEUE_ADVANCE'),
        (req, res) => {
          res.json({ ok: true, staff: req.staff });
        },
      );

      const server = await new Promise((resolve) => {
        const s = app.listen(0, () => resolve(s));
      });
      const { port } = server.address();
      const url = `http://127.0.0.1:${port}`;
      return { server, url };
    }

    it('enforces permission checks over HTTP correctly', async () => {
      const { server, url } = await startTestApp();
      try {
        // 1. Login as receptionist
        const recLogin = await (
          await fetch(`${url}/api/auth/login`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              identifier: 'abena.osei@yencare.gh',
              password: DEMO_STAFF_PASSWORD,
            }),
          })
        ).json();

        // 2. Login as doctor
        const docLogin = await (
          await fetch(`${url}/api/auth/login`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              identifier: 'kwame.boateng@yencare.gh',
              password: DEMO_STAFF_PASSWORD,
            }),
          })
        ).json();

        // Receptionist can access /checkin (has APPOINTMENTS_CHECKIN)
        const recCheckin = await fetch(`${url}/api/test/checkin`, {
          method: 'POST',
          headers: { authorization: `Bearer ${recLogin.token}` },
        });
        assert.equal(recCheckin.status, 200);

        // Doctor is rejected from /checkin (lacks APPOINTMENTS_CHECKIN)
        const docCheckin = await fetch(`${url}/api/test/checkin`, {
          method: 'POST',
          headers: { authorization: `Bearer ${docLogin.token}` },
        });
        assert.equal(docCheckin.status, 403);
        const docCheckinBody = await docCheckin.json();
        assert.ok(docCheckinBody.error.includes('APPOINTMENTS_CHECKIN'));

        // Doctor can access /advance (has QUEUE_ADVANCE)
        const docAdvance = await fetch(`${url}/api/test/advance`, {
          method: 'POST',
          headers: { authorization: `Bearer ${docLogin.token}` },
        });
        assert.equal(docAdvance.status, 200);

        // Receptionist is rejected from /advance (lacks QUEUE_ADVANCE)
        const recAdvance = await fetch(`${url}/api/test/advance`, {
          method: 'POST',
          headers: { authorization: `Bearer ${recLogin.token}` },
        });
        assert.equal(recAdvance.status, 403);
      } finally {
        await new Promise((resolve) => server.close(resolve));
      }
    });
  });
});
