#!/usr/bin/env node

/**
 * Simple GitHub Repository Listing Script
 * 
 * Lists repositories in the celiador-repos organization to analyze cleanup candidates
 */

const https = require('https');

const GITHUB_TOKEN = process.env.GITHUB_ACCESS_TOKEN;

if (!GITHUB_TOKEN) {
  console.error('Missing GITHUB_ACCESS_TOKEN environment variable');
  process.exit(1);
}

function makeGitHubRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      port: 443,
      path: path,
      method: 'GET',
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
        try {
          const jsonData = JSON.parse(data);
          resolve(jsonData);
        } catch (error) {
          reject(new Error(`Failed to parse JSON: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

async function listRepositories() {
  console.log('🔍 Fetching repositories from celiador-repos organization...\n');
  
  try {
    const repos = await makeGitHubRequest('/orgs/celiador-repos/repos?type=all&per_page=100');
    
    console.log(`Found ${repos.length} repositories:\n`);
    
    // Group repositories by analysis
    const analysis = {
      celiadorCreated: [],
      other: [],
      test: [],
      old: []
    };
    
    repos.forEach((repo, index) => {
      const created = new Date(repo.created_at);
      const updated = new Date(repo.updated_at);
      const daysSinceUpdate = (Date.now() - updated.getTime()) / (1000 * 60 * 60 * 24);
      const isCeliadorCreated = repo.description && repo.description.includes('Created by Celiador');
      const isTest = repo.name.toLowerCase().includes('test') || 
                     repo.name.toLowerCase().includes('demo') || 
                     repo.name.toLowerCase().includes('example') ||
                     repo.name.toLowerCase().includes('project');
      
      console.log(`${index + 1}. ${repo.full_name}`);
      console.log(`   Created: ${created.toLocaleDateString()}`);
      console.log(`   Updated: ${updated.toLocaleDateString()} (${Math.round(daysSinceUpdate)} days ago)`);
      console.log(`   Size: ${repo.size}KB`);
      console.log(`   Description: "${repo.description || 'No description'}"`);
      console.log(`   URL: ${repo.html_url}`);
      
      // Categorize
      if (isCeliadorCreated) {
        analysis.celiadorCreated.push(repo);
      } else {
        analysis.other.push(repo);
      }
      
      if (isTest) {
        analysis.test.push(repo);
      }
      
      if (daysSinceUpdate > 7) {
        analysis.old.push(repo);
      }
      
      console.log(`   ${isCeliadorCreated ? '🤖 Celiador Created' : '👤 Manual'} | ${isTest ? '🧪 Test' : '📦 Project'} | ${daysSinceUpdate > 7 ? '⏰ Old' : '🔄 Recent'}`);
      console.log('');
    });
    
    // Summary
    console.log('='.repeat(80));
    console.log('📊 ANALYSIS SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total repositories: ${repos.length}`);
    console.log(`Celiador-created: ${analysis.celiadorCreated.length}`);
    console.log(`Test/Demo repositories: ${analysis.test.length}`);
    console.log(`Not updated in 7+ days: ${analysis.old.length}`);
    console.log('');
    
    // Cleanup candidates
    const cleanupCandidates = repos.filter(repo => {
      const isCeliadorCreated = repo.description && repo.description.includes('Created by Celiador');
      const isTest = repo.name.toLowerCase().includes('test') || 
                     repo.name.toLowerCase().includes('demo') || 
                     repo.name.toLowerCase().includes('example') ||
                     repo.name.toLowerCase().includes('project');
      const daysSinceUpdate = (Date.now() - new Date(repo.updated_at).getTime()) / (1000 * 60 * 60 * 24);
      const isSmall = repo.size < 100; // Less than 100KB
      
      // Candidate for deletion if it's Celiador-created AND (test OR old OR small)
      return isCeliadorCreated && (isTest || daysSinceUpdate > 7 || isSmall);
    });
    
    if (cleanupCandidates.length > 0) {
      console.log('🗑️  CLEANUP CANDIDATES (Celiador-created + test/old/small):');
      cleanupCandidates.forEach(repo => {
        const daysSinceUpdate = (Date.now() - new Date(repo.updated_at).getTime()) / (1000 * 60 * 60 * 24);
        console.log(`  - ${repo.full_name} (${repo.size}KB, ${Math.round(daysSinceUpdate)} days old)`);
      });
      console.log('');
      console.log(`Potential savings: ${cleanupCandidates.length} repositories`);
    } else {
      console.log('✅ No obvious cleanup candidates found.');
    }
    
  } catch (error) {
    console.error('❌ Failed to fetch repositories:', error.message);
  }
}

listRepositories();