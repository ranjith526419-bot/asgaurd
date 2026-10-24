import { Router } from "express";
import crypto from "crypto";
import {
  encryptSecret,
  decryptSecret,
  sha256,
  hashPassword,
  verifyPassword
} from "./crypto.js";
import {
  getActiveSecretCount,
  getVaultEntry,
  saveVaultEntry,
  deleteVaultEntry,
  hasVaultEntry,
  burnVaultEntry,
  getStorageBackendName
} from "./vault.js";
const apiRouter = Router();
function getClientBaseUrl(req) {
  if (process.env.FRONTEND_URL) {
    return process.env.FRONTEND_URL.replace(/\/+$/, "");
  }
  const origin = req.headers.origin;
  if (origin && typeof origin === "string" && origin !== "null") {
    return origin.replace(/\/+$/, "");
  }
  const referer = req.headers.referer;
  if (referer && typeof referer === "string") {
    try {
      const url = new URL(referer);
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts.length > 0 && parts[0] !== "view" && parts[0] !== "api") {
        return `${url.origin}/${parts[0]}`;
      }
      return url.origin;
    } catch {
    }
  }
  const host = req.get("host") || "localhost:3000";
  const proto = req.secure || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
  return `${proto}://${host}`;
}
apiRouter.get(["/health", "/status"], (_req, res) => {
  res.json({
    status: "operational",
    uptime: process.uptime(),
    active_secrets: getActiveSecretCount(),
    storage: getStorageBackendName(),
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    encryption: "AES-256-GCM"
  });
});
apiRouter.post(["/secret", "/secrets"], async (req, res) => {
  try {
    const {
      secret,
      ttl_seconds = 3600,
      max_views = 1,
      password,
      hint,
      secret_type = "text",
      custom_slug,
      notify_email,
      webhook_url,
      burn_after_seconds,
      file_name,
      file_size
    } = req.body || {};
    if (!secret || typeof secret !== "string" || !secret.trim()) {
      return res.status(400).json({ error: "Secret content cannot be empty." });
    }
    const validTtl = Math.max(1, Math.min(2592e3, Number(ttl_seconds) || 3600));
    const validViews = Math.max(1, Math.min(100, Number(max_views) || 1));
    let id;
    if (custom_slug && typeof custom_slug === "string") {
      const sanitized = custom_slug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, "");
      if (sanitized.length < 3) {
        return res.status(400).json({ error: "Custom slug must be at least 3 alphanumeric characters." });
      }
      const slugExists = await hasVaultEntry(sanitized);
      if (slugExists) {
        return res.status(400).json({ error: "This custom slug is already in use." });
      }
      id = sanitized;
    } else {
      id = crypto.randomBytes(12).toString("hex");
    }
    const checksum = sha256(secret);
    let password_hash;
    let password_salt;
    if (password && typeof password === "string" && password.trim()) {
      const { salt, hash } = hashPassword(password);
      password_salt = salt;
      password_hash = hash;
    }
    const encrypted = encryptSecret(secret, password || void 0);
    const now = Date.now();
    const expiresAtMs = now + validTtl * 1e3;
    const expiresAtIso = new Date(expiresAtMs).toISOString();
    const entry = {
      id,
      encrypted,
      checksum,
      created_at: now,
      expires_at: expiresAtMs,
      views_remaining: validViews,
      max_views: validViews,
      hint: hint ? String(hint).slice(0, 150) : void 0,
      password_hash,
      password_salt,
      secret_type: String(secret_type),
      file_name,
      file_size,
      burn_after_seconds,
      notify_email,
      webhook_url
    };
    await saveVaultEntry(entry);
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
      file_size: entry.file_size
    });
  } catch (err) {
    console.error("Error creating secret:", err);
    return res.status(500).json({ error: "Internal server error while encrypting secret." });
  }
});
apiRouter.get(["/secret/:id/meta", "/secrets/:id/meta"], async (req, res) => {
  const id = req.params.id;
  const entry = await getVaultEntry(id);
  if (!entry) {
    return res.status(404).json({ error: "Secret not found, expired, or already destroyed." });
  }
  if (entry.expires_at <= Date.now() || entry.views_remaining <= 0) {
    await deleteVaultEntry(id);
    return res.status(404).json({ error: "Secret not found, expired, or already destroyed." });
  }
  return res.json({
    id: entry.id,
    hint: entry.hint,
    requires_password: !!entry.password_hash,
    expires_at: new Date(entry.expires_at).toISOString(),
    views_remaining: entry.views_remaining,
    secret_type: entry.secret_type,
    file_name: entry.file_name,
    file_size: entry.file_size
  });
});
const handleBurnSecret = async (req, res) => {
  const id = req.params.id;
  const entry = await getVaultEntry(id);
  if (!entry) {
    return res.status(404).json({ error: "Secret not found, expired, or already destroyed." });
  }
  if (entry.expires_at <= Date.now()) {
    await deleteVaultEntry(id);
    return res.status(404).json({ error: "Secret not found, expired, or already destroyed." });
  }
  if (entry.password_hash && entry.password_salt) {
    const password = req.body?.password;
    if (!password) {
      return res.status(401).json({
        error: "Password required to unlock secret.",
        requires_password: true
      });
    }
    const isValid = verifyPassword(password, entry.password_salt, entry.password_hash);
    if (!isValid) {
      return res.status(403).json({
        error: "Incorrect password. Please try again.",
        requires_password: true
      });
    }
  }
  const { entry: burnedEntry, burned } = await burnVaultEntry(id);
  if (!burnedEntry) {
    return res.status(404).json({ error: "Secret not found, expired, or already destroyed." });
  }
  try {
    const decrypted = decryptSecret(
      entry.encrypted.ciphertext,
      entry.encrypted.iv,
      entry.encrypted.authTag,
      req.body?.password,
      entry.encrypted.salt
    );
    if (entry.webhook_url) {
      fetch(entry.webhook_url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "secret.burned",
          id: entry.id,
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          burned,
          views_remaining: Math.max(0, burnedEntry.views_remaining)
        })
      }).catch(() => null);
    }
    return res.status(200).json({
      secret: decrypted,
      views_remaining: Math.max(0, burnedEntry.views_remaining),
      burned,
      secret_type: entry.secret_type,
      file_name: entry.file_name,
      file_size: entry.file_size,
      hint: entry.hint
    });
  } catch (decryptErr) {
    console.error("Decryption failed:", decryptErr);
    await deleteVaultEntry(id);
    return res.status(500).json({ error: "Failed to decrypt secret payload." });
  }
};
apiRouter.post(["/secret/:id/burn", "/secrets/:id/burn"], handleBurnSecret);
apiRouter.get(["/secret/:id", "/secrets/:id"], handleBurnSecret);
export {
  apiRouter,
  getClientBaseUrl,
  handleBurnSecret
};
