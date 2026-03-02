import "dotenv/config";
import express, { type Request, Response, NextFunction, type Express } from "express";
import { registerRoutes, setupRoutes } from "./routes.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { sql } from "drizzle-orm";
import { db } from "./db.js";

// ESM-safe __dirname (import.meta.dirname only available in Node 21.2+, Vercel uses Node 18)
const __filename = fileURLToPath(import.meta.url);
const __serverDir = path.dirname(__filename);

// --- Funções movidas de vite.ts para cá ---
export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(__serverDir, "..", "dist", "public");

  if (!fs.existsSync(distPath)) {
    log(`A pasta de build não foi encontrada em: ${distPath}. Servindo placeholder.`);
    app.use("*", (_req, res) => {
      res.status(404).send("Build folder not found. Run 'npm run build'.");
    });
    return;
  }

  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
// --- Fim das funções movidas ---


const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });
  next();
});

// Configure routes once
let routesRegistered = false;
async function ensureRoutesRegistered() {
  if (!routesRegistered) {
    // Ensure patient_documents table exists on every cold start.
    // Using raw SQL (CREATE TABLE IF NOT EXISTS) instead of drizzle migrate() because
    // the production migration journal is out of sync and migrate() throws 42P07.
    // This is fully idempotent and requires no local terminal commands after deploy.
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS patient_documents (
          id              VARCHAR PRIMARY KEY,
          patient_id      VARCHAR NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
          nutritionist_id VARCHAR NOT NULL REFERENCES users(id),
          file_name       VARCHAR NOT NULL,
          file_url        TEXT NOT NULL,
          created_at      TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log("[DB] patient_documents table ensured.");
    } catch (err) {
      console.error("[DB] Failed to ensure patient_documents table:", err);
    }

    // Add weight_kg column to anthropometric_assessments if it doesn't exist.
    // This is idempotent — safe to run on every cold start.
    try {
      await db.execute(sql`
        ALTER TABLE anthropometric_assessments
        ADD COLUMN IF NOT EXISTS weight_kg REAL
      `);
      console.log("[DB] anthropometric_assessments.weight_kg column ensured.");
    } catch (err) {
      console.error("[DB] Failed to ensure weight_kg column:", err);
    }

    await setupRoutes(app);
    
    // Middleware de tratamento de erros
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
    });

    // Em produção, serve os arquivos estáticos do build
    if (process.env.NODE_ENV !== 'development') {
      serveStatic(app);
    }
    
    routesRegistered = true;
  }
}

// A função serverless do Vercel espera uma exportação padrão (default export) que seja uma função ou um servidor.
export default async function handler(req: Request, res: Response) {
  await ensureRoutesRegistered();
  app(req, res);
}

// Em ambiente de desenvolvimento, iniciamos o servidor normalmente
if (process.env.NODE_ENV === 'development') {
  (async () => {
    const server = await registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
    });

    const { setupVite } = await import("./vite.js");
    await setupVite(app, server);

    const port = parseInt(process.env.PORT || '5000', 10);
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`serving on port ${port}`);
    });
  })();
}

