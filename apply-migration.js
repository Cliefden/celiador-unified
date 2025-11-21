// Apply GitHub trial fields migration to Supabase
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function applyMigration() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    console.log('🔄 Adding GitHub trial columns to profiles table...');
    
    // Add the new columns
    const { error: alterError } = await supabase.rpc('exec', {
      sql: `
        ALTER TABLE profiles 
        ADD COLUMN IF NOT EXISTS github_trial_started_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS github_trial_expires_at TIMESTAMPTZ;
      `
    });
    
    if (alterError) {
      console.error('❌ Failed to add columns:', alterError);
      process.exit(1);
    }
    
    console.log('✅ Columns added successfully');
    
    // Create index
    console.log('🔄 Creating index...');
    const { error: indexError } = await supabase.rpc('exec', {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_profiles_github_trial_expires 
        ON profiles(github_trial_expires_at) 
        WHERE github_trial_expires_at IS NOT NULL;
      `
    });
    
    if (indexError) {
      console.error('❌ Failed to create index:', indexError);
      process.exit(1);
    }
    
    console.log('✅ Index created successfully');
    console.log('🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
}

applyMigration();