import { WebSocketServer, WebSocket } from 'ws';
import { createClient } from '@supabase/supabase-js';
import { formatJobAsActivity } from '../utils/activityFormatter.js';
export class WebSocketService {
    constructor(port, tokenVerifier, supabaseUrl, supabaseServiceKey, databaseService) {
        this.wss = null;
        this.clients = new Map();
        this.verifyToken = tokenVerifier;
        this.db = databaseService;
        // Initialize Supabase for real-time subscriptions
        if (supabaseUrl && supabaseServiceKey) {
            this.supabase = createClient(supabaseUrl, supabaseServiceKey);
            this.setupSupabaseSubscriptions();
        }
        // If port is provided, start immediately (development mode)
        if (port) {
            this.startOnPort(port);
        }
    }
    // Method to set database service after construction
    setDatabaseService(databaseService) {
        this.db = databaseService;
    }
    startOnPort(port) {
        this.wss = new WebSocketServer({ port });
        this.setupWebSocketServer();
        console.log(`✅ WebSocket service started on port ${port}`);
    }
    attachToServer(server) {
        this.wss = new WebSocketServer({ server });
        this.setupWebSocketServer();
        console.log(`✅ WebSocket service attached to HTTP server`);
    }
    setupWebSocketServer() {
        if (!this.wss) {
            console.error('❌ WebSocket server not initialized');
            return;
        }
        this.wss.on('connection', (ws, request) => {
            console.log('🔌 New WebSocket connection attempt');
            // Set connection timeout for authentication
            const authTimeout = setTimeout(() => {
                if (!ws.isAuthenticated) {
                    console.log('⏰ WebSocket authentication timeout');
                    ws.close(1008, 'Authentication timeout');
                }
            }, 30000); // 30 second timeout
            ws.on('message', async (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    await this.handleMessage(ws, message);
                }
                catch (error) {
                    console.error('❌ WebSocket message error:', error);
                    ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
                }
            });
            ws.on('close', () => {
                clearTimeout(authTimeout);
                this.handleDisconnection(ws);
            });
            ws.on('error', (error) => {
                console.error('❌ WebSocket error:', error);
                clearTimeout(authTimeout);
                this.handleDisconnection(ws);
            });
            // Send initial connection message
            ws.send(JSON.stringify({
                type: 'connection_established',
                message: 'Please authenticate with your token'
            }));
        });
    }
    async handleMessage(ws, message) {
        switch (message.type) {
            case 'authenticate':
                await this.authenticateConnection(ws, message.token);
                break;
            case 'subscribe':
                this.handleSubscription(ws, message.channel);
                break;
            case 'unsubscribe':
                this.handleUnsubscription(ws, message.channel);
                break;
            case 'ping':
                ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
                break;
            // Entity request handlers
            case 'entity_fetch':
                await this.handleEntityFetch(ws, message);
                break;
            case 'entities_fetch':
                await this.handleEntitiesFetch(ws, message);
                break;
            case 'entity_create':
                await this.handleEntityCreate(ws, message);
                break;
            case 'entity_update':
                await this.handleEntityUpdate(ws, message);
                break;
            case 'entity_delete':
                await this.handleEntityDelete(ws, message);
                break;
            default:
                ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
        }
    }
    async authenticateConnection(ws, token) {
        try {
            const user = await this.verifyToken(token);
            if (user) {
                ws.userId = user.id;
                ws.isAuthenticated = true;
                ws.subscriptions = new Set();
                // Add to authenticated clients
                if (!this.clients.has(user.id)) {
                    this.clients.set(user.id, new Set());
                }
                this.clients.get(user.id).add(ws);
                console.log(`✅ WebSocket authenticated for user: ${user.id}`);
                ws.send(JSON.stringify({
                    type: 'authenticated',
                    userId: user.id,
                    timestamp: new Date().toISOString()
                }));
                // Send initial data or status
                this.sendInitialData(ws, user.id);
            }
            else {
                console.log('❌ WebSocket authentication failed');
                ws.close(1008, 'Invalid token');
            }
        }
        catch (error) {
            console.error('❌ WebSocket authentication error:', error);
            ws.close(1011, 'Authentication error');
        }
    }
    handleSubscription(ws, channel) {
        if (!ws.isAuthenticated || !ws.userId) {
            ws.send(JSON.stringify({ type: 'error', message: 'Not authenticated' }));
            return;
        }
        ws.subscriptions?.add(channel);
        console.log(`📡 User ${ws.userId} subscribed to ${channel}`);
        ws.send(JSON.stringify({
            type: 'subscribed',
            channel,
            timestamp: new Date().toISOString()
        }));
    }
    handleUnsubscription(ws, channel) {
        if (!ws.isAuthenticated || !ws.userId) {
            return;
        }
        ws.subscriptions?.delete(channel);
        console.log(`📡 User ${ws.userId} unsubscribed from ${channel}`);
        ws.send(JSON.stringify({
            type: 'unsubscribed',
            channel,
            timestamp: new Date().toISOString()
        }));
    }
    handleDisconnection(ws) {
        if (ws.userId && this.clients.has(ws.userId)) {
            const userClients = this.clients.get(ws.userId);
            userClients.delete(ws);
            if (userClients.size === 0) {
                this.clients.delete(ws.userId);
            }
            console.log(`🔌 WebSocket disconnected for user: ${ws.userId}`);
        }
    }
    async sendInitialData(ws, userId) {
        // Send any initial data the iOS app might need
        // This could include active jobs, recent projects, etc.
        try {
            ws.send(JSON.stringify({
                type: 'initial_data',
                data: {
                    connected: true,
                    timestamp: new Date().toISOString(),
                    availableChannels: [
                        'jobs',
                        'projects',
                        'conversations',
                        'deployments',
                        'system_notifications'
                    ]
                }
            }));
        }
        catch (error) {
            console.error('❌ Error sending initial data:', error);
        }
    }
    // Public methods for broadcasting events
    broadcastToUser(userId, event) {
        const userClients = this.clients.get(userId);
        if (!userClients)
            return;
        // Determine channel for this event
        const channel = this.getChannelForEvent(event.type, event);
        // Add channel info to message for frontend routing
        const eventWithChannel = { ...event, channel };
        const message = JSON.stringify(eventWithChannel);
        userClients.forEach(ws => {
            if (ws.readyState === WebSocket.OPEN) {
                // Check if user is subscribed to relevant channel
                if (!channel || ws.subscriptions?.has(channel)) {
                    ws.send(message);
                }
            }
        });
        console.log(`📤 Broadcasted ${event.type} to user ${userId}${channel ? ` on channel ${channel}` : ''}`);
    }
    broadcastToAll(event, excludeUser) {
        // Determine channel for this event
        const channel = this.getChannelForEvent(event.type, event);
        // Add channel info to message for frontend routing
        const eventWithChannel = { ...event, channel };
        const message = JSON.stringify(eventWithChannel);
        this.clients.forEach((userClients, userId) => {
            if (excludeUser && userId === excludeUser)
                return;
            userClients.forEach(ws => {
                if (ws.readyState === WebSocket.OPEN) {
                    console.log(`📤 Checking WebSocket for user ${userId}: subscriptions=${Array.from(ws.subscriptions || []).join(',')}, channel=${channel}`);
                    if (!channel || ws.subscriptions?.has(channel)) {
                        console.log(`📤 Sending message to user ${userId} on channel ${channel}`);
                        ws.send(message);
                    }
                    else {
                        console.log(`📤 NOT sending - user ${userId} not subscribed to channel ${channel}`);
                    }
                }
                else {
                    console.log(`📤 WebSocket not open for user ${userId}: state=${ws.readyState}`);
                }
            });
        });
        console.log(`📤 Broadcasted ${event.type} to all users${channel ? ` on channel ${channel}` : ''}`);
        console.log(`📤 Message content:`, JSON.stringify(eventWithChannel, null, 2));
    }
    getChannelForEvent(eventType, event) {
        // Handle legacy event types
        if (eventType.startsWith('job_'))
            return 'jobs';
        if (eventType.startsWith('project_'))
            return 'projects';
        if (eventType.startsWith('message_') || eventType.startsWith('conversation_'))
            return 'conversations';
        if (eventType.startsWith('deployment_'))
            return 'deployments';
        if (eventType === 'user_activity' || eventType === 'system_notification' || eventType === 'workspace_update')
            return 'system_notifications';
        // Handle new generic entity events - route based on entity type
        if (eventType.startsWith('entity_') && event) {
            const entityType = event.entityType;
            switch (entityType) {
                case 'jobs': return 'jobs';
                case 'projects': return 'projects';
                case 'conversations':
                case 'messages': return 'conversations';
                case 'deployments': return 'deployments';
                case 'integrations': return 'integrations';
                case 'templates': return 'templates';
                default: return 'jobs'; // Default to jobs channel for unknown entity types
            }
        }
        return null;
    }
    // Helper methods for common events
    notifyJobStatusChange(userId, jobId, projectId, status, metadata, jobData) {
        // Extract comprehensive job information
        const event = {
            type: 'job_status_change',
            userId,
            jobId,
            projectId,
            status,
            metadata,
            timestamp: new Date().toISOString()
        };
        // Include additional job data if available
        if (jobData) {
            event.jobType = jobData.type;
            event.startedAt = jobData.startedat || jobData.started_at;
            event.completedAt = jobData.completedat || jobData.completed_at;
            event.result = jobData.result;
            event.logs = jobData.logs;
            event.estimatedDuration = jobData.estimatedduration || jobData.estimated_duration;
            event.createdAt = jobData.createdat || jobData.created_at;
            event.updatedAt = jobData.updatedat || jobData.updated_at;
            event.error = jobData.error;
        }
        this.broadcastToUser(userId, event);
    }
    notifyJobProgress(userId, jobId, projectId, progress) {
        this.broadcastToUser(userId, {
            type: 'job_progress_update',
            userId,
            jobId,
            projectId,
            progress,
            timestamp: new Date().toISOString()
        });
    }
    notifyProjectUpdate(userId, projectId, projectData) {
        this.broadcastToUser(userId, {
            type: 'project_updated',
            userId,
            projectId,
            projectData,
            timestamp: new Date().toISOString()
        });
    }
    notifyNewMessage(userId, conversationId, messageId, messageData) {
        // Extract comprehensive message information
        const event = {
            type: 'message_created',
            userId,
            conversationId,
            messageId,
            messageData,
            timestamp: new Date().toISOString()
        };
        // Include extracted fields for easy access
        if (messageData) {
            event.projectId = messageData.projectid;
            event.messageContent = messageData.content;
            event.messageRole = messageData.role;
            event.messageType = messageData.messagetype || messageData.message_type;
            event.relatedJobId = messageData.relatedjobid || messageData.related_job_id;
            event.createdAt = messageData.createdat || messageData.created_at;
            event.updatedAt = messageData.updatedat || messageData.updated_at;
        }
        this.broadcastToUser(userId, event);
    }
    notifyConversationCreated(userId, conversationId, conversationData) {
        // Extract comprehensive conversation information
        const event = {
            type: 'conversation_created',
            userId,
            conversationId,
            conversationData,
            timestamp: new Date().toISOString()
        };
        // Include extracted fields for easy access
        if (conversationData) {
            event.projectId = conversationData.projectid;
            event.conversationTitle = conversationData.title;
            event.conversationStatus = conversationData.status;
            event.createdAt = conversationData.createdat || conversationData.created_at;
            event.updatedAt = conversationData.updatedat || conversationData.updated_at;
        }
        this.broadcastToUser(userId, event);
    }
    notifyConversationUpdated(userId, conversationId, conversationData) {
        // Extract comprehensive conversation information
        const event = {
            type: 'conversation_updated',
            userId,
            conversationId,
            conversationData,
            timestamp: new Date().toISOString()
        };
        // Include extracted fields for easy access
        if (conversationData) {
            event.projectId = conversationData.projectid;
            event.conversationTitle = conversationData.title;
            event.conversationStatus = conversationData.status;
            event.createdAt = conversationData.createdat || conversationData.created_at;
            event.updatedAt = conversationData.updatedat || conversationData.updated_at;
        }
        this.broadcastToUser(userId, event);
    }
    notifyDeploymentStatusChange(userId, deploymentId, projectId, status, url) {
        this.broadcastToUser(userId, {
            type: 'deployment_status_change',
            userId,
            deploymentId,
            projectId,
            status,
            url,
            timestamp: new Date().toISOString()
        });
    }
    notifyUserActivity(userId, activityType, description, metadata, level = 'info') {
        this.broadcastToUser(userId, {
            type: 'user_activity',
            userId,
            activityType,
            description,
            metadata,
            level,
            timestamp: new Date().toISOString()
        });
    }
    notifySystemNotification(userId, message, metadata, level = 'info') {
        this.broadcastToUser(userId, {
            type: 'system_notification',
            userId,
            description: message,
            metadata,
            level,
            timestamp: new Date().toISOString()
        });
    }
    // Generic entity broadcast methods
    broadcastEntityCreated(entityType, entityData, userId, projectId) {
        const event = {
            type: 'entity_created',
            entityType,
            entityData,
            entityId: entityData.id,
            projectId: projectId || entityData.projectid || entityData.projectId,
            userId: userId || 'system',
            timestamp: new Date().toISOString()
        };
        if (userId) {
            this.broadcastToUser(userId, event);
        }
        else {
            this.broadcastToAll(event);
        }
        console.log(`📤 Broadcasted entity_created for ${entityType}:${entityData.id}`);
    }
    broadcastEntityUpdated(entityType, entityData, userId, projectId) {
        const event = {
            type: 'entity_updated',
            entityType,
            entityData,
            entityId: entityData.id,
            projectId: projectId || entityData.projectid || entityData.projectId,
            userId: userId || 'system',
            timestamp: new Date().toISOString()
        };
        if (userId) {
            this.broadcastToUser(userId, event);
        }
        else {
            this.broadcastToAll(event);
        }
        console.log(`📤 Broadcasted entity_updated for ${entityType}:${entityData.id}`);
    }
    broadcastEntityDeleted(entityType, entityData, userId, projectId) {
        const event = {
            type: 'entity_deleted',
            entityType,
            entityData,
            entityId: entityData.id || entityData,
            projectId,
            userId: userId || 'system',
            timestamp: new Date().toISOString()
        };
        if (userId) {
            this.broadcastToUser(userId, event);
        }
        else {
            this.broadcastToAll(event);
        }
        console.log(`📤 Broadcasted entity_deleted for ${entityType}:${entityData.id || entityData}`);
    }
    // Setup Supabase real-time subscriptions for automatic forwarding
    setupSupabaseSubscriptions() {
        if (!this.supabase)
            return;
        console.log('🔄 Setting up Supabase real-time subscriptions...');
        // Subscribe to jobs table changes
        this.supabase
            .channel('jobs-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, (payload) => {
            console.log('📡 Supabase real-time event received:', payload);
            this.handleGenericEntityChange('jobs', payload);
        })
            .subscribe((status) => {
            console.log('📡 Jobs subscription status:', status);
        });
        // Subscribe to projects table changes  
        this.supabase
            .channel('projects-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, (payload) => {
            this.handleGenericEntityChange('projects', payload);
        })
            .subscribe();
        // Subscribe to conversations table changes
        this.supabase
            .channel('conversations-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, (payload) => {
            this.handleGenericEntityChange('conversations', payload);
        })
            .subscribe();
        // Subscribe to messages table changes
        this.supabase
            .channel('messages-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
            this.handleGenericEntityChange('messages', payload);
        })
            .subscribe();
        console.log('✅ Supabase real-time subscriptions established');
    }
    // Generic handler for all entity changes
    // Helper method to enrich deleted records with full data
    enrichDeletedRecord(entityType, oldRecord) {
        if (!this.supabase || !oldRecord.id) {
            return null;
        }
        try {
            console.log(`🔍 Enriching deleted ${entityType} record:`, oldRecord.id);
            // We can't query the deleted record anymore, but we can check our cache
            // or use the entity ID to broadcast with minimal but sufficient data
            // For now, return a structured minimal record for better formatting
            switch (entityType) {
                case 'jobs':
                    return {
                        id: oldRecord.id,
                        type: 'UNKNOWN', // We don't have the type anymore, but use a format that works with our formatter
                        status: 'CANCELLED', // Use a real status that our formatter recognizes
                        // We can't get projectid from deleted record, so keep it undefined
                        createdat: new Date().toISOString(), // Use current time as fallback
                        updatedat: new Date().toISOString()
                    };
                default:
                    return {
                        id: oldRecord.id,
                        name: `Deleted ${entityType}`,
                        createdat: new Date().toISOString(),
                        updatedat: new Date().toISOString()
                    };
            }
        }
        catch (error) {
            console.error(`Error enriching deleted ${entityType} record:`, error);
            return null;
        }
    }
    handleGenericEntityChange(entityType, payload) {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        console.log(`🔄 Supabase ${entityType} change detected:`, eventType, {
            entityId: newRecord?.id || oldRecord?.id,
            userId: newRecord?.userid || newRecord?.creator
        });
        switch (eventType) {
            case 'INSERT':
                if (newRecord) {
                    this.broadcastEntityCreated(entityType, newRecord, newRecord.userid || newRecord.creator, newRecord.projectid);
                }
                break;
            case 'UPDATE':
                if (newRecord) {
                    this.broadcastEntityUpdated(entityType, newRecord, newRecord.userid || newRecord.creator, newRecord.projectid);
                }
                break;
            case 'DELETE':
                if (oldRecord) {
                    // For DELETE events, Supabase only provides minimal data (usually just ID)
                    // We need to enrich this with project context if possible
                    const enrichedRecord = this.enrichDeletedRecord(entityType, oldRecord);
                    this.broadcastEntityDeleted(entityType, enrichedRecord || oldRecord, enrichedRecord?.userid || oldRecord.userid || oldRecord.creator, enrichedRecord?.projectid || oldRecord.projectid);
                }
                break;
            default:
                console.log(`❓ Unknown eventType: ${eventType} for ${entityType}`);
        }
    }
    handleSupabaseJobChange(payload) {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        console.log('🔄 Supabase job change detected:', eventType, {
            jobId: newRecord?.id,
            userId: newRecord?.userid,
            status: newRecord?.status
        });
        if (eventType === 'INSERT' && newRecord) {
            // New job created directly in database
            console.log('📝 Broadcasting new job creation:', newRecord.id);
            if (newRecord.userid) {
                // Normal case: broadcast to specific user with formatted activity
                const formattedActivity = formatJobAsActivity(newRecord, newRecord.userid);
                this.broadcastToUser(newRecord.userid, {
                    type: 'activity_update',
                    userId: newRecord.userid,
                    activity: formattedActivity,
                    timestamp: new Date().toISOString()
                });
            }
            else {
                // Handle jobs without userid - broadcast to all connected users for testing
                console.log('⚠️ Job has no userid, broadcasting to all connected users for testing');
                const formattedActivity = formatJobAsActivity(newRecord, 'system');
                this.broadcastToAll({
                    type: 'activity_update',
                    userId: 'system',
                    activity: formattedActivity,
                    timestamp: new Date().toISOString()
                });
            }
        }
        else if (eventType === 'UPDATE' && newRecord && oldRecord) {
            // Detect what changed in existing job
            if (newRecord.status !== oldRecord.status) {
                console.log('🔄 Broadcasting job status change:', newRecord.id, oldRecord.status, '→', newRecord.status);
                if (newRecord.userid) {
                    // Normal case: broadcast formatted activity to specific user
                    const formattedActivity = formatJobAsActivity(newRecord, newRecord.userid);
                    this.broadcastToUser(newRecord.userid, {
                        type: 'activity_update',
                        userId: newRecord.userid,
                        activity: formattedActivity,
                        timestamp: new Date().toISOString()
                    });
                }
                else {
                    // Handle updates to jobs without userid
                    console.log('⚠️ Job update has no userid, broadcasting to all connected users');
                    const formattedActivity = formatJobAsActivity(newRecord, 'system');
                    this.broadcastToAll({
                        type: 'activity_update',
                        userId: 'system',
                        activity: formattedActivity,
                        timestamp: new Date().toISOString()
                    });
                }
            }
            if (newRecord.metadata !== oldRecord.metadata) {
                console.log('📊 Broadcasting job metadata update:', newRecord.id);
                if (newRecord.userid) {
                    this.broadcastToUser(newRecord.userid, {
                        type: 'job_metadata_update',
                        userId: newRecord.userid,
                        jobId: newRecord.id,
                        projectId: newRecord.projectid,
                        metadata: newRecord.metadata,
                        timestamp: new Date().toISOString()
                    });
                }
                else {
                    this.broadcastToAll({
                        type: 'job_metadata_update',
                        userId: 'system',
                        jobId: newRecord.id,
                        projectId: newRecord.projectid,
                        metadata: newRecord.metadata,
                        timestamp: new Date().toISOString()
                    });
                }
            }
        }
        else if (eventType === 'DELETE' && oldRecord) {
            // Job deleted from database
            console.log('🗑️ Broadcasting job deletion:', oldRecord.id);
            if (oldRecord.userid) {
                this.broadcastToUser(oldRecord.userid, {
                    type: 'job_deleted',
                    userId: oldRecord.userid,
                    jobId: oldRecord.id,
                    projectId: oldRecord.projectid,
                    timestamp: new Date().toISOString()
                });
            }
            else {
                this.broadcastToAll({
                    type: 'job_deleted',
                    userId: 'system',
                    jobId: oldRecord.id,
                    projectId: oldRecord.projectid,
                    timestamp: new Date().toISOString()
                });
            }
        }
    }
    handleSupabaseProjectChange(payload) {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        if (newRecord) {
            const eventTypeMap = {
                'INSERT': 'project_created',
                'UPDATE': 'project_updated',
                'DELETE': 'project_deleted'
            };
            this.broadcastToUser(newRecord.userid || oldRecord?.userid, {
                type: eventTypeMap[eventType],
                userId: newRecord.userid || oldRecord?.userid,
                projectId: newRecord.id || oldRecord?.id,
                projectData: newRecord,
                timestamp: new Date().toISOString()
            });
        }
    }
    handleSupabaseConversationChange(payload) {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        console.log('🔄 Supabase conversation change detected:', eventType, {
            conversationId: newRecord?.id,
            userId: newRecord?.userid,
            title: newRecord?.title
        });
        if (eventType === 'INSERT' && newRecord) {
            // New conversation created directly in database
            console.log('📝 Broadcasting new conversation creation:', newRecord.id);
            if (newRecord.userid) {
                this.notifyConversationCreated(newRecord.userid, newRecord.id, newRecord);
            }
            else {
                // Handle conversations without userid - broadcast to all connected users for testing
                console.log('⚠️ Conversation has no userid, broadcasting to all connected users for testing');
                this.broadcastToAll({
                    type: 'conversation_created',
                    userId: 'system',
                    conversationId: newRecord.id,
                    conversationData: newRecord,
                    timestamp: new Date().toISOString()
                });
            }
        }
        else if (eventType === 'UPDATE' && newRecord && oldRecord) {
            // Conversation updated
            console.log('🔄 Broadcasting conversation update:', newRecord.id);
            if (newRecord.userid) {
                this.notifyConversationUpdated(newRecord.userid, newRecord.id, newRecord);
            }
            else {
                this.broadcastToAll({
                    type: 'conversation_updated',
                    userId: 'system',
                    conversationId: newRecord.id,
                    conversationData: newRecord,
                    timestamp: new Date().toISOString()
                });
            }
        }
        else if (eventType === 'DELETE' && oldRecord) {
            // Conversation deleted from database
            console.log('🗑️ Broadcasting conversation deletion:', oldRecord.id);
            if (oldRecord.userid) {
                this.broadcastToUser(oldRecord.userid, {
                    type: 'conversation_deleted',
                    userId: oldRecord.userid,
                    conversationId: oldRecord.id,
                    timestamp: new Date().toISOString()
                });
            }
            else {
                this.broadcastToAll({
                    type: 'conversation_deleted',
                    userId: 'system',
                    conversationId: oldRecord.id,
                    timestamp: new Date().toISOString()
                });
            }
        }
    }
    handleSupabaseMessageChange(payload) {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        console.log('🔄 Supabase message change detected:', eventType, {
            messageId: newRecord?.id,
            userId: newRecord?.userid,
            conversationId: newRecord?.conversationid
        });
        if (eventType === 'INSERT' && newRecord) {
            // New message created directly in database
            console.log('📝 Broadcasting new message creation:', newRecord.id);
            if (newRecord.userid) {
                this.notifyNewMessage(newRecord.userid, newRecord.conversationid, newRecord.id, newRecord);
            }
            else {
                // Handle messages without userid - broadcast to all connected users for testing
                console.log('⚠️ Message has no userid, broadcasting to all connected users for testing');
                this.broadcastToAll({
                    type: 'message_created',
                    userId: 'system',
                    conversationId: newRecord.conversationid,
                    messageId: newRecord.id,
                    messageData: newRecord,
                    timestamp: new Date().toISOString()
                });
            }
        }
        else if (eventType === 'DELETE' && oldRecord) {
            // Message deleted from database
            console.log('🗑️ Broadcasting message deletion:', oldRecord.id);
            if (oldRecord.userid) {
                this.broadcastToUser(oldRecord.userid, {
                    type: 'message_deleted',
                    userId: oldRecord.userid,
                    conversationId: oldRecord.conversationid,
                    messageId: oldRecord.id,
                    timestamp: new Date().toISOString()
                });
            }
            else {
                this.broadcastToAll({
                    type: 'message_deleted',
                    userId: 'system',
                    conversationId: oldRecord.conversationid,
                    messageId: oldRecord.id,
                    timestamp: new Date().toISOString()
                });
            }
        }
    }
    // Cleanup method
    // Generic entity request handlers
    async handleEntityFetch(ws, request) {
        if (!ws.isAuthenticated || !ws.userId) {
            this.sendEntityError(ws, request.requestId, 'Not authenticated');
            return;
        }
        if (!this.db) {
            this.sendEntityError(ws, request.requestId, 'Database service not available');
            return;
        }
        try {
            console.log(`[EntityFetch] ${ws.userId} requesting ${request.entityType}:${request.entityId}`);
            let data;
            switch (request.entityType) {
                case 'jobs':
                    data = await this.db.getJobWithUser(request.entityId);
                    // Verify user access
                    if (data && data.derivedUserId !== ws.userId) {
                        data = null;
                    }
                    break;
                case 'projects':
                    data = await this.db.getProjectById(request.entityId);
                    // Verify user access
                    if (data && data.userid !== ws.userId) {
                        data = null;
                    }
                    break;
                case 'conversations':
                    // Get conversation and verify access through project ownership
                    if (this.supabase) {
                        const { data: conversation, error } = await this.supabase
                            .from('conversations')
                            .select(`
                *,
                projects!inner (
                  id,
                  userid
                )
              `)
                            .eq('id', request.entityId)
                            .single();
                        if (!error && conversation && conversation.projects.userid === ws.userId) {
                            data = conversation;
                        }
                    }
                    break;
                case 'integrations':
                    // Get user's integration by ID
                    data = await this.db.getIntegrationById(request.entityId, ws.userId);
                    break;
                case 'templates':
                    // Get template by ID (templates are public)
                    data = await this.db.getTemplateById(request.entityId);
                    break;
                case 'deployments':
                    // Get user's deployment by ID
                    data = await this.db.getDeploymentById(request.entityId, ws.userId);
                    break;
                default:
                    this.sendEntityError(ws, request.requestId, `Unsupported entity type: ${request.entityType}`);
                    return;
            }
            if (data) {
                this.sendEntityResponse(ws, request.requestId, request.entityType, data);
            }
            else {
                this.sendEntityError(ws, request.requestId, 'Entity not found or access denied');
            }
        }
        catch (error) {
            console.error(`[EntityFetch] Error fetching ${request.entityType}:`, error);
            this.sendEntityError(ws, request.requestId, 'Internal server error');
        }
    }
    async handleEntitiesFetch(ws, request) {
        if (!ws.isAuthenticated || !ws.userId) {
            this.sendEntityError(ws, request.requestId, 'Not authenticated');
            return;
        }
        if (!this.db) {
            this.sendEntityError(ws, request.requestId, 'Database service not available');
            return;
        }
        try {
            console.log(`[EntitiesFetch] ${ws.userId} requesting ${request.entityType} with filters:`, request.filters);
            let data;
            switch (request.entityType) {
                case 'jobs':
                    if (request.filters?.projectId) {
                        // Verify user owns the project
                        const project = await this.db.getProjectById(request.filters.projectId);
                        if (!project || project.userid !== ws.userId) {
                            this.sendEntityError(ws, request.requestId, 'Project access denied');
                            return;
                        }
                        data = await this.db.getJobsByProjectId(request.filters.projectId);
                    }
                    else {
                        this.sendEntityError(ws, request.requestId, 'projectId required for jobs');
                        return;
                    }
                    break;
                case 'projects':
                    data = await this.db.getProjectsByUserId(ws.userId);
                    break;
                case 'conversations':
                    if (request.filters?.projectId) {
                        data = await this.db.getConversationsByProjectId(request.filters.projectId, ws.userId);
                    }
                    else {
                        this.sendEntityError(ws, request.requestId, 'projectId required for conversations');
                        return;
                    }
                    break;
                case 'integrations':
                    // Get user's integrations (all or filtered)
                    if (request.filters?.service) {
                        data = await this.db.getServiceIntegrations(ws.userId);
                        data = data.filter((integration) => integration.service === request.filters?.service);
                    }
                    else {
                        data = await this.db.getAllIntegrations(ws.userId);
                    }
                    break;
                case 'templates':
                    // Get all templates (templates are public)
                    data = await this.db.getAllTemplates();
                    // Apply filters if specified
                    if (request.filters?.difficulty) {
                        data = data.filter((template) => template.difficulty === request.filters?.difficulty);
                    }
                    if (request.filters?.framework) {
                        data = data.filter((template) => template.framework === request.filters?.framework);
                    }
                    break;
                case 'deployments':
                    // Get user's deployments (all or filtered by project)
                    if (request.filters?.projectId) {
                        data = await this.db.getRecentDeployments(request.filters.projectId);
                    }
                    else {
                        data = await this.db.getAllDeployments(ws.userId);
                    }
                    // Apply additional filters if specified
                    if (request.filters?.status) {
                        data = data.filter((deployment) => deployment.status === request.filters?.status);
                    }
                    if (request.filters?.platform) {
                        data = data.filter((deployment) => deployment.platform === request.filters?.platform);
                    }
                    break;
                default:
                    this.sendEntityError(ws, request.requestId, `Unsupported entity type: ${request.entityType}`);
                    return;
            }
            this.sendEntitiesResponse(ws, request.requestId, request.entityType, data || []);
        }
        catch (error) {
            console.error(`[EntitiesFetch] Error fetching ${request.entityType}:`, error);
            this.sendEntityError(ws, request.requestId, 'Internal server error');
        }
    }
    async handleEntityCreate(ws, request) {
        if (!ws.isAuthenticated || !ws.userId) {
            this.sendEntityError(ws, request.requestId, 'Not authenticated');
            return;
        }
        if (!this.db) {
            this.sendEntityError(ws, request.requestId, 'Database service not available');
            return;
        }
        try {
            console.log(`[EntityCreate] ${ws.userId} creating ${request.entityType}:`, request.data);
            let data;
            switch (request.entityType) {
                case 'projects':
                    data = await this.db.createProject({ ...request.data, userId: ws.userId });
                    // Broadcast the creation
                    this.broadcastEntityCreated('projects', data, ws.userId, data.id);
                    break;
                case 'conversations':
                    data = await this.db.createConversation({ ...request.data, userId: ws.userId });
                    // Broadcast the creation
                    this.broadcastEntityCreated('conversations', data, ws.userId, data.projectid);
                    break;
                case 'integrations':
                    data = await this.db.createIntegration({ ...request.data, userId: ws.userId });
                    // Broadcast the creation
                    this.broadcastEntityCreated('integrations', data, ws.userId);
                    break;
                case 'templates':
                    // Only allow admins to create templates (for now, check if user has admin role)
                    // For demo purposes, allow any authenticated user
                    data = await this.db.createTemplate(request.data);
                    // Broadcast the creation to all users (templates are public)
                    this.broadcastEntityCreated('templates', data);
                    break;
                case 'deployments':
                    data = await this.db.createDeployment({ ...request.data, userId: ws.userId });
                    // Broadcast the creation
                    this.broadcastEntityCreated('deployments', data, ws.userId, data.projectId);
                    break;
                default:
                    this.sendEntityError(ws, request.requestId, `Entity creation not supported for: ${request.entityType}`);
                    return;
            }
            this.sendEntityResponse(ws, request.requestId, request.entityType, data);
        }
        catch (error) {
            console.error(`[EntityCreate] Error creating ${request.entityType}:`, error);
            this.sendEntityError(ws, request.requestId, error.message || 'Internal server error');
        }
    }
    async handleEntityUpdate(ws, request) {
        if (!ws.isAuthenticated || !ws.userId) {
            this.sendEntityError(ws, request.requestId, 'Not authenticated');
            return;
        }
        if (!this.db) {
            this.sendEntityError(ws, request.requestId, 'Database service not available');
            return;
        }
        try {
            console.log(`[EntityUpdate] ${ws.userId} updating ${request.entityType}:${request.entityId}`);
            let data;
            switch (request.entityType) {
                case 'projects':
                    // Verify ownership first
                    const project = await this.db.getProjectById(request.entityId);
                    if (!project || project.userid !== ws.userId) {
                        this.sendEntityError(ws, request.requestId, 'Project not found or access denied');
                        return;
                    }
                    data = await this.db.updateProject(request.entityId, request.data);
                    // Broadcast the update
                    this.broadcastEntityUpdated('projects', data, ws.userId, data.id);
                    break;
                case 'integrations':
                    // Verify ownership first
                    const integration = await this.db.getIntegrationById(request.entityId, ws.userId);
                    if (!integration) {
                        this.sendEntityError(ws, request.requestId, 'Integration not found or access denied');
                        return;
                    }
                    data = await this.db.updateIntegration(request.entityId, request.data, ws.userId);
                    // Broadcast the update
                    this.broadcastEntityUpdated('integrations', data, ws.userId);
                    break;
                case 'templates':
                    // Only allow admins to update templates (for demo purposes, allow any authenticated user)
                    const template = await this.db.getTemplateById(request.entityId);
                    if (!template) {
                        this.sendEntityError(ws, request.requestId, 'Template not found');
                        return;
                    }
                    data = await this.db.updateTemplate(request.entityId, request.data);
                    // Broadcast the update to all users (templates are public)
                    this.broadcastEntityUpdated('templates', data);
                    break;
                case 'deployments':
                    // Verify ownership first
                    const deployment = await this.db.getDeploymentById(request.entityId, ws.userId);
                    if (!deployment) {
                        this.sendEntityError(ws, request.requestId, 'Deployment not found or access denied');
                        return;
                    }
                    data = await this.db.updateDeployment(request.entityId, request.data, ws.userId);
                    // Broadcast the update
                    this.broadcastEntityUpdated('deployments', data, ws.userId, data.projectId);
                    break;
                default:
                    this.sendEntityError(ws, request.requestId, `Entity update not supported for: ${request.entityType}`);
                    return;
            }
            this.sendEntityResponse(ws, request.requestId, request.entityType, data);
        }
        catch (error) {
            console.error(`[EntityUpdate] Error updating ${request.entityType}:`, error);
            this.sendEntityError(ws, request.requestId, error.message || 'Internal server error');
        }
    }
    async handleEntityDelete(ws, request) {
        if (!ws.isAuthenticated || !ws.userId) {
            this.sendEntityError(ws, request.requestId, 'Not authenticated');
            return;
        }
        if (!this.db) {
            this.sendEntityError(ws, request.requestId, 'Database service not available');
            return;
        }
        try {
            console.log(`[EntityDelete] ${ws.userId} deleting ${request.entityType}:${request.entityId}`);
            switch (request.entityType) {
                case 'projects':
                    // Verify ownership first
                    const project = await this.db.getProjectById(request.entityId);
                    if (!project || project.userid !== ws.userId) {
                        this.sendEntityError(ws, request.requestId, 'Project not found or access denied');
                        return;
                    }
                    // Soft delete
                    await this.db.updateProject(request.entityId, { deletedAt: new Date().toISOString() });
                    // Broadcast the deletion with full project data
                    this.broadcastEntityDeleted('projects', project, ws.userId, request.entityId);
                    break;
                case 'integrations':
                    // Verify ownership first
                    const integration = await this.db.getIntegrationById(request.entityId, ws.userId);
                    if (!integration) {
                        this.sendEntityError(ws, request.requestId, 'Integration not found or access denied');
                        return;
                    }
                    // Delete integration
                    await this.db.deleteIntegration(request.entityId, ws.userId);
                    // Broadcast the deletion with full integration data
                    this.broadcastEntityDeleted('integrations', integration, ws.userId);
                    break;
                case 'templates':
                    // Only allow admins to delete templates (for demo purposes, allow any authenticated user)
                    const template = await this.db.getTemplateById(request.entityId);
                    if (!template) {
                        this.sendEntityError(ws, request.requestId, 'Template not found');
                        return;
                    }
                    // Soft delete template (set is_active to false)
                    const deletedTemplate = await this.db.deleteTemplate(request.entityId);
                    // Broadcast the deletion to all users (templates are public)
                    this.broadcastEntityDeleted('templates', deletedTemplate);
                    break;
                case 'deployments':
                    // Verify ownership first
                    const deployment = await this.db.getDeploymentById(request.entityId, ws.userId);
                    if (!deployment) {
                        this.sendEntityError(ws, request.requestId, 'Deployment not found or access denied');
                        return;
                    }
                    // Delete deployment
                    await this.db.deleteDeployment(request.entityId, ws.userId);
                    // Broadcast the deletion with full deployment data
                    this.broadcastEntityDeleted('deployments', deployment, ws.userId, deployment.projectId);
                    break;
                default:
                    this.sendEntityError(ws, request.requestId, `Entity deletion not supported for: ${request.entityType}`);
                    return;
            }
            this.sendEntityResponse(ws, request.requestId, request.entityType, { success: true });
        }
        catch (error) {
            console.error(`[EntityDelete] Error deleting ${request.entityType}:`, error);
            this.sendEntityError(ws, request.requestId, error.message || 'Internal server error');
        }
    }
    // Helper methods for sending responses
    sendEntityResponse(ws, requestId, entityType, data) {
        const response = {
            type: 'entity_response',
            requestId,
            entityType,
            data
        };
        ws.send(JSON.stringify(response));
    }
    sendEntitiesResponse(ws, requestId, entityType, data) {
        const response = {
            type: 'entities_response',
            requestId,
            entityType,
            data,
            count: data.length
        };
        ws.send(JSON.stringify(response));
    }
    sendEntityError(ws, requestId, error) {
        const response = {
            type: 'entity_error',
            requestId,
            entityType: '',
            error
        };
        ws.send(JSON.stringify(response));
    }
    close() {
        console.log('🔌 Closing WebSocket service...');
        if (this.wss) {
            this.wss.close();
        }
        this.clients.clear();
    }
    // Health check method
    getStats() {
        const totalConnections = Array.from(this.clients.values())
            .reduce((total, clientSet) => total + clientSet.size, 0);
        return {
            totalUsers: this.clients.size,
            totalConnections,
            connectedUsers: Array.from(this.clients.keys())
        };
    }
}
