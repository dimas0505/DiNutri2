// scripts/migrate.ts
// Run all pending Drizzle migrations against the target database.
// Usage: DATABASE_URL=<url> npm run db:migrate
import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import { db } from "../server/db";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.resolve(__dirname, "..", "migrations");

console.log(`Running migrations from: ${migrationsFolder}`);
console.log(`Database URL configured: ${process.env.DATABASE_URL ? 'yes' : 'no (DATABASE_URL not set)'}`);

try {
  await migrate(db, { migrationsFolder });
  console.log("✅ All pending migrations applied successfully.");
  process.exit(0);
} catch (error) {
  console.error("❌ Migration failed:", error);
  process.exit(1);
}
