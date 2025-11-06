// Shared activity formatting utilities
// This ensures consistent data structure between API endpoints and WebSocket events
// Helper function to get better job titles
export function getJobTitle(type, status) {
    const typeMap = {
        'SCAFFOLD': 'Project Setup',
        'AI_ACTION': 'AI Code Generation',
        'EDIT': 'Code Modification',
        'TEST': 'Test Execution',
        'DEPLOY': 'Deployment',
        'BUILD': 'Build Process'
    };
    const statusMap = {
        'PENDING': 'queued',
        'RUNNING': 'in progress',
        'COMPLETED': 'completed',
        'FAILED': 'failed',
        'CANCELLED': 'cancelled'
    };
    const jobType = typeMap[type] || type;
    const jobStatus = statusMap[status] || status.toLowerCase();
    return `${jobType} ${jobStatus}`;
}
// Helper function to get job type descriptions
export function getJobTypeDescription(jobType) {
    const descriptions = {
        'SCAFFOLD': 'Setting up project structure and dependencies',
        'AI_ACTION': 'AI-powered code generation and modification',
        'EDIT': 'Manual code editing and file modifications',
        'TEST': 'Running tests and validation checks',
        'BUILD': 'Compiling and building the project',
        'DEPLOY': 'Deploying to production environment'
    };
    return descriptions[jobType] || jobType;
}
// Helper function to get activity level based on entity action and status
export function getEntityActivityLevel(entityType, action, status) {
    if (entityType === 'jobs' && status) {
        if (status === 'COMPLETED')
            return 'success';
        if (status === 'FAILED')
            return 'error';
        if (status === 'RUNNING')
            return 'info';
    }
    switch (action) {
        case 'created':
            return 'success';
        case 'deleted':
            return 'warning';
        case 'updated':
        default:
            return 'info';
    }
}
// Convert a job database record to standardized activity format
export function formatJobAsActivity(job, userId, action) {
    const level = getEntityActivityLevel('jobs', action || 'updated', job.status);
    return {
        id: job.id,
        type: 'job',
        title: getJobTitle(job.type, job.status),
        description: job.prompt || getJobTypeDescription(job.type),
        timestamp: job.updatedat || job.createdat,
        status: job.status,
        level,
        metadata: {
            jobId: job.id,
            jobType: job.type,
            output: job.output,
            error: job.error,
            jobMetadata: job.metadata,
            userId: userId,
            entityType: 'jobs',
            entityId: job.id,
            action: action || 'updated'
        }
    };
}
// Convert a conversation database record to standardized activity format
export function formatConversationAsActivity(conversation, action = 'created') {
    const level = getEntityActivityLevel('conversations', action);
    const actionWord = action === 'created' ? 'started' : action === 'deleted' ? 'deleted' : 'updated';
    return {
        id: `conv_${conversation.id}`,
        type: 'conversation',
        title: `Conversation ${actionWord}`,
        description: conversation.title || 'Untitled conversation',
        timestamp: conversation.updatedat || conversation.createdat,
        level,
        metadata: {
            conversationId: conversation.id,
            projectId: conversation.projectid || conversation.projectId,
            entityType: 'conversations',
            entityId: conversation.id,
            action
        }
    };
}
// Convert a message database record to standardized activity format
export function formatMessageAsActivity(message, action = 'created') {
    const roleEmoji = message.role === 'user' ? '👤' : message.role === 'assistant' ? '🤖' : '⚙️';
    const level = getEntityActivityLevel('messages', action);
    const actionWord = action === 'created' ? 'New' : action === 'deleted' ? 'Deleted' : 'Updated';
    return {
        id: `message_${message.id}`,
        type: 'message',
        title: `${roleEmoji} ${actionWord} ${message.role} message`,
        description: message.content ?
            (message.content.length > 100 ? message.content.substring(0, 100) + '...' : message.content) :
            `${message.role} sent a message`,
        timestamp: message.updatedat || message.createdat,
        level,
        metadata: {
            messageId: message.id,
            conversationId: message.conversationid || message.conversationId,
            messageContent: message.content,
            messageRole: message.role,
            messageType: message.messagetype || message.messageType,
            relatedJobId: message.relatedjobid || message.relatedJobId,
            projectId: message.projectid || message.projectId,
            entityType: 'messages',
            entityId: message.id,
            action
        }
    };
}
// Convert user activity data to standardized activity format
export function formatUserActivityAsActivity(data) {
    return {
        id: `activity-${data.activityType}-${Date.now()}`,
        type: 'user_activity',
        title: data.activityType?.replace('_', ' ') || 'User Activity',
        description: data.description || 'User performed an action',
        timestamp: data.timestamp,
        level: data.level || 'info',
        metadata: {
            activityType: data.activityType,
            ...data.metadata
        }
    };
}
// Convert deployment data to standardized activity format
export function formatDeploymentAsActivity(deployment, action = 'updated') {
    const statusEmoji = deployment.status === 'COMPLETED' ? '✅' : deployment.status === 'FAILED' ? '❌' : '🔄';
    const level = deployment.status === 'COMPLETED' ? 'success' : deployment.status === 'FAILED' ? 'error' : 'info';
    return {
        id: `deployment_${deployment.deploymentId || deployment.id}`,
        type: 'deployment',
        title: `${statusEmoji} Deployment ${deployment.status?.toLowerCase() || action}`,
        description: `Deployment status changed to ${deployment.status || 'unknown'}`,
        status: deployment.status,
        timestamp: deployment.timestamp || deployment.updatedat || deployment.createdat,
        level,
        metadata: {
            deploymentId: deployment.deploymentId || deployment.id,
            projectId: deployment.projectId || deployment.projectid,
            deploymentUrl: deployment.url || deployment.deploymentUrl,
            entityType: 'deployments',
            entityId: deployment.deploymentId || deployment.id,
            action
        }
    };
}
// Convert project data to standardized activity format
export function formatProjectAsActivity(project, action = 'created') {
    const level = getEntityActivityLevel('projects', action);
    const actionWord = action === 'created' ? 'created' : action === 'deleted' ? 'deleted' : 'updated';
    return {
        id: `project_${project.id}`,
        type: 'project',
        title: `Project ${actionWord}`,
        description: `Project "${project.name || 'Untitled'}" was ${actionWord}`,
        timestamp: project.updatedat || project.createdat,
        level,
        metadata: {
            projectId: project.id,
            projectName: project.name,
            templateKey: project.templatekey || project.templateKey,
            entityType: 'projects',
            entityId: project.id,
            action
        }
    };
}
// Convert system notification to standardized activity format
export function formatSystemNotificationAsActivity(notification) {
    const levelEmojiMap = {
        'info': 'ℹ️',
        'success': '✅',
        'warning': '⚠️',
        'error': '❌'
    };
    const levelEmoji = levelEmojiMap[notification.level || 'info'] || 'ℹ️';
    return {
        id: `system-${Date.now()}`,
        type: 'system',
        title: `${levelEmoji} System ${notification.level || 'notification'}`,
        description: notification.description || 'System notification',
        timestamp: notification.timestamp,
        level: notification.level || 'info',
        metadata: {
            ...notification.metadata,
            entityType: 'system',
            action: 'notification'
        }
    };
}
export const ENTITY_FORMATTERS = {
    'jobs': (data, action, userId) => formatJobAsActivity(data, userId, action),
    'conversations': (data, action) => formatConversationAsActivity(data, action),
    'messages': (data, action) => formatMessageAsActivity(data, action),
    'deployments': (data, action) => formatDeploymentAsActivity(data, action),
    'projects': (data, action) => formatProjectAsActivity(data, action),
    'system': (data) => formatSystemNotificationAsActivity(data)
};
// Generic entity formatter using the mapping
export function formatEntityAsActivity(entityType, entityData, action = 'created', userId) {
    const formatter = ENTITY_FORMATTERS[entityType];
    if (!formatter) {
        console.warn(`No formatter found for entity type: ${entityType}`);
        // Return a generic fallback
        return {
            id: `${entityType}_${entityData.id || Date.now()}`,
            type: entityType,
            title: `${entityType} ${action}`,
            description: `${entityType} was ${action}`,
            timestamp: entityData.updatedat || entityData.createdat || new Date().toISOString(),
            level: getEntityActivityLevel(entityType, action),
            metadata: {
                entityType,
                entityId: entityData.id,
                action,
                ...entityData
            }
        };
    }
    return formatter(entityData, action, userId);
}
