import crypto from "crypto";
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const MASTER_KEY_SEED = process.env.ENCRYPTION_MASTER_KEY || process.env.VAULT_SECRET_KEY || "vault-ephemeral-secret-key-32-bytes-secure!";
const MASTER_KEY = crypto.createHash("sha256").update(MASTER_KEY_SEED).digest();
function encryptSecret(plaintext, password) {
  const iv = crypto.randomBytes(IV_LENGTH);
  let key = MASTER_KEY;
  let salt;
  if (password) {
    const saltBuffer = crypto.randomBytes(16);
    salt = saltBuffer.toString("hex");
    const derivedKey = crypto.scryptSync(password, saltBuffer, 32);
    key = crypto.createHash("sha256").update(Buffer.concat([MASTER_KEY, derivedKey])).digest();
  }
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH
  });
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return {
    ciphertext: encrypted,
    iv: iv.toString("hex"),
    authTag,
    salt
  };
}
function decryptSecret(ciphertext, ivHex, authTagHex, password, saltHex) {
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  let key = MASTER_KEY;
  if (password && saltHex) {
    const saltBuffer = Buffer.from(saltHex, "hex");
    const derivedKey = crypto.scryptSync(password, saltBuffer, 32);
    key = crypto.createHash("sha256").update(Buffer.concat([MASTER_KEY, derivedKey])).digest();
  }
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH
  });
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(ciphertext, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
function sha256(data) {
  return crypto.createHash("sha256").update(data).digest("hex");
}
function hashPassword(password) {
  const saltBuf = crypto.randomBytes(16);
  const salt = saltBuf.toString("hex");
  const hash = crypto.scryptSync(password, saltBuf, 32).toString("hex");
  return { salt, hash };
}
function verifyPassword(password, salt, expectedHash) {
  try {
    const saltBuf = Buffer.from(salt, "hex");
    const testHash = crypto.scryptSync(password, saltBuf, 32);
    const targetHash = Buffer.from(expectedHash, "hex");
    if (testHash.length !== targetHash.length) return false;
    return crypto.timingSafeEqual(testHash, targetHash);
  } catch {
    return false;
  }
}
export {
  ALGORITHM,
  AUTH_TAG_LENGTH,
  IV_LENGTH,
  MASTER_KEY,
  decryptSecret,
  encryptSecret,
  hashPassword,
  sha256,
  verifyPassword
};
