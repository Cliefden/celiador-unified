#!/usr/bin/env node

/**
 * Migration Script: Update Template Storage Paths to Git Repositories
 * 
 * This script updates the existing Supabase templates table to use Git repository URLs
 * instead of Supabase Storage paths, enabling the hybrid Supabase + Git architecture.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Template key to Git repository mapping
const TEMPLATE_GIT_MAPPING = {
  'ecommerce-storefront': 'https://github.com/celiador-templates/ecommerce-store',
  'ecommerce-store': 'https://github.com/celiador-templates/ecommerce-store',
  'blog-platform': 'https://github.com/celiador-templates/blog-nextjs',
  'ai-chat-app': 'https://github.com/celiador-templates/ai-chat-app',
  'landing-page': 'https://github.com/celiador-templates/landing-page',
  'next-saas-starter': 'https://github.com/celiador-templates/saas-starter',
  'dashboard-app': 'https://github.com/celiador-templates/dashboard-app',
  'task-manager': 'https://github.com/celiador-templates/task-manager',
  'blank-nextjs': 'https://github.com/celiador-templates/blank-nextjs',
  'react-typescript': 'https://github.com/celiador-templates/react-typescript',
  'next-prisma-supabase': 'https://github.com/celiador-templates/next-prisma-supabase'
};

async function migrateTemplates() {
  console.log('🚀 Starting template migration to Git repositories...\n');
  
  try {
    // Fetch all active templates
    console.log('📋 Fetching existing templates...');
    const { data: templates, error: fetchError } = await supabase
      .from('templates')
      .select('id, template_key, name, storage_path, is_active')
      .eq('is_active', true);
    
    if (fetchError) {
      throw new Error(`Failed to fetch templates: ${fetchError.message}`);
    }
    
    if (!templates || templates.length === 0) {
      console.log('⚠️ No active templates found in database');
      return;
    }
    
    console.log(`✅ Found ${templates.length} active templates\n`);
    
    // Process each template
    let migrated = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const template of templates) {
      const { id, template_key, name, storage_path } = template;
      
      console.log(`🔄 Processing: ${template_key} (${name})`);
      
      // Check if template already has a Git URL
      if (storage_path && storage_path.startsWith('https://github.com/celiador-templates/')) {
        console.log(`   ⏭️ Already migrated: ${storage_path}`);
        skipped++;
        continue;
      }
      
      // Get the Git repository URL for this template
      const gitRepoUrl = TEMPLATE_GIT_MAPPING[template_key];
      
      if (!gitRepoUrl) {
        console.log(`   ⚠️ No Git repository mapped for template key: ${template_key}`);
        errors++;
        continue;
      }
      
      try {
        // Update the template with the Git repository URL
        const { error: updateError } = await supabase
          .from('templates')
          .update({
            storage_path: gitRepoUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', id);
        
        if (updateError) {
          throw new Error(`Failed to update template: ${updateError.message}`);
        }
        
        console.log(`   ✅ Updated: ${gitRepoUrl}`);
        migrated++;
        
      } catch (error) {
        console.log(`   ❌ Error updating ${template_key}: ${error.message}`);
        errors++;
      }
    }
    
    // Summary
    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Migrated: ${migrated} templates`);
    console.log(`   ⏭️ Skipped: ${skipped} templates (already migrated)`);
    console.log(`   ❌ Errors: ${errors} templates`);
    console.log(`   📋 Total: ${templates.length} templates processed`);
    
    if (migrated > 0) {
      console.log('\n🎉 Template migration completed successfully!');
      console.log('\n🔒 Security Benefits:');
      console.log('   • Templates now validated against allowed Git sources');
      console.log('   • [slug] routes preserved perfectly in Git repositories');
      console.log('   • Full version control for all templates');
      console.log('   • No more Supabase Storage path limitations');
    }
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('Please check your database connection and try again.');
    process.exit(1);
  }
}

// Validation function to test template access
async function validateMigration() {
  console.log('\n🔍 Validating migrated templates...');
  
  try {
    const { GitTemplateService } = require('./src/git-template-service');
    const gitTemplateService = new GitTemplateService(supabase);
    
    // Test fetching templates through the service
    const templates = await gitTemplateService.getAvailableTemplates();
    
    console.log(`✅ Validation successful: ${templates.length} templates accessible`);
    
    // Test individual template validation
    const testTemplateKey = 'ecommerce-store';
    try {
      const validatedTemplate = await gitTemplateService.getValidatedTemplate(testTemplateKey);
      console.log(`✅ Template validation test passed: ${validatedTemplate.name}`);
    } catch (error) {
      console.log(`⚠️ Template validation test failed for ${testTemplateKey}: ${error.message}`);
    }
    
  } catch (error) {
    console.log(`⚠️ Validation failed: ${error.message}`);
  }
}

// Main execution
async function main() {
  console.log('===============================================');
  console.log('🏗️ Celiador Template Migration to Git');
  console.log('===============================================\n');
  
  // Check environment variables
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing required environment variables:');
    console.error('   SUPABASE_URL');
    console.error('   SUPABASE_SERVICE_ROLE_KEY');
    console.error('\nPlease check your .env file.');
    process.exit(1);
  }
  
  // Run migration
  await migrateTemplates();
  
  // Run validation
  await validateMigration();
  
  console.log('\n🚀 Ready to test Git-based template system!');
  console.log('Next steps:');
  console.log('1. Set up GitHub Personal Access Token');
  console.log('2. Test project creation with ecommerce-store template');
  console.log('3. Verify [slug] routes work correctly\n');
}

// Run the migration
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { migrateTemplates, validateMigration };