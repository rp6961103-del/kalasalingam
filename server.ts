/**
 * Kalasalingam University Campus Facility & Maintenance Operations
 * Full-Stack Express Server (Structured Architecture)
 */

import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import helmet from 'helmet';
import { assertDatabaseConfigured, isDatabaseUnavailable, pool } from './server/db/pool';
import { db } from './server/db/database';
import { asyncHandler } from './server/middleware/asyncHandler';
import { sessionTtlSeconds } from './server/services/authService';

// Structured Route Modules
import authRoutes from './server/routes/authRoutes';
import issueRoutes from './server/routes/issueRoutes';
import workerRoutes from './server/routes/workerRoutes';
import smsRoutes from './server/routes/smsRoutes';
import statsRoutes from './server/routes/statsRoutes';
import schemaRoutes from './server/routes/schemaRoutes';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function createExpressServer() {
  const app = express();
  const configuredOrigin = process.env.FRONTEND_ORIGIN || process.env.APP_URL;
  const allowedOrigin = configuredOrigin ? new URL(configuredOrigin).origin : undefined;

  app.disable('x-powered-by');
  if (process.env.TRUST_PROXY === 'true') app.set('trust proxy', 1);
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
        connectSrc: ["'self'", 'https:', ...(process.env.NODE_ENV === 'production' ? [] : ['ws:'])],
        fontSrc: ["'self'", 'data:', 'https:'],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));
  app.use((req, res, next) => {
    const origin = req.get('origin');
    let sameOrigin = false;
    if (origin) {
      try {
        sameOrigin = new URL(origin).host === req.get('host');
      } catch {
        sameOrigin = false;
      }
    }
    const originAllowed = Boolean(origin && (origin === allowedOrigin || (!allowedOrigin && sameOrigin)));

    if (origin && originAllowed) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
      res.setHeader('Vary', 'Origin');
    } else if (origin && req.path.startsWith('/api')) {
      return res.status(403).json({ error: 'Origin is not allowed' });
    }

    if (req.method === 'OPTIONS') return res.sendStatus(204);
    if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method) && origin && !originAllowed) {
      return res.status(403).json({ error: 'Request origin validation failed' });
    }
    return next();
  });
  app.use(express.json({ limit: '15mb' }));

  app.use((req, _res, next) => {
    if (req.url.startsWith('/api')) {
      console.log(`[API] ${req.method} ${req.path}`);
    }
    next();
  });

  app.get('/health', asyncHandler(async (_req, res) => {
    await pool.query('SELECT 1');
    const migration = await pool.query(
      'SELECT 1 FROM myschema.schema_migrations WHERE version = $1',
      ['001_initial.sql'],
    );
    if (!migration.rowCount) {
      return res.status(503).json({ status: 'unavailable', database: 'not-initialized' });
    }
    return res.json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
  }));

  // Mount Structured API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/issues', issueRoutes);
  app.use('/api/workers', workerRoutes);
  app.use('/api', smsRoutes); // /api/sms, /api/notifications, /api/notifications/read
  app.use('/api/stats', statsRoutes);
  app.use('/api/schema', schemaRoutes); // `myschema` database metadata & table inspection
  app.use('/api', (_req, res) => res.status(404).json({ error: 'API endpoint not found' }));

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const databaseUnavailable = isDatabaseUnavailable(error);
    const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : 'unknown';
    console.error(databaseUnavailable ? `Database unavailable (${code})` : 'Unhandled request error');
    if (res.headersSent) return;
    return res.status(databaseUnavailable ? 503 : 500).json({
      error: databaseUnavailable ? 'Database unavailable or not initialized' : 'Internal server error',
    });
  });

  return app;
}

async function startServer() {
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
    throw new Error('Set SESSION_SECRET to a random value of at least 32 characters');
  }
  if (process.env.NODE_ENV === 'production' && !process.env.FRONTEND_ORIGIN && !process.env.APP_URL) {
    throw new Error('Set FRONTEND_ORIGIN or APP_URL to the deployed frontend origin');
  }
  const sameSite = (process.env.COOKIE_SAME_SITE || 'Lax').toLowerCase();
  if (!['strict', 'lax', 'none'].includes(sameSite) || (sameSite === 'none' && process.env.NODE_ENV !== 'production')) {
    throw new Error('COOKIE_SAME_SITE must be Strict, Lax, or None; None requires production Secure cookies');
  }
  sessionTtlSeconds();
  await assertDatabaseConfigured();
  const migrations = await pool.query('SELECT 1 FROM myschema.schema_migrations WHERE version = $1', ['001_initial.sql']);
  if (!migrations.rowCount) throw new Error('Database migrations are missing; run npm run db:migrate before starting the server');
  await db.initializeSeedConfiguration();

  const app = await createExpressServer();
  const port = Number(process.env.PORT || 3000);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res, next) => {
      if (req.path === '/api' || req.path.startsWith('/api/')) return next();
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'), (error) => {
        if (error) next(error);
      });
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`KARE Campus Facility Management server listening on port ${port}`);
  });
}

// Start server if executed directly
if (process.env.NODE_ENV !== 'test') {
  startServer().catch((error: unknown) => {
    const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
    const detail = error instanceof Error && !isDatabaseUnavailable(error) ? `: ${error.message}` : '';
    console.error(`Server startup failed${code ? ` (${code})` : ''}${detail}`);
    process.exitCode = 1;
  });
}
