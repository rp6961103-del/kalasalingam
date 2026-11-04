CREATE SCHEMA IF NOT EXISTS myschema;

CREATE TABLE IF NOT EXISTS myschema.schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS myschema.users (
  id TEXT PRIMARY KEY,
  "regNo" VARCHAR(30) NOT NULL,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(254) NOT NULL,
  phone VARCHAR(20) NOT NULL DEFAULT '',
  role VARCHAR(20) NOT NULL CHECK (role IN ('Student', 'Management')),
  department VARCHAR(100) NOT NULL DEFAULT 'General Campus',
  designation VARCHAR(100),
  hostel VARCHAR(100),
  "passwordHash" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT idx_users_reg_no UNIQUE ("regNo"),
  CONSTRAINT idx_users_email UNIQUE (email),
  CONSTRAINT users_phone_format CHECK (phone = '' OR phone ~ '^\+91[6-9][0-9]{9}$')
);
CREATE INDEX IF NOT EXISTS idx_users_role ON myschema.users(role);

CREATE TABLE IF NOT EXISTS myschema.workers (
  id TEXT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL DEFAULT '',
  role VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('Electrical', 'Plumbing', 'Cleaning', 'Wi-Fi/Network', 'HVAC', 'Civil/Safety')),
  avatar TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Available' CHECK (status IN ('Available', 'On Task', 'Off Duty')),
  "shiftHours" VARCHAR(50) NOT NULL DEFAULT '08:00 - 18:00',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT workers_phone_format CHECK (phone = '' OR phone ~ '^\+91[6-9][0-9]{9}$')
);
CREATE INDEX IF NOT EXISTS idx_workers_category ON myschema.workers(category);
CREATE INDEX IF NOT EXISTS idx_workers_status ON myschema.workers(status);

CREATE TABLE IF NOT EXISTS myschema.issues (
  id TEXT PRIMARY KEY,
  "ticketNo" VARCHAR(30) NOT NULL,
  title VARCHAR(200) NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('Electrical', 'Plumbing', 'Cleaning', 'Wi-Fi/Network', 'HVAC', 'Civil/Safety')),
  description TEXT NOT NULL,
  "locationName" VARCHAR(250) NOT NULL,
  latitude NUMERIC(9,6) NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude NUMERIC(9,6) NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  status VARCHAR(20) NOT NULL DEFAULT 'Reported' CHECK (status IN ('Reported', 'Assigned', 'In Progress', 'Resolved')),
  severity VARCHAR(20) NOT NULL DEFAULT 'Medium' CHECK (severity IN ('Low', 'Medium', 'High', 'Hazard')),
  "isHazard" BOOLEAN NOT NULL DEFAULT FALSE,
  votes INTEGER NOT NULL DEFAULT 1 CHECK (votes >= 0),
  "priorityScore" NUMERIC(6,2) NOT NULL DEFAULT 10 CHECK ("priorityScore" >= 0),
  "reportedById" TEXT NOT NULL REFERENCES myschema.users(id) ON DELETE RESTRICT,
  "assignedWorkerId" TEXT REFERENCES myschema.workers(id) ON DELETE SET NULL,
  "imageUrl" TEXT,
  "resolutionNote" TEXT,
  "resolvedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT idx_issues_ticket_no UNIQUE ("ticketNo")
);
CREATE INDEX IF NOT EXISTS idx_issues_status ON myschema.issues(status);
CREATE INDEX IF NOT EXISTS idx_issues_category ON myschema.issues(category);
CREATE INDEX IF NOT EXISTS idx_issues_priority_score ON myschema.issues("priorityScore" DESC);
CREATE INDEX IF NOT EXISTS idx_issues_coordinates ON myschema.issues(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_issues_reporter_created ON myschema.issues("reportedById", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_issues_worker ON myschema.issues("assignedWorkerId");

CREATE TABLE IF NOT EXISTS myschema.issue_votes (
  id TEXT PRIMARY KEY,
  "issueId" TEXT NOT NULL REFERENCES myschema.issues(id) ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES myschema.users(id) ON DELETE CASCADE,
  "votedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT idx_vote_issue_user UNIQUE ("issueId", "userId")
);

CREATE TABLE IF NOT EXISTS myschema.issue_audit_logs (
  id TEXT PRIMARY KEY,
  "issueId" TEXT NOT NULL REFERENCES myschema.issues(id) ON DELETE CASCADE,
  "fromStatus" VARCHAR(20),
  "toStatus" VARCHAR(20) NOT NULL CHECK ("toStatus" IN ('Reported', 'Assigned', 'In Progress', 'Resolved')),
  action VARCHAR(255) NOT NULL,
  "actorName" VARCHAR(100) NOT NULL,
  "actorRole" VARCHAR(50) NOT NULL,
  note TEXT,
  "timestamp" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_issue_timestamp ON myschema.issue_audit_logs("issueId", "timestamp");

CREATE TABLE IF NOT EXISTS myschema.notifications (
  id TEXT PRIMARY KEY,
  "ticketNo" VARCHAR(30) NOT NULL REFERENCES myschema.issues("ticketNo") ON DELETE CASCADE,
  title VARCHAR(150) NOT NULL,
  message VARCHAR(500) NOT NULL,
  type VARCHAR(30) NOT NULL CHECK (type IN ('alert', 'assignment', 'status_change', 'sms_dispatched')),
  "isRead" BOOLEAN NOT NULL DEFAULT FALSE,
  "targetUserId" TEXT REFERENCES myschema.users(id) ON DELETE CASCADE,
  "timestamp" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_target_timestamp ON myschema.notifications("targetUserId", "timestamp" DESC);

CREATE TABLE IF NOT EXISTS myschema.sms_logs (
  id TEXT PRIMARY KEY,
  "ticketNo" VARCHAR(30) NOT NULL REFERENCES myschema.issues("ticketNo") ON DELETE CASCADE,
  "recipientName" VARCHAR(100) NOT NULL,
  "recipientRole" VARCHAR(100) NOT NULL,
  "toPhone" VARCHAR(25) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Simulated', 'Sent', 'Delivered', 'Read', 'Failed')),
  direction VARCHAR(30) NOT NULL CHECK (direction IN ('Outbound_Worker', 'Outbound_Student', 'Outbound_Management')),
  "gatewayId" VARCHAR(100) NOT NULL DEFAULT 'unconfigured',
  "providerMessageId" VARCHAR(100),
  error TEXT,
  "deliveredAt" TIMESTAMPTZ,
  "timestamp" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sms_ticket_timestamp ON myschema.sms_logs("ticketNo", "timestamp" DESC);
CREATE INDEX IF NOT EXISTS idx_sms_phone ON myschema.sms_logs("toPhone");

CREATE TABLE IF NOT EXISTS myschema.sessions (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES myschema.users(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "expiresAt" TIMESTAMPTZ NOT NULL,
  CONSTRAINT sessions_expiration_after_creation CHECK ("expiresAt" > "createdAt")
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON myschema.sessions("userId");
CREATE INDEX IF NOT EXISTS idx_sessions_expiration ON myschema.sessions("expiresAt");

CREATE TABLE IF NOT EXISTS myschema.rate_limits (
  bucket VARCHAR(80) NOT NULL,
  key TEXT NOT NULL,
  hits INTEGER NOT NULL CHECK (hits > 0),
  "resetAt" TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (bucket, key)
);
CREATE INDEX IF NOT EXISTS idx_rate_limits_reset ON myschema.rate_limits("resetAt");

CREATE SEQUENCE IF NOT EXISTS myschema.ticket_number_seq START WITH 87;

INSERT INTO myschema.workers (id, name, phone, role, category, avatar, status, "shiftHours")
VALUES
  ('w-1', 'Ramesh Murugan', '', 'Senior Campus Electrician', 'Electrical', 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=150&auto=format&fit=crop&q=80', 'Available', '08:00 - 18:00'),
  ('w-2', 'Murugan Shanmugam', '', 'Lead Plumbing Technician', 'Plumbing', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', 'Available', '08:00 - 18:00'),
  ('w-3', 'Palanisamy K.', '', 'Sanitation & Housekeeping Supervisor', 'Cleaning', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80', 'Available', '06:00 - 16:00'),
  ('w-4', 'Priya Dharshini', '', 'Campus IT & Wi-Fi Network Engineer', 'Wi-Fi/Network', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80', 'Available', '09:00 - 19:00'),
  ('w-5', 'David Anthony', '', 'HVAC & Air-Conditioning Specialist', 'HVAC', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80', 'Available', '08:30 - 18:30'),
  ('w-6', 'Capt. K. Sundaram', '', 'Campus Safety & Civil Infrastructure Lead', 'Civil/Safety', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80', 'Available', '24/7 On-Call')
ON CONFLICT (id) DO NOTHING;
