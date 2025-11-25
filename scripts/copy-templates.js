#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';

/**
 * Copy templates directory to build output for production deployment
 * This ensures template files are available when scaffold jobs run in production
 */
async function copyTemplates() {
  console.log('🏗️  [BUILD] Copying templates for production deployment...');
  
  try {
    const sourceDir = path.resolve('../templates');
    const targetDir = path.resolve('./templates');
    
    // Check if source templates directory exists
    try {
      await fs.access(sourceDir);
    } catch (error) {
      console.warn(`⚠️  [BUILD] Templates source directory not found: ${sourceDir}`);
      console.log('🔄 [BUILD] Templates will be downloaded from Supabase Storage at runtime');
      return;
    }
    
    // Remove existing target directory if it exists
    try {
      await fs.rm(targetDir, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist, that's fine
    }
    
    // Copy templates directory
    await copyDirectory(sourceDir, targetDir);
    
    console.log(`✅ [BUILD] Templates copied successfully from ${sourceDir} to ${targetDir}`);
    
  } catch (error) {
    console.error(`❌ [BUILD] Failed to copy templates:`, error);
    console.log('🔄 [BUILD] Templates will be downloaded from Supabase Storage at runtime');
  }
}

async function copyDirectory(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  
  const entries = await fs.readdir(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      // Skip node_modules and build directories
      if (['node_modules', '.next', '.git', 'dist', 'build'].includes(entry.name)) {
        continue;
      }
      await copyDirectory(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
      console.log(`📄 [BUILD] Copied: ${entry.name}`);
    }
  }
}

// Run the script
copyTemplates().catch(console.error);