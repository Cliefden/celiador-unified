-- Expand existing sessions table for comprehensive session tracking
-- This adds the necessary columns while preserving existing data

-- Add new columns to sessions table
ALTER TABLE public.sessions 
  ADD COLUMN IF NOT EXISTS session_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS platform TEXT CHECK (platform IN ('web', 'ios-external', 'ios-internal', 'ios-widget', 'macos-internal')),
  ADD COLUMN IF NOT EXISTS device_info JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS location_info JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS user_agent TEXT,
  ADD COLUMN IF NOT EXISTS ip_address INET,
  ADD COLUMN IF NOT EXISTS total_duration_seconds INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS activity_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'idle', 'ended', 'timeout')),
  ADD COLUMN IF NOT EXISTS end_reason TEXT CHECK (end_reason IN ('logout', 'timeout', 'manual', 'app_close', 'crash')),
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Rename existing columns to match our API expectations
ALTER TABLE public.sessions 
  RENAME COLUMN from_when TO started_at;
  
ALTER TABLE public.sessions 
  RENAME COLUMN to_when TO ended_at;

-- Update user_id column to match profile_id for existing records
UPDATE public.sessions 
SET user_id = profile_id 
WHERE user_id IS NULL AND profile_id IS NOT NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON public.sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_platform ON public.sessions(platform);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON public.sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON public.sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_sessions_last_activity ON public.sessions(last_activity_at);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON public.sessions(user_id, status) WHERE status = 'active';

-- Enable Row Level Security if not already enabled
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Users can create their own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Users can update their own sessions" ON public.sessions;

-- Create new RLS policies for session tracking
CREATE POLICY "Users can view their own sessions" ON public.sessions
  FOR SELECT USING (
    auth.uid() = user_id 
    OR auth.uid() = profile_id
    OR auth.role() = 'service_role'
  );

CREATE POLICY "Users can create their own sessions" ON public.sessions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id 
    OR auth.uid() = profile_id
    OR auth.role() = 'service_role'
  );

CREATE POLICY "Users can update their own sessions" ON public.sessions
  FOR UPDATE USING (
    auth.uid() = user_id 
    OR auth.uid() = profile_id
    OR auth.role() = 'service_role'
  );

-- Grant necessary permissions
GRANT SELECT ON public.sessions TO authenticated;
GRANT INSERT ON public.sessions TO authenticated;
GRANT UPDATE ON public.sessions TO authenticated;

-- Create function to automatically update updated_at timestamp (if not exists)
CREATE OR REPLACE FUNCTION update_sessions_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_at = COALESCE(OLD.created_at, NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update timestamp (if not exists)
DROP TRIGGER IF EXISTS update_sessions_updated_at ON public.sessions;
CREATE TRIGGER update_sessions_updated_at 
  BEFORE UPDATE ON public.sessions 
  FOR EACH ROW EXECUTE FUNCTION update_sessions_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE public.sessions IS 'User sessions across web and mobile platforms with comprehensive tracking';
COMMENT ON COLUMN public.sessions.session_id IS 'Unique client-generated session identifier';
COMMENT ON COLUMN public.sessions.platform IS 'Platform: web, ios-external, ios-internal, ios-widget, macos-internal';
COMMENT ON COLUMN public.sessions.device_info IS 'JSON containing device metadata (OS, version, model, etc.)';
COMMENT ON COLUMN public.sessions.location_info IS 'JSON containing location data (country, timezone, etc.)';
COMMENT ON COLUMN public.sessions.total_duration_seconds IS 'Total session duration in seconds';
COMMENT ON COLUMN public.sessions.activity_count IS 'Number of activities/interactions during session';
COMMENT ON COLUMN public.sessions.last_heartbeat_at IS 'Last heartbeat received from client';