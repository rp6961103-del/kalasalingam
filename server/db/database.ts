import { randomUUID } from 'node:crypto';
import { PoolClient, QueryResultRow } from 'pg';
import {
  IssueAuditLogRow,
  IssueCategory,
  IssueRow,
  IssueStatus,
  MY_SCHEMA_TABLES,
  NotificationRow,
  SmsLogRow,
  UserRow,
  WorkerRow,
} from './schema';
import { pool } from './pool';
import { PriorityService } from '../services/priorityService';
import { SmsService } from '../services/smsService';

export interface HydratedIssue extends IssueRow {
  lat: number;
  lng: number;
  reportedBy: {
    name: string;
    role: string;
    regNo: string;
    phone: string;
    email: string;
    hostel?: string;
    department?: string;
  };
  assignedWorker?: WorkerRow;
  auditTrail: IssueAuditLogRow[];
  upvotedBy: string[];
}

type DbRow = QueryResultRow & Record<string, unknown>;

const asIso = (value: unknown): string => value instanceof Date ? value.toISOString() : new Date(String(value)).toISOString();
const optionalIso = (value: unknown): string | undefined => value == null ? undefined : asIso(value);

function mapUser(row: DbRow): UserRow {
  return {
    id: String(row.id),
    regNo: String(row.regNo),
    name: String(row.name),
    email: String(row.email),
    phone: String(row.phone ?? ''),
    role: row.role as UserRow['role'],
    department: String(row.department ?? 'General Campus'),
    designation: row.designation == null ? undefined : String(row.designation),
    hostel: row.hostel == null ? undefined : String(row.hostel),
    passwordHash: row.passwordHash == null ? undefined : String(row.passwordHash),
    createdAt: asIso(row.createdAt),
    updatedAt: asIso(row.updatedAt),
  };
}

function mapWorker(row: DbRow): WorkerRow {
  return {
    id: String(row.id),
    name: String(row.name),
    phone: String(row.phone ?? ''),
    role: String(row.role),
    category: row.category as WorkerRow['category'],
    avatar: String(row.avatar),
    status: row.status as WorkerRow['status'],
    activeIssues: Number(row.activeIssues ?? 0),
    shiftHours: String(row.shiftHours),
    createdAt: asIso(row.createdAt),
    updatedAt: asIso(row.updatedAt),
  };
}

function mapIssue(row: DbRow): IssueRow {
  return {
    id: String(row.id),
    ticketNo: String(row.ticketNo),
    title: String(row.title),
    category: row.category as IssueRow['category'],
    description: String(row.description),
    locationName: String(row.locationName),
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    status: row.status as IssueRow['status'],
    severity: row.severity as IssueRow['severity'],
    isHazard: Boolean(row.isHazard),
    votes: Number(row.votes),
    priorityScore: Number(row.priorityScore),
    reportedById: String(row.reportedById),
    assignedWorkerId: row.assignedWorkerId == null ? undefined : String(row.assignedWorkerId),
    imageUrl: row.imageUrl == null ? undefined : String(row.imageUrl),
    resolutionNote: row.resolutionNote == null ? undefined : String(row.resolutionNote),
    resolvedAt: optionalIso(row.resolvedAt),
    createdAt: asIso(row.createdAt),
    updatedAt: asIso(row.updatedAt),
  };
}

function mapAudit(row: DbRow): IssueAuditLogRow {
  return {
    id: String(row.id),
    issueId: String(row.issueId),
    fromStatus: row.fromStatus == null ? undefined : row.fromStatus as IssueAuditLogRow['fromStatus'],
    toStatus: row.toStatus as IssueAuditLogRow['toStatus'],
    action: String(row.action),
    actorName: String(row.actorName),
    actorRole: String(row.actorRole),
    note: row.note == null ? undefined : String(row.note),
    timestamp: asIso(row.timestamp),
  };
}

function mapSms(row: DbRow): SmsLogRow {
  return {
    id: String(row.id),
    ticketNo: String(row.ticketNo),
    recipientName: String(row.recipientName),
    recipientRole: String(row.recipientRole),
    toPhone: String(row.toPhone),
    message: String(row.message),
    status: row.status as SmsLogRow['status'],
    direction: row.direction as SmsLogRow['direction'],
    gatewayId: String(row.gatewayId),
    providerMessageId: row.providerMessageId == null ? undefined : String(row.providerMessageId),
    error: row.error == null ? undefined : String(row.error),
    deliveredAt: optionalIso(row.deliveredAt),
    timestamp: asIso(row.timestamp),
  };
}

function mapNotification(row: DbRow): NotificationRow {
  return {
    id: String(row.id),
    ticketNo: String(row.ticketNo),
    title: String(row.title),
    message: String(row.message),
    type: row.type as NotificationRow['type'],
    isRead: Boolean(row.isRead),
    targetUserId: row.targetUserId == null ? undefined : String(row.targetUserId),
    timestamp: asIso(row.timestamp),
  };
}

const issueSelect = `
  SELECT i.id, i."ticketNo", i.title, i.category, i.description, i."locationName",
    i.latitude, i.longitude, i.status, i.severity, i."isHazard", i.votes,
    i."priorityScore", i."reportedById", i."assignedWorkerId", i."imageUrl",
    i."resolutionNote", i."resolvedAt", i."createdAt", i."updatedAt",
    u.name AS "reporterName", u.role AS "reporterRole", u."regNo" AS "reporterRegNo",
    u.phone AS "reporterPhone", u.email AS "reporterEmail", u.hostel AS "reporterHostel",
    u.department AS "reporterDepartment",
    w.id AS "workerId", w.name AS "workerName", w.phone AS "workerPhone",
    w.role AS "workerRole", w.category AS "workerCategory", w.avatar AS "workerAvatar",
    w.status AS "workerStatus", w."shiftHours" AS "workerShiftHours",
    w."createdAt" AS "workerCreatedAt", w."updatedAt" AS "workerUpdatedAt",
    (SELECT COUNT(*)::int FROM myschema.issues wi
      WHERE wi."assignedWorkerId" = w.id AND wi.status <> 'Resolved') AS "workerActiveIssues"
  FROM myschema.issues i
  JOIN myschema.users u ON u.id = i."reportedById"
  LEFT JOIN myschema.workers w ON w.id = i."assignedWorkerId"`;

class MySchemaDatabase {
  async findUserById(id: string): Promise<UserRow | undefined> {
    const result = await pool.query('SELECT * FROM myschema.users WHERE id = $1', [id]);
    return result.rows[0] ? mapUser(result.rows[0] as DbRow) : undefined;
  }

  async findUserByIdentifier(identifier: string): Promise<UserRow | undefined> {
    const result = await pool.query(
      'SELECT * FROM myschema.users WHERE upper("regNo") = upper(trim($1)) OR lower(email) = lower(trim($1)) LIMIT 1',
      [identifier],
    );
    return result.rows[0] ? mapUser(result.rows[0] as DbRow) : undefined;
  }

  async createUser(data: Omit<UserRow, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserRow> {
    const id = randomUUID();
    const result = await pool.query(
      `INSERT INTO myschema.users
        (id, "regNo", name, email, phone, role, department, designation, hostel, "passwordHash")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        id, data.regNo.trim().toUpperCase(), data.name, data.email.trim().toLowerCase(),
        data.phone, data.role, data.department, data.designation ?? null, data.hostel ?? null,
        data.passwordHash ?? null,
      ],
    );
    return mapUser(result.rows[0] as DbRow);
  }

  async createManagementUser(data: Omit<UserRow, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserRow | undefined> {
    const client = await pool.connect();
    let transactionOpen = false;
    try {
      await client.query('BEGIN');
      transactionOpen = true;
      await client.query("SELECT pg_advisory_xact_lock(hashtext('kare-management-bootstrap'))");
      const existing = await client.query(
        "SELECT 1 FROM myschema.users WHERE role = 'Management' AND \"passwordHash\" IS NOT NULL LIMIT 1",
      );
      if (existing.rowCount) {
        await client.query('ROLLBACK');
        transactionOpen = false;
        return undefined;
      }
      const result = await client.query(
        `INSERT INTO myschema.users
          (id, "regNo", name, email, phone, role, department, designation, hostel, "passwordHash")
         VALUES ($1, $2, $3, $4, $5, 'Management', $6, $7, NULL, $8) RETURNING *`,
        [
          randomUUID(), data.regNo.trim().toUpperCase(), data.name, data.email.trim().toLowerCase(),
          data.phone, data.department, data.designation ?? null, data.passwordHash ?? null,
        ],
      );
      await client.query('COMMIT');
      transactionOpen = false;
      return mapUser(result.rows[0] as DbRow);
    } catch (error) {
      if (transactionOpen) await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async listUsers(): Promise<Omit<UserRow, 'passwordHash'>[]> {
    const result = await pool.query('SELECT * FROM myschema.users ORDER BY name');
    return result.rows.map((row) => {
      const { passwordHash: _passwordHash, ...user } = mapUser(row as DbRow);
      return user;
    });
  }

  async hasConfiguredManagementAccount(): Promise<boolean> {
    const result = await pool.query(
      "SELECT EXISTS (SELECT 1 FROM myschema.users WHERE role = 'Management' AND \"passwordHash\" IS NOT NULL) AS configured",
    );
    return Boolean(result.rows[0]?.configured);
  }

  async persistSession(id: string, userId: string, expiresAt: Date): Promise<void> {
    const client = await pool.connect();
    let transactionOpen = false;
    try {
      await client.query('BEGIN');
      transactionOpen = true;
      await client.query('DELETE FROM myschema.sessions WHERE "expiresAt" <= NOW()');
      await client.query(
        'INSERT INTO myschema.sessions (id, "userId", "expiresAt") VALUES ($1, $2, $3)',
        [id, userId, expiresAt],
      );
      await client.query('COMMIT');
      transactionOpen = false;
    } catch (error) {
      if (transactionOpen) await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async hasActiveSession(id: string, userId: string): Promise<boolean> {
    const result = await pool.query(
      'SELECT 1 FROM myschema.sessions WHERE id = $1 AND "userId" = $2 AND "expiresAt" > NOW()',
      [id, userId],
    );
    return Boolean(result.rowCount);
  }

  async revokeSession(id: string): Promise<void> {
    await pool.query('DELETE FROM myschema.sessions WHERE id = $1', [id]);
  }

  async findWorkerById(id: string): Promise<WorkerRow | undefined> {
    const result = await pool.query(
      `SELECT w.*, COUNT(i.id) FILTER (WHERE i.status <> 'Resolved')::int AS "activeIssues"
       FROM myschema.workers w LEFT JOIN myschema.issues i ON i."assignedWorkerId" = w.id
       WHERE w.id = $1 GROUP BY w.id`,
      [id],
    );
    return result.rows[0] ? mapWorker(result.rows[0] as DbRow) : undefined;
  }

  async findWorkerByCategory(category: IssueCategory): Promise<WorkerRow> {
    const result = await pool.query(
      `SELECT w.*, COUNT(i.id) FILTER (WHERE i.status <> 'Resolved')::int AS "activeIssues"
       FROM myschema.workers w LEFT JOIN myschema.issues i ON i."assignedWorkerId" = w.id
       WHERE w.category = $1 GROUP BY w.id ORDER BY COUNT(i.id) FILTER (WHERE i.status <> 'Resolved'), w.id LIMIT 1`,
      [category],
    );
    if (!result.rows[0]) throw new Error(`No worker is configured for category ${category}`);
    return mapWorker(result.rows[0] as DbRow);
  }

  async listWorkers(): Promise<WorkerRow[]> {
    const result = await pool.query(
      `SELECT w.*, COUNT(i.id) FILTER (WHERE i.status <> 'Resolved')::int AS "activeIssues"
       FROM myschema.workers w LEFT JOIN myschema.issues i ON i."assignedWorkerId" = w.id
       GROUP BY w.id ORDER BY w.name`,
    );
    return result.rows.map((row) => {
      const worker = mapWorker(row as DbRow);
      worker.status = worker.activeIssues > 1 ? 'On Task' : 'Available';
      return worker;
    });
  }

  private async hydrateRows(rows: DbRow[]): Promise<HydratedIssue[]> {
    if (!rows.length) return [];
    const ids = rows.map((row) => String(row.id));
    const [audits, votes] = await Promise.all([
      pool.query('SELECT * FROM myschema.issue_audit_logs WHERE "issueId" = ANY($1::text[]) ORDER BY "timestamp"', [ids]),
      pool.query(
        `SELECT v."issueId", u."regNo" FROM myschema.issue_votes v
         JOIN myschema.users u ON u.id = v."userId"
         WHERE v."issueId" = ANY($1::text[])`,
        [ids],
      ),
    ]);
    const auditByIssue = new Map<string, IssueAuditLogRow[]>();
    for (const raw of audits.rows) {
      const audit = mapAudit(raw as DbRow);
      auditByIssue.set(audit.issueId, [...(auditByIssue.get(audit.issueId) || []), audit]);
    }
    const votersByIssue = new Map<string, string[]>();
    for (const row of votes.rows as DbRow[]) {
      const issueId = String(row.issueId);
      votersByIssue.set(issueId, [...(votersByIssue.get(issueId) || []), String(row.regNo)]);
    }
    return rows.map((row) => {
      const issue = mapIssue(row);
      const worker = row.workerId == null ? undefined : mapWorker({
        id: row.workerId,
        name: row.workerName,
        phone: row.workerPhone,
        role: row.workerRole,
        category: row.workerCategory,
        avatar: row.workerAvatar,
        status: Number(row.workerActiveIssues) > 1 ? 'On Task' : 'Available',
        activeIssues: row.workerActiveIssues,
        shiftHours: row.workerShiftHours,
        createdAt: row.workerCreatedAt,
        updatedAt: row.workerUpdatedAt,
      });
      return {
        ...issue,
        lat: issue.latitude,
        lng: issue.longitude,
        reportedBy: {
          name: String(row.reporterName),
          role: String(row.reporterRole),
          regNo: String(row.reporterRegNo),
          phone: String(row.reporterPhone),
          email: String(row.reporterEmail),
          hostel: row.reporterHostel == null ? undefined : String(row.reporterHostel),
          department: row.reporterDepartment == null ? undefined : String(row.reporterDepartment),
        },
        assignedWorker: worker,
        auditTrail: auditByIssue.get(issue.id) || [],
        upvotedBy: votersByIssue.get(issue.id) || [],
      };
    });
  }

  async findHydratedIssue(id: string): Promise<HydratedIssue | undefined> {
    const result = await pool.query(`${issueSelect} WHERE i.id = $1`, [id]);
    return (await this.hydrateRows(result.rows as DbRow[]))[0];
  }

  async listIssues(filter?: { category?: string; status?: string; reporterId?: string }): Promise<HydratedIssue[]> {
    const conditions: string[] = [];
    const values: string[] = [];
    const add = (sql: string, value: string) => {
      values.push(value);
      conditions.push(sql.replace('?', `$${values.length}`));
    };
    if (filter?.reporterId) add('i."reportedById" = ?', filter.reporterId);
    if (filter?.category && !['All categories', 'all'].includes(filter.category)) add('i.category = ?', filter.category);
    if (filter?.status && !['All status', 'all'].includes(filter.status)) add('i.status = ?', filter.status);
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await pool.query(`${issueSelect} ${where}`, values);
    return (await this.hydrateRows(result.rows as DbRow[])).sort(PriorityService.sortComparator);
  }

  async createIssue(params: {
    title: string;
    category: IssueCategory;
    description: string;
    locationName: string;
    latitude: number;
    longitude: number;
    severity?: 'Low' | 'Medium' | 'High' | 'Hazard';
    isHazard?: boolean;
    reportedBy: { name: string; role: 'Student' | 'Staff' | 'Faculty'; regNo: string; phone: string; email?: string; hostel?: string; department?: string };
    imageUrl?: string;
  }): Promise<{ issue: HydratedIssue; sms: SmsLogRow }> {
    const client = await pool.connect();
    const now = new Date();
    const id = randomUUID();
    let transactionOpen = false;
    try {
      await client.query('BEGIN');
      transactionOpen = true;
      const user = await this.findUserByIdentifierWithClient(client, params.reportedBy.regNo);
      if (!user || user.role !== 'Student') throw new Error('Authenticated reporter account was not found');
      const workerResult = await client.query(
        `SELECT w.*, COALESCE(active."activeIssues", 0)::int AS "activeIssues"
         FROM myschema.workers w
         LEFT JOIN LATERAL (
           SELECT COUNT(*)::int AS "activeIssues" FROM myschema.issues i
           WHERE i."assignedWorkerId" = w.id AND i.status <> 'Resolved'
         ) active ON TRUE
         WHERE w.category = $1
         ORDER BY active."activeIssues", w.id LIMIT 1 FOR UPDATE OF w`,
        [params.category],
      );
      if (!workerResult.rows[0]) throw new Error(`No worker is configured for category ${params.category}`);
      const assignedWorker = mapWorker(workerResult.rows[0] as DbRow);
      const ticketResult = await client.query("SELECT nextval('myschema.ticket_number_seq') AS seq");
      const ticketNo = `KARE-${now.getFullYear()}-${String(ticketResult.rows[0].seq).padStart(3, '0')}`;
      const isHazard = Boolean(params.isHazard);
      const severity = isHazard ? 'Hazard' : params.severity || 'Medium';
      const priorityScore = PriorityService.calculateScore({ severity, isHazard, votes: 1, createdAt: now.toISOString() });
      const issueResult = await client.query(
        `INSERT INTO myschema.issues
          (id, "ticketNo", title, category, description, "locationName", latitude, longitude, status,
           severity, "isHazard", votes, "priorityScore", "reportedById", "assignedWorkerId", "imageUrl", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Reported', $9, $10, 1, $11, $12, $13, $14, $15, $15)
         RETURNING id`,
        [id, ticketNo, params.title.trim(), params.category, params.description?.trim() || 'No additional details provided.',
          params.locationName || 'Campus Location', params.latitude, params.longitude, severity, isHazard,
          priorityScore, user.id, assignedWorker.id, params.imageUrl ?? null, now],
      );
      const issueId = String(issueResult.rows[0].id);
      await client.query(
        'INSERT INTO myschema.issue_votes (id, "issueId", "userId", "votedAt") VALUES ($1, $2, $3, $4)',
        [randomUUID(), issueId, user.id, now],
      );
      await client.query(
        `INSERT INTO myschema.issue_audit_logs
          (id, "issueId", "toStatus", action, "actorName", "actorRole", "timestamp")
         VALUES ($1, $2, 'Reported', $3, $4, $5, $6)`,
        [randomUUID(), issueId, isHazard ? 'Critical Hazard Reported!' : 'Issue reported via campus map pin drop', user.name, user.role, now],
      );
      const message = SmsService.buildWorkerDispatchMessage({
        ticketNo, title: params.title.trim(), locationName: params.locationName || 'Campus Location',
        category: params.category, severity, isHazard, reporterName: user.name, reporterPhone: user.phone,
      });
      const smsResult = await client.query(
        `INSERT INTO myschema.sms_logs
          (id, "ticketNo", "recipientName", "recipientRole", "toPhone", message, status, direction, "gatewayId", "timestamp")
         VALUES ($1, $2, $3, $4, $5, $6, 'Pending', 'Outbound_Worker', 'pending', $7) RETURNING *`,
        [randomUUID(), ticketNo, `${assignedWorker.name} (${assignedWorker.category})`, assignedWorker.role, assignedWorker.phone, message, now],
      );
      await client.query(
        `INSERT INTO myschema.notifications
          (id, "ticketNo", title, message, type, "isRead", "timestamp")
         VALUES ($1, $2, $3, $4, $5, FALSE, $6)`,
        [randomUUID(), ticketNo, isHazard ? 'Critical Hazard Dispatched' : 'New Issue Dispatched',
          `${params.title.trim()} reported at ${params.locationName}. SMS notification is being processed for ${assignedWorker.name}.`,
          isHazard ? 'alert' : 'sms_dispatched', now],
      );
      await client.query('COMMIT');
      transactionOpen = false;
      const issue = await this.findHydratedIssue(issueId);
      if (!issue) throw new Error('Created issue could not be reloaded');
      return { issue, sms: mapSms(smsResult.rows[0] as DbRow) };
    } catch (error) {
      if (transactionOpen) await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async findUserByIdentifierWithClient(client: PoolClient, identifier: string): Promise<UserRow | undefined> {
    const result = await client.query(
      'SELECT * FROM myschema.users WHERE upper("regNo") = upper(trim($1)) OR lower(email) = lower(trim($1)) LIMIT 1 FOR SHARE',
      [identifier],
    );
    return result.rows[0] ? mapUser(result.rows[0] as DbRow) : undefined;
  }

  async voteIssue(issueId: string, userId: string): Promise<{ issue: HydratedIssue; votes: number; upvoted: boolean }> {
    const client = await pool.connect();
    let transactionOpen = false;
    try {
      await client.query('BEGIN');
      transactionOpen = true;
      const result = await client.query('SELECT * FROM myschema.issues WHERE id = $1 FOR UPDATE', [issueId]);
      if (!result.rows[0]) throw new Error('Issue not found');
      const issue = mapIssue(result.rows[0] as DbRow);
      const existing = await client.query('DELETE FROM myschema.issue_votes WHERE "issueId" = $1 AND "userId" = $2 RETURNING id', [issueId, userId]);
      const upvoted = existing.rowCount === 0;
      if (upvoted) {
        await client.query('INSERT INTO myschema.issue_votes (id, "issueId", "userId") VALUES ($1, $2, $3)', [randomUUID(), issueId, userId]);
      }
      const votes = Math.max(0, issue.votes + (upvoted ? 1 : -1));
      const priorityScore = PriorityService.calculateScore({ severity: issue.severity, isHazard: issue.isHazard, votes, createdAt: issue.createdAt });
      await client.query(
        'UPDATE myschema.issues SET votes = $2, "priorityScore" = $3, "updatedAt" = NOW() WHERE id = $1',
        [issueId, votes, priorityScore],
      );
      await client.query('COMMIT');
      transactionOpen = false;
      const hydrated = await this.findHydratedIssue(issueId);
      if (!hydrated) throw new Error('Voted issue could not be reloaded');
      return { issue: hydrated, votes, upvoted };
    } catch (error) {
      if (transactionOpen) await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateIssueStatus(issueId: string, params: {
    status: IssueStatus;
    workerId?: string;
    note?: string;
    actorName: string;
    actorRole?: string;
  }): Promise<{ issue: HydratedIssue; sms: SmsLogRow }> {
    const client = await pool.connect();
    const now = new Date();
    let transactionOpen = false;
    try {
      await client.query('BEGIN');
      transactionOpen = true;
      const result = await client.query('SELECT * FROM myschema.issues WHERE id = $1 FOR UPDATE', [issueId]);
      if (!result.rows[0]) throw new Error('Issue not found');
      const issue = mapIssue(result.rows[0] as DbRow);
      const workerId = params.workerId ?? issue.assignedWorkerId ?? null;
      if (params.workerId) {
        const worker = await client.query('SELECT 1 FROM myschema.workers WHERE id = $1', [params.workerId]);
        if (!worker.rowCount) throw new Error('Assigned worker was not found');
      }
      const priorityScore = PriorityService.calculateScore({
        severity: issue.severity, isHazard: issue.isHazard, votes: issue.votes, createdAt: issue.createdAt,
      });
      await client.query(
        `UPDATE myschema.issues SET status = $2, "assignedWorkerId" = $3,
          "resolutionNote" = COALESCE($4, "resolutionNote"),
          "resolvedAt" = CASE WHEN $2 = 'Resolved' THEN $5 ELSE "resolvedAt" END,
          "priorityScore" = $6, "updatedAt" = $5 WHERE id = $1`,
        [issueId, params.status, workerId, params.note ?? null, now, priorityScore],
      );
      await client.query(
        `INSERT INTO myschema.issue_audit_logs
          (id, "issueId", "fromStatus", "toStatus", action, "actorName", "actorRole", note, "timestamp")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [randomUUID(), issueId, issue.status, params.status, `Status transitioned: ${issue.status} → ${params.status}`,
          params.actorName, params.actorRole || 'Management', params.note ?? null, now],
      );
      const worker = workerId ? await client.query('SELECT * FROM myschema.workers WHERE id = $1', [workerId]) : undefined;
      const reporter = await client.query('SELECT * FROM myschema.users WHERE id = $1', [issue.reportedById]);
      if (!reporter.rows[0]) throw new Error('Issue reporter account was not found');
      const reporterUser = mapUser(reporter.rows[0] as DbRow);
      const workerUser = worker?.rows[0] ? mapWorker(worker.rows[0] as DbRow) : undefined;
      const message = SmsService.buildStudentStatusUpdateMessage({
        ticketNo: issue.ticketNo, title: issue.title, status: params.status, actorName: params.actorName,
        workerName: workerUser?.name, note: params.note,
      });
      const smsResult = await client.query(
        `INSERT INTO myschema.sms_logs
          (id, "ticketNo", "recipientName", "recipientRole", "toPhone", message, status, direction, "gatewayId", "timestamp")
         VALUES ($1, $2, $3, 'Student Reporter', $4, $5, 'Pending', 'Outbound_Student', 'pending', $6) RETURNING *`,
        [randomUUID(), issue.ticketNo, reporterUser.name, reporterUser.phone, message, now],
      );
      await client.query(
        `INSERT INTO myschema.notifications
          (id, "ticketNo", title, message, type, "isRead", "targetUserId", "timestamp")
         VALUES ($1, $2, $3, $4, 'status_change', FALSE, $5, $6)`,
        [randomUUID(), issue.ticketNo, `Status: ${params.status}`,
          `Issue #${issue.ticketNo} transitioned to ${params.status}. SMS notification is being processed.`,
          issue.reportedById, now],
      );
      await client.query('COMMIT');
      transactionOpen = false;
      const hydrated = await this.findHydratedIssue(issueId);
      if (!hydrated) throw new Error('Updated issue could not be reloaded');
      return { issue: hydrated, sms: mapSms(smsResult.rows[0] as DbRow) };
    } catch (error) {
      if (transactionOpen) await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async listSmsLogs(): Promise<SmsLogRow[]> {
    const result = await pool.query('SELECT * FROM myschema.sms_logs ORDER BY "timestamp" DESC');
    return result.rows.map((row) => mapSms(row as DbRow));
  }

  async updateSmsLog(id: string, result: Pick<SmsLogRow, 'status' | 'gatewayId'> & Partial<Pick<SmsLogRow, 'providerMessageId' | 'error' | 'deliveredAt'>>): Promise<SmsLogRow | undefined> {
    const updated = await pool.query(
      `UPDATE myschema.sms_logs SET status = $2, "gatewayId" = $3,
        "providerMessageId" = COALESCE($4, "providerMessageId"),
        error = $5, "deliveredAt" = COALESCE($6, "deliveredAt")
       WHERE id = $1 RETURNING *`,
      [id, result.status, result.gatewayId, result.providerMessageId ?? null, result.error ?? null, result.deliveredAt ?? null],
    );
    return updated.rows[0] ? mapSms(updated.rows[0] as DbRow) : undefined;
  }

  async createSmsLog(data: Omit<SmsLogRow, 'id' | 'timestamp'>): Promise<SmsLogRow> {
    const result = await pool.query(
      `INSERT INTO myschema.sms_logs
        (id, "ticketNo", "recipientName", "recipientRole", "toPhone", message, status, direction,
         "gatewayId", "providerMessageId", error, "deliveredAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [randomUUID(), data.ticketNo, data.recipientName, data.recipientRole, data.toPhone, data.message,
        data.status, data.direction, data.gatewayId, data.providerMessageId ?? null, data.error ?? null, data.deliveredAt ?? null],
    );
    return mapSms(result.rows[0] as DbRow);
  }

  async listNotifications(targetUserId?: string): Promise<NotificationRow[]> {
    const result = targetUserId
      ? await pool.query(
        `SELECT * FROM myschema.notifications WHERE "targetUserId" IS NULL OR "targetUserId" = $1 ORDER BY "timestamp" DESC`,
        [targetUserId],
      )
      : await pool.query('SELECT * FROM myschema.notifications ORDER BY "timestamp" DESC');
    return result.rows.map((row) => mapNotification(row as DbRow));
  }

  async markNotificationsRead(targetUserId?: string): Promise<void> {
    if (targetUserId) {
      await pool.query(
        'UPDATE myschema.notifications SET "isRead" = TRUE WHERE "targetUserId" IS NULL OR "targetUserId" = $1',
        [targetUserId],
      );
    } else {
      await pool.query('UPDATE myschema.notifications SET "isRead" = TRUE');
    }
  }

  async getStats() {
    const result = await pool.query(`
      SELECT COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status <> 'Resolved')::int AS open,
        COUNT(*) FILTER (WHERE status = 'Resolved')::int AS resolved,
        COUNT(*) FILTER (WHERE status = 'In Progress')::int AS "inProgress",
        COUNT(*) FILTER (WHERE "isHazard" AND status <> 'Resolved')::int AS hazards,
        COALESCE(ROUND(AVG(GREATEST(0.5, EXTRACT(EPOCH FROM ("resolvedAt" - "createdAt")) / 3600) / 24)
          FILTER (WHERE status = 'Resolved' AND "resolvedAt" IS NOT NULL)::numeric, 1), 2.4) AS "avgDays"
      FROM myschema.issues`);
    const row = result.rows[0] as DbRow;
    return { total: Number(row.total), open: Number(row.open), resolved: Number(row.resolved),
      inProgress: Number(row.inProgress), hazards: Number(row.hazards), avgDays: Number(row.avgDays) };
  }

  async getSchemaMetadata() {
    const tables = await Promise.all(Object.entries(MY_SCHEMA_TABLES).map(async ([key, meta]) => {
      const actualName = key.replace(/[^a-z_]/g, '');
      const count = await pool.query(`SELECT COUNT(*)::int AS count FROM myschema.${actualName}`);
      return { ...meta, key, rowCount: Number(count.rows[0].count) };
    }));
    return { databaseName: 'kare_campus_db', schema: 'myschema', tables };
  }

  async initializeSeedConfiguration(): Promise<void> {
    const configuredPhones = [
      ['w-1', process.env.WORKER_ELECTRICAL_PHONE],
      ['w-2', process.env.WORKER_PLUMBING_PHONE],
      ['w-3', process.env.WORKER_CLEANING_PHONE],
      ['w-4', process.env.WORKER_NETWORK_PHONE],
      ['w-5', process.env.WORKER_HVAC_PHONE],
      ['w-6', process.env.WORKER_SAFETY_PHONE],
    ] as const;
    for (const [workerId, phone] of configuredPhones) {
      if (phone) await pool.query('UPDATE myschema.workers SET phone = $2, "updatedAt" = NOW() WHERE id = $1', [workerId, phone]);
    }
  }
}

export const db = new MySchemaDatabase();
