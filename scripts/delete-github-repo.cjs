#!/usr/bin/env node

/**
 * Delete a specific GitHub repository
 * 
 * Usage: 
 *   GITHUB_ACCESS_TOKEN=token node delete-github-repo.cjs repo-name
 *   GITHUB_ACCESS_TOKEN=token node delete-github-repo.cjs repo-name --confirm
 */

const https = require('https');

const GITHUB_TOKEN = process.env.GITHUB_ACCESS_TOKEN;
const repoName = process.argv[2];
const confirmFlag = process.argv[3] === '--confirm';

if (!GITHUB_TOKEN) {
  console.error('❌ Missing GITHUB_ACCESS_TOKEN environment variable');
  process.exit(1);
}

if (!repoName) {
  console.error('❌ Usage: GITHUB_ACCESS_TOKEN=token node delete-github-repo.cjs <repo-name> [--confirm]');
  console.error('   Example: GITHUB_ACCESS_TOKEN=token node delete-github-repo.cjs test-project-1 --confirm');
  process.exit(1);
}

function makeGitHubRequest(path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      port: 443,
      path: path,
      method: method,
      headers: {
        'User-Agent': 'Celiador-Cleanup-Script/1.0',
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const jsonData = data ? JSON.parse(data) : {};
            resolve({ statusCode: res.statusCode, data: jsonData });
          } catch (error) {
            resolve({ statusCode: res.statusCode, data: {} });
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

async function deleteRepository() {
  const repoFullName = `celiador-repos/${repoName}`;
  
  console.log(`🔍 Checking repository: ${repoFullName}`);
  
  try {
    // First, check if repository exists and get its info
    const repoInfo = await makeGitHubRequest(`/repos/${repoFullName}`);
    
    console.log(`📦 Repository found:`);
    console.log(`   Name: ${repoInfo.data.full_name}`);
    console.log(`   Description: ${repoInfo.data.description || 'No description'}`);
    console.log(`   Created: ${new Date(repoInfo.data.created_at).toLocaleDateString()}`);
    console.log(`   Updated: ${new Date(repoInfo.data.updated_at).toLocaleDateString()}`);
    console.log(`   Size: ${repoInfo.data.size}KB`);
    console.log(`   URL: ${repoInfo.data.html_url}`);
    console.log('');
    
    // Check if it's a Celiador-created repository
    const isCeliadorCreated = repoInfo.data.description && repoInfo.data.description.includes('Created by Celiador');
    if (!isCeliadorCreated) {
      console.log('⚠️  WARNING: This repository does not appear to be created by Celiador.');
      console.log('   Description does not contain "Created by Celiador"');
      console.log('   Are you sure you want to delete it?');
    }
    
    if (!confirmFlag) {
      console.log('🔄 DRY RUN MODE');
      console.log('   Repository would be deleted.');
      console.log('   To actually delete, add --confirm flag:');
      console.log(`   GITHUB_ACCESS_TOKEN=*** node delete-github-repo.cjs ${repoName} --confirm`);
      return;
    }
    
    // Perform deletion
    console.log('🗑️  Deleting repository...');
    await makeGitHubRequest(`/repos/${repoFullName}`, 'DELETE');
    
    console.log(`✅ Repository ${repoFullName} has been deleted successfully!`);
    
  } catch (error) {
    if (error.message.includes('HTTP 404')) {
      console.error(`❌ Repository ${repoFullName} not found.`);
    } else {
      console.error(`❌ Failed to delete repository: ${error.message}`);
    }
    process.exit(1);
  }
}

deleteRepository();