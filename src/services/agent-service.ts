import { OpenAI } from 'openai';
import { createClient } from '@supabase/supabase-js';

interface AgentConfig {
  type: 'architect' | 'performance' | 'security' | 'ux' | 'integration';
  name: string;
  systemPrompt: string;
  analysisTargets: string[];
}

interface AgentResult {
  agentId: string;
  type: string;
  status: 'active' | 'completed' | 'failed';
  progress: number;
  currentTask?: string;
  insights: string[];
  suggestions: Array<{
    title: string;
    description: string;
    impact: 'low' | 'medium' | 'high';
    autoApplicable: boolean;
    codeChanges?: {
      file: string;
      changes: string;
    }[];
  }>;
  metadata: {
    tokensUsed: number;
    executionTime: number;
    filesAnalyzed: number;
    patterns?: any[];
  };
}

export class AgentService {
  private openai: OpenAI;
  private supabase: any;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  private getAgentConfig(type: string): AgentConfig {
    const configs: Record<string, AgentConfig> = {
      architect: {
        type: 'architect',
        name: 'Architect Agent',
        systemPrompt: `You are an expert software architect analyzing React/TypeScript codebases. 
        Focus on:
        - Component architecture patterns and organization
        - Props interface design and TypeScript usage
        - Code reusability and maintainability
        - File structure and naming conventions
        - State management patterns
        
        Provide actionable insights and specific suggestions for improvement.`,
        analysisTargets: ['.tsx', '.ts', '.jsx', '.js']
      },
      performance: {
        type: 'performance',
        name: 'Performance Agent', 
        systemPrompt: `You are a performance optimization expert analyzing web applications.
        Focus on:
        - Bundle size analysis and optimization opportunities
        - Code splitting and lazy loading potential
        - Unused dependencies and dead code
        - Performance bottlenecks and rendering issues
        - Image and asset optimization
        
        Provide specific, measurable optimization recommendations.`,
        analysisTargets: ['package.json', '.tsx', '.ts', '.css', '.json']
      },
      security: {
        type: 'security',
        name: 'Security Agent',
        systemPrompt: `You are a security expert analyzing web applications for vulnerabilities.
        Focus on:
        - Dependency vulnerabilities and outdated packages
        - Input validation and sanitization
        - Authentication and authorization patterns
        - XSS, CSRF, and other common vulnerabilities
        - API security and data exposure
        
        Provide security recommendations with severity levels.`,
        analysisTargets: ['package.json', '.tsx', '.ts', '.env']
      },
      ux: {
        type: 'ux',
        name: 'UX Agent',
        systemPrompt: `You are a UX expert analyzing user interfaces for usability and accessibility.
        Focus on:
        - Accessibility compliance (WCAG standards)
        - Mobile responsiveness and responsive design
        - User interaction patterns and usability
        - Color contrast and visual hierarchy
        - Form design and user flows
        
        Provide actionable UX improvements with impact assessment.`,
        analysisTargets: ['.tsx', '.jsx', '.css', '.scss']
      },
      integration: {
        type: 'integration',
        name: 'Integration Agent',
        systemPrompt: `You are an integration expert analyzing API connections and external services.
        Focus on:
        - API integration patterns and error handling
        - External service dependencies
        - Data flow and state synchronization
        - Rate limiting and caching strategies
        - Service reliability and failover
        
        Provide integration optimization recommendations.`,
        analysisTargets: ['.tsx', '.ts', '.json']
      }
    };

    return configs[type] || configs.architect;
  }

  async analyzeProject(
    projectId: string, 
    agentType: string, 
    userId: string
  ): Promise<AgentResult> {
    const startTime = Date.now();
    const agentId = `agent-${agentType}-${Date.now()}`;
    const config = this.getAgentConfig(agentType);
    
    try {
      console.log(`[AgentService] Starting ${config.name} analysis for project ${projectId}`);
      
      // Get project files from database (JSONB) or Supabase Storage fallback
      const projectFiles = await this.getProjectFiles(projectId, config.analysisTargets, userId);
      
      if (projectFiles.length === 0) {
        return {
          agentId,
          type: agentType,
          status: 'failed',
          progress: 0,
          insights: ['No relevant files found for analysis'],
          suggestions: [],
          metadata: {
            tokensUsed: 0,
            executionTime: Date.now() - startTime,
            filesAnalyzed: 0
          }
        };
      }

      // Analyze files with OpenAI
      const analysis = await this.performAIAnalysis(config, projectFiles);
      
      const result: AgentResult = {
        agentId,
        type: agentType,
        status: 'completed',
        progress: 100,
        currentTask: `Analysis completed - ${projectFiles.length} files analyzed`,
        insights: analysis.insights || [],
        suggestions: analysis.suggestions || [],
        metadata: {
          tokensUsed: analysis.tokensUsed || 0,
          executionTime: Date.now() - startTime,
          filesAnalyzed: projectFiles.length,
          patterns: analysis.patterns || []
        }
      };

      console.log(`[AgentService] ${config.name} analysis completed for project ${projectId}`);
      return result;

    } catch (error) {
      console.error(`[AgentService] Error in ${config.name} analysis:`, error);
      return {
        agentId,
        type: agentType,
        status: 'failed',
        progress: 0,
        insights: [`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        suggestions: [],
        metadata: {
          tokensUsed: 0,
          executionTime: Date.now() - startTime,
          filesAnalyzed: 0
        }
      };
    }
  }

  private async getProjectFiles(projectId: string, targetExtensions: string[], userId: string): Promise<Array<{name: string, content: string}>> {
    try {
      // Normalize extensions (remove dots if present)
      const normalizedExtensions = targetExtensions.map(ext => ext.startsWith('.') ? ext.substring(1) : ext);
      
      // Get project files from database with JSONB storage (10-50x faster than Supabase Storage)
      // Use service role to bypass RLS
      const { data: files, error } = await this.supabase
        .from('project_files')
        .select('file_name, file_path, file_content, file_extension, updated_at')
        .eq('project_id', projectId)
        .eq('user_id', userId) // Add user_id filter for additional security
        .in('file_extension', normalizedExtensions)
        .eq('is_text_file', true)
        .order('updated_at', { ascending: false })
        .limit(10); // Limit to 10 files to avoid token limits

      if (error) {
        console.error(`[AgentService] Error querying project files from database:`, error);
        console.error(`[AgentService] Query was: project_id=${projectId}, user_id=${userId}, normalized_extensions=${normalizedExtensions.join(',')}`);
        
        // Fallback to Supabase Storage if database doesn't have the files yet
        return this.getProjectFilesFromStorage(projectId, targetExtensions);
      }

      if (!files || files.length === 0) {
        console.log(`[AgentService] No files found in database for project ${projectId}, falling back to storage`);
        console.log(`[AgentService] Query was: project_id=${projectId}, user_id=${userId}, normalized_extensions=${normalizedExtensions.join(',')}`);
        
        // Fallback to Supabase Storage
        return this.getProjectFilesFromStorage(projectId, targetExtensions);
      }

      console.log(`[AgentService] Retrieved ${files.length} files from database for project ${projectId}`);

      // Extract content from JSONB and return in expected format
      return files.map((file: any) => ({
        name: file.file_name,
        content: file.file_content?.content || ''
      }));

    } catch (error) {
      console.error('[AgentService] Error getting project files from database:', error);
      
      // Fallback to Supabase Storage
      return this.getProjectFilesFromStorage(projectId, targetExtensions);
    }
  }

  // Fallback method for Supabase Storage (legacy)
  private async getProjectFilesFromStorage(projectId: string, targetExtensions: string[]): Promise<Array<{name: string, content: string}>> {
    try {
      console.log(`[AgentService] Falling back to Supabase Storage for project ${projectId}`);
      
      // List files in project storage
      const { data: files, error } = await this.supabase.storage
        .from('projects')
        .list(projectId, {
          limit: 100,
          sortBy: { column: 'name', order: 'asc' }
        });

      if (error || !files) {
        console.log(`[AgentService] No files found in storage for project ${projectId}`);
        return [];
      }

      const relevantFiles = files.filter((file: any) => 
        targetExtensions.some(ext => file.name.endsWith(ext))
      );

      const fileContents = await Promise.all(
        relevantFiles.slice(0, 10).map(async (file: any) => { // Limit to 10 files to avoid token limits
          try {
            const { data, error } = await this.supabase.storage
              .from('projects')
              .download(`${projectId}/${file.name}`);

            if (error || !data) {
              console.log(`[AgentService] Failed to download file ${file.name}`);
              return null;
            }

            const content = await data.text();
            return { name: file.name, content };
          } catch (error) {
            console.log(`[AgentService] Error reading file ${file.name}:`, error);
            return null;
          }
        })
      );

      return fileContents.filter((file): file is {name: string, content: string} => file !== null);
    } catch (error) {
      console.error('[AgentService] Error getting project files from storage:', error);
      return [];
    }
  }

  private async performAIAnalysis(
    config: AgentConfig,
    files: Array<{name: string, content: string}>
  ): Promise<{
    insights: string[];
    suggestions: any[];
    tokensUsed: number;
    patterns?: any[];
  }> {
    const filesContent = files.map(file => 
      `=== ${file.name} ===\n${file.content}\n`
    ).join('\n');

    const prompt = `${config.systemPrompt}

Analyze the following project files and provide:
1. Key insights about the codebase (3-5 bullet points)
2. Specific actionable suggestions for improvement (2-4 suggestions)
3. Detected patterns or issues

Files to analyze:
${filesContent}

Respond in JSON format:
{
  "insights": ["insight1", "insight2", ...],
  "suggestions": [
    {
      "title": "Suggestion Title",
      "description": "Detailed description",
      "impact": "high|medium|low", 
      "autoApplicable": true/false
    }
  ],
  "patterns": ["pattern1", "pattern2", ...]
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 2000
      });

      const analysis = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        insights: analysis.insights || [],
        suggestions: analysis.suggestions || [],
        tokensUsed: response.usage?.total_tokens || 0,
        patterns: analysis.patterns || []
      };
    } catch (error) {
      console.error('[AgentService] AI analysis failed:', error);
      return {
        insights: ['AI analysis failed - unable to process files'],
        suggestions: [],
        tokensUsed: 0
      };
    }
  }

  async getAllAgentTypes(): Promise<string[]> {
    return ['architect', 'performance', 'security', 'ux', 'integration'];
  }
}