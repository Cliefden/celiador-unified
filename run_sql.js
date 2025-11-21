const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function runSQL() {
  try {
    console.log('Creating user_sessions table...');
    
    const sqlContent = fs.readFileSync('./create_user_sessions.sql', 'utf8');
    
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: sqlContent
    });

    if (error) {
      console.error('Error executing SQL:', error);
      return;
    }

    console.log('✅ user_sessions table created successfully');
    console.log('Result:', data);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

runSQL();