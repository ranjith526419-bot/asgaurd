import { EncryptedPayload } from './crypto.js';

export interface VaultEntry {
  id: string;
  encrypted: EncryptedPayload;
  checksum: string;
  created_at: number;
  expires_at: number;
  views_remaining: number;
  max_views: number;
  hint?: string;
  password_hash?: string; // scrypt verification hash
  password_salt?: string;
  secret_type: string;
  file_name?: string;
  file_size?: number;
  burn_after_seconds?: number;
  notify_email?: string;
  webhook_url?: string;
}

export const vault = new Map<string, VaultEntry>();

// Background TTL Cleanup Timer (runs every 3 seconds)
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [id, entry] of vault.entries()) {
    if (entry.expires_at <= now || entry.views_remaining <= 0) {
      vault.delete(id);
    }
  }
}, 3000);
cleanupTimer.unref();

export function getActiveSecretCount(): number {
  return vault.size;
}
