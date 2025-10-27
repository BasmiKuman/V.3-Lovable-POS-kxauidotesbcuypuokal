#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase credentials
const SUPABASE_URL = 'https://mlwvrqjsaomthfcsmoit.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sd3ZycWpzYW9tdGhmY3Ntb2l0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU1ODU1NCwiZXhwIjoyMDc3MTM0NTU0fQ.G2vDaqFJyrbLovZ0p32sVFL0g8Ds-bUqot7pEdhBesU';

// Create Supabase client with service role
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Get migration files
const migrationsDir = path.join(__dirname, 'supabase', 'migrations');
const migrationFiles = fs.readdirSync(migrationsDir)
  .filter(file => file.endsWith('.sql'))
  .sort(); // Sort to ensure correct order

console.log('🚀 Starting migrations...\n');
console.log(`Found ${migrationFiles.length} migration files:\n`);

// Run migrations
for (const file of migrationFiles) {
  const filePath = path.join(migrationsDir, file);
  const sql = fs.readFileSync(filePath, 'utf8');
  
  console.log(`📝 Running migration: ${file}`);
  
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql }).catch(async () => {
      // If exec_sql RPC doesn't exist, try direct SQL execution
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({ sql_query: sql })
      });
      
      if (!response.ok) {
        // Try using pg_admin extension
        const { data: pgData, error: pgError } = await supabase
          .from('_migrations')
          .select('*')
          .limit(1)
          .catch(() => ({ data: null, error: null }));
        
        // If migrations table doesn't exist, execute SQL directly via raw query
        throw new Error('Cannot execute SQL - trying alternative method');
      }
      
      return response.json();
    });
    
    if (error) {
      console.error(`   ❌ Error: ${error.message}\n`);
      
      // Try alternative: split by statement and execute one by one
      console.log('   🔄 Trying alternative approach...');
      const statements = sql.split(';').filter(s => s.trim());
      
      for (const statement of statements) {
        if (!statement.trim()) continue;
        
        // Execute via REST API using pg
        const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({ query: statement.trim() + ';' })
        }).catch(() => null);
        
        if (!response || !response.ok) {
          console.log(`   ⚠️  Could not execute statement directly`);
        }
      }
      
      console.log(`   ⚠️  Migration may need manual review\n`);
    } else {
      console.log(`   ✅ Success\n`);
    }
  } catch (err) {
    console.error(`   ❌ Error: ${err.message}`);
    console.log(`   ℹ️  This migration may need to be run manually via Supabase Dashboard\n`);
  }
}

console.log('\n' + '='.repeat(60));
console.log('📊 Migration Summary:');
console.log('='.repeat(60));
console.log(`Total migrations: ${migrationFiles.length}`);
console.log('\n⚠️  IMPORTANT: Please verify migrations in Supabase Dashboard');
console.log('Visit: https://supabase.com/dashboard/project/mlwvrqjsaomthfcsmoit/editor\n');
console.log('💡 If migrations failed, you can run them manually by:');
console.log('   1. Go to SQL Editor in Supabase Dashboard');
console.log('   2. Copy content from each migration file in supabase/migrations/');
console.log('   3. Execute them in order');
console.log('='.repeat(60) + '\n');
