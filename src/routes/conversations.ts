import express from 'express';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

// Access services from app.locals (set by main index.ts)
const getServices = (req: any) => ({
  supabase: req.app.locals.supabase,
  supabaseService: req.app.locals.supabaseService,
  db: req.app.locals.db,
  jobService: req.app.locals.jobService
});

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
      const conversation = await db.createConversation({
        title: title || 'New Conversation',
        projectId: id,
        userId: req.user.id
      });
      
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
        userId: req.user.id,
        metadata,
        parentId,
        relatedJobId
      });
      
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
    
    // Get services from req
    const { supabaseService, db, jobService } = getServices(req);
    if (!db) {
      throw new Error('Database service not available');
    }
    
    // For now, return a placeholder response until AI service is integrated
    // TODO: Integrate AI service (OpenAI/Anthropic) for actual chat functionality
    const aiResponse = {
      response: `I received your message: "${message}". The chat functionality is currently being migrated to the new modular architecture. This endpoint is ready for AI service integration.`,
      actions: null,
      conversationId,
      timestamp: new Date().toISOString(),
      usage: null
    };
    
    console.log(`[Chat] Placeholder response generated for project ${projectId}`);
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