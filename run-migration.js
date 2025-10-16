// Quick script to run database migration
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

async function runMigration() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    console.log('Reading migration file...');
    const migrationSQL = fs.readFileSync('./migrations/001_add_github_trial_fields.sql', 'utf8');
    
    console.log('Executing migration...');
    const { data, error } = await supabase.rpc('execute_sql', { sql: migrationSQL });
    
    if (error) {
      console.error('Migration failed:', error);
      process.exit(1);
    }
    
    console.log('✅ Migration completed successfully');
    console.log('Result:', data);
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

runMigration();