// Script to run database migration
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

// Load environment variables
config();

const { Client } = pg;

// Extract database connection info from Supabase URL
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

// Convert Supabase URL to PostgreSQL connection string
// supabaseUrl format: https://xxx.supabase.co
// PostgreSQL connection: postgresql://postgres:[password]@db.xxx.supabase.co:5432/postgres
const projectId = supabaseUrl.replace('https://', '').replace('.supabase.co', '');
const dbUrl = `postgresql://postgres:${supabaseServiceKey}@db.${projectId}.supabase.co:5432/postgres`;

console.log(`Connecting to database: db.${projectId}.supabase.co`);

async function runMigration() {
  try {
    const migrationFile = process.argv[2];
    
    if (!migrationFile) {
      console.error('Please provide a migration file path as an argument');
      console.log('Usage: node run-migration.js migrations/your-migration.sql');
      process.exit(1);
    }
    
    const migrationPath = path.resolve(migrationFile);
    console.log(`Running migration: ${path.basename(migrationFile)}`);
    
    if (!fs.existsSync(migrationPath)) {
      console.error(`Migration file not found: ${migrationPath}`);
      process.exit(1);
    }
    
    const sql = fs.readFileSync(migrationPath, 'utf8');
    console.log(`Loaded SQL migration (${sql.length} characters)`);
    
    // Create PostgreSQL client
    const client = new Client({
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: false }
    });
    
    await client.connect();
    console.log('Connected to PostgreSQL database');
    
    try {
      // Execute the migration SQL
      console.log('Executing migration SQL...');
      await client.query(sql);
      console.log('Migration completed successfully!');
    } finally {
      await client.end();
      console.log('Database connection closed');
    }
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
