-- Migration: Add system token usage tracking to projects table
-- This tracks which deployments used the system's Vercel token vs user's own token

-- Add column to track system token usage
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS used_system_token BOOLEAN DEFAULT FALSE;

-- Add index for querying system token usage
CREATE INDEX IF NOT EXISTS idx_projects_system_token_usage 
ON projects(user_id, used_system_token) 
WHERE used_system_token = TRUE;

-- Update existing projects to assume they used personal tokens
-- (since we're adding this tracking retroactively)
UPDATE projects 
SET used_system_token = FALSE 
WHERE used_system_token IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN projects.used_system_token IS 'TRUE if this deployment used the system Vercel token (freemium), FALSE if user provided their own token';

-- Create view for system token usage analytics
CREATE OR REPLACE VIEW system_token_usage_summary AS
SELECT 
  u.id as user_id,
  u.email,
  COUNT(CASE WHEN p.used_system_token = TRUE THEN 1 END) as system_deployments,
  COUNT(CASE WHEN p.used_system_token = FALSE THEN 1 END) as personal_deployments,
  COUNT(*) as total_deployments,
  MAX(CASE WHEN p.used_system_token = TRUE THEN p.created_at END) as last_system_deployment,
  CASE 
    WHEN COUNT(CASE WHEN p.used_system_token = TRUE THEN 1 END) >= 3 THEN 'limit_reached'
    WHEN COUNT(CASE WHEN p.used_system_token = TRUE THEN 1 END) >= 2 THEN 'approaching_limit'
    ELSE 'within_limit'
  END as usage_status
FROM auth.users u
LEFT JOIN projects p ON u.id = p.user_id AND p.vercel_connected = TRUE
GROUP BY u.id, u.email;

-- Grant permissions
GRANT SELECT ON system_token_usage_summary TO authenticated;

-- Create function to check if user can use system token
CREATE OR REPLACE FUNCTION can_use_system_token(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT COUNT(*) 
    FROM projects 
    WHERE user_id = user_uuid 
      AND used_system_token = TRUE 
      AND vercel_connected = TRUE
  ) < 3;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;