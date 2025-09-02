import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// Plugin to generate versioned service worker
const generateVersionedSW = () => ({
  name: 'generate-versioned-sw',
  async closeBundle() {
    try {
      console.log('Generating versioned service worker...');
      const { stdout } = await execAsync('node scripts/generate-sw-version.js');
      console.log(stdout);
    } catch (error) {
      console.error('Failed to generate versioned service worker:', error);
    }
  }
});

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    generateVersionedSW(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
