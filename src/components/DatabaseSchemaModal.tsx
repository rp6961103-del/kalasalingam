import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  X,
  Database,
  Table,
  Key,
  Link,
  Layers,
  Code,
  CheckCircle2,
  ListFilter,
  Copy,
  Server,
  RefreshCw,
  Search
} from 'lucide-react';

interface DatabaseSchemaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DatabaseSchemaModal: React.FC<DatabaseSchemaModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [schemaData, setSchemaData] = useState<{
    databaseName: string;
    schema: string;
    tables: Array<{
      key: string;
      tableName: string;
      description: string;
      primaryKey: string;
      foreignKeys: Array<{ column: string; referencesTable: string; referencesColumn: string }>;
      indexes: Array<{ indexName: string; columns: string[]; isUnique: boolean }>;
      columns: Array<{ name: string; type: string; isNullable: boolean; description?: string }>;
      rowCount: number;
    }>;
  } | null>(null);

  const [selectedTableKey, setSelectedTableKey] = useState<string>('issues');
  const [activeTab, setActiveTab] = useState<'columns' | 'data' | 'sql' | 'erd'>('columns');
  const [tableRows, setTableRows] = useState<any[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [searchCol, setSearchCol] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    api.getSchema().then((data) => {
      setSchemaData(data);
      if (data.tables.length > 0) {
        setSelectedTableKey(data.tables[0].key);
      }
    });
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || activeTab !== 'data') return;

    setLoadingRows(true);
    api.getTableRows(selectedTableKey)
      .then((rows) => setTableRows(rows))
      .catch(() => setTableRows([]))
      .finally(() => setLoadingRows(false));
  }, [isOpen, selectedTableKey, activeTab]);

  if (!isOpen) return null;

  const currentTable = schemaData?.tables.find((t) => t.key === selectedTableKey) || schemaData?.tables[0];

  // Generate real SQL DDL for myschema
  const generateSqlDdl = () => {
    return `-- ========================================================
-- KALASALINGAM UNIVERSITY (KARE) CAMPUS OPERATIONS
-- SCHEMA: myschema
-- GENERATED: ${new Date().toISOString()}
-- Keep this reference aligned with server/db/migrations/001_initial.sql
-- ========================================================

CREATE SCHEMA IF NOT EXISTS myschema;

-- 1. Users
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
  CHECK (phone = '' OR phone ~ '^\\+91[6-9][0-9]{9}$')
);

-- 2. Workers
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
  CHECK (phone = '' OR phone ~ '^\\+91[6-9][0-9]{9}$')
);

-- 3. Issues
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

-- 4. Votes
CREATE TABLE IF NOT EXISTS myschema.issue_votes (
  id TEXT PRIMARY KEY,
  "issueId" TEXT NOT NULL REFERENCES myschema.issues(id) ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES myschema.users(id) ON DELETE CASCADE,
  "votedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT idx_vote_issue_user UNIQUE ("issueId", "userId")
);

-- 5. Audit logs
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

-- 6. Notifications
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

-- 7. SMS notification logs
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

-- 8. Sessions and distributed rate-limit counters
CREATE TABLE IF NOT EXISTS myschema.sessions (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES myschema.users(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "expiresAt" TIMESTAMPTZ NOT NULL,
  CHECK ("expiresAt" > "createdAt")
);
CREATE TABLE IF NOT EXISTS myschema.rate_limits (
  bucket VARCHAR(80) NOT NULL,
  key TEXT NOT NULL,
  hits INTEGER NOT NULL CHECK (hits > 0),
  "resetAt" TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (bucket, key)
);

CREATE INDEX IF NOT EXISTS idx_users_role ON myschema.users(role);
CREATE INDEX IF NOT EXISTS idx_workers_category ON myschema.workers(category);
CREATE INDEX IF NOT EXISTS idx_workers_status ON myschema.workers(status);
CREATE INDEX IF NOT EXISTS idx_issues_status ON myschema.issues(status);
CREATE INDEX IF NOT EXISTS idx_issues_category ON myschema.issues(category);
CREATE INDEX IF NOT EXISTS idx_issues_priority_score ON myschema.issues("priorityScore" DESC);
CREATE INDEX IF NOT EXISTS idx_issues_coordinates ON myschema.issues(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_issues_reporter_created ON myschema.issues("reportedById", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_issues_worker ON myschema.issues("assignedWorkerId");
CREATE INDEX IF NOT EXISTS idx_audit_issue_timestamp ON myschema.issue_audit_logs("issueId", "timestamp");
CREATE INDEX IF NOT EXISTS idx_notifications_target_timestamp ON myschema.notifications("targetUserId", "timestamp" DESC);
CREATE INDEX IF NOT EXISTS idx_sms_ticket_timestamp ON myschema.sms_logs("ticketNo", "timestamp" DESC);
CREATE INDEX IF NOT EXISTS idx_sms_phone ON myschema.sms_logs("toPhone");
CREATE INDEX IF NOT EXISTS idx_sessions_user ON myschema.sessions("userId");
CREATE INDEX IF NOT EXISTS idx_sessions_expiration ON myschema.sessions("expiresAt");
CREATE INDEX IF NOT EXISTS idx_rate_limits_reset ON myschema.rate_limits("resetAt");

CREATE SEQUENCE IF NOT EXISTS myschema.ticket_number_seq START WITH 87;

-- Run npm run db:migrate to install the worker directory seed records safely.
`;
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(generateSqlDdl());
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const filteredColumns = currentTable?.columns.filter(
    (c) =>
      c.name.toLowerCase().includes(searchCol.toLowerCase()) ||
      c.type.toLowerCase().includes(searchCol.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-md">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg">
                  Database Engine: <span className="text-blue-400 font-mono">kare_campus_db</span>
                </h3>
                <span className="text-xs bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded font-mono font-bold">
                  SCHEMA: myschema
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Strong relational data architecture, foreign keys, table indexes, and constraints
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* View Switcher Bar */}
        <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('columns')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'columns'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Table Columns & Constraints</span>
            </button>

            <button
              onClick={() => setActiveTab('data')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'data'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>Live Records ({currentTable?.rowCount || 0})</span>
            </button>

            <button
              onClick={() => setActiveTab('erd')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'erd'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Relational ERD</span>
            </button>

            <button
              onClick={() => setActiveTab('sql')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'sql'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>SQL DDL Schema</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-500 font-mono">
            ENGINE: In-Memory Relational DAO • STRICT VALIDATION: ZOD
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {/* Left Table Selector Sidebar */}
          <div className="w-full md:w-64 border-r border-slate-200 bg-slate-50 p-3 space-y-1.5 overflow-y-auto flex-shrink-0">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block px-2 mb-1">
              Tables in myschema
            </span>

            {schemaData?.tables.map((t) => (
              <button
                key={t.key}
                onClick={() => setSelectedTableKey(t.key)}
                className={`w-full text-left p-2.5 rounded-lg border transition text-xs cursor-pointer flex items-center justify-between ${
                  selectedTableKey === t.key
                    ? 'bg-blue-50 border-blue-400 text-blue-900 font-bold shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Table className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                  <span className="truncate font-mono">{t.tableName}</span>
                </div>
                <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono font-bold">
                  {t.rowCount} rows
                </span>
              </button>
            ))}
          </div>

          {/* Right Main Panel */}
          <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4">
            {/* VIEW 1: COLUMNS & CONSTRAINTS */}
            {activeTab === 'columns' && currentTable && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 font-mono">
                      {currentTable.tableName}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">{currentTable.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-amber-50 text-amber-800 border border-amber-300 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                      <Key className="w-3 h-3 text-amber-600" /> PK: {currentTable.primaryKey}
                    </span>
                    <span className="text-xs bg-blue-50 text-blue-800 border border-blue-300 px-2 py-0.5 rounded font-semibold font-mono">
                      {currentTable.rowCount} records
                    </span>
                  </div>
                </div>

                {/* Search column */}
                <div className="relative max-w-xs">
                  <input
                    type="text"
                    value={searchCol}
                    onChange={(e) => setSearchCol(e.target.value)}
                    placeholder="Search column..."
                    className="w-full pl-7 pr-3 py-1.5 text-xs border border-slate-300 rounded bg-slate-50 focus:bg-white"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
                </div>

                {/* Columns Table */}
                <div className="border border-slate-200 rounded-lg overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold">
                        <th className="p-2.5">Column Name</th>
                        <th className="p-2.5">Data Type</th>
                        <th className="p-2.5 text-center">Nullable</th>
                        <th className="p-2.5">Key / Relationship</th>
                        <th className="p-2.5">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-sans">
                      {filteredColumns?.map((col) => {
                        const isPk = col.name === currentTable.primaryKey;
                        const fk = currentTable.foreignKeys.find((f) => f.column === col.name);

                        return (
                          <tr key={col.name} className="hover:bg-slate-50">
                            <td className="p-2.5 font-mono font-bold text-slate-900">
                              {col.name}
                            </td>
                            <td className="p-2.5 font-mono text-blue-700 text-[11px]">
                              {col.type}
                            </td>
                            <td className="p-2.5 text-center">
                              {col.isNullable ? (
                                <span className="text-slate-400 text-[10px]">YES</span>
                              ) : (
                                <span className="text-red-600 font-bold text-[10px]">NO (NOT NULL)</span>
                              )}
                            </td>
                            <td className="p-2.5">
                              {isPk && (
                                <span className="inline-flex items-center gap-1 text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded">
                                  <Key className="w-3 h-3 text-amber-600" /> PRIMARY KEY
                                </span>
                              )}
                              {fk && (
                                <span className="inline-flex items-center gap-1 text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded font-mono">
                                  <Link className="w-3 h-3 text-blue-600" /> FK → {fk.referencesTable}.{fk.referencesColumn}
                                </span>
                              )}
                              {!isPk && !fk && <span className="text-slate-400 text-[11px]">-</span>}
                            </td>
                            <td className="p-2.5 text-slate-500 text-[11px]">
                              {col.description || '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Table Indexes */}
                {currentTable.indexes.length > 0 && (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs">
                    <span className="font-bold text-slate-700 block mb-1">Defined Indexes:</span>
                    <div className="flex flex-wrap gap-2">
                      {currentTable.indexes.map((idx) => (
                        <div
                          key={idx.indexName}
                          className="px-2.5 py-1 bg-white border border-slate-300 rounded font-mono text-[11px] flex items-center gap-1.5"
                        >
                          <span className="font-bold text-indigo-700">{idx.indexName}</span>
                          <span className="text-slate-500">({idx.columns.join(', ')})</span>
                          {idx.isUnique && (
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1 rounded font-bold">
                              UNIQUE
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* VIEW 2: LIVE RECORDS DATA */}
            {activeTab === 'data' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">
                    Live Records in <span className="font-mono text-blue-600">{currentTable?.tableName}</span>
                  </span>
                  <span className="text-slate-500 text-[11px]">
                    Showing {tableRows.length} rows directly from database memory
                  </span>
                </div>

                {loadingRows ? (
                  <div className="py-12 text-center text-slate-400 text-xs">Loading records...</div>
                ) : tableRows.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs border border-dashed rounded">
                    No records found in this table.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-[460px]">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 font-semibold text-slate-700 z-10">
                        <tr>
                          {Object.keys(tableRows[0] || {}).map((key) => (
                            <th key={key} className="p-2 whitespace-nowrap font-mono text-[11px]">
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                        {tableRows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            {Object.values(row).map((val: any, colIdx) => (
                              <td key={colIdx} className="p-2 whitespace-nowrap truncate max-w-xs text-slate-700">
                                {typeof val === 'object' ? JSON.stringify(val) : String(val ?? '')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* VIEW 3: RELATIONAL ERD */}
            {activeTab === 'erd' && (
              <div className="space-y-4 text-xs">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <h4 className="font-bold text-slate-900 text-sm mb-1">Entity-Relationship Overview (myschema)</h4>
                  <p className="text-slate-600 leading-relaxed">
                    The database enforces relational constraints connecting reporters, facility issues, assigned workers, community upvotes, and immutable audit logs.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-white border-2 border-blue-400 rounded-lg shadow-xs space-y-1.5">
                    <div className="font-bold font-mono text-blue-700 flex items-center justify-between">
                      <span>myschema.users</span>
                      <span className="text-[10px] bg-blue-100 px-1.5 py-0.2 rounded font-sans">PARENT</span>
                    </div>
                    <div className="font-mono text-[11px] text-slate-600 space-y-0.5">
                      <div>🔑 id (PK)</div>
                      <div>• regNo (UNIQUE)</div>
                      <div>• name, email, phone, role</div>
                    </div>
                  </div>

                  <div className="p-3 bg-white border-2 border-emerald-400 rounded-lg shadow-xs space-y-1.5">
                    <div className="font-bold font-mono text-emerald-700 flex items-center justify-between">
                      <span>myschema.workers</span>
                      <span className="text-[10px] bg-emerald-100 px-1.5 py-0.2 rounded font-sans">PARENT</span>
                    </div>
                    <div className="font-mono text-[11px] text-slate-600 space-y-0.5">
                      <div>🔑 id (PK)</div>
                      <div>• name, phone, category</div>
                      <div>• status, activeIssues</div>
                    </div>
                  </div>

                  <div className="p-3 bg-white border-2 border-red-400 rounded-lg shadow-xs space-y-1.5 sm:col-span-2">
                    <div className="font-bold font-mono text-red-700 flex items-center justify-between">
                      <span>myschema.issues</span>
                      <span className="text-[10px] bg-red-100 px-1.5 py-0.2 rounded font-sans">CENTRAL TRANSACTION TABLE</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px] text-slate-600">
                      <div>
                        <div>🔑 id (PK)</div>
                        <div>• ticketNo (UNIQUE)</div>
                        <div>• title, category, description</div>
                        <div>• latitude, longitude</div>
                      </div>
                      <div>
                        <div className="text-blue-700 font-bold">🔗 reportedById (FK → users.id)</div>
                        <div className="text-emerald-700 font-bold">🔗 assignedWorkerId (FK → workers.id)</div>
                        <div>• priorityScore, severity, isHazard</div>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-white border border-slate-300 rounded-lg space-y-1">
                    <div className="font-bold font-mono text-purple-700">myschema.issue_votes</div>
                    <div className="font-mono text-[11px] text-slate-600">
                      <div>🔑 id (PK)</div>
                      <div>🔗 issueId (FK → issues.id)</div>
                      <div>• userId (FK → users.id)</div>
                    </div>
                  </div>

                  <div className="p-3 bg-white border border-slate-300 rounded-lg space-y-1">
                    <div className="font-bold font-mono text-slate-800">myschema.issue_audit_logs</div>
                    <div className="font-mono text-[11px] text-slate-600">
                      <div>🔑 id (PK)</div>
                      <div>🔗 issueId (FK → issues.id)</div>
                      <div>• fromStatus → toStatus, action, note</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 4: SQL DDL */}
            {activeTab === 'sql' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">
                    PostgreSQL / Cloud SQL Compatible DDL Script:
                  </span>
                  <button
                    onClick={handleCopySql}
                    className="px-3 py-1 bg-slate-900 text-white hover:bg-slate-800 rounded font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    {copiedSql ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSql ? 'Copied SQL!' : 'Copy DDL Script'}</span>
                  </button>
                </div>

                <pre className="p-4 bg-slate-950 text-slate-200 rounded-lg font-mono text-[11px] overflow-x-auto max-h-[460px] leading-relaxed border border-slate-800">
                  {generateSqlDdl()}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>KARE Central Campus Database Architecture</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded font-semibold cursor-pointer transition"
          >
            Close Schema Viewer
          </button>
        </div>
      </div>
    </div>
  );
};
