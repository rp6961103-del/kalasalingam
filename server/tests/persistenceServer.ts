import 'dotenv/config';
import { Server } from 'node:http';
import { createExpressServer } from '../../server';
import { pool } from '../db/pool';

async function run(): Promise<void> {
  const app = await createExpressServer();
  const server: Server = app.listen(0, '127.0.0.1', () => {
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Test server failed to bind');
    console.log(`TEST_SERVER_READY:${address.port}`);
  });

  const shutdown = () => {
    server.close(() => {
      void pool.end().then(() => process.exit(0));
    });
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}

run().catch((error: unknown) => {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : 'startup';
  console.error(`Test server startup failed (${code})`);
  process.exitCode = 1;
});
