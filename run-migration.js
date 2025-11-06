// Script to run database migration
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('Running migration: 004_add_default_branch_column.sql');
    
    // Execute the migration SQL directly
    const { error } = await supabase.rpc('exec_sql', { 
      sql: 'ALTER TABLE projects ADD COLUMN IF NOT EXISTS default_branch TEXT DEFAULT \'main\';' 
    });
    
    if (error) {
      console.error('Error adding column:', error);
    } else {
      console.log('Successfully added default_branch column');
    }
    
    // Update existing projects
    const { error: updateError } = await supabase
      .from('projects')
      .update({ default_branch: 'main' })
      .is('default_branch', null);
      
    if (updateError) {
      console.error('Error updating existing projects:', updateError);
    } else {
      console.log('Updated existing projects with default branch');
    }
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

runMigration();
