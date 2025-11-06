import express from 'express';
import { authenticateUser } from '../middleware/auth.js';
import { aiService } from '../ai-service.js';
const router = express.Router();
// Access services from app.locals (set by main index.ts)
const getServices = (req) => ({
    supabase: req.app.locals.supabase,
    supabaseService: req.app.locals.supabaseService,
    db: req.app.locals.db,
    jobService: req.app.locals.jobService,
    websocket: req.app.locals.websocket
});
// Execute a file operation (create, update, or delete file)
async function executeFileOperation(action, projectId, req) {
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
            }
            catch (error) {
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
            }
            catch (error) {
                console.error(`[Chat] ❌ File deletion failed for ${action.path}:`, error);
                throw error;
            }
            break;
        default:
            console.warn(`[Chat] ⚠️ Unknown file operation type: ${action.type}`);
    }
}
// Helper function to determine file content type
function getFileContentType(path) {
    const extension = path.split('.').pop()?.toLowerCase();
    const contentTypes = {
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
router.get('/projects/:id/conversations', authenticateUser, async (req, res) => {
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
        }
        catch (error) {
            // Conversations table might not exist
            console.log('Conversations table does not exist, returning empty array');
            res.json([]);
        }
    }
    catch (error) {
        console.error('Failed to get conversations:', error);
        res.status(500).json({ error: 'Failed to get conversations' });
    }
});
// POST /projects/:id/conversations - Create a new conversation for a project
router.post('/projects/:id/conversations', authenticateUser, async (req, res) => {
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
                existingConversations.forEach((conv, i) => {
                    console.log(`   ${i + 1}. ${conv.id} - "${conv.title}" (${conv.status})`);
                });
            }
        }
        catch (checkError) {
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
                websocket.notifyUserActivity(req.user.id, 'conversation_created', `Created new conversation: ${conversation.title}`, {
                    conversationId: conversation.id,
                    projectId: id,
                    title: conversation.title
                }, 'success');
            }
            res.status(201).json(conversation);
        }
        catch (error) {
            console.error('Failed to create conversation (table may not exist):', error);
            res.status(500).json({ error: 'Conversations feature not available' });
        }
    }
    catch (error) {
        console.error('Failed to create conversation:', error);
        res.status(500).json({ error: 'Failed to create conversation' });
    }
});
// GET /conversations/:id/messages - Get all messages for a conversation
router.get('/conversations/:id/messages', authenticateUser, async (req, res) => {
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
        }
        catch (error) {
            // Messages table might not exist
            console.log('Messages table does not exist, returning empty array');
            res.json([]);
        }
    }
    catch (error) {
        console.error('Failed to get messages:', error);
        res.status(500).json({ error: 'Failed to get messages' });
    }
});
// POST /conversations/:id/messages - Create a new message in a conversation
router.post('/conversations/:id/messages', authenticateUser, async (req, res) => {
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
                websocket.notifyUserActivity(req.user.id, 'message_created', `Created ${role} message in conversation`, {
                    messageId: message.id,
                    conversationId: id,
                    messageType,
                    contentLength: content.length
                }, 'info');
            }
            res.status(201).json(message);
        }
        catch (error) {
            console.error('Failed to create message (table may not exist):', error);
            res.status(500).json({ error: 'Messages feature not available' });
        }
    }
    catch (error) {
        console.error('Failed to create message:', error);
        res.status(500).json({ error: 'Failed to create message' });
    }
});
// POST /projects/:id/chat - AI chat endpoint (main conversation interface)
router.post('/projects/:id/chat', authenticateUser, async (req, res) => {
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
        // Get project files from internal storage
        let projectContext = {
            name: project.name,
            description: project.description || undefined,
            tech_stack: project.tech_stack || undefined
        };
        try {
            console.log(`[Chat] Fetching project files for ${projectId} from Supabase Storage`);
            // Get files directly from Supabase Storage
            const { data: storageFiles, error: storageError } = await supabaseService.storage
                .from('project-files')
                .list(projectId, {
                limit: 1000,
                offset: 0
            });
            if (storageError || !storageFiles || storageFiles.length === 0) {
                console.warn(`[Chat] No files in storage or error (${storageError?.message}), trying file tree API`);
                // Fallback to file tree API
                const fileTreeResponse = await fetch(`http://localhost:4000/projects/${projectId}/files/tree`, {
                    headers: {
                        'Authorization': `Bearer ${req.headers.authorization?.replace('Bearer ', '')}`
                    }
                });
                if (fileTreeResponse.ok) {
                    const fileTreeData = await fileTreeResponse.json();
                    console.log(`[Chat] Got file tree with ${fileTreeData.tree?.length || 0} items`);
                    // Flatten file tree to get all files
                    const allFiles = [];
                    const flattenFiles = (items) => {
                        for (const item of items) {
                            if (item.type === 'file') {
                                allFiles.push(item);
                            }
                            else if (item.children) {
                                flattenFiles(item.children);
                            }
                        }
                    };
                    if (fileTreeData.tree) {
                        flattenFiles(fileTreeData.tree);
                    }
                    // Filter to important files
                    const importantFiles = allFiles
                        .filter(item => {
                        const ext = item.path.split('.').pop()?.toLowerCase();
                        return ['tsx', 'jsx', 'ts', 'js', 'css', 'json', 'md'].includes(ext || '');
                    })
                        .filter(item => {
                        const isComponent = item.path.includes('component') || item.path.includes('Component');
                        const isPage = item.path.includes('page') || item.path.includes('Page');
                        const isApp = item.path.includes('app') || item.path.includes('App');
                        const isLayout = item.path.includes('layout') || item.path.includes('Layout');
                        const isIndex = item.name === 'index.tsx' || item.name === 'index.jsx' || item.name === 'index.ts' || item.name === 'index.js';
                        const isMain = item.name === 'main.tsx' || item.name === 'main.jsx' || item.name === 'App.tsx' || item.name === 'App.jsx';
                        const isPackageJson = item.name === 'package.json';
                        const isConfig = item.name.includes('config') || item.name.includes('Config');
                        return isComponent || isPage || isApp || isLayout || isIndex || isMain || isPackageJson || isConfig;
                    })
                        .slice(0, 15);
                    console.log(`[Chat] Selected ${importantFiles.length} important files to provide to AI`);
                    // Get file contents from API
                    const fileContents = {};
                    for (const file of importantFiles) {
                        try {
                            const fileResponse = await fetch(`http://localhost:4000/projects/${projectId}/files/${encodeURIComponent(file.path)}`, {
                                headers: {
                                    'Authorization': `Bearer ${req.headers.authorization?.replace('Bearer ', '')}`
                                }
                            });
                            if (fileResponse.ok) {
                                const fileData = await fileResponse.json();
                                fileContents[file.path] = fileData.content;
                                console.log(`[Chat] Loaded ${file.path} (${fileData.content?.length || 0} chars)`);
                            }
                        }
                        catch (error) {
                            console.warn(`[Chat] Failed to load ${file.path}:`, error);
                        }
                    }
                    // Add files to project context
                    projectContext.current_files = importantFiles.map(f => f.path);
                    projectContext.file_contents = fileContents;
                    console.log(`[Chat] Providing ${Object.keys(fileContents).length} files to AI`);
                }
            }
            else {
                console.log(`[Chat] Found ${storageFiles.length} files in Supabase Storage for project ${projectId}`);
                // Filter storage files to important ones
                const importantStorageFiles = storageFiles
                    .filter((file) => {
                    const ext = file.name.split('.').pop()?.toLowerCase();
                    return ['tsx', 'jsx', 'ts', 'js', 'css', 'json', 'md'].includes(ext || '');
                })
                    .filter((file) => {
                    const isComponent = file.name.includes('component') || file.name.includes('Component');
                    const isPage = file.name.includes('page') || file.name.includes('Page');
                    const isApp = file.name.includes('app') || file.name.includes('App');
                    const isLayout = file.name.includes('layout') || file.name.includes('Layout');
                    const fileName = file.name.split('/').pop() || '';
                    const isIndex = fileName === 'index.tsx' || fileName === 'index.jsx' || fileName === 'index.ts' || fileName === 'index.js';
                    const isMain = fileName === 'main.tsx' || fileName === 'main.jsx' || fileName === 'App.tsx' || fileName === 'App.jsx';
                    const isPackageJson = fileName === 'package.json';
                    const isConfig = fileName.includes('config') || fileName.includes('Config');
                    return isComponent || isPage || isApp || isLayout || isIndex || isMain || isPackageJson || isConfig;
                })
                    .slice(0, 15);
                console.log(`[Chat] Selected ${importantStorageFiles.length} important files from storage`);
                // Get file contents directly from Supabase Storage
                const fileContents = {};
                for (const file of importantStorageFiles) {
                    try {
                        const { data: fileData, error: fileError } = await supabaseService.storage
                            .from('project-files')
                            .download(`${projectId}/${file.name}`);
                        if (!fileError && fileData) {
                            const content = await fileData.text();
                            fileContents[file.name] = content;
                            console.log(`[Chat] Loaded ${file.name} from storage (${content.length} chars)`);
                        }
                        else {
                            console.warn(`[Chat] Failed to load ${file.name} from storage: ${fileError?.message}`);
                        }
                    }
                    catch (error) {
                        console.warn(`[Chat] Failed to load ${file.name} from storage:`, error);
                    }
                }
                // Add files to project context
                projectContext.current_files = importantStorageFiles.map((f) => f.name);
                projectContext.file_contents = fileContents;
                console.log(`[Chat] Providing ${Object.keys(fileContents).length} files from storage to AI`);
            }
        }
        catch (error) {
            console.warn(`[Chat] Failed to fetch project files from storage:`, error);
            // Continue without files if storage access fails
        }
        // Build conversation history in AI message format
        const aiMessages = [];
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
        console.log(`[Chat] Calling AI service with ${aiMessages.length} messages`);
        // Get AI response
        const aiResult = await aiService.generateResponse(aiMessages, { provider });
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
            }
            catch (operationError) {
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
                    model: aiResult.model
                }
            });
            console.log(`[Chat] Assistant message created: ${assistantMessage.id}`);
            // Broadcast real-time message creation event
            const { websocket } = getServices(req);
            if (websocket) {
                console.log(`📡 Broadcasting assistant message creation for user ${req.user.id}`);
                websocket.notifyNewMessage(req.user.id, conversationId, assistantMessage.id, assistantMessage);
                // Track user activity
                websocket.notifyUserActivity(req.user.id, 'ai_response_generated', `AI generated response in conversation`, {
                    messageId: assistantMessage.id,
                    conversationId,
                    provider: aiResult.provider,
                    model: aiResult.model,
                    tokenUsage: aiResult.usage?.total_tokens || 0
                }, 'success');
            }
        }
        catch (messageError) {
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
            model: aiResult.model
        };
        console.log(`[Chat] Response ready for project ${projectId}`);
        res.json(aiResponse);
    }
    catch (error) {
        console.error(`Failed to process chat message for project ${projectId}:`, error);
        res.status(500).json({
            error: 'Failed to process chat message',
            details: error.message
        });
    }
});
export default router;
