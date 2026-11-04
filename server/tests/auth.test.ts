import 'dotenv/config';
import assert from 'node:assert/strict';
import { ChildProcess, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { SmsService } from '../services/smsService';

if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'test-session-secret-with-at-least-thirty-two-characters';
process.env.TRUST_PROXY = 'true';

async function startBackendProcess(): Promise<{ child: ChildProcess; baseUrl: string }> {
  const child = spawn(process.execPath, ['--import', 'tsx', 'server/tests/persistenceServer.ts'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: 'test',
      SMS_PROVIDER: '',
      TWILIO_ACCOUNT_SID: '',
      TWILIO_AUTH_TOKEN: '',
      TWILIO_PHONE_NUMBER: '',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  let errorOutput = '';
  if (!child.stdout || !child.stderr) throw new Error('Backend test process output was not piped');
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');

  const baseUrl = await new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error(`Backend test process did not become ready: ${errorOutput}`));
    }, 15_000);
    child.stdout.on('data', (chunk: string) => {
      output += chunk;
      const match = output.match(/TEST_SERVER_READY:(\d+)/);
      if (match) {
        clearTimeout(timeout);
        resolve(`http://127.0.0.1:${match[1]}`);
      }
    });
    child.stderr.on('data', (chunk: string) => { errorOutput += chunk; });
    child.once('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.once('exit', (code) => {
      clearTimeout(timeout);
      reject(new Error(`Backend test process exited before readiness (${code}): ${errorOutput}`));
    });
  });
  return { child, baseUrl };
}

async function stopBackendProcess(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return;
  await new Promise<void>((resolve) => {
    child.once('exit', () => resolve());
    child.kill('SIGTERM');
    setTimeout(() => {
      if (child.exitCode === null && child.signalCode === null) child.kill();
    }, 5_000).unref();
  });
}

test('hashes credentials and uses secure session cookie attributes', async () => {
  const { hashPassword, sessionCookie, sessionTtlSeconds } = await import('../services/authService');
  const hash = await hashPassword('test-password-2026');
  assert.notEqual(hash, 'test-password-2026');
  assert.match(hash, /^\$2[aby]\$/);
  const cookie = sessionCookie('signed-value', true, 'Lax');
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /SameSite=Lax/);
  assert.doesNotMatch(cookie, /Domain=/);
  const configuredTtl = process.env.SESSION_TTL_SECONDS;
  process.env.SESSION_TTL_SECONDS = '600';
  try {
    assert.equal(sessionTtlSeconds(), 600);
    assert.match(sessionCookie('signed-value', false, 'Strict'), /Max-Age=600/);
  } finally {
    if (configuredTtl === undefined) delete process.env.SESSION_TTL_SECONDS;
    else process.env.SESSION_TTL_SECONDS = configuredTtl;
  }
});

test('persists campus workflow and sessions across HTTP server restarts', {
  skip: !process.env.TEST_DATABASE_URL ? 'TEST_DATABASE_URL is not configured; PostgreSQL integration test not run' : false,
}, async () => {
  const { pool } = await import('../db/pool');
  const { db } = await import('../db/database');
  const { hashPassword } = await import('../services/authService');
  const migration = await pool.query(
    'SELECT 1 FROM myschema.schema_migrations WHERE version = $1',
    ['001_initial.sql'],
  );
  assert.equal(migration.rowCount, 1, 'run npm run db:migrate before integration tests');
  await db.initializeSeedConfiguration();

  const userMarker = randomUUID().slice(0, 8);
  const registration = `TEST-${userMarker}`;
  const email = `${userMarker}@example.edu`;
  const password = 'student-test-password-2026';
  const managementHash = await hashPassword('management-test-password-2026');
  const management = await db.createUser({
    name: 'Integration Test Manager',
    regNo: `MGR-${userMarker}`,
    email: `manager-${userMarker}@example.edu`,
    phone: '+919876543210',
    role: 'Management',
    department: 'Integration Tests',
    passwordHash: managementHash,
  });
  let backend: Awaited<ReturnType<typeof startBackendProcess>> | undefined;
  let secondBackend: Awaited<ReturnType<typeof startBackendProcess>> | undefined;
  const ownedUserIds = [management.id];
  const ownedIssueIds: string[] = [];

  const postJson = (baseUrl: string, route: string, body: unknown, cookie?: string, clientIp?: string) =>
    fetch(`${baseUrl}${route}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cookie ? { Cookie: cookie } : {}),
        ...(clientIp ? { 'X-Forwarded-For': clientIp } : {}),
      },
      body: JSON.stringify(body),
    });

  try {
    backend = await startBackendProcess();
    let baseUrl = backend.baseUrl;
    const elevatedRegistration = await postJson(baseUrl, '/api/auth/register', {
      name: 'Role Escalation Attempt',
      regNo: `ELEVATE-${userMarker}`,
      email: `elevate-${userMarker}@example.edu`,
      phone: '+919876543210',
      password,
      role: 'Management',
    });
    assert.equal(elevatedRegistration.status, 403);
    const registrationResponse = await postJson(baseUrl, '/api/auth/register', {
      name: 'Integration Student',
      regNo: registration,
      email,
      phone: '+919876543211',
      password,
    });
    assert.equal(registrationResponse.status, 201);
    const registrationPayload = await registrationResponse.clone().json() as { user: Record<string, unknown> };
    assert.equal('passwordHash' in registrationPayload.user, false);
    const student = await db.findUserByIdentifier(registration);
    assert.ok(student);
    ownedUserIds.push(student.id);
    assert.notEqual(student.passwordHash, password);
    const studentCookie = registrationResponse.headers.get('set-cookie')!.split(';')[0];

    const login = await postJson(baseUrl, '/api/auth/login', { identifier: registration, password });
    assert.equal(login.status, 200);
    const refreshedStudentCookie = login.headers.get('set-cookie')!.split(';')[0];
    assert.notEqual(refreshedStudentCookie, studentCookie, 'login rotates the session identifier');
    const invalidatedRegistrationSession = await fetch(`${baseUrl}/api/auth/me`, { headers: { Cookie: studentCookie } });
    assert.equal(invalidatedRegistrationSession.status, 401);

    const managementLogin = await postJson(baseUrl, '/api/auth/login', {
      identifier: management.regNo,
      password: 'management-test-password-2026',
    });
    assert.equal(managementLogin.status, 200);
    const managementCookie = managementLogin.headers.get('set-cookie')!.split(';')[0];

    const workersResponse = await fetch(`${baseUrl}/api/workers`, { headers: { Cookie: managementCookie } });
    assert.equal(workersResponse.status, 200);
    const workers = await workersResponse.json() as Array<{ id: string; category: string }>;
    const worker = workers.find((item) => item.category === 'Electrical');
    assert.ok(worker);

    const created = await postJson(baseUrl, '/api/issues', {
      title: 'Persistent integration-test light issue',
      category: 'Electrical',
      description: 'Verifies database-backed persistence.',
      locationName: 'Integration Test Block',
      lat: 9.5772,
      lng: 77.6791,
    }, refreshedStudentCookie);
    assert.equal(created.status, 201);
    const issueBody = await created.json() as { issue: { id: string; ticketNo: string; reportedById: string }; sms: { status: string } };
    ownedIssueIds.push(issueBody.issue.id);
    assert.equal(issueBody.issue.reportedById, student.id);

    const assignment = await fetch(`${baseUrl}/api/issues/${issueBody.issue.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: managementCookie },
      body: JSON.stringify({ status: 'Assigned', workerId: worker.id, note: 'Assigned by integration test' }),
    });
    assert.equal(assignment.status, 200);
    const assignedIssue = await assignment.json() as { issue: { status: string; assignedWorkerId: string } };
    assert.equal(assignedIssue.issue.status, 'Assigned');
    assert.equal(assignedIssue.issue.assignedWorkerId, worker.id);

    const progress = await fetch(`${baseUrl}/api/issues/${issueBody.issue.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: managementCookie },
      body: JSON.stringify({ status: 'In Progress', note: 'Work started by integration test' }),
    });
    assert.equal(progress.status, 200);

    const forbiddenWorkers = await fetch(`${baseUrl}/api/workers`, { headers: { Cookie: refreshedStudentCookie } });
    assert.equal(forbiddenWorkers.status, 403);
    const unauthorized = await fetch(`${baseUrl}/api/issues/${issueBody.issue.id}`);
    assert.equal(unauthorized.status, 401);
    const secondRegistration = await postJson(baseUrl, '/api/auth/register', {
      name: 'Other Integration Student',
      regNo: `OTHER-${userMarker}`,
      email: `other-${userMarker}@example.edu`,
      phone: '+919876543212',
      password,
    });
    assert.equal(secondRegistration.status, 201);
    const otherStudent = await db.findUserByIdentifier(`OTHER-${userMarker}`);
    assert.ok(otherStudent);
    ownedUserIds.push(otherStudent.id);
    const otherStudentCookie = secondRegistration.headers.get('set-cookie')!.split(';')[0];
    const hiddenIssue = await fetch(`${baseUrl}/api/issues/${issueBody.issue.id}`, { headers: { Cookie: otherStudentCookie } });
    assert.equal(hiddenIssue.status, 404);

    const tokenPayload = JSON.parse(Buffer.from(refreshedStudentCookie.split('.')[1], 'base64url').toString('utf8')) as { jti: string };
    const sessionRow = await pool.query(
      'SELECT "expiresAt" FROM myschema.sessions WHERE id = $1',
      [tokenPayload.jti],
    );
    assert.equal(sessionRow.rowCount, 1);
    assert.ok(new Date(sessionRow.rows[0].expiresAt).getTime() > Date.now());

    await stopBackendProcess(backend.child);
    backend = await startBackendProcess();
    baseUrl = backend.baseUrl;

    const persistedSession = await fetch(`${baseUrl}/api/auth/me`, { headers: { Cookie: refreshedStudentCookie } });
    assert.equal(persistedSession.status, 200, 'session remains valid after server restart');
    const persistedIssues = await fetch(`${baseUrl}/api/issues`, { headers: { Cookie: refreshedStudentCookie } });
    assert.equal(persistedIssues.status, 200);
    const issueList = await persistedIssues.json() as Array<{ id: string }>;
    assert.ok(issueList.some((issue) => issue.id === issueBody.issue.id));

    const persistedDetail = await fetch(`${baseUrl}/api/issues/${issueBody.issue.id}`, { headers: { Cookie: managementCookie } });
    assert.equal(persistedDetail.status, 200);
    const detail = await persistedDetail.json() as { status: string; assignedWorkerId: string; auditTrail: unknown[] };
    assert.equal(detail.status, 'In Progress');
    assert.equal(detail.assignedWorkerId, worker.id);
    assert.equal(detail.auditTrail.length, 3);
    const persistedRecords = await pool.query(
      `SELECT
        (SELECT COUNT(*)::int FROM myschema.issue_votes WHERE "issueId" = $1) AS votes,
        (SELECT COUNT(*)::int FROM myschema.issue_audit_logs WHERE "issueId" = $1) AS audits,
        (SELECT COUNT(*)::int FROM myschema.sms_logs WHERE "ticketNo" = $2) AS sms,
        (SELECT COUNT(*)::int FROM myschema.notifications WHERE "ticketNo" = $2) AS notifications`,
      [issueBody.issue.id, issueBody.issue.ticketNo],
    );
    assert.deepEqual(persistedRecords.rows[0], { votes: 1, audits: 3, sms: 3, notifications: 3 });

    const rateLimitIp = `198.51.100.${(Number.parseInt(userMarker.slice(0, 2), 16) % 200) + 1}`;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await postJson(baseUrl, '/api/auth/login', { identifier: `missing-${userMarker}`, password: 'wrong-password' }, undefined, rateLimitIp);
      assert.equal(response.status, 401);
    }
    secondBackend = await startBackendProcess();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await postJson(secondBackend.baseUrl, '/api/auth/login', { identifier: `missing-${userMarker}`, password: 'wrong-password' }, undefined, rateLimitIp);
      assert.equal(response.status, 401);
    }
    const rateLimited = await postJson(baseUrl, '/api/auth/login', { identifier: `missing-${userMarker}`, password: 'wrong-password' }, undefined, rateLimitIp);
    assert.equal(rateLimited.status, 429);

    const logout = await postJson(baseUrl, '/api/auth/logout', {}, refreshedStudentCookie);
    assert.equal(logout.status, 200);
    const invalidated = await fetch(`${baseUrl}/api/auth/me`, { headers: { Cookie: refreshedStudentCookie } });
    assert.equal(invalidated.status, 401);
  } finally {
    if (backend) await stopBackendProcess(backend.child);
    if (secondBackend) await stopBackendProcess(secondBackend.child);
    for (const issueId of ownedIssueIds) {
      await pool.query('DELETE FROM myschema.issues WHERE id = $1', [issueId]);
    }
    for (const userId of ownedUserIds) {
      await pool.query('DELETE FROM myschema.users WHERE id = $1', [userId]);
    }
    const testRateLimitIp = `198.51.100.${(Number.parseInt(userMarker.slice(0, 2), 16) % 200) + 1}`;
    await pool.query("DELETE FROM myschema.rate_limits WHERE bucket = 'login' AND key = $1", [testRateLimitIp]);
    await pool.end();
  }
});

test('sends through Twilio only with explicit configuration and records provider outcomes', async () => {
  const env = {
    provider: process.env.SMS_PROVIDER,
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    from: process.env.TWILIO_PHONE_NUMBER,
  };
  const originalFetch = globalThis.fetch;
  let requestUrl = '';
  let requestInit: RequestInit | undefined;
  let requestCount = 0;
  process.env.SMS_PROVIDER = 'twilio';
  process.env.TWILIO_ACCOUNT_SID = 'AC00000000000000000000000000000000';
  process.env.TWILIO_AUTH_TOKEN = 'test-auth-token';
  process.env.TWILIO_PHONE_NUMBER = '+15017122661';

  try {
    globalThis.fetch = async (input, init) => {
      requestUrl = String(input);
      requestInit = init;
      return new Response(JSON.stringify({ sid: 'SM-test', status: 'queued' }), { status: 201 });
    };
    const sent = await SmsService.deliver('+919876543210', 'Test message');
    assert.equal(sent.status, 'Sent');
    assert.equal(sent.providerMessageId, 'SM-test');
    assert.match(requestUrl, /Messages\.json$/);
    assert.match(String(requestInit?.headers && new Headers(requestInit.headers).get('Authorization')), /^Basic /);

    globalThis.fetch = async () => {
      requestCount += 1;
      if (requestCount === 1) {
        return new Response(JSON.stringify({ code: 20429, message: 'Rate limited' }), {
          status: 429,
          headers: { 'Retry-After': '0' },
        });
      }
      return new Response(JSON.stringify({ sid: 'SM-retried', status: 'queued' }), { status: 201 });
    };
    const retried = await SmsService.deliver('+919876543210', 'Test message');
    assert.equal(retried.status, 'Sent');
    assert.equal(requestCount, 2);

    globalThis.fetch = async () => new Response(JSON.stringify({ code: 30001, message: 'Temporary provider failure' }), { status: 503 });
    const failed = await SmsService.deliver('+919876543210', 'Test message');
    assert.equal(failed.status, 'Failed');
    assert.match(failed.error || '', /Temporary provider failure/);
    assert.equal((await SmsService.deliver('12345', 'Test message')).status, 'Failed');
  } finally {
    globalThis.fetch = originalFetch;
    if (env.provider === undefined) delete process.env.SMS_PROVIDER;
    else process.env.SMS_PROVIDER = env.provider;
    if (env.accountSid === undefined) delete process.env.TWILIO_ACCOUNT_SID;
    else process.env.TWILIO_ACCOUNT_SID = env.accountSid;
    if (env.authToken === undefined) delete process.env.TWILIO_AUTH_TOKEN;
    else process.env.TWILIO_AUTH_TOKEN = env.authToken;
    if (env.from === undefined) delete process.env.TWILIO_PHONE_NUMBER;
    else process.env.TWILIO_PHONE_NUMBER = env.from;
  }
});
