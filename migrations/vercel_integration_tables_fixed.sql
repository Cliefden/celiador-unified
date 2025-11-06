-- Vercel Integration Database Migration - Fixed Column Names
-- Add columns to profiles table for Vercel trial tracking
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS vercel_trial_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS vercel_trial_expires_at TIMESTAMP WITH TIME ZONE;

-- Drop existing tables if they exist with wrong schema
DROP TABLE IF EXISTS vercel_integrations CASCADE;
DROP TABLE IF EXISTS deployments CASCADE;

-- Create vercel_integrations table for customer Vercel connections
CREATE TABLE vercel_integrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    userId UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    username TEXT,
    team_slug TEXT,
    team_id TEXT,
    project_name TEXT,
    deployment_url TEXT,
    access_token TEXT, -- Encrypted in production
    permissions TEXT[] DEFAULT '{}',
    token_status TEXT DEFAULT 'valid',
    last_deploy TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    creator TEXT,
    updater TEXT,
    createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deletedAt TIMESTAMP WITH TIME ZONE,
    deleter TEXT
);

-- Create deployments table for tracking deployment history
CREATE TABLE deployments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    projectId UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    userId UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    deployment_id TEXT NOT NULL, -- Vercel deployment ID
    url TEXT,
    status TEXT DEFAULT 'PENDING', -- PENDING, BUILDING, READY, ERROR, CANCELED
    git_commit_sha TEXT,
    git_commit_message TEXT,
    deployment_type TEXT DEFAULT 'platform', -- customer, platform
    creator TEXT,
    updater TEXT,
    createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deletedAt TIMESTAMP WITH TIME ZONE,
    deleter TEXT
);

-- Create indexes for better performance
CREATE INDEX idx_vercel_integrations_userId ON vercel_integrations(userId);
CREATE INDEX idx_vercel_integrations_deletedAt ON vercel_integrations(deletedAt);

CREATE INDEX idx_deployments_projectId ON deployments(projectId);
CREATE INDEX idx_deployments_userId ON deployments(userId);
CREATE INDEX idx_deployments_createdAt ON deployments(createdAt DESC);
CREATE INDEX idx_deployments_deletedAt ON deployments(deletedAt);

-- Add RLS policies
ALTER TABLE vercel_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployments ENABLE ROW LEVEL SECURITY;

-- RLS policy for vercel_integrations - users can only access their own integrations
CREATE POLICY "Users can access their own Vercel integrations" ON vercel_integrations
    FOR ALL USING (userId = auth.uid());

-- RLS policy for deployments - users can only access deployments for their projects
CREATE POLICY "Users can access their own project deployments" ON deployments
    FOR ALL USING (userId = auth.uid() OR projectId IN (
        SELECT id FROM projects WHERE userid = auth.uid()
    ));

-- Add project columns for Vercel integration tracking
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS vercel_integration_type TEXT, -- customer, platform
ADD COLUMN IF NOT EXISTS vercel_project_id TEXT,
ADD COLUMN IF NOT EXISTS deployment_url TEXT;