import { Request, Response } from 'express';
import { db } from '../db/database';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

export class SmsController {
  static async listLogs(req: AuthenticatedRequest, res: Response) {
    if (req.authUser?.role !== 'Management') return res.status(403).json({ error: 'Management role required' });
    const logs = await db.listSmsLogs();
    return res.json(logs);
  }

  static async listNotifications(req: AuthenticatedRequest, res: Response) {
    if (!req.authUser) return res.status(401).json({ error: 'Authentication required' });
    const notifs = await db.listNotifications(req.authUser.role === 'Management' ? undefined : req.authUser.id);
    return res.json(notifs);
  }

  static async markNotificationsRead(req: AuthenticatedRequest, res: Response) {
    if (!req.authUser) return res.status(401).json({ error: 'Authentication required' });
    await db.markNotificationsRead(req.authUser.role === 'Management' ? undefined : req.authUser.id);
    return res.json({ success: true, message: 'All notifications marked as read' });
  }
}
