import { Request, Response } from 'express';
import { db } from '../db/database';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

export class WorkerController {
  static async list(req: AuthenticatedRequest, res: Response) {
    if (req.authUser?.role !== 'Management') return res.status(403).json({ error: 'Management role required' });
    const workers = await db.listWorkers();
    return res.json(workers);
  }

  static async getById(req: AuthenticatedRequest, res: Response) {
    if (req.authUser?.role !== 'Management') return res.status(403).json({ error: 'Management role required' });
    const { id } = req.params;
    const worker = await db.findWorkerById(id);
    if (!worker) {
      return res.status(404).json({ error: 'Worker not found' });
    }
    return res.json(worker);
  }
}
