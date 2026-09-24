import { RecentSecretItem } from '../types';

const RECENT_SECRETS_KEY = 'ephemeral_vault_recent_secrets';
const MAX_RECENT_SECRETS = 5;

export function getRecentSecrets(): RecentSecretItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RECENT_SECRETS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveRecentSecret(item: RecentSecretItem): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getRecentSecrets();
    // Exclude duplicates of same ID
    const filtered = current.filter((s) => s.id !== item.id);
    const updated = [item, ...filtered].slice(0, MAX_RECENT_SECRETS);
    localStorage.setItem(RECENT_SECRETS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('vault_recent_secrets_updated'));
  } catch {
    // ignore local storage errors
  }
}

export function removeRecentSecret(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getRecentSecrets();
    const updated = current.filter((s) => s.id !== id);
    localStorage.setItem(RECENT_SECRETS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('vault_recent_secrets_updated'));
  } catch {
    // ignore
  }
}

export function clearAllRecentSecrets(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(RECENT_SECRETS_KEY);
    window.dispatchEvent(new CustomEvent('vault_recent_secrets_updated'));
  } catch {
    // ignore
  }
}
