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

// Safe storage helpers that never throw in restrictive browser sandbox or private browsing
export function safeGetItem(key: string): string | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSetItem(key: string, val: string): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(key, val);
  } catch {
    // storage not available or quota exceeded
  }
}

export function safeRemoveItem(key: string): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.removeItem(key);
  } catch {
    // storage not available
  }
}

const CUSTOM_BACKEND_KEY = 'vault_backend_url';

export function getCustomBackendUrl(): string | null {
  return safeGetItem(CUSTOM_BACKEND_KEY);
}

export function setCustomBackendUrl(url: string | null): void {
  if (url && url.trim()) {
    safeSetItem(CUSTOM_BACKEND_KEY, url.trim().replace(/\/+$/, ''));
  } else {
    safeRemoveItem(CUSTOM_BACKEND_KEY);
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('vault_backend_url_changed', { detail: { url } }));
  }
}

export function isGitHubPages(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.hostname.endsWith('github.io');
}

export function isBackendConfigured(): boolean {
  if (!isGitHubPages()) return true;
  const custom = getCustomBackendUrl();
  if (custom && custom.startsWith('http')) return true;
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) return true;
  if (typeof window !== 'undefined' && (window as unknown as { __VAULT_API_URL__?: string }).__VAULT_API_URL__) return true;
  return false;
}

export function getApiBaseUrl(): string {
  // 1. User manual override configured in browser
  const custom = getCustomBackendUrl();
  if (custom && custom.startsWith('http')) {
    return custom.replace(/\/+$/, '');
  }

  // 2. Global window configuration
  if (typeof window !== 'undefined' && (window as unknown as { __VAULT_API_URL__?: string }).__VAULT_API_URL__) {
    return (window as unknown as { __VAULT_API_URL__: string }).__VAULT_API_URL__;
  }

  // 3. Vite / Next environment variables
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL.replace(/\/+$/, '');
    if (import.meta.env.NEXT_PUBLIC_API_URL) return import.meta.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, '');
  }

  // 4. Same origin (only if NOT hosted on static GitHub Pages)
  if (typeof window !== 'undefined' && window.location?.origin) {
    if (!isGitHubPages()) {
      return window.location.origin;
    }
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

export function getAppSubpath(): string {
  if (typeof window === 'undefined') return '';
  const pathname = window.location.pathname.toLowerCase();
  if (pathname.startsWith('/asgaurd')) {
    return '/asgaurd';
  }
  const viteBase = typeof import.meta !== 'undefined' ? import.meta.env?.BASE_URL : undefined;
  if (viteBase && viteBase !== '/' && viteBase !== './') {
    return viteBase.replace(/\/+$/, '');
  }
  return '';
}

// In-memory demo vault storage for optional sandbox testing
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
  if (typeof window === 'undefined') return false;
  const val = safeGetItem(DEMO_STORAGE_KEY);
  // Default to false so live backend API is used!
  if (val === null) return false;
  return val === 'true';
}

export function setDemoModeActive(active: boolean): void {
  if (typeof window === 'undefined') return;
  safeSetItem(DEMO_STORAGE_KEY, active ? 'true' : 'false');
  try {
    window.dispatchEvent(new CustomEvent('vault_demo_mode_changed', { detail: { active } }));
  } catch {
    // ignore
  }
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
    const subpath = getAppSubpath();
    const view_url = `${origin}${subpath}/view/${id}`;

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

  // Guard for GitHub Pages missing backend configuration
  if (isGitHubPages() && !isBackendConfigured()) {
    throw new VaultApiError(
      'Backend API is not configured on GitHub Pages. Please set your Render backend URL in settings or enable Demo Sandbox.',
      undefined,
      true
    );
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
    throw new VaultApiError('Could not reach backend server. Check your connection or verify backend status.', undefined, true);
  }

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  if (response.status === 201) {
    if (!isJson) {
      throw new VaultApiError('Unexpected non-JSON response from server.', undefined, true);
    }
    const data = (await response.json()) as CreateSecretResponse;
    if (!data.checksum) {
      data.checksum = checksum;
    }
    if (typeof window !== 'undefined') {
      const subpath = getAppSubpath();
      data.view_url = `${window.location.origin}${subpath}/view/${data.id}`;
    }
    return data;
  }

  if (response.status === 400) {
    const errorData = isJson ? await response.json().catch(() => ({ error: 'Invalid secret payload.' })) : { error: 'Invalid secret payload.' };
    throw new VaultApiError(errorData.error || 'Bad request', 400);
  }

  if (response.status === 404) {
    throw new VaultApiError('Secret API endpoint not found on server (404). Check backend URL.', 404, true);
  }

  if (response.status >= 500) {
    throw new VaultApiError('Internal server error while encrypting secret.', response.status);
  }

  const genericData = isJson ? await response.json().catch(() => ({ error: 'Failed to create secret' })) : {};
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

  if (isGitHubPages() && !isBackendConfigured()) {
    throw new VaultApiError(
      'Backend API is not configured on GitHub Pages. Connect your Render backend URL in settings to retrieve secrets.',
      undefined,
      true
    );
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
    throw new VaultApiError('Could not reach the vault server. Check your connection or verify backend status.', undefined, true);
  }

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  if (response.status === 200) {
    if (!isJson) {
      throw new VaultApiError('Unexpected non-JSON response from server.', undefined, true);
    }
    return (await response.json()) as BurnSecretResponse;
  }

  if (response.status === 401 || response.status === 403) {
    const errorData = isJson ? await response.json().catch(() => ({ error: 'Incorrect password.' })) : { error: 'Incorrect password.' };
    throw new VaultApiError(errorData.error || 'Password required or invalid.', response.status, false, true);
  }

  if (response.status === 404) {
    // CRITICAL SECURITY & COMPLIANCE LOGIC:
    // Only a valid JSON 404 response from our Express API means the secret is consumed or expired.
    // An HTML 404 response from GitHub Pages or a misconfigured proxy is an infrastructure routing error, NOT a destroyed secret!
    if (isJson) {
      const errorData = await response.json().catch(() => ({}));
      throw new VaultApiError(errorData.error || 'Secret not found, expired, or already destroyed.', 404, false);
    }
    throw new VaultApiError('API endpoint not found (HTML 404). Your frontend is not connected to a live backend API.', 404, true);
  }

  if (response.status >= 500) {
    throw new VaultApiError('Server error while retrieving secret.', response.status);
  }

  const errorData = isJson ? await response.json().catch(() => ({ error: 'Error burning secret' })) : {};
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

export interface SecretMetadataResult {
  exists: boolean;
  notFound?: boolean;
  networkError?: boolean;
  errorMessage?: string;
  id?: string;
  hint?: string;
  requires_password?: boolean;
  expires_at?: string;
  views_remaining?: number;
  secret_type?: string;
  file_name?: string;
  file_size?: number;
}

// Fetch public secret metadata (hint, expiration, password requirement) without burning
export async function getSecretMetadata(id: string): Promise<SecretMetadataResult | null> {
  if (isDemoModeActive()) {
    const meta = getDemoSecretMetadata(id);
    if (!meta) return { exists: false, notFound: true };
    return {
      exists: true,
      hint: meta.hint,
      requires_password: meta.has_password,
      expires_at: meta.expires_at,
    };
  }

  if (isGitHubPages() && !isBackendConfigured()) {
    return {
      exists: false,
      networkError: true,
      errorMessage: 'Backend API is not configured on GitHub Pages. Connect your Render backend URL to check secrets.',
    };
  }

  try {
    const baseUrl = getApiBaseUrl().replace(/\/+$/, '');
    const res = await fetch(`${baseUrl}/api/secret/${encodeURIComponent(id)}/meta`);
    const contentType = res.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');

    if (res.status === 200 && isJson) {
      const data = await res.json();
      return { exists: true, ...data };
    }

    if (res.status === 404) {
      if (isJson) {
        // Confirmed genuine JSON 404 from backend: secret was consumed or expired
        return { exists: false, notFound: true };
      }
      // HTML 404 from GitHub Pages: backend route missing
      return {
        exists: false,
        networkError: true,
        errorMessage: 'Backend API endpoint not found (HTML 404). Check backend configuration.',
      };
    }

    return { exists: false, networkError: true };
  } catch {
    return { exists: false, networkError: true };
  }
}

export async function pingBackend(url: string): Promise<{ ok: boolean; status?: string; encryption?: string; error?: string }> {
  try {
    const clean = url.trim().replace(/\/+$/, '');
    const res = await fetch(`${clean}/api/health`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) {
      return { ok: false, error: `Server responded with HTTP ${res.status}` };
    }
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return { ok: false, error: 'Expected JSON response from health endpoint' };
    }
    const data = await res.json();
    return { ok: true, status: data.status, encryption: data.encryption };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Network connection failed' };
  }
}
