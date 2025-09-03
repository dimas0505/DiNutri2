#!/usr/bin/env node
/**
 * Database Schema Verification Script
 * 
 * This script checks if the invitations table has all required columns
 * and helps diagnose schema-related issues.
 */

import { db } from './server/db.js';
import { sql } from 'drizzle-orm';

async function checkInvitationsSchema() {
  try {
    console.log('🔍 Checking invitations table schema...\n');
    
    // Check if table exists
    const tableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'invitations'
      );
    `);
    
    if (!tableExists[0].exists) {
      console.log('❌ Error: invitations table does not exist!');
      return;
    }
    
    // Get current columns
    const columns = await db.execute(sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'invitations'
      ORDER BY ordinal_position;
    `);
    
    console.log('📋 Current columns in invitations table:');
    console.log('----------------------------------------');
    columns.forEach(col => {
      console.log(`${col.column_name} (${col.data_type}) - Nullable: ${col.is_nullable} - Default: ${col.column_default || 'none'}`);
    });
    
    // Check for required columns
    const requiredColumns = ['id', 'nutritionist_id', 'token', 'status', 'created_at'];
    const newColumns = ['expires_at', 'email', 'role', 'used'];
    const existingColumns = columns.map(col => col.column_name);
    
    console.log('\n🔍 Schema Analysis:');
    console.log('------------------');
    
    // Check basic columns
    const missingRequired = requiredColumns.filter(col => !existingColumns.includes(col));
    if (missingRequired.length > 0) {
      console.log(`❌ Missing required columns: ${missingRequired.join(', ')}`);
    } else {
      console.log('✅ All basic required columns present');
    }
    
    // Check new columns
    const missingNew = newColumns.filter(col => !existingColumns.includes(col));
    if (missingNew.length > 0) {
      console.log(`⚠️  Missing new schema columns: ${missingNew.join(', ')}`);
      console.log('   📝 Run the migration in migrations/0003_add_missing_invitation_columns.sql');
    } else {
      console.log('✅ All new schema columns present');
    }
    
    // Test invitation creation capability
    console.log('\n🧪 Testing schema compatibility...');
    try {
      // Try to get a sample invitation to test query capability
      const testQuery = await db.execute(sql`
        SELECT id, nutritionist_id, token, status, created_at
        FROM invitations 
        LIMIT 1;
      `);
      console.log('✅ Basic queries work');
      
      // Try to query new columns if they exist
      if (missingNew.length === 0) {
        const newSchemaTest = await db.execute(sql`
          SELECT expires_at, email, role, used
          FROM invitations 
          LIMIT 1;
        `);
        console.log('✅ New schema queries work');
      }
      
    } catch (error) {
      console.log(`❌ Query test failed: ${error.message}`);
    }
    
    console.log('\n📊 Summary:');
    console.log('-----------');
    if (missingNew.length === 0) {
      console.log('✅ Database schema is up to date');
      console.log('✅ Invitation creation should work normally');
    } else {
      console.log('⚠️  Database needs migration');
      console.log('📝 Apply migrations/0003_add_missing_invitation_columns.sql');
      console.log('🔄 Application will use legacy mode until migration is applied');
    }
    
  } catch (error) {
    console.error('❌ Error checking schema:', error);
  }
}

// Run the check
checkInvitationsSchema()
  .then(() => {
    console.log('\n✨ Schema check complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });