// ARQUIVO: ./server/db.ts
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from '../shared/schema.js';

// Configure Neon for serverless environments
neonConfig.fetchConnectionCache = true;

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL must be set. Did you forget to provision a database?',
  );
}

// Use connection pooling optimized for serverless
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  // Optimized for serverless functions
  max: 1,
  idleTimeoutMillis: 0,
  connectionTimeoutMillis: 5000,
});

export const db = drizzle({ client: pool, schema });
