// server/app.ts
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// server/routes.ts
import { Router } from "express";
import crypto2 from "crypto";

// server/crypto.ts
import crypto from "crypto";
var ALGORITHM = "aes-256-gcm";
var IV_LENGTH = 12;
var AUTH_TAG_LENGTH = 16;
var MASTER_KEY_SEED = process.env.ENCRYPTION_MASTER_KEY || process.env.VAULT_SECRET_KEY || "vault-ephemeral-secret-key-32-bytes-secure!";
var MASTER_KEY = crypto.createHash("sha256").update(MASTER_KEY_SEED).digest();
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

// server/vault.ts
var vault = /* @__PURE__ */ new Map();
var cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [id, entry] of vault.entries()) {
    if (entry.expires_at <= now || entry.views_remaining <= 0) {
      vault.delete(id);
    }
  }
}, 3e3);
cleanupTimer.unref();
function getActiveSecretCount() {
  return vault.size;
}

// server/routes.ts
var apiRouter = Router();
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
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    encryption: "AES-256-GCM"
  });
});
apiRouter.post(["/secret", "/secrets"], (req, res) => {
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
      if (vault.has(sanitized)) {
        return res.status(400).json({ error: "This custom slug is already in use." });
      }
      id = sanitized;
    } else {
      id = crypto2.randomBytes(12).toString("hex");
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
      file_size: entry.file_size
    });
  } catch (err) {
    console.error("Error creating secret:", err);
    return res.status(500).json({ error: "Internal server error while encrypting secret." });
  }
});
apiRouter.get(["/secret/:id/meta", "/secrets/:id/meta"], (req, res) => {
  const id = req.params.id;
  const entry = vault.get(id);
  if (!entry) {
    return res.status(404).json({ error: "Secret not found, expired, or already destroyed." });
  }
  if (entry.expires_at <= Date.now() || entry.views_remaining <= 0) {
    vault.delete(id);
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
var handleBurnSecret = (req, res) => {
  const id = req.params.id;
  const entry = vault.get(id);
  if (!entry) {
    return res.status(404).json({ error: "Secret not found, expired, or already destroyed." });
  }
  if (entry.expires_at <= Date.now()) {
    vault.delete(id);
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
  entry.views_remaining -= 1;
  const burned = entry.views_remaining <= 0;
  if (burned) {
    vault.delete(id);
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
          views_remaining: Math.max(0, entry.views_remaining)
        })
      }).catch(() => null);
    }
    return res.status(200).json({
      secret: decrypted,
      views_remaining: Math.max(0, entry.views_remaining),
      burned,
      secret_type: entry.secret_type,
      file_name: entry.file_name,
      file_size: entry.file_size,
      hint: entry.hint
    });
  } catch (decryptErr) {
    console.error("Decryption failed:", decryptErr);
    vault.delete(id);
    return res.status(500).json({ error: "Failed to decrypt secret payload." });
  }
};
apiRouter.post(["/secret/:id/burn", "/secrets/:id/burn"], handleBurnSecret);
apiRouter.get(["/secret/:id", "/secrets/:id"], handleBurnSecret);

// server/app.ts
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
async function createApp() {
  const app = express();
  const isProd = process.env.NODE_ENV === "production";
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));
  const GITHUB_PAGES_ORIGIN = "https://ranjith526419-bot.github.io";
  const allowedOriginsEnv = process.env.CORS_ORIGIN || process.env.ALLOWED_ORIGINS;
  const configuredOrigins = allowedOriginsEnv ? allowedOriginsEnv.split(",").map((s) => s.trim().replace(/\/+$/, "")) : [];
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const cleanOrigin = origin.replace(/\/+$/, "");
        if (cleanOrigin === GITHUB_PAGES_ORIGIN) {
          return callback(null, true);
        }
        if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(cleanOrigin)) {
          return callback(null, true);
        }
        if (configuredOrigins.includes(cleanOrigin) || configuredOrigins.includes("*")) {
          return callback(null, true);
        }
        if (/^https:\/\/ais-(dev|pre)-[a-zA-Z0-9-]+\.asia-southeast1\.run\.app$/.test(cleanOrigin)) {
          return callback(null, true);
        }
        return callback(null, false);
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"]
    })
  );
  app.use("/api", apiRouter);
  if (!isProd) {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa"
      });
      app.use(vite.middlewares);
    } catch (viteErr) {
      console.warn("[Server] Vite is not available as middleware, skipping:", viteErr);
    }
  } else {
    const distPath = path.resolve(__dirname, "..", "dist");
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get("*", (_req, res) => {
        const indexPath = path.resolve(distPath, "index.html");
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          res.status(404).send("Not Found");
        }
      });
    } else {
      console.log("[Server] Production mode: dist directory not found. Running in API-only mode.");
      app.get("/", (_req, res) => {
        res.json({
          status: "operational",
          mode: "api-only",
          message: "Ephemeral Secret Vault API is running.",
          endpoints: {
            health: "/api/health",
            status: "/api/status",
            create_secret: "POST /api/secret",
            secret_metadata: "GET /api/secret/:id/meta",
            burn_secret: "POST /api/secret/:id/burn"
          }
        });
      });
    }
  }
  return app;
}
async function createServer() {
  const args = process.argv.slice(2);
  const portArgIndex = args.indexOf("--port");
  const portFromArg = portArgIndex !== -1 && args[portArgIndex + 1] ? parseInt(args[portArgIndex + 1], 10) : void 0;
  const envPort = process.env.PORT ? parseInt(process.env.PORT, 10) : void 0;
  const PORT = portFromArg || (process.env.APP_PORT ? parseInt(process.env.APP_PORT, 10) : void 0) || (envPort && (process.env.NODE_ENV === "production" || process.env.PORT !== "8080") ? envPort : void 0) || 3e3;
  const app = await createApp();
  return app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Ephemeral Secret Vault] Backend server running on http://0.0.0.0:${PORT}`);
  });
}

// server/index.ts
var isDirectRun = process.argv[1]?.includes("server/index") || process.argv[1]?.includes("backend/index");
if (isDirectRun && process.env.NODE_ENV !== "test") {
  createServer().catch((err) => {
    console.error("[Backend] Failed to start server:", err);
    process.exit(1);
  });
}

// server.ts
if (process.env.NODE_ENV !== "test") {
  createServer().catch((err) => {
    console.error("[Ephemeral Secret Vault] Failed to start server:", err);
    process.exit(1);
  });
}
export {
  ALGORITHM,
  AUTH_TAG_LENGTH,
  IV_LENGTH,
  MASTER_KEY,
  apiRouter,
  createApp,
  createServer,
  decryptSecret,
  encryptSecret,
  getActiveSecretCount,
  getClientBaseUrl,
  handleBurnSecret,
  hashPassword,
  sha256,
  vault,
  verifyPassword
};
