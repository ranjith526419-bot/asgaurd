export * from './app.js';
export * from './crypto.js';
export * from './vault.js';
export * from './routes.js';
import { createServer } from './app.js';

// Auto-start only when executed directly (e.g. `tsx server/index.ts` or `npm run backend`)
const isDirectRun =
  process.argv[1]?.includes('server/index') ||
  process.argv[1]?.includes('backend/index');

if (isDirectRun && process.env.NODE_ENV !== 'test') {
  createServer().catch((err) => {
    console.error('[Backend] Failed to start server:', err);
    process.exit(1);
  });
}
