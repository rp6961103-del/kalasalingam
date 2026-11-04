import { Request, Response } from 'express';
import { db } from '../db/database';

export class StatsController {
  static async getStats(_req: Request, res: Response) {
    const stats = await db.getStats();
    return res.json(stats);
  }
}
