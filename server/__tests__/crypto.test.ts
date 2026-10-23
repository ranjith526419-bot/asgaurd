import { describe, it, expect } from 'vitest';
import {
  ALGORITHM,
  IV_LENGTH,
  AUTH_TAG_LENGTH,
  MASTER_KEY,
  encryptSecret,
  decryptSecret,
  sha256,
  hashPassword,
  verifyPassword,
} from '../crypto.js';

describe('AES-256-GCM Backend Cryptographic Engine', () => {
  describe('Cryptographic Standards & Constants Compliance', () => {
    it('should use AES-256-GCM algorithm specification', () => {
      expect(ALGORITHM).toBe('aes-256-gcm');
    });

    it('should configure a 96-bit (12-byte) IV recommended for GCM mode', () => {
      expect(IV_LENGTH).toBe(12);
    });

    it('should configure a 128-bit (16-byte) authentication tag for cryptographic integrity', () => {
      expect(AUTH_TAG_LENGTH).toBe(16);
    });

    it('should use a 256-bit (32-byte) master key buffer', () => {
      expect(Buffer.isBuffer(MASTER_KEY)).toBe(true);
      expect(MASTER_KEY.length).toBe(32);
    });
  });

  describe('Encryption & Decryption Roundtrip Integrity', () => {
    it('should roundtrip standard ASCII secret text correctly', () => {
      const secret = 'Confidential: server-database-password-xyz-987';
      const encrypted = encryptSecret(secret);
      const decrypted = decryptSecret(encrypted.ciphertext, encrypted.iv, encrypted.authTag);
      expect(decrypted).toBe(secret);
    });

    it('should roundtrip JSON-formatted secrets and API configurations', () => {
      const secretObj = {
        apiKey: 'sk-proj-99998888777766665555444433332222',
        database: {
          host: 'db.internal.vault',
          port: 5432,
          ssl: true,
        },
        allowedOrigins: ['https://example.com', 'https://vault.internal'],
      };
      const secretJson = JSON.stringify(secretObj, null, 2);
      const encrypted = encryptSecret(secretJson);
      const decrypted = decryptSecret(encrypted.ciphertext, encrypted.iv, encrypted.authTag);
      expect(decrypted).toBe(secretJson);
      expect(JSON.parse(decrypted)).toEqual(secretObj);
    });

    it('should roundtrip multi-byte UTF-8, international scripts, and symbols', () => {
      const unicodeSecret =
        '🔒 安全秘密 • سرية تامة • Секретный ключ • 秘密のメッセージ • 🔐 Résumé & café • 100% 🛡️';
      const encrypted = encryptSecret(unicodeSecret);
      const decrypted = decryptSecret(encrypted.ciphertext, encrypted.iv, encrypted.authTag);
      expect(decrypted).toBe(unicodeSecret);
    });

    it('should roundtrip complex multi-line text with tabs, newlines, and escape characters', () => {
      const multilineSecret =
        '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC7\n\tSpecial\\tIndent\r\nLine3\0NullChar\n-----END PRIVATE KEY-----';
      const encrypted = encryptSecret(multilineSecret);
      const decrypted = decryptSecret(encrypted.ciphertext, encrypted.iv, encrypted.authTag);
      expect(decrypted).toBe(multilineSecret);
    });

    it('should roundtrip an empty string payload without throwing', () => {
      const emptySecret = '';
      const encrypted = encryptSecret(emptySecret);
      const decrypted = decryptSecret(encrypted.ciphertext, encrypted.iv, encrypted.authTag);
      expect(decrypted).toBe('');
      expect(encrypted.ciphertext).toBe('');
      expect(encrypted.iv).toHaveLength(IV_LENGTH * 2);
      expect(encrypted.authTag).toHaveLength(AUTH_TAG_LENGTH * 2);
    });

    it('should roundtrip large text payloads reliably (64KB payload)', () => {
      const largeChunk = 'A'.repeat(1024);
      const largePayload = Array.from({ length: 64 }, (_, i) => `[Block ${i}]: ${largeChunk}`).join('\n');
      const encrypted = encryptSecret(largePayload);
      const decrypted = decryptSecret(encrypted.ciphertext, encrypted.iv, encrypted.authTag);
      expect(decrypted).toBe(largePayload);
      expect(decrypted.length).toBe(largePayload.length);
    });
  });

  describe('Cryptographic Format & Nonce Randomness', () => {
    it('should return valid hexadecimal strings for IV, AuthTag, and Ciphertext', () => {
      const payload = encryptSecret('Sensitive Vault Item');
      const hexRegex = /^[0-9a-fA-F]+$/;

      expect(payload.iv).toMatch(hexRegex);
      expect(payload.iv).toHaveLength(IV_LENGTH * 2); // 24 hex chars

      expect(payload.authTag).toMatch(hexRegex);
      expect(payload.authTag).toHaveLength(AUTH_TAG_LENGTH * 2); // 32 hex chars

      expect(payload.ciphertext).toMatch(hexRegex);
      expect(payload.salt).toBeUndefined();
    });

    it('should generate unique IVs and ciphertexts for identical plaintext (replay & keystream safety)', () => {
      const plaintext = 'Consistent Plaintext Message';
      const enc1 = encryptSecret(plaintext);
      const enc2 = encryptSecret(plaintext);
      const enc3 = encryptSecret(plaintext);

      // IVs must be cryptographically random and unique
      expect(enc1.iv).not.toBe(enc2.iv);
      expect(enc2.iv).not.toBe(enc3.iv);
      expect(enc1.iv).not.toBe(enc3.iv);

      // Ciphertexts must differ due to unique IVs
      expect(enc1.ciphertext).not.toBe(enc2.ciphertext);
      expect(enc2.ciphertext).not.toBe(enc3.ciphertext);

      // Auth tags must also differ
      expect(enc1.authTag).not.toBe(enc2.authTag);

      // All three must successfully decrypt to the original plaintext
      expect(decryptSecret(enc1.ciphertext, enc1.iv, enc1.authTag)).toBe(plaintext);
      expect(decryptSecret(enc2.ciphertext, enc2.iv, enc2.authTag)).toBe(plaintext);
      expect(decryptSecret(enc3.ciphertext, enc3.iv, enc3.authTag)).toBe(plaintext);
    });

    it('should ensure plaintext never appears in encrypted output structures', () => {
      const sensitiveSecret = 'TopSecretPassword987!_NeverExposeThisInStorage';
      const payload = encryptSecret(sensitiveSecret);

      expect(payload.ciphertext.toLowerCase()).not.toContain(sensitiveSecret.toLowerCase());
      expect(payload.iv.toLowerCase()).not.toContain(sensitiveSecret.toLowerCase());
      expect(payload.authTag.toLowerCase()).not.toContain(sensitiveSecret.toLowerCase());

      const rawCipherBuffer = Buffer.from(payload.ciphertext, 'hex').toString('utf8');
      expect(rawCipherBuffer).not.toContain(sensitiveSecret);
    });
  });

  describe('Tamper Detection & AEAD Authentication Tag Verification', () => {
    it('should fail decryption if ciphertext is tampered with', () => {
      const secret = 'Unmodified message';
      const payload = encryptSecret(secret);

      // Flip first hex char of ciphertext
      const originalFirstChar = payload.ciphertext[0];
      const tamperedChar = originalFirstChar === 'a' ? 'b' : 'a';
      const tamperedCiphertext = tamperedChar + payload.ciphertext.slice(1);

      expect(() => {
        decryptSecret(tamperedCiphertext, payload.iv, payload.authTag);
      }).toThrow();
    });

    it('should fail decryption if IV is modified', () => {
      const secret = 'Protected with IV';
      const payload = encryptSecret(secret);

      // Mutate IV
      const tamperedIv = (payload.iv[0] === '0' ? '1' : '0') + payload.iv.slice(1);

      expect(() => {
        decryptSecret(payload.ciphertext, tamperedIv, payload.authTag);
      }).toThrow();
    });

    it('should fail decryption if authentication tag is modified', () => {
      const secret = 'Protected with Auth Tag';
      const payload = encryptSecret(secret);

      // Mutate Auth Tag
      const tamperedAuthTag = (payload.authTag[0] === 'f' ? '0' : 'f') + payload.authTag.slice(1);

      expect(() => {
        decryptSecret(payload.ciphertext, payload.iv, tamperedAuthTag);
      }).toThrow();
    });

    it('should fail decryption if ciphertext is truncated', () => {
      const secret = 'Long enough secret for truncation test';
      const payload = encryptSecret(secret);
      const truncatedCiphertext = payload.ciphertext.slice(0, -4);

      expect(() => {
        decryptSecret(truncatedCiphertext, payload.iv, payload.authTag);
      }).toThrow();
    });
  });

  describe('Password-Derived Key Protection (Scrypt KDF)', () => {
    it('should encrypt with a password and generate a 16-byte random salt', () => {
      const secret = 'Secret protected with recipient password';
      const password = 'StrongUserPassword#2026!';

      const payload = encryptSecret(secret, password);

      expect(payload.salt).toBeDefined();
      expect(payload.salt).toHaveLength(32); // 16 bytes = 32 hex chars

      const decrypted = decryptSecret(
        payload.ciphertext,
        payload.iv,
        payload.authTag,
        password,
        payload.salt
      );
      expect(decrypted).toBe(secret);
    });

    it('should fail decryption when supplied with an incorrect password', () => {
      const secret = 'Guarded by passphrase';
      const correctPassword = 'CorrectPassphrase123';
      const wrongPassword = 'WrongPassphrase456';

      const payload = encryptSecret(secret, correctPassword);

      expect(() => {
        decryptSecret(
          payload.ciphertext,
          payload.iv,
          payload.authTag,
          wrongPassword,
          payload.salt
        );
      }).toThrow();
    });

    it('should fail decryption if salt is corrupted or tampered with', () => {
      const secret = 'Salt tampering test';
      const password = 'MyPassword';
      const payload = encryptSecret(secret, password);

      const tamperedSalt = (payload.salt![0] === 'a' ? 'b' : 'a') + payload.salt!.slice(1);

      expect(() => {
        decryptSecret(
          payload.ciphertext,
          payload.iv,
          payload.authTag,
          password,
          tamperedSalt
        );
      }).toThrow();
    });

    it('should fail decryption if password is omitted when decrypting password-protected secret', () => {
      const secret = 'Requires password to open';
      const password = 'RequiredKey!';
      const payload = encryptSecret(secret, password);

      // Attempting to decrypt with master key alone without password/salt
      expect(() => {
        decryptSecret(payload.ciphertext, payload.iv, payload.authTag);
      }).toThrow();
    });

    it('should produce different salts and ciphertexts for the same password', () => {
      const secret = 'Password reuse test';
      const password = 'StaticPassword';

      const enc1 = encryptSecret(secret, password);
      const enc2 = encryptSecret(secret, password);

      expect(enc1.salt).not.toBe(enc2.salt);
      expect(enc1.ciphertext).not.toBe(enc2.ciphertext);

      expect(decryptSecret(enc1.ciphertext, enc1.iv, enc1.authTag, password, enc1.salt)).toBe(secret);
      expect(decryptSecret(enc2.ciphertext, enc2.iv, enc2.authTag, password, enc2.salt)).toBe(secret);
    });
  });

  describe('SHA-256 Checksum Utilities', () => {
    it('should produce a deterministic 64-character lowercase hex digest', () => {
      const input = 'vault-integrity-check';
      const hash1 = sha256(input);
      const hash2 = sha256(input);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
      expect(hash1).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should match standard NIST test vectors', () => {
      // Empty string SHA-256 standard vector
      expect(sha256('')).toBe(
        'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
      );

      // Standard test vector
      expect(sha256('The quick brown fox jumps over the lazy dog')).toBe(
        'd7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592'
      );
    });

    it('should demonstrate avalanche effect on single character change', () => {
      const hashA = sha256('SecretMessage1');
      const hashB = sha256('SecretMessage2');

      expect(hashA).not.toBe(hashB);

      // Count differing characters (should differ significantly, >30 chars)
      let differences = 0;
      for (let i = 0; i < 64; i++) {
        if (hashA[i] !== hashB[i]) differences++;
      }
      expect(differences).toBeGreaterThan(30);
    });
  });

  describe('Password Hashing & Constant-Time Verification', () => {
    it('should hash a password and generate valid salt and hash hex strings', () => {
      const password = 'AdminVaultSecretPassword!2026';
      const { salt, hash } = hashPassword(password);

      expect(salt).toHaveLength(32); // 16 bytes
      expect(hash).toHaveLength(64); // 32 bytes
      expect(salt).toMatch(/^[0-9a-f]+$/);
      expect(hash).toMatch(/^[0-9a-f]+$/);
    });

    it('should generate unique salts for consecutive hashes of the same password', () => {
      const password = 'RepeatedPassword';
      const res1 = hashPassword(password);
      const res2 = hashPassword(password);

      expect(res1.salt).not.toBe(res2.salt);
      expect(res1.hash).not.toBe(res2.hash);
    });

    it('should successfully verify the correct password against salt and hash', () => {
      const password = 'SecurePassword_ToVerify';
      const { salt, hash } = hashPassword(password);

      const isValid = verifyPassword(password, salt, hash);
      expect(isValid).toBe(true);
    });

    it('should reject an incorrect password', () => {
      const correctPassword = 'CorrectVaultPassword';
      const wrongPassword = 'IncorrectVaultPassword';
      const { salt, hash } = hashPassword(correctPassword);

      const isValid = verifyPassword(wrongPassword, salt, hash);
      expect(isValid).toBe(false);
    });

    it('should safely return false for corrupted hash or invalid hex without throwing', () => {
      const password = 'MyPassword';
      const { salt } = hashPassword(password);

      expect(verifyPassword(password, salt, 'invalid-non-hex-string')).toBe(false);
      expect(verifyPassword(password, salt, '1234')).toBe(false); // wrong length
      expect(verifyPassword(password, 'corrupted-salt', 'deadbeef')).toBe(false);
    });
  });
});
