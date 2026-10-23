/**
 * Backend Directory Entry Point
 *
 * Re-exports the complete backend engine from the /server directory:
 * - AES-256-GCM encryption & decryption
 * - Express REST API router (/api/secret, /api/secret/:id/burn, /api/health)
 * - Atomic single-use in-memory vault store with TTL eviction
 */

export * from '../server/index.js';
import { createServer } from '../server/index.js';

if (process.env.NODE_ENV !== 'test') {
  createServer().catch((err) => {
    console.error('[Backend] Failed to start server:', err);
    process.exit(1);
  });
}
