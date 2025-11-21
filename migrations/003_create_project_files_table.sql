-- Migration: Create project_files table for JSONB file storage
-- This replaces Supabase Storage for faster AI file access

-- Create project_files table with JSONB storage
CREATE TABLE IF NOT EXISTS project_files (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    
    -- File metadata
    file_path TEXT NOT NULL, -- Relative path within project (e.g., "src/components/Button.tsx")
    file_name TEXT NOT NULL, -- Just the filename (e.g., "Button.tsx")
    file_extension TEXT, -- File extension (e.g., "tsx", "js", "css")
    file_size INTEGER NOT NULL DEFAULT 0, -- File size in bytes
    
    -- File content as JSONB for fast querying and indexing
    file_content JSONB NOT NULL, -- Store as: {"content": "actual file content", "encoding": "utf8"}
    
    -- Content analysis for AI optimization
    content_hash TEXT, -- SHA256 hash for deduplication
    content_type TEXT DEFAULT 'text/plain', -- MIME type
    is_text_file BOOLEAN DEFAULT true, -- Whether file is text-based
    
    -- Metadata for AI analysis
    analysis_metadata JSONB DEFAULT '{}', -- Store AI analysis results, tokens count, etc.
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_file_per_project UNIQUE(project_id, file_path)
);

-- Create indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_project_files_project_id ON project_files(project_id);
CREATE INDEX IF NOT EXISTS idx_project_files_user_id ON project_files(user_id);
CREATE INDEX IF NOT EXISTS idx_project_files_file_extension ON project_files(file_extension);
CREATE INDEX IF NOT EXISTS idx_project_files_updated_at ON project_files(updated_at);

-- GIN index on JSONB content for fast text search within file contents
CREATE INDEX IF NOT EXISTS idx_project_files_content_gin ON project_files USING GIN(file_content);

-- Index for file path searches
CREATE INDEX IF NOT EXISTS idx_project_files_file_path ON project_files(file_path text_pattern_ops);

-- Partial index for text files only (most AI analysis)
CREATE INDEX IF NOT EXISTS idx_project_files_text_files ON project_files(project_id, file_extension, updated_at) 
WHERE is_text_file = true;

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_project_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_project_files_updated_at
    BEFORE UPDATE ON project_files
    FOR EACH ROW
    EXECUTE FUNCTION update_project_files_updated_at();

-- Enable Row Level Security
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access files from their own projects
CREATE POLICY "Users can access their own project files" ON project_files
    FOR ALL USING (
        user_id = auth.uid()
        OR 
        project_id IN (
            SELECT id FROM projects WHERE user_id = auth.uid()
        )
    );

-- RLS Policy: Service role can access all files
CREATE POLICY "Service role can access all project files" ON project_files
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'service_role'
    );

-- Create view for easy file content retrieval
CREATE OR REPLACE VIEW project_files_with_content AS
SELECT 
    pf.id,
    pf.project_id,
    pf.user_id,
    pf.file_path,
    pf.file_name,
    pf.file_extension,
    pf.file_size,
    pf.file_content->>'content' as content, -- Extract content as text
    pf.file_content->>'encoding' as encoding,
    pf.content_hash,
    pf.content_type,
    pf.is_text_file,
    pf.analysis_metadata,
    pf.created_at,
    pf.updated_at,
    p.name as project_name
FROM project_files pf
JOIN projects p ON pf.project_id = p.id;

-- Grant permissions
GRANT ALL ON project_files TO authenticated;
GRANT ALL ON project_files TO service_role;
GRANT SELECT ON project_files_with_content TO authenticated;
GRANT SELECT ON project_files_with_content TO service_role;

-- Comments for documentation
COMMENT ON TABLE project_files IS 'JSONB-based storage for project files, optimized for AI analysis and fast retrieval';
COMMENT ON COLUMN project_files.file_content IS 'JSONB storage containing file content and metadata for fast querying';
COMMENT ON COLUMN project_files.analysis_metadata IS 'JSONB storage for AI analysis results, caching, and optimization data';
COMMENT ON INDEX idx_project_files_content_gin IS 'GIN index for fast full-text search within file contents';
COMMENT ON INDEX idx_project_files_text_files IS 'Optimized index for AI analysis queries on text files only';