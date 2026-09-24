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

## ⚙️ Environment Variables Reference

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_URL` | `http://localhost:3000` | Points to your backend API URL for secret encryption and burning. |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3000` | Fallback backend URL configuration. |

*Note: If no backend API URL is provided, the application automatically runs in **Demo Sandbox** mode with in-memory encryption, so all routes and previews work out of the box.*
