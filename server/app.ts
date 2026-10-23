import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { apiRouter } from './routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function createApp() {
  const app = express();
  const isProd = process.env.NODE_ENV === 'production';

  // Body parser with 10MB limit for attachments
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // CORS configuration supporting GitHub Pages, local development, and custom origins
  const allowedOriginsEnv = process.env.CORS_ORIGIN || process.env.ALLOWED_ORIGINS;
  const configuredOrigins = allowedOriginsEnv
    ? allowedOriginsEnv.split(',').map((s) => s.trim().replace(/\/+$/, ''))
    : [];

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const cleanOrigin = origin.replace(/\/+$/, '');

        if (configuredOrigins.includes('*') || configuredOrigins.includes(cleanOrigin)) {
          return callback(null, true);
        }

        // Allow any GitHub Pages domain (*.github.io)
        if (/^https:\/\/[a-zA-Z0-9-]+\.github\.io$/.test(cleanOrigin)) {
          return callback(null, true);
        }

        // Allow local development on localhost or 127.0.0.1
        if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(cleanOrigin)) {
          return callback(null, true);
        }

        // Permissive for development / previews
        return callback(null, true);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    })
  );

  // Mount API router
  app.use('/api', apiRouter);

  // Frontend Integration (Vite middleware in dev / Static files in prod)
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Look for dist at workspace root (one level up from server/)
    const distPath = path.resolve(__dirname, '..', 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  return app;
}

export async function createServer() {
  const PORT = process.env.APP_PORT
    ? parseInt(process.env.APP_PORT, 10)
    : (process.env.PORT && process.env.PORT !== '8080')
      ? parseInt(process.env.PORT, 10)
      : 3000;
  const app = await createApp();

  return app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Ephemeral Secret Vault] Backend server running on http://0.0.0.0:${PORT}`);
  });
}
