export type SecretType = 'text' | 'password' | 'file' | 'url';

export interface CreateSecretRequest {
  secret: string;
  ttl_seconds: number;
  max_views: number;
  password?: string;
  hint?: string;
  secret_type?: SecretType;
  custom_slug?: string;
  notify_email?: string;
  webhook_url?: string;
  burn_after_seconds?: number;
  file_name?: string;
  file_size?: number;
}

export interface CreateSecretResponse {
  id: string;
  view_url: string;
  expires_at: string;
  views_remaining: number;
  checksum?: string;
  hint?: string;
  requires_password?: boolean;
  secret_type?: SecretType;
  file_name?: string;
  file_size?: number;
}

export interface BurnSecretRequest {
  password?: string;
}

export interface BurnSecretResponse {
  secret: string;
  views_remaining: number;
  burned: boolean;
  secret_type?: SecretType;
  file_name?: string;
  file_size?: number;
  hint?: string;
}

export interface ApiError {
  error: string;
  status?: number;
}

export interface ToastMessage {
  id: string;
  message: string;
  type?: 'error' | 'warning' | 'info' | 'success';
  action?: { label: string; onClick: () => void };
}

export interface RecentSecretItem {
  id: string;
  view_url: string;
  created_at: string;
  expires_at: string;
  secret_type?: SecretType;
  hint?: string;
  has_password?: boolean;
}

export type RoutePath =
  | '/'
  | `/view/${string}`
  | '/about'
  | '/faq'
  | '/privacy'
  | '/terms'
  | '/status'
  | '/404';
