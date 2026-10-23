# Ephemeral Secret Vault (Full-Stack React + Node.js Express)

A modern, zero-knowledge, self-destructing secret sharing tool (inspired by OneTimeSecret, PrivateBin, and Yopass). Users create encrypted secrets, configure expiration and view policies, and distribute single-use links that burn forever upon redemption.

---

## 📂 Project Structure & Where the Backend is Located

When downloading or cloning this repository, the project is structured into dedicated frontend and backend directories:

```text
├── server/                         # 🔒 Dedicated Node.js + Express Backend
│   ├── crypto.ts                   # AES-256-GCM cipher engine & scrypt key derivation
│   ├── vault.ts                    # In-memory atomic store & background TTL cleaner
│   ├── routes.ts                   # Express REST API (/api/secret, /api/secret/:id/burn, /api/health)
│   ├── app.ts                      # Express app setup, CORS, and Vite dev integration
│   ├── index.ts                    # Backend runner entry point
│   └── README.md                   # Backend documentation
├── backend/                        # 🔒 Backend alias entry point
│   ├── index.ts                    # Re-exports server modules
│   └── README.md                   # Backend quick guide
├── server.ts                       # 🚀 Root full-stack server entry (dev & prod)
├── src/                            # 🎨 React 19 Frontend
│   ├── components/                 # UI components (CreateSecretForm, RevealCard, etc.)
│   ├── lib/                        # Client API client (api.ts) & utilities
│   ├── App.tsx                     # Main router and view controllers
│   ├── main.tsx                    # React DOM entry
│   └── index.css                   # Tailwind CSS styles
├── public/                         # Static assets and icons
├── DEPLOYMENT.md                   # Complete cloud deployment guide (Render, Railway, GitHub Pages)
├── Dockerfile                      # Production Docker container
├── package.json                    # Scripts & dependencies
└── vite.config.ts                  # Vite build configuration
```

---

## 🛠️ Tech Stack

- **Backend**:
  - **Runtime**: Node.js 22 + TypeScript (`tsx`)
  - **Framework**: Express 4
  - **Cryptography**: Native `crypto` module with **AES-256-GCM** (96-bit unique IVs, 128-bit authentication tags, and `scrypt` password hashing)
  - **Storage**: In-memory atomic vault with background TTL garbage collector running every 3 seconds
- **Frontend**:
  - **Framework**: React 19 + TypeScript + Vite
  - **Styling**: Tailwind CSS
  - **Icons**: `lucide-react`
  - **Notifications**: `react-hot-toast`
  - **QR Codes**: `qrcode.react`
  - **Theme**: Dark default (`#0a0a0a`) and High-Contrast Light Mode

---

## 💻 Running Locally

### 1. Unified Mode (Frontend + Backend on `localhost:3000`) — Recommended
This starts the Express server which automatically mounts Vite middleware in development:
```bash
npm install
npm run dev
```
Open **`http://localhost:3000`** in your browser. All API requests (`/api/secret`, `/api/health`, `/api/secret/:id/burn`) are handled by Express directly.

### 2. Run Only the Backend
If you want to run the backend API service by itself:
```bash
npm run backend
# or
npx tsx server/index.ts
```
The backend API starts on `http://localhost:3000` (or the port specified in `PORT`).

### 3. Run Only the Frontend
```bash
npm run frontend
```

---

## 📡 Backend API Endpoints

Base URL: `http://localhost:3000` (or `VITE_API_URL` when deployed)

### 1. `GET /api/health`
Health check and active secret count.
```json
{
  "status": "operational",
  "uptime": 128.4,
  "active_secrets": 2,
  "timestamp": "2026-10-23T05:00:00.000Z",
  "encryption": "AES-256-GCM"
}
```

### 2. `POST /api/secret`
Creates an encrypted secret.
- **Request Body**:
  ```json
  {
    "secret": "confidential data",
    "ttl_seconds": 3600,
    "max_views": 1,
    "password": "optional-passphrase",
    "hint": "optional hint",
    "secret_type": "text"
  }
  ```
- **Response 201**:
  ```json
  {
    "id": "e89c0b1a2c3d",
    "view_url": "http://localhost:3000/view/e89c0b1a2c3d",
    "expires_at": "2026-10-23T06:00:00.000Z",
    "views_remaining": 1,
    "checksum": "f3b2a1..."
  }
  ```

### 3. `GET /api/secret/:id/meta`
Safely retrieves non-sensitive metadata (hint, password requirement) without burning or decrementing the view count.
```json
{
  "id": "e89c0b1a2c3d",
  "hint": "Bank PIN",
  "requires_password": true,
  "expires_at": "2026-10-23T06:00:00.000Z",
  "views_remaining": 1
}
```

### 4. `POST /api/secret/:id/burn`
Decrypts and **atomically burns** the secret from server memory.
- **Request Body**:
  ```json
  {
    "password": "optional-passphrase"
  }
  ```
- **Response 200**:
  ```json
  {
    "secret": "confidential data",
    "views_remaining": 0,
    "burned": true
  }
  ```
- **Returns 401 / 403**: Password required or incorrect.
- **Returns 404**: Secret not found, expired, or already burned.

---

## 🌐 Deploying to Production

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full instructions on deploying:
- **Backend**: Render, Railway, Google Cloud Run, or Docker
- **Frontend**: GitHub Pages, Vercel, Netlify, or Cloudflare Pages
