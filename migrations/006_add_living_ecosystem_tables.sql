-- Migration: Add Living Ecosystem AI tables
-- Purpose: Enable contextual AI memory and multi-agent coordination
-- Safety: Only adds new tables, no changes to existing schema

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Project contextual snapshots for AI memory
CREATE TABLE IF NOT EXISTS project_context_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    snapshot_type TEXT NOT NULL DEFAULT 'manual', -- 'manual', 'auto', 'agent_triggered'
    
    -- Visual context
    visual_state JSONB DEFAULT '{}',
    preview_url TEXT,
    ui_elements JSONB DEFAULT '[]',
    user_interactions JSONB DEFAULT '[]',
    
    -- Code context  
    code_state JSONB DEFAULT '{}',
    active_files JSONB DEFAULT '[]',
    git_context JSONB DEFAULT '{}',
    
    -- AI insights
    ai_insights JSONB DEFAULT '{}',
    patterns_detected JSONB DEFAULT '[]',
    suggestions JSONB DEFAULT '[]',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project DNA - evolutionary patterns and decisions
CREATE TABLE IF NOT EXISTS project_dna (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    
    pattern_type TEXT NOT NULL, -- 'architectural_decision', 'code_pattern', 'user_preference', 'performance_insight'
    pattern_category TEXT, -- 'frontend', 'backend', 'database', 'deployment', 'ui_ux'
    
    pattern_data JSONB NOT NULL DEFAULT '{}',
    confidence_score REAL DEFAULT 0.0 CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
    
    -- Relationships
    related_files JSONB DEFAULT '[]',
    related_decisions UUID[], -- Array of other project_dna IDs
    
    -- Metadata
    source TEXT DEFAULT 'ai_analysis', -- 'ai_analysis', 'user_explicit', 'performance_data'
    created_by_agent TEXT, -- Which AI agent discovered this pattern
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI agent sessions for coordination
CREATE TABLE IF NOT EXISTS ai_agent_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    
    agent_type TEXT NOT NULL, -- 'architect', 'performance', 'security', 'ux', 'integration'
    agent_role TEXT, -- 'primary', 'collaborator', 'observer'
    
    session_data JSONB NOT NULL DEFAULT '{}',
    collaboration_id UUID, -- Links multiple agents working together
    parent_session_id UUID REFERENCES ai_agent_sessions(id), -- For hierarchical agent coordination
    
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'failed')),
    
    -- Performance metrics
    tokens_used INTEGER DEFAULT 0,
    execution_time_ms INTEGER DEFAULT 0,
    
    -- Results
    actions_taken JSONB DEFAULT '[]',
    insights_generated JSONB DEFAULT '[]',
    files_modified JSONB DEFAULT '[]',
    
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Visual-code mappings for UI element tracking
CREATE TABLE IF NOT EXISTS visual_code_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    snapshot_id UUID REFERENCES project_context_snapshots(id) ON DELETE CASCADE,
    
    -- UI Element identification
    element_selector TEXT NOT NULL, -- CSS selector or component identifier
    element_type TEXT, -- 'component', 'element', 'text', 'interactive'
    element_coordinates JSONB, -- { x, y, width, height }
    
    -- Code mapping
    file_path TEXT NOT NULL,
    line_number INTEGER,
    column_number INTEGER,
    code_block TEXT,
    
    -- Relationships
    component_name TEXT,
    parent_component TEXT,
    
    -- Metadata
    confidence_score REAL DEFAULT 0.0,
    mapping_method TEXT DEFAULT 'ai_analysis', -- 'ai_analysis', 'static_analysis', 'user_annotation'
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Intent-to-implementation tracking
CREATE TABLE IF NOT EXISTS ai_intent_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Original intent
    user_intent TEXT NOT NULL,
    intent_category TEXT, -- 'feature_request', 'bug_fix', 'optimization', 'refactor', 'styling'
    
    -- Context
    visual_context_id UUID REFERENCES project_context_snapshots(id),
    
    -- Execution plan
    execution_plan JSONB NOT NULL DEFAULT '{}',
    required_agents TEXT[] DEFAULT '{}',
    estimated_complexity INTEGER DEFAULT 1 CHECK (estimated_complexity >= 1 AND estimated_complexity <= 10),
    
    -- Execution tracking
    status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'executing', 'completed', 'failed', 'cancelled')),
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    
    -- Results
    actions_completed JSONB DEFAULT '[]',
    files_modified JSONB DEFAULT '[]',
    preview_urls JSONB DEFAULT '[]',
    
    -- Performance
    total_tokens_used INTEGER DEFAULT 0,
    execution_time_ms INTEGER DEFAULT 0,
    
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_context_snapshots_project_id ON project_context_snapshots(project_id);
CREATE INDEX IF NOT EXISTS idx_project_context_snapshots_created_at ON project_context_snapshots(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_project_dna_project_id ON project_dna(project_id);
CREATE INDEX IF NOT EXISTS idx_project_dna_pattern_type ON project_dna(pattern_type);
CREATE INDEX IF NOT EXISTS idx_project_dna_confidence ON project_dna(confidence_score DESC);

CREATE INDEX IF NOT EXISTS idx_ai_agent_sessions_project_id ON ai_agent_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_ai_agent_sessions_status ON ai_agent_sessions(status);
CREATE INDEX IF NOT EXISTS idx_ai_agent_sessions_collaboration_id ON ai_agent_sessions(collaboration_id);

CREATE INDEX IF NOT EXISTS idx_visual_code_mappings_project_id ON visual_code_mappings(project_id);
CREATE INDEX IF NOT EXISTS idx_visual_code_mappings_snapshot_id ON visual_code_mappings(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_visual_code_mappings_file_path ON visual_code_mappings(file_path);

CREATE INDEX IF NOT EXISTS idx_ai_intent_executions_project_id ON ai_intent_executions(project_id);
CREATE INDEX IF NOT EXISTS idx_ai_intent_executions_status ON ai_intent_executions(status);
CREATE INDEX IF NOT EXISTS idx_ai_intent_executions_created_at ON ai_intent_executions(created_at DESC);

-- Row Level Security (RLS) policies
ALTER TABLE project_context_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_dna ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE visual_code_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_intent_executions ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only access their own project data
CREATE POLICY IF NOT EXISTS "Users can access their project context snapshots" ON project_context_snapshots
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Users can access their project DNA" ON project_dna
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Users can access their AI sessions" ON ai_agent_sessions
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Users can access their visual mappings" ON visual_code_mappings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM project_context_snapshots pcs 
            WHERE pcs.id = visual_code_mappings.snapshot_id 
            AND pcs.user_id = auth.uid()
        )
    );

CREATE POLICY IF NOT EXISTS "Users can access their intent executions" ON ai_intent_executions
    FOR ALL USING (user_id = auth.uid());

-- Update triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_project_context_snapshots_updated_at BEFORE UPDATE ON project_context_snapshots FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_project_dna_updated_at BEFORE UPDATE ON project_dna FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_ai_agent_sessions_updated_at BEFORE UPDATE ON ai_agent_sessions FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_visual_code_mappings_updated_at BEFORE UPDATE ON visual_code_mappings FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_ai_intent_executions_updated_at BEFORE UPDATE ON ai_intent_executions FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE project_context_snapshots IS 'Stores visual and code context snapshots for AI memory and analysis';
COMMENT ON TABLE project_dna IS 'Tracks evolutionary patterns, decisions, and insights for each project';
COMMENT ON TABLE ai_agent_sessions IS 'Manages AI agent coordination and collaboration sessions';
COMMENT ON TABLE visual_code_mappings IS 'Maps UI elements to their corresponding code locations';
COMMENT ON TABLE ai_intent_executions IS 'Tracks user intents and their AI-driven implementation';