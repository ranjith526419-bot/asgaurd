import crypto from 'crypto';

// ==========================================
// AES-256-GCM Cryptographic Engine
// ==========================================
export const ALGORITHM = 'aes-256-gcm';
export const IV_LENGTH = 12; // 96-bit nonce recommended for AES-GCM
export const AUTH_TAG_LENGTH = 16; // 128-bit authentication tag

const MASTER_KEY_SEED =
  process.env.ENCRYPTION_MASTER_KEY ||
  process.env.VAULT_SECRET_KEY ||
  'vault-ephemeral-secret-key-32-bytes-secure!';

export const MASTER_KEY = crypto.createHash('sha256').update(MASTER_KEY_SEED).digest();

export interface EncryptedPayload {
  ciphertext: string; // hex
  iv: string; // hex
  authTag: string; // hex
  salt?: string; // hex (for optional recipient password derivation)
}

/**
 * Encrypts a plaintext secret using AES-256-GCM.
 * If a recipient password is provided, a secondary key is derived with scrypt
 * and combined with the master key.
 */
export function encryptSecret(plaintext: string, password?: string): EncryptedPayload {
  const iv = crypto.randomBytes(IV_LENGTH);
  let key = MASTER_KEY;
  let salt: string | undefined;

  if (password) {
    const saltBuffer = crypto.randomBytes(16);
    salt = saltBuffer.toString('hex');
    const derivedKey = crypto.scryptSync(password, saltBuffer, 32);
    // Combine master key with derived key to form secondary layer
    key = crypto.createHash('sha256').update(Buffer.concat([MASTER_KEY, derivedKey])).digest();
  }

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return {
    ciphertext: encrypted,
    iv: iv.toString('hex'),
    authTag,
    salt,
  };
}

/**
 * Decrypts an AES-256-GCM encrypted payload and verifies authentication tag integrity.
 */
export function decryptSecret(
  ciphertext: string,
  ivHex: string,
  authTagHex: string,
  password?: string,
  saltHex?: string
): string {
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  let key = MASTER_KEY;
  if (password && saltHex) {
    const saltBuffer = Buffer.from(saltHex, 'hex');
    const derivedKey = crypto.scryptSync(password, saltBuffer, 32);
    key = crypto.createHash('sha256').update(Buffer.concat([MASTER_KEY, derivedKey])).digest();
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Computes SHA-256 hexadecimal checksum.
 */
export function sha256(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Derives a salt and hash using scrypt for password verification.
 */
export function hashPassword(password: string): { salt: string; hash: string } {
  const saltBuf = crypto.randomBytes(16);
  const salt = saltBuf.toString('hex');
  const hash = crypto.scryptSync(password, saltBuf, 32).toString('hex');
  return { salt, hash };
}

/**
 * Constant-time password verification to prevent timing attacks.
 */
export function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  try {
    const saltBuf = Buffer.from(salt, 'hex');
    const testHash = crypto.scryptSync(password, saltBuf, 32);
    const targetHash = Buffer.from(expectedHash, 'hex');
    if (testHash.length !== targetHash.length) return false;
    return crypto.timingSafeEqual(testHash, targetHash);
  } catch {
    return false;
  }
}
