import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import {
  encryptSecret,
  decryptSecret,
  sha256,
  hashPassword,
  verifyPassword,
} from './crypto.js';
import { vault, VaultEntry, getActiveSecretCount } from './vault.js';

export const apiRouter = Router();

// Helper to determine base URL for view links
export function getClientBaseUrl(req: Request): string {
  if (process.env.FRONTEND_URL) {
    return process.env.FRONTEND_URL.replace(/\/+$/, '');
  }
  const origin = req.headers.origin;
  if (origin && typeof origin === 'string' && origin !== 'null') {
    return origin.replace(/\/+$/, '');
  }
  const referer = req.headers.referer;
  if (referer && typeof referer === 'string') {
    try {
      const url = new URL(referer);
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts.length > 0 && parts[0] !== 'view' && parts[0] !== 'api') {
        return `${url.origin}/${parts[0]}`;
      }
      return url.origin;
    } catch {
      // ignore
    }
  }
  const host = req.get('host') || 'localhost:3000';
  const proto = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
  return `${proto}://${host}`;
}

// 1. Health & Status
apiRouter.get(['/health', '/status'], (_req: Request, res: Response) => {
  res.json({
    status: 'operational',
    uptime: process.uptime(),
    active_secrets: getActiveSecretCount(),
    timestamp: new Date().toISOString(),
    encryption: 'AES-256-GCM',
  });
});

// 2. Create Secret (POST /api/secret and /api/secrets)
apiRouter.post(['/secret', '/secrets'], (req: Request, res: Response) => {
  try {
    const {
      secret,
      ttl_seconds = 3600,
      max_views = 1,
      password,
      hint,
      secret_type = 'text',
      custom_slug,
      notify_email,
      webhook_url,
      burn_after_seconds,
      file_name,
      file_size,
    } = req.body || {};

    if (!secret || typeof secret !== 'string' || !secret.trim()) {
      return res.status(400).json({ error: 'Secret content cannot be empty.' });
    }

    const validTtl = Math.max(1, Math.min(2592000, Number(ttl_seconds) || 3600)); // 1 second to 30 days
    const validViews = Math.max(1, Math.min(100, Number(max_views) || 1));

    // Generate unique ID
    let id: string;
    if (custom_slug && typeof custom_slug === 'string') {
      const sanitized = custom_slug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '');
      if (sanitized.length < 3) {
        return res.status(400).json({ error: 'Custom slug must be at least 3 alphanumeric characters.' });
      }
      if (vault.has(sanitized)) {
        return res.status(400).json({ error: 'This custom slug is already in use.' });
      }
      id = sanitized;
    } else {
      id = crypto.randomBytes(12).toString('hex'); // 24 chars unique id
    }

    // Checksum for integrity verification
    const checksum = sha256(secret);

    // Password hashing for quick verification
    let password_hash: string | undefined;
    let password_salt: string | undefined;
    if (password && typeof password === 'string' && password.trim()) {
      const { salt, hash } = hashPassword(password);
      password_salt = salt;
      password_hash = hash;
    }

    // Encrypt with AES-256-GCM
    const encrypted = encryptSecret(secret, password || undefined);

    const now = Date.now();
    const expiresAtMs = now + validTtl * 1000;
    const expiresAtIso = new Date(expiresAtMs).toISOString();

    const entry: VaultEntry = {
      id,
      encrypted,
      checksum,
      created_at: now,
      expires_at: expiresAtMs,
      views_remaining: validViews,
      max_views: validViews,
      hint: hint ? String(hint).slice(0, 150) : undefined,
      password_hash,
      password_salt,
      secret_type: String(secret_type),
      file_name,
      file_size,
      burn_after_seconds,
      notify_email,
      webhook_url,
    };

    vault.set(id, entry);

    const clientBase = getClientBaseUrl(req);
    const view_url = `${clientBase}/view/${id}`;

    return res.status(201).json({
      id,
      view_url,
      expires_at: expiresAtIso,
      views_remaining: validViews,
      checksum,
      hint: entry.hint,
      requires_password: !!password_hash,
      secret_type: entry.secret_type,
      file_name: entry.file_name,
      file_size: entry.file_size,
    });
  } catch (err: unknown) {
    console.error('Error creating secret:', err);
    return res.status(500).json({ error: 'Internal server error while encrypting secret.' });
  }
});

// 3. Metadata query without burning (GET /api/secret/:id/meta)
apiRouter.get(['/secret/:id/meta', '/secrets/:id/meta'], (req: Request, res: Response) => {
  const id = req.params.id;
  const entry = vault.get(id);

  if (!entry) {
    return res.status(404).json({ error: 'Secret not found, expired, or already destroyed.' });
  }

  if (entry.expires_at <= Date.now() || entry.views_remaining <= 0) {
    vault.delete(id);
    return res.status(404).json({ error: 'Secret not found, expired, or already destroyed.' });
  }

  return res.json({
    id: entry.id,
    hint: entry.hint,
    requires_password: !!entry.password_hash,
    expires_at: new Date(entry.expires_at).toISOString(),
    views_remaining: entry.views_remaining,
    secret_type: entry.secret_type,
    file_name: entry.file_name,
    file_size: entry.file_size,
  });
});

// 4. Reveal & Atomically Burn Secret
export const handleBurnSecret = (req: Request, res: Response) => {
  const id = req.params.id;
  const entry = vault.get(id);

  if (!entry) {
    return res.status(404).json({ error: 'Secret not found, expired, or already destroyed.' });
  }

  // Check expiration
  if (entry.expires_at <= Date.now()) {
    vault.delete(id);
    return res.status(404).json({ error: 'Secret not found, expired, or already destroyed.' });
  }

  // Check password if protected
  if (entry.password_hash && entry.password_salt) {
    const password = req.body?.password;
    if (!password) {
      return res.status(401).json({
        error: 'Password required to unlock secret.',
        requires_password: true,
      });
    }

    const isValid = verifyPassword(password, entry.password_salt, entry.password_hash);
    if (!isValid) {
      return res.status(403).json({
        error: 'Incorrect password. Please try again.',
        requires_password: true,
      });
    }
  }

  // ATOMIC BURN: Decrement views immediately in synchronous block
  entry.views_remaining -= 1;
  const burned = entry.views_remaining <= 0;

  if (burned) {
    vault.delete(id);
  }

  // Decrypt AES-256-GCM ciphertext
  try {
    const decrypted = decryptSecret(
      entry.encrypted.ciphertext,
      entry.encrypted.iv,
      entry.encrypted.authTag,
      req.body?.password,
      entry.encrypted.salt
    );

    // Async webhook notification (non-blocking)
    if (entry.webhook_url) {
      fetch(entry.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'secret.burned',
          id: entry.id,
          timestamp: new Date().toISOString(),
          burned,
          views_remaining: Math.max(0, entry.views_remaining),
        }),
      }).catch(() => null);
    }

    return res.status(200).json({
      secret: decrypted,
      views_remaining: Math.max(0, entry.views_remaining),
      burned,
      secret_type: entry.secret_type,
      file_name: entry.file_name,
      file_size: entry.file_size,
      hint: entry.hint,
    });
  } catch (decryptErr) {
    console.error('Decryption failed:', decryptErr);
    // Delete corrupted or tampered secret
    vault.delete(id);
    return res.status(500).json({ error: 'Failed to decrypt secret payload.' });
  }
};

apiRouter.post(['/secret/:id/burn', '/secrets/:id/burn'], handleBurnSecret);
apiRouter.get(['/secret/:id', '/secrets/:id'], handleBurnSecret);
