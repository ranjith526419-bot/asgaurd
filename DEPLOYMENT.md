# 🚀 Deploying Ephemeral Secret Vault from GitHub

This repository contains all pre-configured assets (`vercel.json`, `netlify.toml`, `Dockerfile`, `.github/workflows/`) needed to deploy anywhere directly from GitHub.

---

## 📦 Step 1: Push Code to GitHub

If you haven't pushed this project to GitHub yet, run the following commands in your terminal:

```bash
# 1. Initialize git repository (if not already done)
git init -b main

# 2. Add all files and make initial commit
git add .
git commit -m "feat: initial commit for ephemeral secret vault"

# 3. Link your GitHub repository (replace with your repo URL)
git remote add origin https://github.com/<YOUR-USERNAME>/<YOUR-REPO-NAME>.git

# 4. Push to main branch
git push -u origin main
```

---

## 🌐 Deployment Options

### Option A: Vercel (Recommended — Easiest & Fastest)
1. Go to [vercel.com](https://vercel.com) and log in with your GitHub account.
2. Click **"Add New Project"** and select your GitHub repository.
3. Vercel automatically detects **Vite**:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. *(Optional)* Add Environment Variables in Vercel settings:
   - `VITE_API_URL`: URL of your backend API (e.g., `https://api.yourdomain.com`).
5. Click **"Deploy"**.
6. SPA routing is already configured via `vercel.json` (`/view/:id`, `/about`, `/faq` work on reload).

---

### Option B: Netlify
1. Go to [netlify.com](https://netlify.com) and click **"Add new site"** → **"Import an existing project"**.
2. Select **GitHub** and choose your repository.
3. The included `netlify.toml` file will automatically configure:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - **Redirects**: Single-page application fallbacks
4. *(Optional)* Under **Site settings → Environment variables**, add `VITE_API_URL`.
5. Click **"Deploy site"**.

---

### Option C: Cloudflare Pages
1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/) and go to **Workers & Pages**.
2. Click **"Create application"** → **"Pages"** → **"Connect to Git"**.
3. Select your GitHub repository.
4. Set build settings:
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
5. Click **"Save and Deploy"**.

---

### Option D: GitHub Pages (Free, Built-In)
This repository includes a ready-to-use GitHub Actions workflow (`.github/workflows/deploy-pages.yml`):
1. In your GitHub repository, click **Settings** → **Pages** (in the left sidebar).
2. Under **Build and deployment** → **Source**, change from *Deploy from a branch* to **GitHub Actions**.
3. On every push to `main`, GitHub Actions will automatically compile and deploy your site to `https://<YOUR-USERNAME>.github.io/<REPO>/`.

---

### Option E: Docker / Render / Railway / Google Cloud Run
A multi-stage production `Dockerfile` with Nginx and gzip compression is already included in this repository.

#### Deploy with Render:
1. Go to [render.com](https://render.com) and click **"New +"** → **"Web Service"**.
2. Connect your GitHub repository.
3. Select **Docker** as the runtime (Render will automatically detect the `Dockerfile`).
4. Set instance type and click **"Create Web Service"**.

#### Deploy with Railway:
1. Go to [railway.app](https://railway.app) → **"New Project"** → **"Deploy from GitHub repo"**.
2. Railway detects the `Dockerfile` and deploys automatically.

#### Deploy with Google Cloud Run:
```bash
# Build and deploy directly to Cloud Run
gcloud run deploy ephemeral-vault-ui \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

---

## 💻 Running the Services Locally

This project is a full-stack Node.js + Express + React application:

### Run Everything Unified (Recommended)
```bash
# Installs dependencies
npm install

# Starts both Express backend API and Vite frontend on port 3000
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser. All API requests (`/api/secret`, `/api/secret/:id/burn`) are handled directly by the Express backend.

---

## 🚀 Deploying Backend so GitHub Pages Can Communicate With It

GitHub Pages only hosts static files (HTML/JS/CSS). The cryptographic vault backend runs on Node.js. Follow these simple steps to deploy your backend and connect your GitHub Pages frontend to it:

### Step 1: Deploy the Backend (Free on Render, Railway, or Fly.io)

#### Option A: Render (Free Web Service)
1. Go to [render.com](https://render.com) and click **"New +"** → **"Web Service"**.
2. Connect your GitHub repository.
3. Configure the service:
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
4. Under **Environment Variables**, add:
   - `CORS_ORIGIN`: `https://<YOUR-USERNAME>.github.io` (or `*`)
   - `ENCRYPTION_MASTER_KEY`: A secure random 32-character string or hex (optional, a secure key is generated automatically if omitted)
5. Click **"Create Web Service"**.
6. Render will provide your public backend URL, e.g.: `https://ephemeral-vault-backend.onrender.com`.

#### Option B: Railway
1. Go to [railway.app](https://railway.app) → **"New Project"** → **"Deploy from GitHub repo"**.
2. Add environment variable `CORS_ORIGIN` set to `https://<YOUR-USERNAME>.github.io`.
3. In service settings, generate a domain (e.g. `https://vault-api-production.up.railway.app`).

---

### Step 2: Configure Your GitHub Pages Frontend to Connect to the Backend

1. In your GitHub repository, go to **Settings** → **Secrets and variables** → **Actions**.
2. Click **"New repository secret"** (or Repository Variable under Variables):
   - **Name**: `VITE_API_URL`
   - **Value**: `https://<YOUR-BACKEND-SERVICE>.onrender.com` (your backend URL from Step 1, without trailing slash)
3. Re-run your GitHub Actions workflow or push a commit. Vite will embed `VITE_API_URL` into the production bundle during `npm run build`.

#### Dynamic / Runtime API Configuration (No rebuild required)
You can also point the GitHub Pages frontend to your backend dynamically at runtime:
The frontend checks:
1. `window.__VAULT_API_URL__` (can be set in `index.html`)
2. `import.meta.env.VITE_API_URL`
3. Current origin (`window.location.origin`)

---

## 🔒 Security & CORS Architecture

- **AES-256-GCM Encryption**: Secrets are encrypted on the server using 12-byte cryptographic nonces and 16-byte authentication tags. Keys are never exposed in frontend code.
- **Atomic Burn**: Each secret is deleted synchronously on retrieval; concurrent requests cannot double-read.
- **CORS Protection**: The backend automatically allows requests from all `https://*.github.io` origins and localhost, with credentials and preflight `OPTIONS` caching.

---

## ⚙️ Environment Variables Reference

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_URL` | `window.location.origin` | Points the frontend to the backend API URL. Set to your deployed backend URL for GitHub Pages. |
| `CORS_ORIGIN` | `*` | Comma-separated list of allowed origins on the backend (e.g., `https://myuser.github.io`). Automatically permits `*.github.io` by default. |
| `ENCRYPTION_MASTER_KEY` | Auto-generated seed | 256-bit master key seed for AES-256-GCM encryption at rest. |
| `PORT` | `3000` | Port for the backend Express server. |
