import express from 'express';
import { authenticateUser } from '../middleware/auth.js';
import { aiService } from '../ai-service.js';

const router = express.Router();

// Access services from app.locals (set by main index.ts)
const getServices = (req: any) => ({
  supabase: req.app.locals.supabase,
  supabaseService: req.app.locals.supabaseService,
  db: req.app.locals.db,
  jobService: req.app.locals.jobService,
  websocket: req.app.locals.websocket
});

// Execute a file operation (create, update, or delete file)
async function executeFileOperation(action: any, projectId: string, req: any) {
  const { supabaseService, db } = getServices(req);
  
  console.log(`[Chat] Executing file operation: ${action.type} for ${action.path}`);
  
  switch (action.type) {
    case 'create_file':
    case 'update_file':
      // Save file content using the files API logic
      try {
        const { data, error } = await supabaseService.storage
          .from('project-files')
          .upload(`${projectId}/${action.path}`, action.content || '', {
            contentType: getFileContentType(action.path),
            upsert: true // This allows both create and update
          });

        if (error) {
          throw new Error(`Failed to ${action.type}: ${error.message}`);
        }
        
        console.log(`[Chat] ✅ ${action.type} successful: ${action.path}`);
      } catch (error) {
        console.error(`[Chat] ❌ ${action.type} failed for ${action.path}:`, error);
        throw error;
      }
      break;
      
    case 'delete_file':
      try {
        const { error } = await supabaseService.storage
          .from('project-files')
          .remove([`${projectId}/${action.path}`]);

        if (error) {
          throw new Error(`Failed to delete file: ${error.message}`);
        }
        
        console.log(`[Chat] ✅ File deleted: ${action.path}`);
      } catch (error) {
        console.error(`[Chat] ❌ File deletion failed for ${action.path}:`, error);
        throw error;
      }
      break;
      
    default:
      console.warn(`[Chat] ⚠️ Unknown file operation type: ${action.type}`);
  }
}

// Helper function to determine file content type
function getFileContentType(path: string): string {
  const extension = path.split('.').pop()?.toLowerCase();
  const contentTypes: { [key: string]: string } = {
    'js': 'application/javascript',
    'jsx': 'application/javascript',
    'ts': 'application/typescript',
    'tsx': 'application/typescript',
    'json': 'application/json',
    'css': 'text/css',
    'html': 'text/html',
    'htm': 'text/html',
    'md': 'text/markdown',
    'txt': 'text/plain',
    'yml': 'text/yaml',
    'yaml': 'text/yaml'
  };
  
  return contentTypes[extension || ''] || 'text/plain';
}

// GET /projects/:id/conversations - Get all conversations for a project
router.get('/projects/:id/conversations', authenticateUser, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    
    // Get services from req
    const { supabaseService, db } = getServices(req);
    if (!db) {
      return res.status(500).json({ error: 'Database service not available' });
    }
    
    const project = await db.getProjectById(id);
    if (!project || project.userid !== req.user.id) {
      return res.status(404).json({ error: 'Project not found or access denied' });
    }

    try {
      const conversations = await db.getConversationsByProjectId(id, req.user.id);
      res.json(conversations);
    } catch (error) {
      // Conversations table might not exist
      console.log('Conversations table does not exist, returning empty array');
      res.json([]);
    }
  } catch (error) {
    console.error('Failed to get conversations:', error);
    res.status(500).json({ error: 'Failed to get conversations' });
  }
});

// POST /projects/:id/conversations - Create a new conversation for a project
router.post('/projects/:id/conversations', authenticateUser, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { title } = req.body;
    
    // Enhanced logging to track conversation creation
    console.log(`🆕 [CONVERSATION CREATE] Request to create conversation for project ${id}`);
    console.log(`🆕 [CONVERSATION CREATE] Title: "${title}"`);
    console.log(`🆕 [CONVERSATION CREATE] User: ${req.user.id}`);
    console.log(`🆕 [CONVERSATION CREATE] User-Agent: ${req.headers['user-agent']}`);
    console.log(`🆕 [CONVERSATION CREATE] Referer: ${req.headers.referer}`);
    console.log(`🆕 [CONVERSATION CREATE] Origin: ${req.headers.origin}`);
    console.log(`🆕 [CONVERSATION CREATE] Stack trace:`);
    console.trace();
    
    // Get services from req
    const { supabaseService, db } = getServices(req);
    if (!db) {
      return res.status(500).json({ error: 'Database service not available' });
    }
    
    const project = await db.getProjectById(id);
    if (!project || project.userid !== req.user.id) {
      return res.status(404).json({ error: 'Project not found or access denied' });
    }

    // Check if conversations already exist for this project before creating new one
    console.log(`🔍 [CONVERSATION CREATE] Checking existing conversations for project ${id}`);
    try {
      const existingConversations = await db.getConversationsByProjectId(id, req.user.id);
      console.log(`🔍 [CONVERSATION CREATE] Found ${existingConversations.length} existing conversations`);
      
      if (existingConversations.length > 0) {
        console.log(`⚠️  [CONVERSATION CREATE] WARNING: Creating new conversation when ${existingConversations.length} already exist!`);
        existingConversations.forEach((conv: any, i: number) => {
          console.log(`   ${i + 1}. ${conv.id} - "${conv.title}" (${conv.status})`);
        });
      }
    } catch (checkError) {
      console.log(`🔍 [CONVERSATION CREATE] Could not check existing conversations:`, checkError);
    }

    try {
      const conversation = await db.createConversation({
        title: title || 'New Conversation',
        projectId: id
        // Note: userId will be derived automatically from project relationship
      });
      
      console.log(`✅ [CONVERSATION CREATE] Successfully created conversation ${conversation.id}`);
      
      // Broadcast real-time conversation creation event
      const { websocket } = getServices(req);
      if (websocket) {
        console.log(`📡 Broadcasting conversation creation via API for user ${req.user.id}`);
        websocket.notifyConversationCreated(req.user.id, conversation.id, conversation);
        
        // Track user activity
        websocket.notifyUserActivity(
          req.user.id,
          'conversation_created',
          `Created new conversation: ${conversation.title}`,
          {
            conversationId: conversation.id,
            projectId: id,
            title: conversation.title
          },
          'success'
        );
      }
      
      res.status(201).json(conversation);
    } catch (error) {
      console.error('Failed to create conversation (table may not exist):', error);
      res.status(500).json({ error: 'Conversations feature not available' });
    }
  } catch (error) {
    console.error('Failed to create conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// GET /conversations/:id/messages - Get all messages for a conversation
router.get('/conversations/:id/messages', authenticateUser, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    
    // Get services from req
    const { supabaseService, db } = getServices(req);
    if (!db) {
      return res.status(500).json({ error: 'Database service not available' });
    }
    
    try {
      const messages = await db.getMessagesByConversationId(id);
      res.json(messages);
    } catch (error) {
      // Messages table might not exist
      console.log('Messages table does not exist, returning empty array');
      res.json([]);
    }
  } catch (error) {
    console.error('Failed to get messages:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

// POST /conversations/:id/messages - Create a new message in a conversation
router.post('/conversations/:id/messages', authenticateUser, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { content, role, messageType, metadata, parentId, relatedJobId } = req.body;
    
    if (!content || !role) {
      return res.status(400).json({ error: 'Content and role are required' });
    }

    // Get services from req
    const { supabaseService, db } = getServices(req);
    if (!db) {
      return res.status(500).json({ error: 'Database service not available' });
    }

    try {
      const message = await db.createMessage({
        content,
        role,
        messageType: messageType || 'text',
        conversationId: id,
        // Note: userId will be derived automatically from conversation->project relationship
        metadata,
        parentId,
        relatedJobId
      });
      
      // Broadcast real-time message creation event
      const { websocket } = getServices(req);
      if (websocket) {
        console.log(`📡 Broadcasting message creation via API for user ${req.user.id}`);
        websocket.notifyNewMessage(req.user.id, id, message.id, message);
        
        // Track user activity
        websocket.notifyUserActivity(
          req.user.id,
          'message_created',
          `Created ${role} message in conversation`,
          {
            messageId: message.id,
            conversationId: id,
            messageType,
            contentLength: content.length
          },
          'info'
        );
      }
      
      res.status(201).json(message);
    } catch (error) {
      console.error('Failed to create message (table may not exist):', error);
      res.status(500).json({ error: 'Messages feature not available' });
    }
  } catch (error) {
    console.error('Failed to create message:', error);
    res.status(500).json({ error: 'Failed to create message' });
  }
});

// POST /projects/:id/chat - AI chat endpoint (main conversation interface)
router.post('/projects/:id/chat', authenticateUser, async (req: any, res: any) => {
  const { id: projectId } = req.params;
  const { message, conversationId, history, provider = 'openai' } = req.body;
  
  try {
    console.log(`[Chat] Processing message for project ${projectId}, conversation ${conversationId}`);
    console.log(`[Chat] Message length: ${message?.length || 0}, History length: ${history?.length || 0}`);
    console.log(`[Chat] Using AI provider: ${provider}`);
    
    // Get services from req
    const { supabaseService, db, jobService } = getServices(req);
    if (!db) {
      throw new Error('Database service not available');
    }

    // Check if AI service is available
    if (!aiService.isAvailable()) {
      console.warn('[Chat] No AI service available - check API keys');
      return res.status(503).json({
        error: 'AI service not available',
        details: 'No API keys configured for OpenAI or Anthropic',
        availableProviders: aiService.getAvailableProviders()
      });
    }

    // Get project context for better AI responses
    const project = await db.getProjectById(projectId);
    if (!project || project.userid !== req.user.id) {
      return res.status(404).json({ error: 'Project not found or access denied' });
    }

    // Create basic project context (no file pre-loading)
    let projectContext: any = {
      name: project.name,
      description: project.description || undefined,
      tech_stack: project.tech_stack || undefined
    };

    // Build conversation history in AI message format
    const aiMessages: Array<{role: 'system' | 'user' | 'assistant', content: string}> = [];
    
    // Add system prompt with project context and relevant documentation
    const systemPrompt = await aiService.createDevelopmentSystemPrompt(message, projectContext);
    aiMessages.push({ role: 'system', content: systemPrompt });

    // Add conversation history
    if (history && Array.isArray(history)) {
      for (const msg of history) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          aiMessages.push({
            role: msg.role,
            content: msg.content
          });
        }
      }
    }

    // Add the current user message
    aiMessages.push({
      role: 'user',
      content: message
    });

    // Create file system tools for the AI to use
    const tools = aiService.createFileSystemTools();
    console.log(`[Chat] Providing AI with ${tools.length} file system tools`);
    
    // Get initial AI response with tools
    console.log(`[Chat] Calling AI service with ${aiMessages.length} messages and tools`);
    let aiResult = await aiService.generateResponse(aiMessages, { provider }, tools);
    
    // Handle tool calls if any
    if (aiResult.toolCalls && aiResult.toolCalls.length > 0) {
      console.log(`[Chat] AI made ${aiResult.toolCalls.length} tool calls`);
      
      // Import and create AI tools service
      const { AIToolsService } = await import('../services/ai-tools.js');
      const aiTools = new AIToolsService(projectId, req.user.id);
      
      // Execute each tool call
      for (const toolCall of aiResult.toolCalls) {
        console.log(`[Chat] Executing tool call: ${toolCall.name}`);
        
        const toolResult = await aiTools.executeToolCall(toolCall.name, toolCall.arguments);
        
        // Add tool call and result to conversation
        aiMessages.push({
          role: 'assistant',
          content: `Tool call: ${toolCall.name}(${JSON.stringify(toolCall.arguments)})`
        });
        
        aiMessages.push({
          role: 'user', 
          content: `Tool result: ${JSON.stringify(toolResult)}`
        });
      }
      
      // Get final AI response after tool execution
      console.log(`[Chat] Getting final AI response after tool execution`);
      aiResult = await aiService.generateResponse(aiMessages, { provider });
    }
    
    // Parse any file operations from the AI response
    const parsedActions = aiService.parseActionsFromResponse(aiResult.content);
    
    console.log(`[Chat] AI response generated, has actions: ${parsedActions.hasActions}`);
    if (parsedActions.hasActions) {
      console.log(`[Chat] Found ${parsedActions.actions.length} file operations`);
      
      // Execute file operations immediately
      try {
        for (const action of parsedActions.actions) {
          await executeFileOperation(action, projectId, req);
        }
        console.log(`[Chat] ✅ Successfully executed ${parsedActions.actions.length} file operations`);
      } catch (operationError) {
        console.error(`[Chat] ❌ Failed to execute file operations:`, operationError);
      }
    }

    // Create the assistant message in the database
    console.log(`[Chat] Creating assistant message in database for conversation ${conversationId}`);
    try {
      const assistantMessage = await db.createMessage({
        content: aiResult.content,
        role: 'assistant',
        messageType: 'text',
        conversationId,
        metadata: {
          usage: aiResult.usage,
          provider: aiResult.provider,
          model: aiResult.model,
          toolCallsUsed: aiResult.toolCalls?.length || 0
        }
      });
      
      console.log(`[Chat] Assistant message created: ${assistantMessage.id}`);
      
      // Broadcast real-time message creation event
      const { websocket } = getServices(req);
      if (websocket) {
        console.log(`📡 Broadcasting assistant message creation for user ${req.user.id}`);
        websocket.notifyNewMessage(req.user.id, conversationId, assistantMessage.id, assistantMessage);
        
        // Track user activity
        websocket.notifyUserActivity(
          req.user.id,
          'ai_response_generated',
          `AI generated response in conversation`,
          {
            messageId: assistantMessage.id,
            conversationId,
            provider: aiResult.provider,
            model: aiResult.model,
            tokenUsage: aiResult.usage?.total_tokens || 0,
            toolCallsUsed: aiResult.toolCalls?.length || 0
          },
          'success'
        );
      }
      
    } catch (messageError) {
      console.error(`[Chat] Failed to create assistant message:`, messageError);
      // Continue with response even if message creation fails
    }

    const aiResponse = {
      response: aiResult.content,
      actions: parsedActions.hasActions ? {
        detected: true,
        operations: parsedActions.actions,
        jobId: null // TODO: Create job for file operations if needed
      } : null,
      conversationId,
      timestamp: new Date().toISOString(),
      usage: aiResult.usage,
      provider: aiResult.provider,
      model: aiResult.model,
      toolCallsUsed: aiResult.toolCalls?.length || 0
    };
    
    console.log(`[Chat] Response ready for project ${projectId}`);
    res.json(aiResponse);
    
  } catch (error: any) {
    console.error(`Failed to process chat message for project ${projectId}:`, error);
    res.status(500).json({ 
      error: 'Failed to process chat message',
      details: error.message 
    });
  }
});

export default router;