-- Migration: Add default_branch column to projects table
-- This is needed for Vercel deployment integration to store repository default branch

-- Add default_branch column
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS default_branch TEXT DEFAULT 'main';

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_projects_default_branch 
ON projects(default_branch);

-- Update existing projects to have main as default branch
UPDATE projects 
SET default_branch = 'main' 
WHERE default_branch IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN projects.default_branch IS 'Default branch of the connected GitHub repository (e.g., main, master)';