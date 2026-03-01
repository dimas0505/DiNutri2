// scripts/create-documents-table.ts
// Creates the patient_documents table in the production database using raw SQL.
// Safe to run multiple times (uses CREATE TABLE IF NOT EXISTS).
//
// Usage: DATABASE_URL=<neon-url> npm run db:fix
import "dotenv/config";
import { pool } from "../server/db";

const sql = `
  CREATE TABLE IF NOT EXISTS patient_documents (
    id          VARCHAR PRIMARY KEY,
    patient_id  VARCHAR NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    nutritionist_id VARCHAR NOT NULL REFERENCES users(id),
    file_name   VARCHAR NOT NULL,
    file_url    TEXT NOT NULL,
    created_at  TIMESTAMP DEFAULT NOW()
  );
`;

console.log("Creating patient_documents table if it does not exist...");
try {
  await pool.query(sql);
  console.log("✅ patient_documents table is ready.");
} catch (error) {
  console.error("❌ Failed to create patient_documents table:", error);
  await pool.end();
  process.exit(1);
}
await pool.end();
process.exit(0);
