// scripts/test-db-connection.ts
import "dotenv/config";
import { db } from '../server/db';
import { users } from '../shared/schema';

async function testConnection() {
  console.log('Attempting to connect to the database...');
  console.log('DATABASE_URL configured:', process.env.DATABASE_URL ? 'Yes' : 'No');
  
  if (process.env.DATABASE_URL) {
    console.log('Database host:', process.env.DATABASE_URL.split('@')[1]?.split('/')[0]);
  }
  
  try {
    // Executa uma consulta simples para verificar a conexão
    const result = await db.select().from(users).limit(1);
    console.log('✅ Database connection successful!');
    console.log('Query returned:', result.length, 'user(s)');
    process.exit(0); // Sucesso
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    
    // Specific error analysis
    if (error instanceof Error) {
      if (error.message.includes('ENOTFOUND') || error.message.includes('network')) {
        console.error('🔥 This appears to be a network connectivity issue - likely blocked by firewall');
      }
      if (error.message.includes('timeout')) {
        console.error('⏱️  Connection timeout - may indicate firewall blocking');
      }
    }
    
    process.exit(1); // Falha
  }
}

testConnection();