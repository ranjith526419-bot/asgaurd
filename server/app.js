import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { apiRouter } from "./routes.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
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
        if (/^https:\/\/[a-zA-Z0-9-]+\.vercel\.app$/.test(cleanOrigin)) {
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
  app.use(apiRouter);
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
export {
  createApp,
  createServer
};
