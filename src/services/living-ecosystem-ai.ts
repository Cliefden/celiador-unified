import { AIService, AIMessage, AIResponse } from '../ai-service.js';
import { LivingEcosystemWebSocketService } from './living-ecosystem-websocket.js';
import { createClient } from '@supabase/supabase-js';

// Types for the Living Ecosystem
interface ProjectContext {
  projectId: string;
  userId: string;
  name?: string;
  description?: string;
  tech_stack?: string[];
  current_files?: string[];
  file_contents?: { [key: string]: string };
}

interface VisualContext {
  screenshotUrl?: string;
  uiElements?: UIElement[];
  userInteractions?: UserInteraction[];
  previewUrl?: string;
}

interface UIElement {
  id: string;
  selector: string;
  type: string;
  coordinates: { x: number; y: number; width: number; height: number };
  text?: string;
  attributes?: Record<string, any>;
}

interface UserInteraction {
  timestamp: string;
  type: 'click' | 'hover' | 'scroll' | 'type';
  element?: string;
  coordinates?: { x: number; y: number };
  data?: any;
}

interface SpecializedAgent {
  id: string;
  type: 'architect' | 'performance' | 'security' | 'ux' | 'integration';
  status: 'active' | 'paused' | 'completed' | 'failed';
  capabilities: string[];
  context: any;
  progress: number;
}

interface AgentCollaboration {
  id: string;
  projectId: string;
  agents: SpecializedAgent[];
  coordinationPlan: any;
  status: 'planning' | 'executing' | 'completed' | 'failed';
}

interface IntentExecutionPlan {
  intentId: string;
  userIntent: string;
  requiredAgents: string[];
  steps: ExecutionStep[];
  estimatedComplexity: number;
  visualContext?: VisualContext;
}

interface ExecutionStep {
  id: string;
  agentType: string;
  action: string;
  dependencies: string[];
  expectedOutput: string;
}

/**
 * Living Ecosystem AI Service
 * Extends existing AIService with contextual awareness and multi-agent coordination
 * Safe: Only adds functionality, doesn't modify existing behavior
 */
export class LivingEcosystemAIService {
  private baseAIService: AIService;
  private websocketService: LivingEcosystemWebSocketService;
  private supabase: any;
  private db: any;
  
  // Internal state
  private activeAgents: Map<string, SpecializedAgent> = new Map();
  private activeCollaborations: Map<string, AgentCollaboration> = new Map();
  private contextMemory: Map<string, any> = new Map();

  constructor(
    baseAIService: AIService,
    websocketService: LivingEcosystemWebSocketService,
    supabaseUrl?: string,
    supabaseServiceKey?: string,
    databaseService?: any
  ) {
    this.baseAIService = baseAIService;
    this.websocketService = websocketService;
    this.db = databaseService;
    
    if (supabaseUrl && supabaseServiceKey) {
      this.supabase = createClient(supabaseUrl, supabaseServiceKey);
    }
    
    console.log('🌟 Living Ecosystem AI Service initialized');
  }

  /**
   * Main entry point: Process user intent with full context awareness
   */
  async processIntent(
    userIntent: string,
    projectContext: ProjectContext,
    visualContext?: VisualContext
  ): Promise<{
    intentId: string;
    executionPlan: IntentExecutionPlan;
    immediateResponse: string;
  }> {
    const intentId = `intent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`🎯 Processing intent: "${userIntent}" (${intentId})`);
    
    // Notify WebSocket listeners
    this.websocketService.notifyIntentReceived(
      projectContext.userId,
      projectContext.projectId,
      intentId,
      userIntent
    );

    try {
      // Step 1: Capture current context snapshot
      const contextSnapshot = await this.captureContextSnapshot(projectContext, visualContext);
      
      // Step 2: Analyze intent and determine required agents
      const requiredAgents = await this.analyzeRequiredAgents(userIntent, projectContext, visualContext);
      
      // Step 3: Create execution plan
      const executionPlan = await this.createExecutionPlan(
        intentId,
        userIntent,
        requiredAgents,
        projectContext,
        visualContext
      );
      
      // Step 4: Generate immediate response
      const immediateResponse = await this.generateImmediateResponse(userIntent, executionPlan);
      
      // Notify planning complete
      this.websocketService.notifyIntentPlanning(
        projectContext.userId,
        projectContext.projectId,
        intentId,
        userIntent,
        executionPlan
      );
      
      // Step 5: Start asynchronous execution
      this.executeIntentAsync(intentId, executionPlan, projectContext);
      
      return {
        intentId,
        executionPlan,
        immediateResponse
      };
      
    } catch (error) {
      console.error(`❌ Error processing intent ${intentId}:`, error);
      
      this.websocketService.notifyIntentFailed(
        projectContext.userId,
        projectContext.projectId,
        intentId,
        userIntent,
        error instanceof Error ? error.message : 'Unknown error'
      );
      
      throw error;
    }
  }

  /**
   * Capture and store current project context
   */
  private async captureContextSnapshot(
    projectContext: ProjectContext,
    visualContext?: VisualContext
  ): Promise<string> {
    if (!this.supabase) {
      console.warn('⚠️ No Supabase client, skipping context snapshot');
      return 'no_snapshot';
    }

    try {
      const snapshot = {
        project_id: projectContext.projectId,
        user_id: projectContext.userId,
        snapshot_type: 'intent_triggered',
        visual_state: visualContext || {},
        code_state: {
          files: projectContext.current_files || [],
          tech_stack: projectContext.tech_stack || []
        },
        ai_insights: {
          captured_at: new Date().toISOString(),
          trigger: 'user_intent'
        }
      };

      const { data, error } = await this.supabase
        .from('project_context_snapshots')
        .insert(snapshot)
        .select()
        .single();

      if (error) {
        console.error('❌ Error saving context snapshot:', error);
        return 'snapshot_error';
      }

      console.log(`📸 Context snapshot captured: ${data.id}`);
      
      this.websocketService.notifyVisualContextCaptured(
        projectContext.userId,
        projectContext.projectId,
        data.id,
        snapshot
      );

      return data.id;
    } catch (error) {
      console.error('❌ Error in captureContextSnapshot:', error);
      return 'snapshot_error';
    }
  }

  /**
   * Analyze intent to determine which specialized agents are needed
   */
  private async analyzeRequiredAgents(
    userIntent: string,
    projectContext: ProjectContext,
    visualContext?: VisualContext
  ): Promise<string[]> {
    const analysisPrompt = `Analyze this user intent and determine which specialized AI agents should handle it:

User Intent: "${userIntent}"

Project Context:
- Name: ${projectContext.name || 'Unknown'}
- Tech Stack: ${projectContext.tech_stack?.join(', ') || 'Unknown'}
- Files: ${projectContext.current_files?.length || 0} files

Available Agents:
- architect: Overall design and structure decisions
- performance: Optimization and performance improvements
- security: Security analysis and improvements
- ux: User experience and interface improvements
- integration: External service and API integrations

Visual Context Available: ${!!visualContext}

Respond with a JSON array of required agent types, e.g., ["ux", "architect"]`;

    try {
      const response = await this.baseAIService.generateResponse([
        { role: 'system', content: analysisPrompt },
        { role: 'user', content: userIntent }
      ], { provider: 'openai', model: 'gpt-4o-mini' });

      // Parse agent requirements from response
      const agentMatch = response.content.match(/\[(.*?)\]/);
      if (agentMatch) {
        const agentsStr = agentMatch[1];
        const agents = agentsStr.split(',').map(a => a.trim().replace(/"/g, ''));
        console.log(`🤖 Required agents for "${userIntent}": ${agents.join(', ')}`);
        return agents.filter(a => ['architect', 'performance', 'security', 'ux', 'integration'].includes(a));
      }

      // Fallback: determine based on keywords
      return this.determineAgentsByKeywords(userIntent);
    } catch (error) {
      console.error('❌ Error analyzing required agents:', error);
      return this.determineAgentsByKeywords(userIntent);
    }
  }

  /**
   * Fallback method to determine agents by keywords
   */
  private determineAgentsByKeywords(userIntent: string): string[] {
    const intent = userIntent.toLowerCase();
    const agents: string[] = [];

    if (intent.includes('design') || intent.includes('layout') || intent.includes('ui') || intent.includes('modern')) {
      agents.push('ux');
    }
    if (intent.includes('performance') || intent.includes('optimize') || intent.includes('speed') || intent.includes('slow')) {
      agents.push('performance');
    }
    if (intent.includes('security') || intent.includes('auth') || intent.includes('permission')) {
      agents.push('security');
    }
    if (intent.includes('api') || intent.includes('integrate') || intent.includes('service') || intent.includes('connect')) {
      agents.push('integration');
    }
    if (intent.includes('structure') || intent.includes('organize') || intent.includes('refactor') || intent.includes('architecture')) {
      agents.push('architect');
    }

    // Default to UX agent if no specific match
    if (agents.length === 0) {
      agents.push('ux');
    }

    return agents;
  }

  /**
   * Create detailed execution plan
   */
  private async createExecutionPlan(
    intentId: string,
    userIntent: string,
    requiredAgents: string[],
    projectContext: ProjectContext,
    visualContext?: VisualContext
  ): Promise<IntentExecutionPlan> {
    // Estimate complexity (1-10 scale)
    const complexity = Math.min(10, Math.max(1, requiredAgents.length * 2 + (visualContext ? 1 : 0)));

    // Create execution steps
    const steps: ExecutionStep[] = requiredAgents.map((agentType, index) => ({
      id: `step_${index + 1}`,
      agentType,
      action: this.getDefaultActionForAgent(agentType, userIntent),
      dependencies: index > 0 ? [`step_${index}`] : [],
      expectedOutput: this.getExpectedOutputForAgent(agentType, userIntent)
    }));

    return {
      intentId,
      userIntent,
      requiredAgents,
      steps,
      estimatedComplexity: complexity,
      visualContext
    };
  }

  private getDefaultActionForAgent(agentType: string, userIntent: string): string {
    switch (agentType) {
      case 'architect': return `Analyze project structure and suggest architectural improvements for: ${userIntent}`;
      case 'performance': return `Analyze performance implications and suggest optimizations for: ${userIntent}`;
      case 'security': return `Review security considerations and suggest improvements for: ${userIntent}`;
      case 'ux': return `Analyze user experience and suggest UI/UX improvements for: ${userIntent}`;
      case 'integration': return `Analyze integration requirements and suggest implementation for: ${userIntent}`;
      default: return `Analyze and suggest improvements for: ${userIntent}`;
    }
  }

  private getExpectedOutputForAgent(agentType: string, userIntent: string): string {
    switch (agentType) {
      case 'architect': return 'Architectural recommendations and code structure suggestions';
      case 'performance': return 'Performance optimization recommendations and metrics';
      case 'security': return 'Security analysis and vulnerability remediation suggestions';
      case 'ux': return 'UI/UX improvements and design recommendations';
      case 'integration': return 'Integration implementation plan and code suggestions';
      default: return 'Analysis and improvement recommendations';
    }
  }

  /**
   * Generate immediate response to user
   */
  private async generateImmediateResponse(
    userIntent: string,
    executionPlan: IntentExecutionPlan
  ): Promise<string> {
    const agentList = executionPlan.requiredAgents.join(', ');
    const stepCount = executionPlan.steps.length;
    
    return `I understand you want to "${userIntent}". I've created an execution plan involving ${stepCount} steps with specialized agents: ${agentList}. I'll coordinate these agents to implement your request and provide real-time updates through the WebSocket connection.`;
  }

  /**
   * Execute intent asynchronously with agent coordination
   */
  private async executeIntentAsync(
    intentId: string,
    executionPlan: IntentExecutionPlan,
    projectContext: ProjectContext
  ): Promise<void> {
    this.websocketService.notifyIntentExecuting(
      projectContext.userId,
      projectContext.projectId,
      intentId,
      executionPlan.userIntent,
      0
    );

    try {
      const collaboration = await this.spawnAgentCollaboration(
        executionPlan.requiredAgents,
        projectContext,
        intentId
      );

      // Execute steps sequentially
      for (let i = 0; i < executionPlan.steps.length; i++) {
        const step = executionPlan.steps[i];
        const progress = Math.floor(((i + 1) / executionPlan.steps.length) * 100);

        console.log(`⚙️ Executing step ${i + 1}/${executionPlan.steps.length}: ${step.action}`);

        await this.executeStep(step, projectContext, collaboration);

        this.websocketService.notifyIntentExecuting(
          projectContext.userId,
          projectContext.projectId,
          intentId,
          executionPlan.userIntent,
          progress
        );
      }

      // Complete execution
      await this.completeIntentExecution(intentId, executionPlan, projectContext, collaboration);

    } catch (error) {
      console.error(`❌ Error executing intent ${intentId}:`, error);
      
      this.websocketService.notifyIntentFailed(
        projectContext.userId,
        projectContext.projectId,
        intentId,
        executionPlan.userIntent,
        error instanceof Error ? error.message : 'Execution failed'
      );
    }
  }

  /**
   * Spawn and coordinate specialized agents
   */
  private async spawnAgentCollaboration(
    requiredAgents: string[],
    projectContext: ProjectContext,
    intentId: string
  ): Promise<AgentCollaboration> {
    const collaborationId = `collab_${intentId}`;
    
    const agents: SpecializedAgent[] = requiredAgents.map(agentType => {
      const agentId = `${agentType}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      
      const agent: SpecializedAgent = {
        id: agentId,
        type: agentType as any,
        status: 'active',
        capabilities: this.getAgentCapabilities(agentType),
        context: { projectContext, intentId },
        progress: 0
      };

      this.activeAgents.set(agentId, agent);
      
      // Notify WebSocket
      this.websocketService.notifyAgentSpawn(
        projectContext.userId,
        projectContext.projectId,
        agentId,
        agentType as any,
        collaborationId
      );

      return agent;
    });

    const collaboration: AgentCollaboration = {
      id: collaborationId,
      projectId: projectContext.projectId,
      agents,
      coordinationPlan: { sequential: true }, // Start with sequential execution
      status: 'executing'
    };

    this.activeCollaborations.set(collaborationId, collaboration);
    
    return collaboration;
  }

  private getAgentCapabilities(agentType: string): string[] {
    switch (agentType) {
      case 'architect': return ['code_analysis', 'structure_optimization', 'pattern_detection'];
      case 'performance': return ['performance_analysis', 'optimization_suggestions', 'metrics_analysis'];
      case 'security': return ['vulnerability_scanning', 'security_recommendations', 'auth_analysis'];
      case 'ux': return ['ui_analysis', 'design_suggestions', 'accessibility_review'];
      case 'integration': return ['api_analysis', 'service_integration', 'data_flow_optimization'];
      default: return ['general_analysis'];
    }
  }

  /**
   * Execute individual step with appropriate agent
   */
  private async executeStep(
    step: ExecutionStep,
    projectContext: ProjectContext,
    collaboration: AgentCollaboration
  ): Promise<any> {
    const agent = collaboration.agents.find(a => a.type === step.agentType);
    if (!agent) {
      throw new Error(`Agent not found for type: ${step.agentType}`);
    }

    try {
      // Update agent status
      agent.status = 'active';
      agent.progress = 0;

      this.websocketService.notifyAgentUpdate(
        projectContext.userId,
        projectContext.projectId,
        agent.id,
        agent.type,
        agent.status,
        agent.progress,
        { executing: step.action }
      );

      // Execute the step using base AI service
      const result = await this.executeAgentTask(agent, step, projectContext);

      // Update progress
      agent.progress = 100;
      agent.status = 'completed';

      this.websocketService.notifyAgentUpdate(
        projectContext.userId,
        projectContext.projectId,
        agent.id,
        agent.type,
        agent.status,
        agent.progress,
        { completed: true, result }
      );

      this.websocketService.notifyAgentResult(
        projectContext.userId,
        projectContext.projectId,
        agent.id,
        agent.type,
        result
      );

      return result;

    } catch (error) {
      agent.status = 'failed';
      
      this.websocketService.notifyAgentUpdate(
        projectContext.userId,
        projectContext.projectId,
        agent.id,
        agent.type,
        agent.status,
        agent.progress,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );

      throw error;
    }
  }

  /**
   * Execute task for specific agent type
   */
  private async executeAgentTask(
    agent: SpecializedAgent,
    step: ExecutionStep,
    projectContext: ProjectContext
  ): Promise<any> {
    const systemPrompt = this.getAgentSystemPrompt(agent.type);
    
    // Get project files from database (JSONB) for much faster access
    let fileContentsSection = '';
    
    try {
      if (this.supabase && projectContext.projectId) {
        // Determine relevant file extensions based on agent type
        const targetExtensions = this.getRelevantExtensionsForAgent(agent.type);
        
        const { data: files, error } = await this.supabase
          .from('project_files')
          .select('file_name, file_path, file_content, file_extension, updated_at')
          .eq('project_id', projectContext.projectId)
          .in('file_extension', targetExtensions)
          .eq('is_text_file', true)
          .order('updated_at', { ascending: false })
          .limit(15); // More files for comprehensive analysis

        if (!error && files && files.length > 0) {
          console.log(`🚀 Retrieved ${files.length} files from database for agent ${agent.type}`);
          
          fileContentsSection = '\n\nFile Contents (from database):\n';
          for (const file of files) {
            const content = file.file_content?.content || '';
            if (content.trim()) {
              fileContentsSection += `\n--- ${file.file_path} ---\n${content}\n`;
            }
          }
        } else if (projectContext.file_contents && Object.keys(projectContext.file_contents).length > 0) {
          // Fallback to provided file contents
          fileContentsSection = '\n\nFile Contents (from context):\n';
          for (const [filePath, content] of Object.entries(projectContext.file_contents)) {
            fileContentsSection += `\n--- ${filePath} ---\n${content}\n`;
          }
        }
      } else if (projectContext.file_contents && Object.keys(projectContext.file_contents).length > 0) {
        // Fallback to provided file contents
        fileContentsSection = '\n\nFile Contents:\n';
        for (const [filePath, content] of Object.entries(projectContext.file_contents)) {
          fileContentsSection += `\n--- ${filePath} ---\n${content}\n`;
        }
      }
    } catch (error) {
      console.error('Error retrieving files from database, using context:', error);
      // Fallback to provided file contents
      if (projectContext.file_contents && Object.keys(projectContext.file_contents).length > 0) {
        fileContentsSection = '\n\nFile Contents:\n';
        for (const [filePath, content] of Object.entries(projectContext.file_contents)) {
          fileContentsSection += `\n--- ${filePath} ---\n${content}\n`;
        }
      }
    }

    const taskPrompt = `${step.action}

Project Context:
- Name: ${projectContext.name || 'Unknown'}
- Tech Stack: ${projectContext.tech_stack?.join(', ') || 'Unknown'}
- Files: ${projectContext.current_files?.join(', ') || 'None'}${fileContentsSection}

Expected Output: ${step.expectedOutput}

Please provide specific, actionable recommendations based on the actual code provided above.`;

    const response = await this.baseAIService.generateResponse([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: taskPrompt }
    ], { provider: 'openai', model: 'gpt-4o-mini' });

    return {
      agentType: agent.type,
      action: step.action,
      recommendations: response.content,
      metadata: {
        tokens_used: response.usage?.total_tokens || 0,
        model: 'gpt-4o-mini',
        timestamp: new Date().toISOString(),
        files_analyzed: fileContentsSection ? fileContentsSection.split('---').length - 1 : 0,
        source: fileContentsSection.includes('from database') ? 'database' : 'context'
      }
    };
  }

  /**
   * Get relevant file extensions based on agent type for optimized queries
   */
  private getRelevantExtensionsForAgent(agentType: string): string[] {
    switch (agentType) {
      case 'architect':
        return ['ts', 'tsx', 'js', 'jsx', 'json', 'md'];
      case 'performance':
        return ['ts', 'tsx', 'js', 'jsx', 'json', 'css', 'scss'];
      case 'security':
        return ['ts', 'tsx', 'js', 'jsx', 'json', 'env', 'yml', 'yaml'];
      case 'ux':
        return ['tsx', 'jsx', 'css', 'scss', 'html', 'md'];
      case 'integration':
        return ['ts', 'tsx', 'js', 'jsx', 'json', 'yml', 'yaml'];
      default:
        return ['ts', 'tsx', 'js', 'jsx', 'json'];
    }
  }

  private getAgentSystemPrompt(agentType: string): string {
    const basePrompt = "You are a specialized AI agent working as part of a coordinated development team.";
    
    switch (agentType) {
      case 'architect':
        return `${basePrompt} You are the Architecture Agent, responsible for code structure, design patterns, and overall project organization. Focus on maintainability, scalability, and best practices.`;
      
      case 'performance':
        return `${basePrompt} You are the Performance Agent, responsible for optimization, efficiency, and speed improvements. Focus on performance metrics, bottlenecks, and optimization strategies.`;
      
      case 'security':
        return `${basePrompt} You are the Security Agent, responsible for identifying vulnerabilities, security best practices, and protection strategies. Focus on authentication, authorization, and data protection.`;
      
      case 'ux':
        return `${basePrompt} You are the UX Agent, responsible for user experience, interface design, and usability improvements. Focus on accessibility, user flow, and design consistency.`;
      
      case 'integration':
        return `${basePrompt} You are the Integration Agent, responsible for external services, APIs, and data flow between systems. Focus on connectivity, data synchronization, and service reliability.`;
      
      default:
        return `${basePrompt} You are a general development agent focused on code quality and best practices.`;
    }
  }

  /**
   * Complete intent execution and store results
   */
  private async completeIntentExecution(
    intentId: string,
    executionPlan: IntentExecutionPlan,
    projectContext: ProjectContext,
    collaboration: AgentCollaboration
  ): Promise<void> {
    // Collect all agent results
    const agentResults = collaboration.agents.map(agent => ({
      agentType: agent.type,
      status: agent.status,
      progress: agent.progress
    }));

    const result = {
      intentId,
      executionPlan,
      agentResults,
      completedAt: new Date().toISOString()
    };

    // Store in database if available
    if (this.supabase) {
      try {
        await this.supabase
          .from('ai_intent_executions')
          .insert({
            id: intentId,
            project_id: projectContext.projectId,
            user_id: projectContext.userId,
            user_intent: executionPlan.userIntent,
            execution_plan: executionPlan,
            status: 'completed',
            progress_percentage: 100,
            actions_completed: agentResults,
            completed_at: new Date().toISOString()
          });
      } catch (error) {
        console.error('❌ Error storing intent execution:', error);
      }
    }

    // Clean up active state
    collaboration.agents.forEach(agent => {
      this.activeAgents.delete(agent.id);
    });
    this.activeCollaborations.delete(collaboration.id);

    // Notify completion
    this.websocketService.notifyIntentCompleted(
      projectContext.userId,
      projectContext.projectId,
      intentId,
      executionPlan.userIntent,
      result
    );

    console.log(`🎉 Intent execution completed: ${intentId}`);
  }

  /**
   * Get current ecosystem status
   */
  public getEcosystemStatus() {
    return {
      activeAgents: this.activeAgents.size,
      activeCollaborations: this.activeCollaborations.size,
      contextMemorySize: this.contextMemory.size,
      isAvailable: this.baseAIService.isAvailable(),
      availableProviders: this.baseAIService.getAvailableProviders()
    };
  }
}

// Export factory function for safe creation
export function createLivingEcosystemAIService(
  baseAIService: AIService,
  websocketService: LivingEcosystemWebSocketService,
  supabaseUrl?: string,
  supabaseServiceKey?: string,
  databaseService?: any
): LivingEcosystemAIService {
  return new LivingEcosystemAIService(
    baseAIService,
    websocketService,
    supabaseUrl,
    supabaseServiceKey,
    databaseService
  );
}