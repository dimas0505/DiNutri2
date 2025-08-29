import "dotenv/config";
import express, { type Request, Response, NextFunction, type Express } from "express";
import { registerRoutes } from "./routes.js";
import { createServer } from "http";
import path from "path";
import fs from "fs";

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
  // @ts-ignore
  const distPath = path.resolve(import.meta.dirname, "..", "dist", "public");

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

(async () => {
  await registerRoutes(app);
  
  const server = createServer(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
  });

  // --- CORREÇÃO PRINCIPAL ---
  // Apenas importa e usa o Vite em ambiente de desenvolvimento
  if (process.env.NODE_ENV === 'development') {
    const { setupVite } = await import("./vite.js");
    await setupVite(app, server);
  } else {
    // Em produção, serve os arquivos estáticos do build
    serveStatic(app);
  }
  // --- FIM DA CORREÇÃO ---

  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();