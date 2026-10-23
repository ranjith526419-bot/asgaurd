# 🔒 Ephemeral Secret Vault — Backend Service

This directory houses the Node.js + Express backend service providing AES-256-GCM zero-knowledge encryption and atomic secret destruction.

---

## 📁 Architecture & File Layout

- **`crypto.ts`**: AES-256-GCM cipher with 96-bit unique IVs, 128-bit authentication tags, scrypt key derivation, and constant-time password verification (`crypto.timingSafeEqual`).
- **`vault.ts`**: In-memory atomic store with non-blocking 3-second background TTL garbage collector.
- **`routes.ts`**: Express router defining all REST endpoints:
  - `GET /api/health` — Service uptime, active secret count, encryption mode.
  - `POST /api/secret` — Creates an encrypted secret, stores in vault, returns view URL.
  - `GET /api/secret/:id/meta` — Safe inspection of metadata (hint, password requirement) without burning.
  - `POST /api/secret/:id/burn` — Decrypts secret and atomically deletes from memory.
- **`app.ts`**: Configures Express, CORS policies (including `*.github.io`), and mounts Vite middleware in dev or static files in production.
- **`index.ts`**: Backend server entry point.

---

## 🚀 Running the Backend Locally

### Method 1: Unified Dev Server (Frontend + Backend on Port 3000)
From the project root:
```bash
npm run dev
```

### Method 2: Standalone Backend Server
From the project root:
```bash
npm run backend
```
or:
```bash
npx tsx server/index.ts
```

The server listens on `http://localhost:3000` (or `PORT` environment variable).

---

## 🌐 Deploying Standalone to Cloud (Render / Railway / Fly.io)

1. Build & Start command:
   - Build: `npm install`
   - Start: `npx tsx server/index.ts`
2. Environment variables:
   - `PORT`: `3000` (or auto-assigned by cloud provider)
   - `CORS_ORIGIN`: Your frontend URL (e.g. `https://yourusername.github.io`)
   - `ENCRYPTION_MASTER_KEY`: Custom 32-character encryption key (optional; auto-generated if omitted)
