import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { UserRow } from '../db/schema';
import { db } from '../db/database';

const SESSION_COOKIE = 'kare_session';

export function sessionTtlSeconds(): number {
  const ttl = Number(process.env.SESSION_TTL_SECONDS || 3600);
  if (!Number.isInteger(ttl) || ttl < 300 || ttl > 30 * 24 * 60 * 60) {
    throw new Error('SESSION_TTL_SECONDS must be an integer from 300 to 2592000');
  }
  return ttl;
}

interface SessionPayload {
  sub: string;
  role: UserRow['role'];
  jti: string;
  iat: number;
  exp: number;
}

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET must contain at least 32 characters');
  }
  return secret;
}

function base64Url(value: string): string {
  return Buffer.from(value).toString('base64url');
}

export function sanitizeUser(user: UserRow): Omit<UserRow, 'passwordHash'> {
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash?: string): Promise<boolean> {
  if (!passwordHash) {
    await bcrypt.compare(password, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy');
    return false;
  }
  return bcrypt.compare(password, passwordHash);
}

export async function createSession(user: UserRow): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    sub: user.id,
    role: user.role,
    jti: randomUUID(),
    iat: now,
    exp: now + sessionTtlSeconds(),
  };
  const header = base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64Url(JSON.stringify(payload));
  const unsignedToken = `${header}.${body}`;
  const signature = createHmac('sha256', getSessionSecret()).update(unsignedToken).digest('base64url');
  await db.persistSession(payload.jti, user.id, new Date(payload.exp * 1000));
  return `${unsignedToken}.${signature}`;
}

function decodeSession(token: string): SessionPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const unsignedToken = `${parts[0]}.${parts[1]}`;
  const expected = createHmac('sha256', getSessionSecret()).update(unsignedToken).digest();
  let actual: Buffer;
  try {
    actual = Buffer.from(parts[2], 'base64url');
  } catch {
    return null;
  }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;

  try {
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')) as { alg?: string };
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as SessionPayload;
    if (
      header.alg !== 'HS256' ||
      typeof payload.sub !== 'string' ||
      !['Student', 'Management'].includes(payload.role) ||
      typeof payload.jti !== 'string' ||
      !Number.isInteger(payload.exp) ||
      payload.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  const session = decodeSession(token);
  if (!session) return null;
  if (!(await db.hasActiveSession(session.jti, session.sub))) return null;
  return session;
}

export async function revokeSession(token?: string): Promise<void> {
  if (!token) return;
  const session = decodeSession(token);
  if (session) await db.revokeSession(session.jti);
}

export function sessionCookie(token: string, secure: boolean, sameSite: 'Strict' | 'Lax' | 'None'): string {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=${sameSite}; Max-Age=${sessionTtlSeconds()}${secure ? '; Secure' : ''}`;
}

export function clearSessionCookie(secure: boolean, sameSite: 'Strict' | 'Lax' | 'None'): string {
  return `${SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=${sameSite}; Max-Age=0${secure ? '; Secure' : ''}`;
}

export function getSessionToken(cookieHeader?: string): string | undefined {
  const cookie = cookieHeader?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${SESSION_COOKIE}=`));
  if (!cookie) return undefined;
  try {
    return decodeURIComponent(cookie.slice(SESSION_COOKIE.length + 1));
  } catch {
    return undefined;
  }
}
