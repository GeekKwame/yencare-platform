import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { STAFF_ROLES } from '../db/constants.js';
import { StaffUser } from '../models/StaffUser.js';
import { NotFoundError, ValidationError } from '../patients/errors.js';

export const DEMO_STAFF_PASSWORD = process.env.STAFF_DEMO_PASSWORD || 'yencare';

/** Evaluator demo accounts. Passwords are hashed at service creation. */
export const DEMO_STAFF = Object.freeze([
  {
    staffId: 'stf_01',
    email: 'abena.osei@yencare.gh',
    name: 'Abena Osei',
    role: 'RECEPTIONIST',
    assignedRoom: null,
    clinicSite: 'students-clinic',
  },
  {
    staffId: 'stf_02',
    email: 'kwame.boateng@yencare.gh',
    name: 'Dr. Kwame Boateng',
    role: 'DOCTOR',
    assignedRoom: 'Room 1',
    clinicSite: 'students-clinic',
  },
  {
    staffId: 'stf_03',
    email: 'kojo.mensah@yencare.gh',
    name: 'Kojo Mensah',
    role: 'ADMIN',
    assignedRoom: null,
    clinicSite: 'students-clinic',
  },
]);

const DEFAULT_JWT_SECRET = 'yencare-dev-jwt-secret';
const BCRYPT_ROUNDS = 8;

function normalizeIdentifier(value) {
  return String(value || '').trim().toLowerCase();
}

export function serializeStaff(user) {
  if (!user) return null;

  const id = user.id || (user._id ? String(user._id) : user.staffId);

  return {
    id,
    staffId: user.staffId,
    name: user.name,
    email: user.email,
    role: user.role,
    assignedRoom: user.assignedRoom || null,
    clinicSite: user.clinicSite || 'students-clinic',
    activeSite: user.clinicSite || 'students-clinic',
  };
}

function mongoReady() {
  return mongoose.connection?.readyState === 1;
}

/**
 * Staff authentication: JWT issuance, demo seeding, and role middleware.
 *
 * @param {{ jwtSecret?: string, demoPassword?: string, expiresIn?: string }} [options]
 */
export function createStaffAuthService({
  jwtSecret = process.env.JWT_SECRET || DEFAULT_JWT_SECRET,
  demoPassword = DEMO_STAFF_PASSWORD,
  expiresIn = process.env.JWT_EXPIRES_IN || '12h',
} = {}) {
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is required for staff authentication');
  }

  const usingDevSecret = jwtSecret === DEFAULT_JWT_SECRET;
  const demoPasswordHash = bcrypt.hashSync(demoPassword, BCRYPT_ROUNDS);

  const memoryStaff = DEMO_STAFF.map((person) => ({
    ...person,
    id: person.staffId,
    passwordHash: demoPasswordHash,
    active: true,
  }));

  async function findStaff(identifier) {
    const key = normalizeIdentifier(identifier);
    if (!key) return null;

    if (mongoReady()) {
      try {
        const trimmed = String(identifier || '').trim();
        const doc = await StaffUser.findOne({
          $or: [{ email: key }, { staffId: trimmed }, { staffId: key }],
          active: true,
        });
        if (doc) return doc;
      } catch (err) {
        console.warn('[staff-auth] Mongo lookup failed, using demo accounts:', err.message);
      }
    }

    return (
      memoryStaff.find(
        (person) =>
          person.email === key || person.staffId.toLowerCase() === key,
      ) || null
    );
  }

  function signToken(staff) {
    const payload = serializeStaff(staff);
    return jwt.sign(
      {
        sub: payload.id,
        staffId: payload.staffId,
        role: payload.role,
        name: payload.name,
        assignedRoom: payload.assignedRoom,
        clinicSite: payload.clinicSite,
      },
      jwtSecret,
      { expiresIn },
    );
  }

  function verifyToken(token) {
    try {
      return jwt.verify(String(token || ''), jwtSecret);
    } catch {
      const err = new Error('Invalid or expired staff session');
      err.status = 401;
      err.name = 'UnauthorizedError';
      throw err;
    }
  }

  async function login({ identifier, email, staffId, password } = {}) {
    const loginId = identifier || email || staffId;
    if (!loginId || !password) {
      throw new ValidationError('Staff ID / email and password are required');
    }

    const staff = await findStaff(loginId);
    if (!staff) {
      const err = new Error('Invalid staff credentials');
      err.status = 401;
      err.name = 'UnauthorizedError';
      throw err;
    }

    const ok = await bcrypt.compare(String(password), staff.passwordHash);
    if (!ok) {
      const err = new Error('Invalid staff credentials');
      err.status = 401;
      err.name = 'UnauthorizedError';
      throw err;
    }

    const publicStaff = serializeStaff(staff);
    return {
      token: signToken(staff),
      staff: publicStaff,
    };
  }

  async function readStaffFromToken(token) {
    const payload = verifyToken(token);
    const staff = await findStaff(payload.staffId || payload.email || payload.sub);
    if (!staff) {
      throw new NotFoundError('Staff account not found');
    }
    return serializeStaff(staff);
  }

  async function seedDemoStaff() {
    if (!mongoReady()) {
      return { ok: true, seeded: 0, skipped: true };
    }

    let seeded = 0;
    for (const person of DEMO_STAFF) {
      await StaffUser.findOneAndUpdate(
        { email: person.email },
        {
          $set: {
            staffId: person.staffId,
            email: person.email,
            name: person.name,
            role: person.role,
            assignedRoom: person.assignedRoom,
            clinicSite: person.clinicSite,
            active: true,
          },
          $setOnInsert: {
            passwordHash: demoPasswordHash,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      seeded += 1;
    }

    return { ok: true, seeded };
  }

  /**
   * Express middleware factory. Empty `requiredRoles` means any authenticated staff.
   * @param {string[]} [requiredRoles]
   */
  function authenticate(requiredRoles = []) {
    const allowed = requiredRoles.map((role) => String(role).toUpperCase());

    return (req, res, next) => {
      const header = req.headers.authorization || req.headers.Authorization || '';
      const match = String(header).match(/^Bearer\s+(.+)$/i);
      if (!match) {
        return res.status(401).json({ error: 'Staff authentication required' });
      }

      try {
        const payload = verifyToken(match[1]);
        const role = String(payload.role || '').toUpperCase();

        if (allowed.length > 0 && !allowed.includes(role)) {
          return res.status(403).json({
            error: `This action requires one of: ${allowed.join(', ')}`,
          });
        }

        req.user = {
          id: payload.sub,
          _id: payload.sub,
          staffId: payload.staffId,
          name: payload.name,
          role,
          assignedRoom: payload.assignedRoom || null,
          clinicSite: payload.clinicSite,
        };
        req.staff = req.user;
        return next();
      } catch (err) {
        return next(err);
      }
    };
  }

  return {
    login,
    readStaffFromToken,
    seedDemoStaff,
    authenticate,
    verifyToken,
    serializeStaff,
    usingDevSecret,
    demoPassword,
    roles: STAFF_ROLES,
  };
}
