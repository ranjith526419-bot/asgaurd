import express, { Express } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Server } from 'http';
import { apiRouter } from './routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function createApp(): Promise<Express> {
  const app = express();
  const isProd = process.env.NODE_ENV === 'production';

  // Body parser with 10MB limit for attachments & payloads
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // CORS configuration:
  // Allow exact GitHub Pages origin, local dev origins, and explicitly configured env origins.
  // Do not allow every origin by default.
  const GITHUB_PAGES_ORIGIN = 'https://ranjith526419-bot.github.io';
  const allowedOriginsEnv = process.env.CORS_ORIGIN || process.env.ALLOWED_ORIGINS;
  const configuredOrigins = allowedOriginsEnv
    ? allowedOriginsEnv.split(',').map((s) => s.trim().replace(/\/+$/, ''))
    : [];

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. curl, server-to-server, mobile clients)
        if (!origin) return callback(null, true);

        const cleanOrigin = origin.replace(/\/+$/, '');

        // 1. Allow exact GitHub Pages production frontend origin
        if (cleanOrigin === GITHUB_PAGES_ORIGIN) {
          return callback(null, true);
        }

        // 2. Allow local development on localhost or 127.0.0.1
        if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(cleanOrigin)) {
          return callback(null, true);
        }

        // 3. Allow explicitly configured origins from environment variables
        if (configuredOrigins.includes(cleanOrigin) || configuredOrigins.includes('*')) {
          return callback(null, true);
        }

        // 4. Allow AI Studio development and shared preview origins
        if (/^https:\/\/ais-(dev|pre)-[a-zA-Z0-9-]+\.asia-southeast1\.run\.app$/.test(cleanOrigin)) {
          return callback(null, true);
        }

        // Deny all other origins by default
        return callback(null, false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    })
  );

  // Mount API router
  app.use('/api', apiRouter);

  // Frontend Integration: Vite middleware in development / Static assets in production
  if (!isProd) {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (viteErr) {
      console.warn('[Server] Vite is not available as middleware, skipping:', viteErr);
    }
  } else {
    // In production, serve dist directory if it exists; if missing, start gracefully in API-only mode
    const distPath = path.resolve(__dirname, '..', 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        const indexPath = path.resolve(distPath, 'index.html');
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          res.status(404).send('Not Found');
        }
      });
    } else {
      console.log('[Server] Production mode: dist directory not found. Running in API-only mode.');
      app.get('/', (_req, res) => {
        res.json({
          status: 'operational',
          mode: 'api-only',
          message: 'Ephemeral Secret Vault API is running.',
          endpoints: {
            health: '/api/health',
            status: '/api/status',
            create_secret: 'POST /api/secret',
            secret_metadata: 'GET /api/secret/:id/meta',
            burn_secret: 'POST /api/secret/:id/burn',
          },
        });
      });
    }
  }

  return app;
}

export async function createServer(): Promise<Server> {
  // Read listening port: command line --port, process.env.APP_PORT, process.env.PORT, or fallback to 3000
  const args = process.argv.slice(2);
  const portArgIndex = args.indexOf('--port');
  const portFromArg =
    portArgIndex !== -1 && args[portArgIndex + 1] ? parseInt(args[portArgIndex + 1], 10) : undefined;

  const envPort = process.env.PORT ? parseInt(process.env.PORT, 10) : undefined;
  const PORT =
    portFromArg ||
    (process.env.APP_PORT ? parseInt(process.env.APP_PORT, 10) : undefined) ||
    (envPort && (process.env.NODE_ENV === 'production' || process.env.PORT !== '8080') ? envPort : undefined) ||
    3000;

  const app = await createApp();

  return app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Ephemeral Secret Vault] Backend server running on http://0.0.0.0:${PORT}`);
  });
}
