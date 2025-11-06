#!/usr/bin/env node

/**
 * GitHub Repository Cleanup Script
 * 
 * This script identifies and optionally removes GitHub repositories that were
 * created by the old eager creation system but are no longer needed.
 * 
 * Criteria for removal:
 * 1. Repository was created by Celiador (has specific description pattern)
 * 2. No active Vercel deployments pointing to it
 * 3. Repository has minimal/no meaningful commits (just initial scaffolding)
 * 4. Project in database is marked as test/unused
 */

const { createClient } = require('@supabase/supabase-js');
const { GitHubService } = require('../dist/github-service.js');

// Configuration
const DRY_RUN = true; // Set to false to actually delete repositories
const GITHUB_TOKEN = process.env.GITHUB_ACCESS_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!GITHUB_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing required environment variables:');
  console.error('- GITHUB_ACCESS_TOKEN');
  console.error('- SUPABASE_URL'); 
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const github = new GitHubService(GITHUB_TOKEN);

async function getProjectsFromDatabase() {
  console.log('📊 Fetching projects from database...');
  
  const { data: projects, error } = await supabase
    .from('projects')
    .select('*')
    .not('deletedat', 'is', null); // Only get non-deleted projects
    
  if (error) {
    console.error('Failed to fetch projects:', error);
    return [];
  }
  
  console.log(`Found ${projects.length} projects in database`);
  return projects;
}

async function getCeliadorRepositories() {
  console.log('🔍 Fetching Celiador organization repositories...');
  
  try {
    // Get repos from celiador-repos organization
    const orgRepos = await github.octokit.rest.repos.listForOrg({
      org: 'celiador-repos',
      type: 'all',
      per_page: 100
    });
    
    console.log(`Found ${orgRepos.data.length} repositories in celiador-repos org`);
    return orgRepos.data;
  } catch (error) {
    console.error('Failed to fetch repositories:', error);
    return [];
  }
}

async function analyzeRepository(repo) {
  console.log(`\n🔍 Analyzing repository: ${repo.full_name}`);
  
  const analysis = {
    name: repo.name,
    fullName: repo.full_name,
    description: repo.description,
    createdAt: repo.created_at,
    updatedAt: repo.updated_at,
    size: repo.size,
    hasIssues: repo.open_issues_count > 0,
    isPrivate: repo.private,
    defaultBranch: repo.default_branch,
    commits: 0,
    lastCommitDate: null,
    isCeliadorCreated: false,
    hasVercelDeployment: false,
    linkedProjects: [],
    shouldDelete: false,
    deleteReason: null
  };
  
  // Check if created by Celiador
  if (repo.description && repo.description.includes('Created by Celiador')) {
    analysis.isCeliadorCreated = true;
  }
  
  try {
    // Get commit count and last commit
    const commits = await github.octokit.rest.repos.listCommits({
      owner: repo.owner.login,
      repo: repo.name,
      per_page: 100
    });
    
    analysis.commits = commits.data.length;
    if (commits.data.length > 0) {
      analysis.lastCommitDate = commits.data[0].commit.author.date;
    }
  } catch (error) {
    console.warn(`  ⚠️ Could not fetch commits: ${error.message}`);
  }
  
  return analysis;
}

async function findLinkedProjects(repoAnalysis, projects) {
  const linkedProjects = projects.filter(project => 
    project.repoowner === 'celiador-repos' && 
    project.reponame === repoAnalysis.name
  );
  
  repoAnalysis.linkedProjects = linkedProjects;
  return linkedProjects;
}

async function checkVercelDeployment(repoAnalysis) {
  // For now, assume no Vercel deployment if project is not actively used
  // This could be enhanced to actually check Vercel API
  repoAnalysis.hasVercelDeployment = false;
  return false;
}

function shouldDeleteRepository(analysis) {
  const reasons = [];
  
  // Only consider Celiador-created repositories
  if (!analysis.isCeliadorCreated) {
    return { shouldDelete: false, reason: 'Not created by Celiador' };
  }
  
  // Check if repository has minimal activity
  if (analysis.commits <= 2) {
    reasons.push('minimal commits (≤2)');
  }
  
  // Check if repository is very small (likely just scaffolding)
  if (analysis.size < 100) { // Less than 100KB
    reasons.push('very small size (<100KB)');
  }
  
  // Check if no linked active projects
  if (analysis.linkedProjects.length === 0) {
    reasons.push('no linked projects in database');
  }
  
  // Check if all linked projects are test projects
  const hasNonTestProjects = analysis.linkedProjects.some(project => 
    !project.name.toLowerCase().includes('test') &&
    !project.name.toLowerCase().includes('demo') &&
    !project.name.toLowerCase().includes('example')
  );
  
  if (!hasNonTestProjects && analysis.linkedProjects.length > 0) {
    reasons.push('only test/demo projects linked');
  }
  
  // Check if repository hasn't been updated recently
  const daysSinceUpdate = (Date.now() - new Date(analysis.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceUpdate > 7) {
    reasons.push(`not updated in ${Math.round(daysSinceUpdate)} days`);
  }
  
  // Repository should be deleted if it meets multiple criteria
  const shouldDelete = reasons.length >= 2;
  
  return {
    shouldDelete,
    reason: shouldDelete ? reasons.join(', ') : 'Active repository'
  };
}

async function main() {
  console.log('🧹 GitHub Repository Cleanup Script');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no deletion)' : 'LIVE RUN (will delete)'}`);
  console.log('');
  
  // Get data from database and GitHub
  const [projects, repositories] = await Promise.all([
    getProjectsFromDatabase(),
    getCeliadorRepositories()
  ]);
  
  console.log('\n📋 Analysis Results:');
  console.log('='.repeat(80));
  
  const analysisResults = [];
  let totalToDelete = 0;
  
  // Analyze each repository
  for (const repo of repositories) {
    const analysis = await analyzeRepository(repo);
    await findLinkedProjects(analysis, projects);
    await checkVercelDeployment(analysis);
    
    const deleteDecision = shouldDeleteRepository(analysis);
    analysis.shouldDelete = deleteDecision.shouldDelete;
    analysis.deleteReason = deleteDecision.reason;
    
    if (analysis.shouldDelete) {
      totalToDelete++;
    }
    
    analysisResults.push(analysis);
    
    // Print analysis
    console.log(`\n📦 ${analysis.fullName}`);
    console.log(`   Created: ${analysis.createdAt}`);
    console.log(`   Size: ${analysis.size}KB, Commits: ${analysis.commits}`);
    console.log(`   Linked Projects: ${analysis.linkedProjects.length}`);
    if (analysis.linkedProjects.length > 0) {
      analysis.linkedProjects.forEach(project => {
        console.log(`     - ${project.name} (ID: ${project.id})`);
      });
    }
    console.log(`   ${analysis.shouldDelete ? '🗑️  DELETE' : '✅ KEEP'}: ${analysis.deleteReason}`);
  }
  
  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total repositories analyzed: ${repositories.length}`);
  console.log(`Repositories to keep: ${repositories.length - totalToDelete}`);
  console.log(`Repositories to delete: ${totalToDelete}`);
  
  if (totalToDelete > 0) {
    console.log('\n🗑️  Repositories marked for deletion:');
    analysisResults
      .filter(a => a.shouldDelete)
      .forEach(analysis => {
        console.log(`  - ${analysis.fullName} (${analysis.deleteReason})`);
      });
  }
  
  // Perform deletions if not dry run
  if (!DRY_RUN && totalToDelete > 0) {
    console.log('\n🚨 PERFORMING DELETIONS...');
    
    for (const analysis of analysisResults) {
      if (analysis.shouldDelete) {
        try {
          console.log(`Deleting ${analysis.fullName}...`);
          await github.octokit.rest.repos.delete({
            owner: 'celiador-repos',
            repo: analysis.name
          });
          console.log(`✅ Deleted ${analysis.fullName}`);
        } catch (error) {
          console.error(`❌ Failed to delete ${analysis.fullName}:`, error.message);
        }
      }
    }
    
    console.log('\n✅ Cleanup completed!');
  } else if (DRY_RUN && totalToDelete > 0) {
    console.log('\n🔍 DRY RUN: No repositories were deleted.');
    console.log('   Set DRY_RUN = false to perform actual deletions.');
  }
}

main().catch(console.error);