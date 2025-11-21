import { WebSocketService, AuthenticatedWebSocket, BaseRealtimeEvent } from './websocket.js';

// Extended WebSocket events for Living Ecosystem (additive only)
export interface VisualContextEvent extends BaseRealtimeEvent {
  type: 'visual_context_captured' | 'ui_element_selected' | 'visual_diff_generated';
  projectId: string;
  snapshotId?: string;
  elementId?: string;
  visualDiff?: any;
  coordinates?: { x: number; y: number; width: number; height: number };
  data?: any;
}

export interface AgentCoordinationEvent extends BaseRealtimeEvent {
  type: 'agent_spawn' | 'agent_update' | 'agent_collaboration' | 'agent_result' | 'agent_complete';
  agentId: string;
  agentType: 'architect' | 'performance' | 'security' | 'ux' | 'integration';
  projectId: string;
  collaborationId?: string;
  parentAgentId?: string;
  status?: 'active' | 'paused' | 'completed' | 'failed';
  data: any;
  progress?: number;
}

export interface IntentExecutionEvent extends BaseRealtimeEvent {
  type: 'intent_received' | 'intent_planning' | 'intent_executing' | 'intent_completed' | 'intent_failed';
  intentId: string;
  projectId: string;
  userIntent: string;
  executionPlan?: any;
  progress?: number;
  result?: any;
  error?: string;
}

export interface ProjectDNAEvent extends BaseRealtimeEvent {
  type: 'pattern_detected' | 'decision_recorded' | 'insight_generated' | 'dna_updated';
  projectId: string;
  patternType: string;
  patternData: any;
  confidenceScore: number;
  relatedFiles?: string[];
}

// Extended event types (additive to existing ones)
export type LivingEcosystemEvent = VisualContextEvent | AgentCoordinationEvent | IntentExecutionEvent | ProjectDNAEvent;

/**
 * Extension of WebSocketService for Living Ecosystem AI features
 * Safe: Only adds new functionality, doesn't modify existing behavior
 */
export class LivingEcosystemWebSocketService {
  private baseWebSocketService: WebSocketService;

  constructor(baseWebSocketService: WebSocketService) {
    this.baseWebSocketService = baseWebSocketService;
  }

  // Visual Context Events
  public notifyVisualContextCaptured(
    userId: string, 
    projectId: string, 
    snapshotId: string, 
    visualData: any
  ) {
    const event: VisualContextEvent = {
      type: 'visual_context_captured',
      userId,
      projectId,
      snapshotId,
      data: visualData,
      timestamp: new Date().toISOString()
    };
    
    this.baseWebSocketService.broadcastToUser(userId, event as any);
    console.log(`📸 Visual context captured for project ${projectId}, snapshot ${snapshotId}`);
  }

  public notifyUIElementSelected(
    userId: string,
    projectId: string,
    elementId: string,
    coordinates: { x: number; y: number; width: number; height: number },
    codeMapping?: any
  ) {
    const event: VisualContextEvent = {
      type: 'ui_element_selected',
      userId,
      projectId,
      elementId,
      coordinates,
      data: { codeMapping },
      timestamp: new Date().toISOString()
    };

    this.baseWebSocketService.broadcastToUser(userId, event as any);
    console.log(`🎯 UI element selected: ${elementId} in project ${projectId}`);
  }

  public notifyVisualDiffGenerated(
    userId: string,
    projectId: string,
    visualDiff: any
  ) {
    const event: VisualContextEvent = {
      type: 'visual_diff_generated',
      userId,
      projectId,
      visualDiff,
      timestamp: new Date().toISOString()
    };

    this.baseWebSocketService.broadcastToUser(userId, event as any);
    console.log(`🔄 Visual diff generated for project ${projectId}`);
  }

  // Agent Coordination Events
  public notifyAgentSpawn(
    userId: string,
    projectId: string,
    agentId: string,
    agentType: 'architect' | 'performance' | 'security' | 'ux' | 'integration',
    collaborationId?: string
  ) {
    const event: AgentCoordinationEvent = {
      type: 'agent_spawn',
      userId,
      projectId,
      agentId,
      agentType,
      collaborationId,
      data: { spawned: true },
      timestamp: new Date().toISOString()
    };

    this.baseWebSocketService.broadcastToUser(userId, event as any);
    console.log(`🤖 Agent spawned: ${agentType} (${agentId}) for project ${projectId}`);
  }

  public notifyAgentUpdate(
    userId: string,
    projectId: string,
    agentId: string,
    agentType: 'architect' | 'performance' | 'security' | 'ux' | 'integration',
    status: 'active' | 'paused' | 'completed' | 'failed',
    progress: number,
    data: any
  ) {
    const event: AgentCoordinationEvent = {
      type: 'agent_update',
      userId,
      projectId,
      agentId,
      agentType,
      status,
      progress,
      data,
      timestamp: new Date().toISOString()
    };

    this.baseWebSocketService.broadcastToUser(userId, event as any);
    console.log(`🔄 Agent update: ${agentType} (${agentId}) - ${status} ${progress}%`);
  }

  public notifyAgentCollaboration(
    userId: string,
    projectId: string,
    primaryAgentId: string,
    collaboratingAgentId: string,
    collaborationId: string,
    collaborationData: any
  ) {
    const event: AgentCoordinationEvent = {
      type: 'agent_collaboration',
      userId,
      projectId,
      agentId: primaryAgentId,
      agentType: 'architect', // Will be determined dynamically
      collaborationId,
      parentAgentId: collaboratingAgentId,
      data: collaborationData,
      timestamp: new Date().toISOString()
    };

    this.baseWebSocketService.broadcastToUser(userId, event as any);
    console.log(`🤝 Agent collaboration: ${primaryAgentId} ↔ ${collaboratingAgentId}`);
  }

  public notifyAgentResult(
    userId: string,
    projectId: string,
    agentId: string,
    agentType: 'architect' | 'performance' | 'security' | 'ux' | 'integration',
    result: any
  ) {
    const event: AgentCoordinationEvent = {
      type: 'agent_result',
      userId,
      projectId,
      agentId,
      agentType,
      data: { result },
      timestamp: new Date().toISOString()
    };

    this.baseWebSocketService.broadcastToUser(userId, event as any);
    console.log(`✅ Agent result: ${agentType} (${agentId}) completed task`);
  }

  // Intent Execution Events
  public notifyIntentReceived(
    userId: string,
    projectId: string,
    intentId: string,
    userIntent: string
  ) {
    const event: IntentExecutionEvent = {
      type: 'intent_received',
      userId,
      projectId,
      intentId,
      userIntent,
      timestamp: new Date().toISOString()
    };

    this.baseWebSocketService.broadcastToUser(userId, event as any);
    console.log(`💭 Intent received: "${userIntent}" (${intentId})`);
  }

  public notifyIntentPlanning(
    userId: string,
    projectId: string,
    intentId: string,
    userIntent: string,
    executionPlan: any
  ) {
    const event: IntentExecutionEvent = {
      type: 'intent_planning',
      userId,
      projectId,
      intentId,
      userIntent,
      executionPlan,
      timestamp: new Date().toISOString()
    };

    this.baseWebSocketService.broadcastToUser(userId, event as any);
    console.log(`📋 Intent planning: ${intentId} - ${executionPlan.steps?.length || 0} steps`);
  }

  public notifyIntentExecuting(
    userId: string,
    projectId: string,
    intentId: string,
    userIntent: string,
    progress: number
  ) {
    const event: IntentExecutionEvent = {
      type: 'intent_executing',
      userId,
      projectId,
      intentId,
      userIntent,
      progress,
      timestamp: new Date().toISOString()
    };

    this.baseWebSocketService.broadcastToUser(userId, event as any);
    console.log(`⚙️ Intent executing: ${intentId} - ${progress}% complete`);
  }

  public notifyIntentCompleted(
    userId: string,
    projectId: string,
    intentId: string,
    userIntent: string,
    result: any
  ) {
    const event: IntentExecutionEvent = {
      type: 'intent_completed',
      userId,
      projectId,
      intentId,
      userIntent,
      result,
      timestamp: new Date().toISOString()
    };

    this.baseWebSocketService.broadcastToUser(userId, event as any);
    console.log(`🎉 Intent completed: ${intentId}`);
  }

  public notifyIntentFailed(
    userId: string,
    projectId: string,
    intentId: string,
    userIntent: string,
    error: string
  ) {
    const event: IntentExecutionEvent = {
      type: 'intent_failed',
      userId,
      projectId,
      intentId,
      userIntent,
      error,
      timestamp: new Date().toISOString()
    };

    this.baseWebSocketService.broadcastToUser(userId, event as any);
    console.log(`❌ Intent failed: ${intentId} - ${error}`);
  }

  // Project DNA Events
  public notifyPatternDetected(
    userId: string,
    projectId: string,
    patternType: string,
    patternData: any,
    confidenceScore: number,
    relatedFiles?: string[]
  ) {
    const event: ProjectDNAEvent = {
      type: 'pattern_detected',
      userId,
      projectId,
      patternType,
      patternData,
      confidenceScore,
      relatedFiles,
      timestamp: new Date().toISOString()
    };

    this.baseWebSocketService.broadcastToUser(userId, event as any);
    console.log(`🧬 Pattern detected: ${patternType} (confidence: ${confidenceScore})`);
  }

  public notifyDecisionRecorded(
    userId: string,
    projectId: string,
    patternType: string,
    patternData: any,
    confidenceScore: number
  ) {
    const event: ProjectDNAEvent = {
      type: 'decision_recorded',
      userId,
      projectId,
      patternType,
      patternData,
      confidenceScore,
      timestamp: new Date().toISOString()
    };

    this.baseWebSocketService.broadcastToUser(userId, event as any);
    console.log(`📝 Decision recorded: ${patternType}`);
  }

  public notifyInsightGenerated(
    userId: string,
    projectId: string,
    patternType: string,
    patternData: any,
    confidenceScore: number
  ) {
    const event: ProjectDNAEvent = {
      type: 'insight_generated',
      userId,
      projectId,
      patternType,
      patternData,
      confidenceScore,
      timestamp: new Date().toISOString()
    };

    this.baseWebSocketService.broadcastToUser(userId, event as any);
    console.log(`💡 Insight generated: ${patternType} (confidence: ${confidenceScore})`);
  }

  // Channel management (extends existing channel system)
  public getChannelForLivingEcosystemEvent(eventType: string): string {
    if (eventType.startsWith('visual_')) return 'visual_context';
    if (eventType.startsWith('agent_')) return 'ai_agents';
    if (eventType.startsWith('intent_')) return 'intent_execution';
    if (eventType.includes('pattern') || eventType.includes('decision') || eventType.includes('dna')) return 'project_dna';
    
    return 'ai_ecosystem'; // Default channel for AI ecosystem events
  }

  // Statistics for monitoring
  public getEcosystemStats() {
    return {
      ...this.baseWebSocketService.getStats(),
      ecosystem_features: {
        visual_context: true,
        agent_coordination: true,
        intent_execution: true,
        project_dna: true
      }
    };
  }
}

// Export a factory function to create the service safely
export function createLivingEcosystemWebSocketService(
  baseWebSocketService: WebSocketService
): LivingEcosystemWebSocketService {
  return new LivingEcosystemWebSocketService(baseWebSocketService);
}