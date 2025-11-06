// Apply GitHub trial fields migration using direct SQL
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function applyMigration() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      db: { schema: 'public' }
    }
  );

  try {
    console.log('🔄 Checking if columns already exist...');
    
    // First check if columns already exist by querying the profiles table structure
    const { data: testData, error: testError } = await supabase
      .from('profiles')
      .select('github_trial_started_at, github_trial_expires_at')
      .limit(1);
    
    if (!testError) {
      console.log('✅ Columns already exist in the database');
      console.log('🎉 Migration already applied!');
      return;
    }
    
    if (testError.code === '42703') {
      console.log('🔄 Columns do not exist, need to add them...');
      console.log('⚠️  Manual database migration required');
      console.log('Please run the following SQL in your Supabase dashboard:');
      console.log('');
      console.log('ALTER TABLE profiles ');
      console.log('ADD COLUMN github_trial_started_at TIMESTAMPTZ,');
      console.log('ADD COLUMN github_trial_expires_at TIMESTAMPTZ;');
      console.log('');
      console.log('CREATE INDEX idx_profiles_github_trial_expires ON profiles(github_trial_expires_at) WHERE github_trial_expires_at IS NOT NULL;');
      console.log('');
    } else {
      console.error('❌ Unexpected error:', testError);
    }
    
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
}

applyMigration();