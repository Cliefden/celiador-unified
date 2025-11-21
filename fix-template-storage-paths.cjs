#!/usr/bin/env node

// Fix template storage paths to point to local directories and deactivate missing templates
require('dotenv').config({ path: './.env' });
const { createClient } = require('@supabase/supabase-js');

async function fixTemplateStoragePaths() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log('🔧 Fixing template storage paths...');

  // Templates that exist locally - update their storage paths
  const existingTemplates = [
    { key: 'ai-chat-app', path: 'ai-chat-app' },
    { key: 'landing-page-blue', path: 'Landing Page Blue' },
    { key: 'landing-page-yellow', path: 'Landing Page Yellow' },
    { key: 'blog-page', path: 'Blog Page' },
    { key: 'ecommerce-store', path: 'ecommerce-store' }
  ];

  // Update existing templates to use local paths
  for (const template of existingTemplates) {
    console.log(`✅ Updating ${template.key} -> ${template.path}`);
    
    const { error } = await supabase
      .from('templates')
      .update({ 
        storage_path: template.path,
        is_active: true
      })
      .eq('template_key', template.key);

    if (error) {
      console.error(`❌ Error updating ${template.key}:`, error);
    } else {
      console.log(`✅ Updated ${template.key}`);
    }
  }

  // Templates that don't exist locally - deactivate them
  const missingTemplates = [
    'next-saas-starter', 'ecommerce-storefront', 'dashboard-app', 
    'next-prisma-supabase', 'landing-page', 'blog-platform', 
    'task-manager', 'react-typescript', 'blank-nextjs'
  ];

  for (const templateKey of missingTemplates) {
    console.log(`❌ Deactivating missing template: ${templateKey}`);
    
    const { error } = await supabase
      .from('templates')
      .update({ is_active: false })
      .eq('template_key', templateKey);

    if (error) {
      console.error(`❌ Error deactivating ${templateKey}:`, error);
    } else {
      console.log(`✅ Deactivated ${templateKey}`);
    }
  }

  console.log('🎉 Template storage paths fixed!');
}

fixTemplateStoragePaths().catch(console.error);