import { Request, Response } from 'express';
import { db } from '../db/database';

export class SchemaController {
  static async getMetadata(_req: Request, res: Response) {
    const meta = await db.getSchemaMetadata();
    return res.json(meta);
  }

  static async getTableRows(req: Request, res: Response) {
    const { table } = req.params;

    if (table === 'users') {
      return res.json(await db.listUsers());
    } else if (table === 'workers') {
      return res.json(await db.listWorkers());
    } else if (table === 'issues') {
      return res.json(await db.listIssues());
    } else if (table === 'sms_logs') {
      return res.json(await db.listSmsLogs());
    } else if (table === 'notifications') {
      return res.json(await db.listNotifications());
    } else {
      return res.status(404).json({ error: `Table '${table}' not found in myschema` });
    }
  }
}
