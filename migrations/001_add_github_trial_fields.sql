-- Migration: Add GitHub trial tracking fields to profiles table
-- This migration adds fields to track GitHub platform trial periods for users

-- Add GitHub trial tracking columns to profiles table
ALTER TABLE profiles 
ADD COLUMN github_trial_started_at TIMESTAMPTZ,
ADD COLUMN github_trial_expires_at TIMESTAMPTZ;

-- Create index for efficient trial queries
CREATE INDEX idx_profiles_github_trial_expires ON profiles(github_trial_expires_at) WHERE github_trial_expires_at IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN profiles.github_trial_started_at IS 'When the user started their GitHub platform trial';
COMMENT ON COLUMN profiles.github_trial_expires_at IS 'When the user GitHub platform trial expires';