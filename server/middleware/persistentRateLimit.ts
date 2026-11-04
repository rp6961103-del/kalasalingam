import { NextFunction, Request, Response, RequestHandler } from 'express';
import { databaseErrorCode, pool } from '../db/pool';
import { AuthenticatedRequest } from './authMiddleware';

type KeyGenerator = (req: Request) => string;

export function persistentRateLimit(
  bucket: string,
  limit: number,
  windowMs: number,
  keyGenerator: KeyGenerator = (req) => req.ip || 'unknown',
): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = keyGenerator(req);
      const result = await pool.query(
        `INSERT INTO myschema.rate_limits AS existing (bucket, key, hits, "resetAt")
         VALUES ($1, $2, 1, NOW() + ($3::double precision * INTERVAL '1 millisecond'))
         ON CONFLICT (bucket, key) DO UPDATE SET
           hits = CASE WHEN existing."resetAt" <= NOW() THEN 1 ELSE existing.hits + 1 END,
           "resetAt" = CASE WHEN existing."resetAt" <= NOW()
             THEN NOW() + ($3::double precision * INTERVAL '1 millisecond')
             ELSE existing."resetAt" END
         RETURNING hits, "resetAt"`,
        [bucket, key, windowMs],
      );
      const hits = Number(result.rows[0].hits);
      const resetAt = new Date(result.rows[0].resetAt as Date);
      res.setHeader('RateLimit-Limit', String(limit));
      res.setHeader('RateLimit-Remaining', String(Math.max(0, limit - hits)));
      res.setHeader('RateLimit-Reset', String(Math.max(0, Math.ceil((resetAt.getTime() - Date.now()) / 1000))));
      if (hits > limit) {
        res.setHeader('Retry-After', String(Math.max(1, Math.ceil((resetAt.getTime() - Date.now()) / 1000))));
        return res.status(429).json({ error: 'Too many requests. Try again later.' });
      }

      if (Math.random() < 0.01) {
        void pool.query(
          `WITH expired AS (
            SELECT bucket, key FROM myschema.rate_limits
            WHERE "resetAt" < NOW()
            ORDER BY "resetAt" LIMIT 500
          )
          DELETE FROM myschema.rate_limits limits USING expired
          WHERE limits.bucket = expired.bucket AND limits.key = expired.key`,
        ).catch((error: unknown) => {
          console.error(`Unable to clean expired rate-limit rows (${databaseErrorCode(error) || 'database error'})`);
        });
      }
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

export const authenticatedMutationRateLimit = persistentRateLimit(
  'authenticated-mutations',
  120,
  60_000,
  (req) => (req as AuthenticatedRequest).authUser?.id || req.ip || 'unknown',
);

export const authenticatedApiRateLimit = persistentRateLimit(
  'authenticated-api',
  300,
  60_000,
  (req) => (req as AuthenticatedRequest).authUser?.id || req.ip || 'unknown',
);
