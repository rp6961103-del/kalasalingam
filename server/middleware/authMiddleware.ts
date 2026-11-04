import { NextFunction, Request, Response } from 'express';
import { UserRow } from '../db/schema';
import { db } from '../db/database';
import { getSessionToken, verifySession } from '../services/authService';

export interface AuthenticatedRequest extends Request {
  authUser?: UserRow;
}

export async function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = getSessionToken(req.headers.cookie);
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  try {
    const session = await verifySession(token);
    const user = session ? await db.findUserById(session.sub) : undefined;
    if (!session || !user || user.role !== session.role) {
      return res.status(401).json({ error: 'Session is invalid or expired' });
    }
    req.authUser = user;
    return next();
  } catch (error) {
    return next(error);
  }
}

export function requireRole(...roles: UserRow['role'][]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.authUser) return res.status(401).json({ error: 'Authentication required' });
    if (!roles.includes(req.authUser.role)) return res.status(403).json({ error: 'Insufficient permissions' });
    return next();
  };
}
