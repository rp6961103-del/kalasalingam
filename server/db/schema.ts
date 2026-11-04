/**
 * KARE Campus Facility Management & Operations
 * Database Schema: `myschema`
 *
 * Defines the structured relational schema for campus operations, including
 * users, maintenance staff, facility service issues, audit logs, SMS logs,
 * and upvotes with strict field constraints and relational integrity.
 */

import { z } from 'zod';

// ==========================================
// ENUMS & CONSTANTS
// ==========================================
export const UserRoleEnum = z.enum(['Student', 'Management']);
export type UserRole = z.infer<typeof UserRoleEnum>;

export const IssueCategoryEnum = z.enum([
  'Electrical',
  'Plumbing',
  'Cleaning',
  'Wi-Fi/Network',
  'HVAC',
  'Civil/Safety',
]);
export type IssueCategory = z.infer<typeof IssueCategoryEnum>;

export const IssueStatusEnum = z.enum([
  'Reported',
  'Assigned',
  'In Progress',
  'Resolved',
]);
export type IssueStatus = z.infer<typeof IssueStatusEnum>;

export const IssueSeverityEnum = z.enum([
  'Low',
  'Medium',
  'High',
  'Hazard',
]);
export type IssueSeverity = z.infer<typeof IssueSeverityEnum>;

export const WorkerStatusEnum = z.enum([
  'Available',
  'On Task',
  'Off Duty',
]);
export type WorkerStatus = z.infer<typeof WorkerStatusEnum>;

export const SmsDirectionEnum = z.enum([
  'Outbound_Worker',
  'Outbound_Student',
  'Outbound_Management',
]);
export type SmsDirection = z.infer<typeof SmsDirectionEnum>;

export const SmsStatusEnum = z.enum([
  'Pending',
  'Simulated',
  'Sent',
  'Delivered',
  'Read',
  'Failed',
]);
export type SmsStatus = z.infer<typeof SmsStatusEnum>;

// ==========================================
// TABLE SCHEMAS (myschema.*)
// ==========================================

/**
 * Table: `myschema.users`
 * Represents university students, faculty, and administrative staff
 */
export const UserSchema = z.object({
  id: z.string().describe('Primary Key'),
  regNo: z.string().min(3).max(30).describe('University Reg No or Staff ID (Unique Index)'),
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().max(20).refine((phone) => phone === '' || /^\+91[6-9]\d{9}$/.test(phone)),
  role: UserRoleEnum,
  department: z.string().optional().default('General Campus'),
  designation: z.string().optional(),
  hostel: z.string().optional(),
  passwordHash: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type UserRow = z.infer<typeof UserSchema>;

/**
 * Table: `myschema.workers`
 * Campus trade technicians (Electricians, Plumbers, Sanitation, IT, Safety)
 */
export const WorkerSchema = z.object({
  id: z.string().describe('Primary Key'),
  name: z.string().min(2).max(100),
  phone: z.string().max(20).refine((phone) => phone === '' || /^\+91[6-9]\d{9}$/.test(phone)),
  role: z.string().min(2).max(100),
  category: IssueCategoryEnum,
  avatar: z.string().url(),
  status: WorkerStatusEnum.default('Available'),
  activeIssues: z.number().int().min(0).default(0),
  shiftHours: z.string().default('08:00 - 18:00'),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type WorkerRow = z.infer<typeof WorkerSchema>;

/**
 * Table: `myschema.issues`
 * Core campus service requests and incident reports
 */
export const IssueSchema = z.object({
  id: z.string().describe('Primary Key'),
  ticketNo: z.string().min(5).max(30).describe('Unique Ticket Number, e.g. KARE-2026-081'),
  title: z.string().min(3).max(200),
  category: IssueCategoryEnum,
  description: z.string().max(2000),
  locationName: z.string().min(2).max(250),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  status: IssueStatusEnum.default('Reported'),
  severity: IssueSeverityEnum.default('Medium'),
  isHazard: z.boolean().default(false),
  votes: z.number().int().min(0).default(1),
  priorityScore: z.number().min(0).default(10),
  reportedById: z.string().describe('Foreign Key -> myschema.users.id'),
  assignedWorkerId: z.string().optional().describe('Foreign Key -> myschema.workers.id'),
  imageUrl: z.string().optional(),
  resolutionNote: z.string().optional(),
  resolvedAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type IssueRow = z.infer<typeof IssueSchema>;

/**
 * Table: `myschema.issue_votes`
 * Tracks community upvotes to prevent duplicate voting and calculate priority
 */
export const IssueVoteSchema = z.object({
  id: z.string().describe('Primary Key'),
  issueId: z.string().describe('Foreign Key -> myschema.issues.id'),
  userId: z.string().describe('Foreign Key -> myschema.users.id'),
  votedAt: z.string().datetime(),
});
export type IssueVoteRow = z.infer<typeof IssueVoteSchema>;

/**
 * Table: `myschema.issue_audit_logs`
 * Immutable chronological transition history for accountability
 */
export const IssueAuditLogSchema = z.object({
  id: z.string().describe('Primary Key'),
  issueId: z.string().describe('Foreign Key -> myschema.issues.id'),
  fromStatus: IssueStatusEnum.optional(),
  toStatus: IssueStatusEnum,
  action: z.string().max(255),
  actorName: z.string().max(100),
  actorRole: z.string().max(50),
  note: z.string().optional(),
  timestamp: z.string().datetime(),
});
export type IssueAuditLogRow = z.infer<typeof IssueAuditLogSchema>;

/**
 * Table: `myschema.sms_logs`
 * SMS notification attempts and provider outcomes for technicians and students
 */
export const SmsLogSchema = z.object({
  id: z.string().describe('Primary Key'),
  ticketNo: z.string().max(30),
  recipientName: z.string().max(100),
  recipientRole: z.string().max(100),
  toPhone: z.string().max(25),
  message: z.string().max(1000),
  status: SmsStatusEnum.default('Pending'),
  direction: SmsDirectionEnum,
  gatewayId: z.string().default('unconfigured'),
  providerMessageId: z.string().optional(),
  error: z.string().max(1000).optional(),
  deliveredAt: z.string().datetime().optional(),
  timestamp: z.string().datetime(),
});
export type SmsLogRow = z.infer<typeof SmsLogSchema>;

/**
 * Table: `myschema.notifications`
 * System and in-app alert events
 */
export const NotificationSchema = z.object({
  id: z.string().describe('Primary Key'),
  ticketNo: z.string().max(30),
  title: z.string().max(150),
  message: z.string().max(500),
  type: z.enum(['alert', 'assignment', 'status_change', 'sms_dispatched']),
  isRead: z.boolean().default(false),
  targetUserId: z.string().optional(),
  timestamp: z.string().datetime(),
});
export type NotificationRow = z.infer<typeof NotificationSchema>;

/**
 * Table: `myschema.campus_landmarks`
 * Reference university infrastructure landmarks
 */
export const CampusLandmarkSchema = z.object({
  id: z.string(),
  code: z.string().max(20),
  name: z.string().max(150),
  category: z.string().max(50),
  lat: z.number(),
  lng: z.number(),
});
export type CampusLandmarkRow = z.infer<typeof CampusLandmarkSchema>;

// ==========================================
// SCHEMA METADATA INTROSPECTION DEFINITION
// ==========================================
export interface SchemaTableMeta {
  tableName: string;
  description: string;
  primaryKey: string;
  foreignKeys: Array<{ column: string; referencesTable: string; referencesColumn: string }>;
  indexes: Array<{ indexName: string; columns: string[]; isUnique: boolean }>;
  columns: Array<{ name: string; type: string; isNullable: boolean; description?: string }>;
}

export const MY_SCHEMA_TABLES: Record<string, SchemaTableMeta> = {
  users: {
    tableName: 'myschema.users',
    description: 'Stores student and staff identities, affiliations, and login credentials',
    primaryKey: 'id',
    foreignKeys: [],
    indexes: [
      { indexName: 'idx_users_reg_no', columns: ['regNo'], isUnique: true },
      { indexName: 'idx_users_email', columns: ['email'], isUnique: true },
      { indexName: 'idx_users_role', columns: ['role'], isUnique: false },
    ],
    columns: [
      { name: 'id', type: 'TEXT', isNullable: false, description: 'Primary unique key' },
      { name: 'regNo', type: 'VARCHAR(30)', isNullable: false, description: 'Unique register number or staff code' },
      { name: 'name', type: 'VARCHAR(100)', isNullable: false, description: 'Full legal name' },
      { name: 'email', type: 'VARCHAR(254)', isNullable: false, description: 'Institutional email address' },
      { name: 'phone', type: 'VARCHAR(20)', isNullable: false, description: 'Verified Indian mobile contact for SMS alerts; empty until configured' },
      { name: 'role', type: 'VARCHAR(20) CHECK', isNullable: false, description: 'Student or Management access level' },
      { name: 'department', type: 'VARCHAR(100)', isNullable: true, description: 'Academic or operational division' },
      { name: 'designation', type: 'VARCHAR(100)', isNullable: true, description: 'Position title' },
      { name: 'hostel', type: 'VARCHAR(100)', isNullable: true, description: 'Campus hostel or transit block' },
      { name: 'createdAt', type: 'TIMESTAMP WITH TIME ZONE', isNullable: false },
      { name: 'updatedAt', type: 'TIMESTAMP WITH TIME ZONE', isNullable: false },
    ],
  },
  workers: {
    tableName: 'myschema.workers',
    description: 'University maintenance crews, category trades, and duty statuses',
    primaryKey: 'id',
    foreignKeys: [],
    indexes: [
      { indexName: 'idx_workers_category', columns: ['category'], isUnique: false },
      { indexName: 'idx_workers_status', columns: ['status'], isUnique: false },
    ],
    columns: [
      { name: 'id', type: 'TEXT', isNullable: false },
      { name: 'name', type: 'VARCHAR(100)', isNullable: false },
      { name: 'phone', type: 'VARCHAR(20)', isNullable: false },
      { name: 'role', type: 'VARCHAR(100)', isNullable: false },
      { name: 'category', type: 'VARCHAR(50) CHECK', isNullable: false },
      { name: 'status', type: 'VARCHAR(20) CHECK', isNullable: false },
      { name: 'shiftHours', type: 'VARCHAR(50)', isNullable: false },
      { name: 'createdAt', type: 'TIMESTAMP WITH TIME ZONE', isNullable: false },
      { name: 'updatedAt', type: 'TIMESTAMP WITH TIME ZONE', isNullable: false },
    ],
  },
  issues: {
    tableName: 'myschema.issues',
    description: 'Campus facility service requests, geotagged map pins, and priority scores',
    primaryKey: 'id',
    foreignKeys: [
      { column: 'reportedById', referencesTable: 'myschema.users', referencesColumn: 'id' },
      { column: 'assignedWorkerId', referencesTable: 'myschema.workers', referencesColumn: 'id' },
    ],
    indexes: [
      { indexName: 'idx_issues_ticket_no', columns: ['ticketNo'], isUnique: true },
      { indexName: 'idx_issues_status', columns: ['status'], isUnique: false },
      { indexName: 'idx_issues_category', columns: ['category'], isUnique: false },
      { indexName: 'idx_issues_priority_score', columns: ['priorityScore'], isUnique: false },
      { indexName: 'idx_issues_coordinates', columns: ['latitude', 'longitude'], isUnique: false },
    ],
    columns: [
      { name: 'id', type: 'TEXT', isNullable: false },
      { name: 'ticketNo', type: 'VARCHAR(30)', isNullable: false },
      { name: 'title', type: 'VARCHAR(200)', isNullable: false },
      { name: 'category', type: 'VARCHAR(50) CHECK', isNullable: false },
      { name: 'description', type: 'TEXT', isNullable: false },
      { name: 'locationName', type: 'VARCHAR(250)', isNullable: false },
      { name: 'latitude', type: 'DECIMAL(9,6)', isNullable: false },
      { name: 'longitude', type: 'DECIMAL(9,6)', isNullable: false },
      { name: 'status', type: 'VARCHAR(20) CHECK', isNullable: false },
      { name: 'severity', type: 'VARCHAR(20) CHECK', isNullable: false },
      { name: 'isHazard', type: 'BOOLEAN', isNullable: false },
      { name: 'votes', type: 'INTEGER', isNullable: false },
      { name: 'priorityScore', type: 'NUMERIC(6,2)', isNullable: false },
      { name: 'reportedById', type: 'TEXT', isNullable: false },
      { name: 'assignedWorkerId', type: 'TEXT', isNullable: true },
      { name: 'imageUrl', type: 'TEXT', isNullable: true },
      { name: 'resolutionNote', type: 'TEXT', isNullable: true },
      { name: 'resolvedAt', type: 'TIMESTAMP WITH TIME ZONE', isNullable: true },
      { name: 'createdAt', type: 'TIMESTAMP WITH TIME ZONE', isNullable: false },
      { name: 'updatedAt', type: 'TIMESTAMP WITH TIME ZONE', isNullable: false },
    ],
  },
  issue_votes: {
    tableName: 'myschema.issue_votes',
    description: 'Relational upvotes per user and ticket to recalculate ranking',
    primaryKey: 'id',
    foreignKeys: [
      { column: 'issueId', referencesTable: 'myschema.issues', referencesColumn: 'id' },
      { column: 'userId', referencesTable: 'myschema.users', referencesColumn: 'id' },
    ],
    indexes: [
      { indexName: 'idx_vote_issue_user', columns: ['issueId', 'userId'], isUnique: true },
    ],
    columns: [
      { name: 'id', type: 'TEXT', isNullable: false },
      { name: 'issueId', type: 'TEXT', isNullable: false },
      { name: 'userId', type: 'TEXT', isNullable: false },
      { name: 'votedAt', type: 'TIMESTAMP WITH TIME ZONE', isNullable: false },
    ],
  },
  issue_audit_logs: {
    tableName: 'myschema.issue_audit_logs',
    description: 'Immutable ledger of status transitions and management remarks',
    primaryKey: 'id',
    foreignKeys: [
      { column: 'issueId', referencesTable: 'myschema.issues', referencesColumn: 'id' },
    ],
    indexes: [
      { indexName: 'idx_audit_issue_timestamp', columns: ['issueId', 'timestamp'], isUnique: false },
    ],
    columns: [
      { name: 'id', type: 'TEXT', isNullable: false },
      { name: 'issueId', type: 'TEXT', isNullable: false },
      { name: 'fromStatus', type: 'VARCHAR(20)', isNullable: true },
      { name: 'toStatus', type: 'VARCHAR(20) CHECK', isNullable: false },
      { name: 'action', type: 'VARCHAR(255)', isNullable: false },
      { name: 'actorName', type: 'VARCHAR(100)', isNullable: false },
      { name: 'actorRole', type: 'VARCHAR(50)', isNullable: false },
      { name: 'note', type: 'TEXT', isNullable: true },
      { name: 'timestamp', type: 'TIMESTAMP WITH TIME ZONE', isNullable: false },
    ],
  },
  sms_logs: {
    tableName: 'myschema.sms_logs',
    description: 'SMS notification attempts and provider outcomes for workers and reporters',
    primaryKey: 'id',
    foreignKeys: [
      { column: 'ticketNo', referencesTable: 'myschema.issues', referencesColumn: 'ticketNo' },
    ],
    indexes: [
      { indexName: 'idx_sms_ticket_timestamp', columns: ['ticketNo', 'timestamp'], isUnique: false },
      { indexName: 'idx_sms_phone', columns: ['toPhone'], isUnique: false },
    ],
    columns: [
      { name: 'id', type: 'TEXT', isNullable: false },
      { name: 'ticketNo', type: 'VARCHAR(30)', isNullable: false },
      { name: 'recipientName', type: 'VARCHAR(100)', isNullable: false },
      { name: 'recipientRole', type: 'VARCHAR(100)', isNullable: false },
      { name: 'toPhone', type: 'VARCHAR(25)', isNullable: false },
      { name: 'message', type: 'TEXT', isNullable: false },
      { name: 'status', type: 'VARCHAR(20) CHECK', isNullable: false },
      { name: 'direction', type: 'VARCHAR(30) CHECK', isNullable: false },
      { name: 'gatewayId', type: 'VARCHAR(100)', isNullable: false },
      { name: 'providerMessageId', type: 'VARCHAR(100)', isNullable: true },
      { name: 'error', type: 'TEXT', isNullable: true },
      { name: 'deliveredAt', type: 'TIMESTAMP WITH TIME ZONE', isNullable: true },
      { name: 'timestamp', type: 'TIMESTAMP WITH TIME ZONE', isNullable: false },
    ],
  },
  notifications: {
    tableName: 'myschema.notifications',
    description: 'In-app notifications targeted to a user or shared with management',
    primaryKey: 'id',
    foreignKeys: [
      { column: 'ticketNo', referencesTable: 'myschema.issues', referencesColumn: 'ticketNo' },
      { column: 'targetUserId', referencesTable: 'myschema.users', referencesColumn: 'id' },
    ],
    indexes: [
      { indexName: 'idx_notifications_target_timestamp', columns: ['targetUserId', 'timestamp'], isUnique: false },
    ],
    columns: [
      { name: 'id', type: 'TEXT', isNullable: false },
      { name: 'ticketNo', type: 'VARCHAR(30)', isNullable: false },
      { name: 'title', type: 'VARCHAR(150)', isNullable: false },
      { name: 'message', type: 'VARCHAR(500)', isNullable: false },
      { name: 'type', type: 'VARCHAR(30) CHECK', isNullable: false },
      { name: 'isRead', type: 'BOOLEAN', isNullable: false },
      { name: 'targetUserId', type: 'TEXT', isNullable: true },
      { name: 'timestamp', type: 'TIMESTAMP WITH TIME ZONE', isNullable: false },
    ],
  },
};
