# GitHub Repository Cleanup Guide

This guide helps you clean up unnecessary GitHub repositories created by the old eager creation system.

## Step 1: List Current Repositories

Run the listing script to see what repositories exist:

```bash
cd celiador-unified
GITHUB_ACCESS_TOKEN=your_token_here node scripts/list-github-repos.cjs
```

This will show you:
- All repositories in the celiador-repos organization
- Which ones were created by Celiador
- Which ones are test/demo projects  
- Which ones haven't been updated recently
- Cleanup candidates

## Step 2: Review Cleanup Candidates

The script will identify repositories that are good candidates for deletion:
- Created by Celiador (have "Created by Celiador" in description)
- AND one of:
  - Contains "test", "demo", "example", or "project" in the name
  - Haven't been updated in 7+ days
  - Are very small (<100KB, likely just scaffolding)

## Step 3: Manual Cleanup (Recommended)

Based on the analysis, manually delete repositories through GitHub web interface:

1. Go to https://github.com/celiador-repos
2. For each cleanup candidate:
   - Click on the repository
   - Go to Settings → General
   - Scroll down to "Danger Zone" 
   - Click "Delete this repository"
   - Type the repository name to confirm

## Step 4: Automated Cleanup (Advanced)

If you want to use the automated script:

```bash
cd celiador-unified

# First, run in dry-run mode to see what would be deleted:
GITHUB_ACCESS_TOKEN=your_token_here \
SUPABASE_URL=your_supabase_url \
SUPABASE_SERVICE_ROLE_KEY=your_service_key \
node scripts/cleanup-github-repos.cjs

# If you're satisfied with the analysis, edit the script and set DRY_RUN = false
# Then run again to perform actual deletions
```

## Safety Notes

- **Start with manual cleanup** for the first few repositories to verify the process
- **Check for any active deployments** before deleting repositories
- **Backup any important code** before deletion
- **Test repositories are safe to delete** - they were likely created just for testing

## What This Accomplishes

After cleanup:
- ✅ Only repositories that are actually being used for deployments remain
- ✅ New projects will only create GitHub repositories when actually needed (lazy creation)
- ✅ Cleaner GitHub organization
- ✅ Easier to manage and find actual project repositories

## Example Output

The listing script will show something like:

```
🔍 Fetching repositories from celiador-repos organization...

Found 15 repositories:

1. celiador-repos/test-project-1
   Created: 11/1/2025
   Updated: 11/1/2025 (5 days ago)
   Size: 45KB
   Description: "Test Project 1 - Created by Celiador"
   🤖 Celiador Created | 🧪 Test | ⏰ Old

2. celiador-repos/my-blog
   Created: 10/28/2025
   Updated: 11/5/2025 (1 days ago)
   Size: 234KB
   Description: "My personal blog - Created by Celiador"
   🤖 Celiador Created | 📦 Project | 🔄 Recent

================================================================================
📊 ANALYSIS SUMMARY
================================================================================
Total repositories: 15
Celiador-created: 12
Test/Demo repositories: 8
Not updated in 7+ days: 6

🗑️  CLEANUP CANDIDATES (Celiador-created + test/old/small):
  - celiador-repos/test-project-1 (45KB, 5 days old)
  - celiador-repos/demo-app (32KB, 8 days old)
  - celiador-repos/example-site (78KB, 10 days old)

Potential savings: 3 repositories
```