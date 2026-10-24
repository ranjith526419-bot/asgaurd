import fs from 'fs';
import path from 'path';
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

// In-Memory map (Tier 3 & fast cache)
export const vault = new Map<string, VaultEntry>();

// File storage directory in /tmp (Tier 2 - shared across serverless invocations on same host)
const TMP_DIR = path.resolve('/tmp', 'ephemeral-vault');
let isFileStoreAvailable = false;

try {
  if (!fs.existsSync(TMP_DIR)) {
    fs.mkdirSync(TMP_DIR, { recursive: true });
  }
  isFileStoreAvailable = true;
} catch {
  isFileStoreAvailable = false;
}

// Upstash / Vercel KV REST configuration (Tier 1 - persistent across all serverless regions)
function getRedisConfig(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    return { url: url.replace(/\/+$/, ''), token };
  }
  return null;
}

export function getStorageBackendName(): string {
  if (getRedisConfig()) return 'Vercel KV / Upstash Redis (Serverless Persistent)';
  if (isFileStoreAvailable) return 'Temporary Disk Storage (/tmp/ephemeral-vault)';
  return 'In-Memory Vault (Single Process)';
}

// Helper for Upstash / Vercel KV REST API command execution
async function executeRedisCommand(command: string[]): Promise<any> {
  const config = getRedisConfig();
  if (!config) return null;

  try {
    const res = await fetch(`${config.url}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(command),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.result;
  } catch (err) {
    console.warn('[Vault Storage] Redis REST operation error:', err);
    return null;
  }
}

// File storage helpers
function readEntryFromFile(id: string): VaultEntry | null {
  if (!isFileStoreAvailable) return null;
  const filePath = path.join(TMP_DIR, `${id}.json`);
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const entry = JSON.parse(content) as VaultEntry;
      if (entry.expires_at <= Date.now() || entry.views_remaining <= 0) {
        fs.unlinkSync(filePath);
        return null;
      }
      return entry;
    }
  } catch {
    // ignore
  }
  return null;
}

function writeEntryToFile(entry: VaultEntry): void {
  if (!isFileStoreAvailable) return;
  const filePath = path.join(TMP_DIR, `${entry.id}.json`);
  try {
    fs.writeFileSync(filePath, JSON.stringify(entry), 'utf-8');
  } catch {
    // ignore
  }
}

function deleteEntryFromFile(id: string): void {
  if (!isFileStoreAvailable) return;
  const filePath = path.join(TMP_DIR, `${id}.json`);
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {
    // ignore
  }
}

/**
 * Save an encrypted secret to the vault.
 * Automatically distributes across Redis, file store, and memory.
 */
export async function saveVaultEntry(entry: VaultEntry): Promise<void> {
  // 1. In-memory
  vault.set(entry.id, entry);

  // 2. File store
  writeEntryToFile(entry);

  // 3. Upstash / Vercel KV (if configured)
  const redis = getRedisConfig();
  if (redis) {
    const ttlSeconds = Math.max(1, Math.ceil((entry.expires_at - Date.now()) / 1000));
    const serialized = JSON.stringify(entry);
    await executeRedisCommand(['SET', `vault:${entry.id}`, serialized, 'EX', String(ttlSeconds)]);
  }
}

/**
 * Retrieve an encrypted secret from the vault.
 * Checks in-memory first, then file store, then Redis.
 */
export async function getVaultEntry(id: string): Promise<VaultEntry | null> {
  const now = Date.now();

  // 1. Check in-memory
  let entry: VaultEntry | null | undefined = vault.get(id);
  if (entry) {
    if (entry.expires_at <= now || entry.views_remaining <= 0) {
      await deleteVaultEntry(id);
      return null;
    }
    return entry;
  }

  // 2. Check file store
  entry = readEntryFromFile(id);
  if (entry) {
    vault.set(id, entry);
    return entry;
  }

  // 3. Check Redis
  const redis = getRedisConfig();
  if (redis) {
    const result = await executeRedisCommand(['GET', `vault:${id}`]);
    if (result && typeof result === 'string') {
      try {
        const parsed = JSON.parse(result) as VaultEntry;
        if (parsed.expires_at > now && parsed.views_remaining > 0) {
          vault.set(id, parsed);
          writeEntryToFile(parsed);
          return parsed;
        } else {
          await deleteVaultEntry(id);
          return null;
        }
      } catch {
        // parse error
      }
    }
  }

  return null;
}

/**
 * Check if a secret exists without retrieving full payload.
 */
export async function hasVaultEntry(id: string): Promise<boolean> {
  const entry = await getVaultEntry(id);
  return entry !== null;
}

/**
 * Delete a secret from all storage tiers.
 */
export async function deleteVaultEntry(id: string): Promise<boolean> {
  // In-memory
  vault.delete(id);

  // File store
  deleteEntryFromFile(id);

  // Redis
  const redis = getRedisConfig();
  if (redis) {
    await executeRedisCommand(['DEL', `vault:${id}`]);
  }

  return true;
}

/**
 * Decrement remaining views or burn permanently.
 */
export async function burnVaultEntry(
  id: string
): Promise<{ entry: VaultEntry | null; burned: boolean }> {
  const entry = await getVaultEntry(id);
  if (!entry) {
    return { entry: null, burned: true };
  }

  entry.views_remaining -= 1;
  const burned = entry.views_remaining <= 0;

  if (burned) {
    await deleteVaultEntry(id);
  } else {
    await saveVaultEntry(entry);
  }

  return { entry, burned };
}

// Background cleanup timer for in-memory and file store
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [id, entry] of vault.entries()) {
    if (entry.expires_at <= now || entry.views_remaining <= 0) {
      deleteVaultEntry(id).catch(() => null);
    }
  }
  if (isFileStoreAvailable) {
    try {
      const files = fs.readdirSync(TMP_DIR);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(TMP_DIR, file);
          try {
            const raw = fs.readFileSync(filePath, 'utf-8');
            const parsed = JSON.parse(raw);
            if (parsed.expires_at <= now || parsed.views_remaining <= 0) {
              fs.unlinkSync(filePath);
            }
          } catch {
            // ignore
          }
        }
      }
    } catch {
      // ignore
    }
  }
}, 3000);
cleanupTimer.unref();

export function getActiveSecretCount(): number {
  return vault.size;
}
