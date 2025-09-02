import fs from 'fs';
import path from 'path';

// Generate a version based on current timestamp
const timestamp = Date.now();
const version = timestamp.toString();
const buildDate = new Date(timestamp).toISOString();
const swTemplatePath = path.resolve(process.cwd(), 'client/public/sw.js');
const swDistPath = path.resolve(process.cwd(), 'dist/public/sw.js');

// Read the service worker template
let swContent = fs.readFileSync(swTemplatePath, 'utf8');

// Replace the static cache version with the dynamic one
swContent = swContent.replace(
  /const CACHE_NAME = 'dinutri-v1';/,
  `const CACHE_NAME = 'dinutri-v${version}';`
);

// Add build timestamp comment at the top
swContent = `// Service Worker generated at: ${buildDate}\n// Cache version: dinutri-v${version}\n${swContent}`;

// Ensure the dist/public directory exists
const distDir = path.dirname(swDistPath);
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Write the updated service worker to the dist directory
fs.writeFileSync(swDistPath, swContent, 'utf8');

console.log(`Service Worker updated with cache version: dinutri-v${version} (${buildDate})`);