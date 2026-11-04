import { Request, Response } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { db } from '../db/database';
import { databaseErrorCode, isDatabaseUnavailable } from '../db/pool';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import {
  clearSessionCookie,
  createSession,
  hashPassword,
  getSessionToken,
  revokeSession,
  sanitizeUser,
  sessionCookie,
  verifyPassword,
} from '../services/authService';

const isSecureCookie = () => process.env.NODE_ENV === 'production';
const cookieSameSite = () => {
  const value = (process.env.COOKIE_SAME_SITE || 'Lax').toLowerCase();
  return value === 'strict' ? 'Strict' : value === 'none' ? 'None' : 'Lax';
};

const isUniqueViolation = (error: unknown) =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';

export class AuthController {
  static async login(req: Request, res: Response) {
    const { identifier, password } = req.body as { identifier?: unknown; password?: unknown };
    if (
      typeof identifier !== 'string' ||
      typeof password !== 'string' ||
      !identifier.trim() ||
      !password ||
      Buffer.byteLength(password, 'utf8') > 72
    ) {
      return res.status(400).json({ error: 'Identifier and password are required' });
    }

    const user = await db.findUserByIdentifier(identifier);
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid identifier or password' });
    }

    try {
      await revokeSession(getSessionToken(req.headers.cookie));
      const token = await createSession(user);
      res.setHeader('Set-Cookie', sessionCookie(token, isSecureCookie(), cookieSameSite()));
      return res.json({ user: sanitizeUser(user), message: `Welcome back, ${user.name}` });
    } catch (error) {
      console.error(`Unable to create user session (${databaseErrorCode(error) || 'application error'})`);
      return res.status(isDatabaseUnavailable(error) ? 503 : 500).json({ error: 'Unable to start a session' });
    }
  }

  static async register(req: Request, res: Response) {
    if (req.body?.role !== undefined && req.body.role !== 'Student') {
      return res.status(403).json({ error: 'Management accounts must be provisioned by an administrator' });
    }

    const { name, regNo, email, phone, department, hostel, password } = req.body as Record<string, unknown>;
    if (
      typeof name !== 'string' ||
      typeof regNo !== 'string' ||
      typeof email !== 'string' ||
      typeof phone !== 'string' ||
      typeof password !== 'string' ||
      name.trim().length < 2 ||
      name.trim().length > 100 ||
      regNo.trim().length < 3 ||
      regNo.trim().length > 30 ||
      email.length > 254 ||
      phone.length > 32 ||
      password.length < 12 ||
      Buffer.byteLength(password, 'utf8') > 72
    ) {
      return res.status(400).json({
        error: 'Name, register number, email, phone, and a password of 12 to 72 bytes are required',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ error: 'A valid email address is required' });
    }
    if (await db.findUserByIdentifier(regNo) || await db.findUserByIdentifier(normalizedEmail)) {
      return res.status(409).json({ error: 'An account with that register number or email already exists' });
    }

    const normalizedPhone = phone.replace(/[\s()-]/g, '');
    if (!/^\+91[6-9]\d{9}$/.test(normalizedPhone)) {
      return res.status(400).json({ error: 'Enter a valid Indian mobile number in +91XXXXXXXXXX format' });
    }

    try {
      const passwordHash = await hashPassword(password);
      const user = await db.createUser({
        name: name.trim(),
        regNo: regNo.trim(),
        email: normalizedEmail,
        phone: normalizedPhone,
        role: 'Student',
        department: typeof department === 'string' ? department.trim().slice(0, 100) : 'General Campus',
        hostel: typeof hostel === 'string' ? hostel.trim().slice(0, 100) : undefined,
        passwordHash,
      });
      await revokeSession(getSessionToken(req.headers.cookie));
      const token = await createSession(user);
      res.setHeader('Set-Cookie', sessionCookie(token, isSecureCookie(), cookieSameSite()));
      return res.status(201).json({
        user: sanitizeUser(user),
        message: `Registration successful. Welcome ${user.name}.`,
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        return res.status(409).json({ error: 'An account with that register number or email already exists' });
      }
      console.error(`Unable to register student (${databaseErrorCode(error) || 'application error'})`);
      return res.status(isDatabaseUnavailable(error) ? 503 : 500).json({ error: 'Unable to complete registration' });
    }
  }

  static async bootstrapManagement(req: Request, res: Response) {
    const expectedKey = process.env.MANAGEMENT_BOOTSTRAP_KEY;
    const suppliedKey = req.body?.bootstrapKey;
    const expectedKeyBuffer = expectedKey ? Buffer.from(expectedKey) : undefined;
    const suppliedKeyBuffer = typeof suppliedKey === 'string' ? Buffer.from(suppliedKey) : undefined;
    if (
      !expectedKey ||
      expectedKey.length < 32 ||
      expectedKey.length > 256 ||
      typeof suppliedKey !== 'string' ||
      suppliedKey.length < 32 ||
      suppliedKey.length > 256 ||
      suppliedKey.length !== expectedKey.length ||
      !expectedKeyBuffer ||
      !suppliedKeyBuffer ||
      suppliedKeyBuffer.length !== expectedKeyBuffer.length ||
      !timingSafeEqual(suppliedKeyBuffer, expectedKeyBuffer)
    ) {
      return res.status(403).json({ error: 'Management bootstrap is not authorized' });
    }
    if (await db.hasConfiguredManagementAccount()) {
      return res.status(409).json({ error: 'A management account has already been provisioned' });
    }

    const { name, regNo, email, phone, department, designation, password } = req.body as Record<string, unknown>;
    if (
      typeof name !== 'string' ||
      typeof regNo !== 'string' ||
      typeof email !== 'string' ||
      typeof phone !== 'string' ||
      typeof password !== 'string' ||
      name.trim().length < 2 ||
      name.trim().length > 100 ||
      regNo.trim().length < 3 ||
      regNo.trim().length > 30 ||
      email.length > 254 ||
      phone.length > 32 ||
      password.length < 12 ||
      Buffer.byteLength(password, 'utf8') > 72 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ) {
      return res.status(400).json({ error: 'Valid name, staff ID, email, Indian mobile, and a 12-character password are required' });
    }
    const normalizedPhone = phone.replace(/[\s()-]/g, '');
    if (!/^\+91[6-9]\d{9}$/.test(normalizedPhone)) {
      return res.status(400).json({ error: 'Enter an Indian mobile number in +91XXXXXXXXXX format' });
    }
    const normalizedEmail = email.trim().toLowerCase();
    if (await db.findUserByIdentifier(regNo) || await db.findUserByIdentifier(normalizedEmail)) {
      return res.status(409).json({ error: 'An account with that staff ID or email already exists' });
    }

    try {
      const passwordHash = await hashPassword(password);
      const user = await db.createManagementUser({
        name: name.trim(),
        regNo: regNo.trim(),
        email: normalizedEmail,
        phone: normalizedPhone,
        role: 'Management',
        department: typeof department === 'string' ? department.trim().slice(0, 100) : 'Estate & Facility Works Directorate',
        designation: typeof designation === 'string' ? designation.trim().slice(0, 100) : 'Facility Manager',
        passwordHash,
      });
      if (!user) return res.status(409).json({ error: 'A management account has already been provisioned' });
      await revokeSession(getSessionToken(req.headers.cookie));
      const token = await createSession(user);
      res.setHeader('Set-Cookie', sessionCookie(token, isSecureCookie(), cookieSameSite()));
      return res.status(201).json({ user: sanitizeUser(user), message: 'Management account provisioned successfully' });
    } catch (error) {
      if (isUniqueViolation(error)) {
        return res.status(409).json({ error: 'An account with that staff ID or email already exists' });
      }
      console.error(`Unable to provision management account (${databaseErrorCode(error) || 'application error'})`);
      return res.status(isDatabaseUnavailable(error) ? 503 : 500).json({ error: 'Unable to provision management account' });
    }
  }

  static sendOtp(_req: Request, res: Response) {
    return res.status(501).json({ error: 'OTP verification is not configured. Use password authentication.' });
  }

  static me(req: AuthenticatedRequest, res: Response) {
    if (!req.authUser) return res.status(401).json({ error: 'Authentication required' });
    return res.json({ user: sanitizeUser(req.authUser) });
  }

  static async logout(req: Request, res: Response) {
    await revokeSession(getSessionToken(req.headers.cookie));
    res.setHeader('Set-Cookie', clearSessionCookie(isSecureCookie(), cookieSameSite()));
    return res.json({ success: true });
  }
}
