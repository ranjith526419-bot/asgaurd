# Ephemeral Secret Vault — Production Web Frontend

A modern, zero-knowledge, self-destructing secret sharing tool (inspired by OneTimeSecret + PrivateBin + Yopass). Users create encrypted secrets, configure expiration and view policies, and distribute single-use links that burn forever upon redemption.

---

## 🛠️ Tech Stack

- **Framework**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Animations**: CSS Keyframes + Canvas-Confetti
- **Icons**: `lucide-react`
- **Notifications**: `react-hot-toast`
- **QR Codes**: `qrcode.react` (with PNG download support)
- **Theme**: Dark default (`#0a0a0a`) and High-Contrast Light Mode with localStorage persistence

---

## 📄 8 Complete Routes

| Route | View | Description |
|---|---|---|
| `/` | **Home — Create Secret** | Form with 4 secret types (Text, Password, File, URL), line numbers, paste & clear, password generator, TTL presets & custom popover, max views selector, password lock, advanced options (custom slug, email notifications, webhooks), success state with confetti, QR code generator, and recent secrets manager. |
| `/view/:id` | **Recipient — Reveal & Burn** | 6-state interactive flow: Ready, Confirm modal with required checkbox, Password prompt with retry counter and lockout, Revealed state with 60s auto-hiding circular countdown ring, shoulder privacy toggle, 404 ghost view, and network retry. |
| `/about` | **How It Works & Architecture** | 3-step visual flow, cryptographic explanation of AES-256-GCM, unique IV per secret, threat model diagram, and comparison table (Vault vs Slack vs Email vs Pastebin). |
| `/faq` | **Frequently Asked Questions** | Interactive searchable accordion answering 10 questions on encryption, memory wiping, TTL expiration, file limits, and API usage. |
| `/privacy` | **Zero-Knowledge Privacy Policy** | Explicit guarantees on zero plaintext logging, non-logging of IPs, and ephemeral memory scrubbing. |
| `/terms` | **Terms of Service** | Acceptable use policies, disclaimers, and warranty terms. |
| `/status` | **System Status & Health Check** | Live latency pinging tool, 99.99% uptime tracker, 90-day operational grid, and subsystem statuses. |
| `/404` | **Custom 404 Not Found** | Custom animated ghost state with navigation back to Home. |

---

## 📡 API Contract

Base URL: `NEXT_PUBLIC_API_URL` or `VITE_API_URL` (default: `http://localhost:3000`)

### 1. `POST /api/secret`
Creates an encrypted secret.
- **Request Body**:
  ```json
  {
    "secret": "...",
    "ttl_seconds": 3600,
    "max_views": 1,
    "password": "optional-passphrase",
    "hint": "optional hint",
    "secret_type": "text",
    "custom_slug": "optional-slug",
    "notify_email": "optional-email",
    "webhook_url": "optional-webhook",
    "burn_after_seconds": 60
  }
  ```
- **Returns 201**:
  ```json
  {
    "id": "abc123xyz",
    "view_url": "http://localhost:3000/view/abc123xyz",
    "expires_at": "2026-09-24T06:30:00.000Z",
    "views_remaining": 1,
    "checksum": "a8f3e2b1..."
  }
  ```

### 2. `POST /api/secret/:id/burn`
Burns and reveals the secret. **Never called on initial page load**, only upon explicit user confirmation.
- **Request Body**:
  ```json
  {
    "password": "optional-passphrase"
  }
  ```
- **Returns 200**:
  ```json
  {
    "secret": "my-confidential-secret",
    "views_remaining": 0,
    "burned": true
  }
  ```
- **Returns 401 / 403**: Password required or incorrect.
- **Returns 404**: Secret not found, expired, or already burned.

---

## ⚡ UX Features

- **Keyboard Shortcuts**:
  - `Cmd/Ctrl + Enter`: Submit secret creation
  - `Cmd/Ctrl + K`: Focus secret input
  - `Escape`: Dismiss confirmation modal
- **Demo Sandbox Mode**: Built-in toggle in the top bar to test the full end-to-end secret creation, password protection, and burn experience in-memory without requiring an external backend.
- **File Attachments**: Drag-and-drop support up to 100KB with base64 encoding and one-click download for recipients.
- **Social Sharing**: Direct share links for WhatsApp, Telegram, Signal, Slack, Email, and QR Code PNG export.
