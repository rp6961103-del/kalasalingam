<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/1a873a88-dc9f-49da-9335-6c81200db760

## Run Locally

**Prerequisites:** Node.js 20+ and PostgreSQL 14+ (local or managed).

1. Install dependencies:
   `npm install`
2. Create a PostgreSQL role and database (replace the sample password with a unique secret):
   ```sql
   CREATE ROLE kare_app LOGIN PASSWORD 'replace-with-a-strong-password';
   CREATE DATABASE kare_campus_db OWNER kare_app;
   ```
3. Copy `.env.example` to `.env`; configure `DATABASE_URL` and generate a random `SESSION_SECRET` of at least 32 characters. Set `GEMINI_API_KEY` if Gemini features are used.
4. Apply the versioned schema migrations:
   `npm run db:migrate`
5. Start the app:
   `npm run dev`

`npm run dev` serves the UI and API on port 3000 by default. The server refuses to start without a reachable PostgreSQL database and the initial migration. The application does not create database objects implicitly at runtime. Grant the configured database role permission to create the `myschema` schema and tables when applying migrations.

The initial migration creates users, workers, issues, votes, audit logs, notifications, SMS logs, durable sessions, and shared rate-limit buckets, with foreign keys, unique constraints, checks, and indexes. It seeds the six worker directory records but does not insert demo users or issues. Data held in the previous process-local Maps cannot be migrated because it was not stored on disk; create new accounts and issues after applying the migration.

For managed PostgreSQL, keep `DATABASE_URL` in the server's secret manager, use the provider's TLS-required connection string, and configure certificate validation. `PG_POOL_MAX` controls the per-instance connection pool size. `PGSSLMODE=require` enables PostgreSQL TLS with certificate verification.

## Authentication and API security

- Student registration requires a unique register number, email, Indian mobile number in `+91XXXXXXXXXX` format, and a password of at least 12 characters. Passwords are hashed with bcrypt.
- Login creates a signed session whose JTI is stored in PostgreSQL. `SESSION_TTL_SECONDS` defaults to 3600 and accepts 300 through 2592000 seconds. Login rotates and revokes an existing session, logout invalidates it in PostgreSQL, and sessions remain valid across server restarts until expiry or revocation. Cookies are `HttpOnly`; production cookies are `Secure`. `COOKIE_SAME_SITE` supports `Strict`, `Lax` (default), or `None` (requires production Secure cookies).
- Login, registration, bootstrap, and OTP requests use PostgreSQL-backed rate-limit buckets shared across app instances. Authenticated mutations have a per-user limit. If PostgreSQL is unavailable, the server fails closed and returns a service-unavailable error rather than disabling persistence or limiting.
- API requests enforce the authenticated user's role; student issue lists and details are scoped to their own reports, and administrative endpoints require the management role. Worker records are not login accounts and there is no worker authentication/status-update workflow yet; workers cannot authenticate as a distinct role.
- Management accounts cannot be self-registered. A one-time `POST /api/auth/bootstrap-management` endpoint provisions the first manager only when `MANAGEMENT_BOOTSTRAP_KEY` is configured (at least 32 characters). The provision check is serialized in PostgreSQL, and the manager account survives restarts. Remove the bootstrap key after provisioning.
- `/api/auth/send-otp` is intentionally disabled until a real verification provider is configured; it never returns or accepts a hardcoded OTP.

## SMS configuration

Set these variables in the server environment to enable Twilio:

```env
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1XXXXXXXXXX
```

Create a Twilio account, obtain the Account SID and Auth Token from its console, and configure an SMS-capable sender. Before sending to Indian numbers, enable the relevant destination permissions and satisfy Twilio's current India-specific sender and regulatory requirements. Keep credentials in the deployment platform's secret manager; do not commit them.

Seeded worker and user records have no phone numbers by default. Populate the applicable `WORKER_*_PHONE` environment variables with verified, authorized contacts before enabling real SMS; student numbers come from student registration.

When Twilio is not configured in development, messages are recorded with status `Simulated` and are not sent or described as delivered. With credentials configured, `Sent` means Twilio accepted the API request; a delivery receipt/webhook is not yet implemented, so the app does not claim that a carrier delivered the message. Provider failures are recorded in the SMS log. A definite Twilio `429` rejection is retried once using `Retry-After`; ambiguous network and server errors are not retried to avoid duplicate texts.

## Management bootstrap

Generate a one-time bootstrap key, set it as `MANAGEMENT_BOOTSTRAP_KEY` in the server environment, then submit the first manager's profile and password:

```powershell
curl.exe -X POST http://localhost:3000/api/auth/bootstrap-management `
  -H "Content-Type: application/json" `
  -d "{\"bootstrapKey\":\"<your-key>\",\"name\":\"Campus Manager\",\"regNo\":\"STAFF-ID\",\"email\":\"manager@example.edu\",\"phone\":\"+919876543210\",\"password\":\"<12-or-more-characters>\"}"
```

The endpoint is rate-limited, compares the key in constant time, hashes the password, and refuses a second manager setup across all instances. Remove the bootstrap key from the environment after setup. Protect the endpoint at the network layer during initial setup.

## Production and deployment status

Build the frontend with `npm run build`, then start the Express server with `NODE_ENV=production npm start`. The server serves `dist/`, exposes a database-aware `GET /health`, uses Helmet security headers, and requires `APP_URL` or `FRONTEND_ORIGIN`, a strong `SESSION_SECRET`, `DATABASE_URL`, and a previously migrated PostgreSQL database. The health endpoint reports ready only while PostgreSQL can be reached.

For a future Render deployment, provision PostgreSQL first and run `npm run db:migrate` as a controlled release step before starting the application. Configure `NODE_ENV=production`, `DATABASE_URL`, `APP_URL`, `SESSION_SECRET`, and any Twilio secrets in the platform's environment settings; set `TRUST_PROXY=true` when running behind a trusted proxy. This is setup guidance only; no external PostgreSQL instance or deployment has been tested.

## Checks

Run `npm run db:migrate`, then `npm run lint`, `npm run test`, and `npm run build`. Set `TEST_DATABASE_URL` to a separate disposable PostgreSQL database before running tests: the integration scenario creates records, starts separate backend processes, and removes its fixtures afterward. Apply migrations to it by temporarily setting `DATABASE_URL` to the same test connection string and running `npm run db:migrate`. It exercises registration/login, issue submission, worker assignment, status changes, persistence and session survival across process restarts, cross-instance rate limiting, logout, and authorization. Without `TEST_DATABASE_URL`, that database integration test is explicitly skipped; SMS provider protocol tests use a mocked HTTP response and do not send real messages.

**Do not deploy until the database-backed integration suite has passed against the intended PostgreSQL version and production configuration.** PostgreSQL persistence, migrations, durable sessions, and shared PostgreSQL rate limits are implemented, but this workspace has not verified a live PostgreSQL connection. Worker authentication, Twilio delivery receipts, durable SMS retries/idempotency, external deployment, and production-scale load/security testing remain outstanding.
