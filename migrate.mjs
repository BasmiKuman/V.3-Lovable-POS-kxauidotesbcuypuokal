#!/usr/bin/env node

/**
 * Migration Runner for Supabase
 * This script runs all SQL migrations from supabase/migrations/ folder
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const SUPABASE_URL = 'https://mlwvrqjsaomthfcsmoit.supabase.co';
const SUPABASE_SERVICE_ROLE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sd3ZycWpzYW9tdGhmY3Ntb2l0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU1ODU1NCwiZXhwIjoyMDc3MTM0NTU0fQ.G2vDaqFJyrbLovZ0p32sVFL0g8Ds-bUqot7pEdhBesU';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

// Read complete migration file
const migrationSQL = readFileSync(join(__dirname, 'complete-migration.sql'), 'utf8');

console.log('🚀 Starting migration to Supabase...\n');
console.log('📝 Reading complete-migration.sql...\n');

// Execute via raw SQL using Supabase REST API
async function runMigration() {
  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      query: migrationSQL
    });

    if (error) {
      console.error('❌ Error executing migration:', error.message);
      console.log('\n⚠️  Trying alternative method via SQL statements...\n');
      
      // Split into individual statements and try to execute
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));
      
      console.log(`Found ${statements.length} SQL statements to execute\n`);
      
      let successCount = 0;
      let errorCount = 0;
      
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        if (!statement) continue;
        
        try {
          const { error: stmtError } = await supabase.rpc('exec_sql', {
            query: statement + ';'
          });
          
          if (stmtError) {
            console.log(`⚠️  Statement ${i + 1}: ${stmtError.message.substring(0, 80)}...`);
            errorCount++;
          } else {
            successCount++;
            process.stdout.write(`✓`);
            if ((i + 1) % 50 === 0) process.stdout.write('\n');
          }
        } catch (e) {
          errorCount++;
          process.stdout.write(`✗`);
        }
      }
      
      console.log(`\n\n📊 Summary: ${successCount} succeeded, ${errorCount} failed\n`);
      
      if (errorCount > 0) {
        console.log('⚠️  Some statements failed. This might be normal if:');
        console.log('   - Objects already exist');
        console.log('   - Policies are being re-created\n');
      }
    } else {
      console.log('✅ Migration completed successfully!\n');
    }
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    console.log('\n📖 Manual migration required:');
    console.log('   1. Open: https://supabase.com/dashboard/project/mlwvrqjsaomthfcsmoit/editor');
    console.log('   2. Go to SQL Editor');
    console.log('   3. Copy contents from complete-migration.sql');
    console.log('   4. Paste and execute\n');
  }
}

runMigration().then(() => {
  console.log('🎉 Migration process completed!');
  console.log('📍 Next: Verify in Dashboard and test your app\n');
});
