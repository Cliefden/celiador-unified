import { AIService } from '../ai-service.js';
import { WebSocketService } from './websocket.js';
import { PreviewService } from './preview.js';
import { 
  LivingEcosystemWebSocketService, 
  createLivingEcosystemWebSocketService 
} from './living-ecosystem-websocket.js';
import { 
  LivingEcosystemAIService, 
  createLivingEcosystemAIService 
} from './living-ecosystem-ai.js';
import { 
  VisualContextCaptureService, 
  createVisualContextCaptureService 
} from './visual-context-capture.js';

/**
 * Feature flags for Living Ecosystem
 * Safe: All features are opt-in via environment variables
 */
interface LivingEcosystemFeatureFlags {
  enabled: boolean;
  multiAgentSystem: boolean;
  visualContextCapture: boolean;
  contextualMemory: boolean;
  intentExecution: boolean;
  projectDNATracking: boolean;
}

/**
 * Living Ecosystem Integration Manager
 * Safe: Only enables features when explicitly configured
 */
export class LivingEcosystemIntegration {
  private featureFlags: LivingEcosystemFeatureFlags;
  private ecosystemWebSocket?: LivingEcosystemWebSocketService;
  private ecosystemAI?: LivingEcosystemAIService;
  private visualCapture?: VisualContextCaptureService;

  constructor(
    private baseAIService: AIService,
    private baseWebSocketService: WebSocketService,
    private previewService: PreviewService,
    private databaseService?: any,
    private supabaseUrl?: string,
    private supabaseServiceKey?: string
  ) {
    // Initialize feature flags from environment
    this.featureFlags = this.initializeFeatureFlags();
    
    // Initialize services based on feature flags
    this.initializeServices();
    
    console.log('🌟 Living Ecosystem Integration initialized:', this.featureFlags);
  }

  /**
   * Initialize feature flags from environment variables
   * Safe: Defaults to disabled for all features
   */
  private initializeFeatureFlags(): LivingEcosystemFeatureFlags {
    return {
      enabled: process.env.LIVING_ECOSYSTEM_ENABLED === 'true',
      multiAgentSystem: process.env.MULTI_AGENT_SYSTEM_ENABLED === 'true',
      visualContextCapture: process.env.VISUAL_CONTEXT_CAPTURE_ENABLED === 'true',
      contextualMemory: process.env.CONTEXTUAL_MEMORY_ENABLED === 'true',
      intentExecution: process.env.INTENT_EXECUTION_ENABLED === 'true',
      projectDNATracking: process.env.PROJECT_DNA_TRACKING_ENABLED === 'true'
    };
  }

  /**
   * Initialize services based on enabled features
   * Safe: Only creates services for enabled features
   */
  private initializeServices(): void {
    if (!this.featureFlags.enabled) {
      console.log('🌟 Living Ecosystem is disabled (use LIVING_ECOSYSTEM_ENABLED=true to enable)');
      return;
    }

    console.log('🌟 Initializing Living Ecosystem services...');

    // Always initialize WebSocket extension if ecosystem is enabled
    this.ecosystemWebSocket = createLivingEcosystemWebSocketService(this.baseWebSocketService);
    console.log('✅ Living Ecosystem WebSocket extension initialized');

    // Initialize AI service if multi-agent or intent execution is enabled
    if (this.featureFlags.multiAgentSystem || this.featureFlags.intentExecution) {
      this.ecosystemAI = createLivingEcosystemAIService(
        this.baseAIService,
        this.ecosystemWebSocket,
        this.supabaseUrl,
        this.supabaseServiceKey,
        this.databaseService
      );
      console.log('✅ Living Ecosystem AI service initialized');
    }

    // Initialize visual capture if enabled
    if (this.featureFlags.visualContextCapture) {
      this.visualCapture = createVisualContextCaptureService(this.previewService);
      console.log('✅ Visual Context Capture service initialized');
    }
  }

  /**
   * Process user intent (main entry point)
   * Safe: Falls back to base AI service if ecosystem is disabled
   */
  async processUserIntent(
    userIntent: string,
    projectContext: {
      projectId: string;
      userId: string;
      name?: string;
      description?: string;
      tech_stack?: string[];
      current_files?: string[];
      file_contents?: { [key: string]: string };
    },
    visualContext?: {
      previewInstanceId?: string;
      screenshotUrl?: string;
      uiElements?: any[];
      userInteractions?: any[];
    }
  ): Promise<{
    response: string;
    intentId?: string;
    executionPlan?: any;
    usedLivingEcosystem: boolean;
  }> {
    // Check if Living Ecosystem should handle this
    if (this.shouldUseLivingEcosystem(userIntent, projectContext, visualContext)) {
      return await this.processWithLivingEcosystem(userIntent, projectContext, visualContext);
    } else {
      return await this.processWithBaseAI(userIntent, projectContext);
    }
  }

  /**
   * Determine if Living Ecosystem should handle the request
   * Safe: Conservative approach - only use ecosystem for explicit scenarios
   */
  private shouldUseLivingEcosystem(
    userIntent: string,
    projectContext: any,
    visualContext?: any
  ): boolean {
    if (!this.featureFlags.enabled || !this.ecosystemAI) {
      return false;
    }

    // Only use ecosystem for complex intents that benefit from multi-agent coordination
    const complexIntentKeywords = [
      'modernize', 'optimize', 'improve', 'refactor', 'redesign',
      'make it', 'change the', 'add feature', 'implement',
      'performance', 'security', 'accessibility', 'responsive'
    ];

    const intentLower = userIntent.toLowerCase();
    const hasComplexIntent = complexIntentKeywords.some(keyword => intentLower.includes(keyword));

    // Use ecosystem if:
    // 1. Intent is complex AND multi-agent is enabled
    // 2. Visual context is provided AND visual capture is enabled
    return (hasComplexIntent && this.featureFlags.multiAgentSystem) ||
           (visualContext && this.featureFlags.visualContextCapture);
  }

  /**
   * Process with Living Ecosystem
   */
  private async processWithLivingEcosystem(
    userIntent: string,
    projectContext: any,
    visualContext?: any
  ): Promise<any> {
    if (!this.ecosystemAI) {
      throw new Error('Living Ecosystem AI not available');
    }

    try {
      console.log(`🌟 Processing with Living Ecosystem: "${userIntent}"`);

      // Enhance visual context if available
      let enhancedVisualContext = visualContext;
      if (visualContext?.previewInstanceId && this.visualCapture) {
        const capturedContext = await this.visualCapture.captureVisualContext(
          visualContext.previewInstanceId,
          {
            includeScreenshot: true,
            analyzeUIElements: true,
            mapToCode: true
          }
        );

        if (capturedContext) {
          enhancedVisualContext = {
            ...visualContext,
            uiElements: capturedContext.uiElements,
            metadata: capturedContext.metadata
          };
        }
      }

      // Process with ecosystem
      const result = await this.ecosystemAI.processIntent(
        userIntent,
        projectContext,
        enhancedVisualContext
      );

      return {
        response: result.immediateResponse,
        intentId: result.intentId,
        executionPlan: result.executionPlan,
        usedLivingEcosystem: true
      };

    } catch (error) {
      console.error('❌ Error in Living Ecosystem processing:', error);
      
      // Fallback to base AI service
      console.log('🔄 Falling back to base AI service');
      return await this.processWithBaseAI(userIntent, projectContext);
    }
  }

  /**
   * Process with base AI service (fallback)
   * Safe: Uses existing functionality
   */
  private async processWithBaseAI(
    userIntent: string,
    projectContext: any
  ): Promise<any> {
    try {
      const systemPrompt = await this.baseAIService.createDevelopmentSystemPrompt(
        userIntent,
        projectContext
      );

      const response = await this.baseAIService.generateResponse([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userIntent }
      ], { provider: 'openai' });

      return {
        response: response.content,
        usedLivingEcosystem: false
      };

    } catch (error) {
      console.error('❌ Error in base AI processing:', error);
      throw error;
    }
  }

  /**
   * Capture visual context for a preview instance
   * Safe: Only works if visual capture is enabled
   */
  async captureVisualContext(
    instanceId: string,
    options: {
      includeScreenshot?: boolean;
      analyzeUIElements?: boolean;
      mapToCode?: boolean;
    } = {}
  ): Promise<any> {
    if (!this.featureFlags.visualContextCapture || !this.visualCapture) {
      console.log('📸 Visual context capture is disabled');
      return null;
    }

    return await this.visualCapture.captureVisualContext(instanceId, options);
  }

  /**
   * Record project DNA pattern
   * Safe: Only works if DNA tracking is enabled
   */
  async recordProjectPattern(
    projectId: string,
    userId: string,
    patternType: string,
    patternData: any,
    confidenceScore: number
  ): Promise<void> {
    if (!this.featureFlags.projectDNATracking || !this.ecosystemWebSocket) {
      return;
    }

    this.ecosystemWebSocket.notifyPatternDetected(
      userId,
      projectId,
      patternType,
      patternData,
      confidenceScore
    );
  }

  /**
   * Get ecosystem status
   */
  getStatus(): {
    featureFlags: LivingEcosystemFeatureFlags;
    services: {
      ecosystemWebSocket: boolean;
      ecosystemAI: boolean;
      visualCapture: boolean;
    };
    baseServices: {
      aiService: boolean;
      webSocketService: boolean;
      previewService: boolean;
    };
  } {
    return {
      featureFlags: this.featureFlags,
      services: {
        ecosystemWebSocket: !!this.ecosystemWebSocket,
        ecosystemAI: !!this.ecosystemAI,
        visualCapture: !!this.visualCapture
      },
      baseServices: {
        aiService: this.baseAIService.isAvailable(),
        webSocketService: !!this.baseWebSocketService,
        previewService: !!this.previewService
      }
    };
  }

  /**
   * Update feature flags at runtime
   * Safe: Allows dynamic enabling/disabling of features
   */
  updateFeatureFlags(newFlags: Partial<LivingEcosystemFeatureFlags>): void {
    const oldFlags = { ...this.featureFlags };
    this.featureFlags = { ...this.featureFlags, ...newFlags };
    
    console.log('🔧 Feature flags updated:', {
      old: oldFlags,
      new: this.featureFlags
    });

    // Reinitialize services if needed
    if (newFlags.enabled !== undefined) {
      this.initializeServices();
    }

    // Update visual capture service
    if (newFlags.visualContextCapture !== undefined && this.visualCapture) {
      this.visualCapture.setEnabled(newFlags.visualContextCapture);
    }
  }

  /**
   * Get ecosystem WebSocket service (for external use)
   */
  getEcosystemWebSocket(): LivingEcosystemWebSocketService | undefined {
    return this.ecosystemWebSocket;
  }

  /**
   * Get ecosystem AI service (for external use)
   */
  getEcosystemAI(): LivingEcosystemAIService | undefined {
    return this.ecosystemAI;
  }

  /**
   * Get visual capture service (for external use)
   */
  getVisualCapture(): VisualContextCaptureService | undefined {
    return this.visualCapture;
  }
}

// Export factory function for safe creation
export function createLivingEcosystemIntegration(
  baseAIService: AIService,
  baseWebSocketService: WebSocketService,
  previewService: PreviewService,
  databaseService?: any,
  supabaseUrl?: string,
  supabaseServiceKey?: string
): LivingEcosystemIntegration {
  return new LivingEcosystemIntegration(
    baseAIService,
    baseWebSocketService,
    previewService,
    databaseService,
    supabaseUrl,
    supabaseServiceKey
  );
}