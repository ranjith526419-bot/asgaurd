/**
 * Root Server Entry Point
 *
 * This file delegates to the modular backend located in the `/server` directory:
 * - /server/crypto.ts: AES-256-GCM encryption & decryption engine + scrypt password hashing
 * - /server/vault.ts: In-memory atomic vault store & automatic background TTL eviction
 * - /server/routes.ts: Express API endpoints (/api/secret, /api/health, /api/secret/:id/burn)
 * - /server/app.ts: Express application configuration & CORS
 * - /server/index.ts: Standalone backend runner
 */

export * from './server/index.js';
import { createServer } from './server/index.js';

if (process.env.NODE_ENV !== 'test') {
  createServer().catch((err) => {
    console.error('[Ephemeral Secret Vault] Failed to start server:', err);
    process.exit(1);
  });
}
