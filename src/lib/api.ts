import { CreateSecretRequest, CreateSecretResponse, BurnSecretResponse } from '../types';

export class VaultApiError extends Error {
  status?: number;
  isNetworkError: boolean;
  requiresPassword?: boolean;

  constructor(message: string, status?: number, isNetworkError: boolean = false, requiresPassword: boolean = false) {
    super(message);
    this.name = 'VaultApiError';
    this.status = status;
    this.isNetworkError = isNetworkError;
    this.requiresPassword = requiresPassword;
  }
}

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined' && (window as unknown as { __VAULT_API_URL__?: string }).__VAULT_API_URL__) {
    return (window as unknown as { __VAULT_API_URL__: string }).__VAULT_API_URL__;
  }
  // Vite env
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
    if (import.meta.env.NEXT_PUBLIC_API_URL) return import.meta.env.NEXT_PUBLIC_API_URL;
  }
  return 'http://localhost:3000';
}

// Compute SHA-256 in browser for checksum verification
export async function computeSha256(text: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // simple fallback
    return Math.random().toString(36).substring(2, 14);
  }
}

// In-memory demo vault storage for seamless sandbox testing
interface DemoSecretEntry {
  id: string;
  secret: string;
  expires_at: string;
  views_remaining: number;
  password?: string;
  hint?: string;
  secret_type?: 'text' | 'password' | 'file' | 'url';
  file_name?: string;
  file_size?: number;
  checksum: string;
}
const demoVault = new Map<string, DemoSecretEntry>();

const DEMO_STORAGE_KEY = 'ephemeral_vault_demo_mode';
export function isDemoModeActive(): boolean {
  if (typeof window === 'undefined') return true;
  const val = localStorage.getItem(DEMO_STORAGE_KEY);
  // Default to true in standalone browser sandbox if no backend configured
  if (val === null) return true;
  return val === 'true';
}

export function setDemoModeActive(active: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DEMO_STORAGE_KEY, active ? 'true' : 'false');
  window.dispatchEvent(new CustomEvent('vault_demo_mode_changed', { detail: { active } }));
}

/**
 * 1) POST /api/secret
 * Request:  { secret, ttl_seconds, max_views, password?, hint?, secret_type?, ... }
 * Response 201: { id, view_url, expires_at, views_remaining, checksum? }
 */
export async function createSecret(payload: CreateSecretRequest): Promise<CreateSecretResponse> {
  const checksum = await computeSha256(payload.secret);

  if (isDemoModeActive()) {
    const id = payload.custom_slug
      ? payload.custom_slug.toLowerCase().trim()
      : Math.random().toString(36).substring(2, 9) + Math.random().toString(36).substring(2, 6);

    const expiresDate = new Date(Date.now() + payload.ttl_seconds * 1000);
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const view_url = `${origin}/view/${id}`;

    demoVault.set(id, {
      id,
      secret: payload.secret,
      expires_at: expiresDate.toISOString(),
      views_remaining: payload.max_views,
      password: payload.password || undefined,
      hint: payload.hint || undefined,
      secret_type: payload.secret_type || 'text',
      file_name: payload.file_name,
      file_size: payload.file_size,
      checksum,
    });

    return {
      id,
      view_url,
      expires_at: expiresDate.toISOString(),
      views_remaining: payload.max_views,
      checksum,
      hint: payload.hint,
      requires_password: !!payload.password,
      secret_type: payload.secret_type,
      file_name: payload.file_name,
      file_size: payload.file_size,
    };
  }

  const baseUrl = getApiBaseUrl().replace(/\/+$/, '');
  const url = `${baseUrl}/api/secret`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new VaultApiError('Connection failed. Retry?', undefined, true);
  }

  if (response.status === 201) {
    const data = (await response.json()) as CreateSecretResponse;
    if (!data.checksum) {
      data.checksum = checksum;
    }
    return data;
  }

  if (response.status === 400) {
    const errorData = await response.json().catch(() => ({ error: 'Invalid secret payload.' }));
    throw new VaultApiError(errorData.error || 'Bad request', 400);
  }

  if (response.status >= 500) {
    throw new VaultApiError('Internal server error. Please try again.', response.status);
  }

  const genericData = await response.json().catch(() => ({ error: 'Failed to create secret' }));
  throw new VaultApiError(genericData.error || `HTTP error ${response.status}`, response.status);
}

/**
 * 3) POST /api/secret/:id/burn
 * Request:  { password?: string }
 * Response 200: { secret, views_remaining, burned, secret_type?, file_name?, file_size?, hint? }
 * Response 401 / 403: { error: "Password required or incorrect" }
 * Response 404: { error: "Secret not found, expired, or already destroyed." }
 */
export async function burnSecret(id: string, password?: string): Promise<BurnSecretResponse> {
  if (isDemoModeActive()) {
    const entry = demoVault.get(id);
    if (!entry) {
      throw new VaultApiError('Secret not found, expired, or already destroyed.', 404);
    }

    if (new Date(entry.expires_at).getTime() < Date.now()) {
      demoVault.delete(id);
      throw new VaultApiError('Secret not found, expired, or already destroyed.', 404);
    }

    // Verify password if protected
    if (entry.password) {
      if (!password) {
        throw new VaultApiError('Password required to unlock secret.', 401, false, true);
      }
      if (password !== entry.password) {
        throw new VaultApiError('Incorrect password. Please try again.', 403, false, true);
      }
    }

    const remaining = entry.views_remaining - 1;
    const burned = remaining <= 0;

    if (burned) {
      demoVault.delete(id);
    } else {
      entry.views_remaining = remaining;
    }

    return {
      secret: entry.secret,
      views_remaining: Math.max(0, remaining),
      burned,
      secret_type: entry.secret_type,
      file_name: entry.file_name,
      file_size: entry.file_size,
      hint: entry.hint,
    };
  }

  const baseUrl = getApiBaseUrl().replace(/\/+$/, '');
  const url = `${baseUrl}/api/secret/${encodeURIComponent(id)}/burn`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password }),
    });
  } catch {
    throw new VaultApiError('Connection failed. Retry?', undefined, true);
  }

  if (response.status === 200) {
    return (await response.json()) as BurnSecretResponse;
  }

  if (response.status === 401 || response.status === 403) {
    const errorData = await response.json().catch(() => ({ error: 'Incorrect password.' }));
    throw new VaultApiError(errorData.error || 'Password required or invalid.', response.status, false, true);
  }

  if (response.status === 404) {
    const errorData = await response.json().catch(() => ({
      error: 'Secret not found, expired, or already destroyed.',
    }));
    throw new VaultApiError(errorData.error || 'Secret not found, expired, or already destroyed.', 404);
  }

  if (response.status >= 500) {
    throw new VaultApiError('Server error while retrieving secret.', response.status);
  }

  const errorData = await response.json().catch(() => ({ error: 'Error burning secret' }));
  throw new VaultApiError(errorData.error || `HTTP error ${response.status}`, response.status);
}

// Inspect demo entry hint without revealing secret
export function getDemoSecretMetadata(id: string): { hint?: string; has_password?: boolean; expires_at?: string } | null {
  if (isDemoModeActive()) {
    const entry = demoVault.get(id);
    if (!entry) return null;
    return {
      hint: entry.hint,
      has_password: !!entry.password,
      expires_at: entry.expires_at,
    };
  }
  return null;
}
