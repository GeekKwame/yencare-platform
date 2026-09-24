import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { STAFF_ROLES } from '../db/constants.js';
import { logger } from '../lib/logger.js';
import { isProduction } from '../lib/runtime.js';
import { StaffUser } from '../models/StaffUser.js';
import {
  NotFoundError,
  ServiceUnavailableError,
  ValidationError,
} from '../patients/errors.js';

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
    clinicianId: '68bf2c0e9c1a2b0012345671',
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
    clinicianId: user.clinicianId ? String(user.clinicianId) : null,
  };
}

function mongoReady() {
  return mongoose.connection?.readyState === 1;
}

export const STAFF_AUTH_UNAVAILABLE_MESSAGE =
  'Staff sign-in is temporarily unavailable. Please try again in a moment.';

/**
 * In-memory demo accounts exist only for local development and evaluator demos.
 * They are reachable when the process has no database at all AND demo seeding is
 * enabled AND this is not production, so a transient Mongo failure in production
 * can never turn into an authentication bypass.
 *
 * @param {NodeJS.ProcessEnv} [env]
 */
export function demoStaffAllowed(env = process.env) {
  if (isProduction(env)) return false;
  return env.STAFF_SEED_DEMO !== 'false';
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

  function findMemoryStaff(key) {
    return (
      memoryStaff.find(
        (person) => person.email === key || person.staffId.toLowerCase() === key,
      ) || null
    );
  }

  async function findStaff(identifier) {
    const key = normalizeIdentifier(identifier);
    if (!key) return null;

    if (mongoReady()) {
      try {
        const trimmed = String(identifier || '').trim();
        return await StaffUser.findOne({
          $or: [{ email: key }, { staffId: trimmed }, { staffId: key }],
          active: true,
        });
      } catch (err) {
        // Fail closed. Falling back to demo accounts here would let a database
        // blip hand out staff sessions with a well-known password.
        logger.error('staff account lookup failed', {
          subsystem: 'staff-auth',
          err,
        });
        throw new ServiceUnavailableError(STAFF_AUTH_UNAVAILABLE_MESSAGE);
      }
    }

    // No database connection: only the deliberately seeded demo accounts of a
    // local/dev environment can answer, and never in production.
    if (demoStaffAllowed()) {
      return findMemoryStaff(key);
    }

    logger.error('staff account lookup attempted without a database connection', {
      subsystem: 'staff-auth',
      readyState: mongoose.connection?.readyState ?? 0,
    });
    throw new ServiceUnavailableError(STAFF_AUTH_UNAVAILABLE_MESSAGE);
  }

  function signToken(staff) {
    const payload = serializeStaff(staff);
    return jwt.sign(
      {
        sub: payload.id,
        staffId: payload.staffId,
        role: payload.role,
        name: payload.name,
        email: payload.email,
        assignedRoom: payload.assignedRoom,
        clinicSite: payload.clinicSite,
        clinicianId: payload.clinicianId || null,
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
      let clinicianId = person.clinicianId || null;
      if (person.role === 'DOCTOR') {
        const { Clinician } = await import('../models/Clinician.js');
        const clin = await Clinician.findOne({ name: person.name });
        if (clin?._id) {
          clinicianId = clin._id;
        }
      }

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
            clinicianId,
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
   * Issues a fresh token for a still-valid session so staff are not logged out
   * mid-shift. An expired token cannot be refreshed — that is a new sign-in.
   *
   * @param {string} token
   */
  async function refresh(token) {
    const payload = verifyToken(token);
    const staff = await findStaff(payload.staffId || payload.email || payload.sub);

    if (!staff) {
      const err = new Error('Staff account is no longer active');
      err.status = 401;
      err.name = 'UnauthorizedError';
      throw err;
    }

    return {
      token: signToken(staff),
      staff: serializeStaff(staff),
    };
  }

  /** @param {import('express').Request} req */
  function bearerToken(req) {
    const header = req.headers.authorization || req.headers.Authorization || '';
    const match = String(header).match(/^Bearer\s+(.+)$/i);
    return match ? match[1].trim() : null;
  }

  /** @param {jwt.JwtPayload} payload */
  function staffFromPayload(payload) {
    return {
      id: payload.sub,
      _id: payload.sub,
      staffId: payload.staffId,
      name: payload.name,
      role: String(payload.role || '').toUpperCase(),
      assignedRoom: payload.assignedRoom || null,
      clinicSite: payload.clinicSite,
      clinicianId: payload.clinicianId || null,
    };
  }

  /**
   * Express middleware factory. Empty `requiredRoles` means any authenticated staff.
   * @param {string[]} [requiredRoles]
   */
  function authenticate(requiredRoles = []) {
    const allowed = requiredRoles.map((role) => String(role).toUpperCase());

    return (req, res, next) => {
      const token = bearerToken(req);
      if (!token) {
        return res.status(401).json({ error: 'Staff authentication required' });
      }

      try {
        const staff = staffFromPayload(verifyToken(token));

        if (allowed.length > 0 && !allowed.includes(staff.role)) {
          return res.status(403).json({
            error: `This action requires one of: ${allowed.join(', ')}`,
          });
        }

        req.user = staff;
        req.staff = staff;
        return next();
      } catch (err) {
        return next(err);
      }
    };
  }

  /**
   * Optional variant of `authenticate` for endpoints that serve both staff and
   * patients: it attaches `req.staff` when a valid token is present and
   * otherwise continues as an anonymous request.
   *
   * A malformed or expired token is treated as "no staff session" rather than a
   * 401, so a patient whose browser still holds a stale staff token can still
   * use the public (phone-verified) path.
   *
   * @param {string[]} [requiredRoles]
   */
  function authenticateOptional(requiredRoles = []) {
    const allowed = requiredRoles.map((role) => String(role).toUpperCase());

    return (req, _res, next) => {
      const token = bearerToken(req);
      if (!token) return next();

      let staff;
      try {
        staff = staffFromPayload(verifyToken(token));
      } catch {
        return next();
      }

      if (allowed.length > 0 && !allowed.includes(staff.role)) {
        return next();
      }

      req.user = staff;
      req.staff = staff;
      return next();
    };
  }

  return {
    login,
    refresh,
    readStaffFromToken,
    seedDemoStaff,
    authenticate,
    authenticateOptional,
    verifyToken,
    serializeStaff,
    usingDevSecret,
    demoPassword,
    roles: STAFF_ROLES,
  };
}
