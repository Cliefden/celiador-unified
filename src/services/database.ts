// Database service
class DatabaseService {
  private supabaseService: any;

  constructor(supabaseService: any) {
    this.supabaseService = supabaseService;
  }

  async getProjectsByUserId(userId: string) {
    if (!this.supabaseService) return [];
    
    const { data, error } = await this.supabaseService
      .from('projects')
      .select('*')
      .eq('userid', userId)
      .is('deletedAt', null)
      .order('updatedat', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  async createProject(projectData: any) {
    if (!this.supabaseService) throw new Error('Database not available');
    
    const { data: project, error } = await this.supabaseService
      .from('projects')
      .insert({
        name: projectData.name,
        templatekey: projectData.templateKey || 'next-prisma-supabase',
        repoprovider: projectData.repoProvider || 'github',
        repoowner: projectData.repoOwner,
        reponame: projectData.repoName,
        repo_url: projectData.repoUrl,
        repo_created: projectData.repoCreated || false,
        userid: projectData.userId,
        status: 'READY'
      })
      .select()
      .single();
    
    if (error) throw error;
    return project;
  }

  async getProjectById(id: string) {
    if (!this.supabaseService) return null;
    
    const { data, error } = await this.supabaseService
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) return null;
    return data;
  }

  async updateProject(id: string, updates: any) {
    if (!this.supabaseService) throw new Error('Database not available');
    
    const { data, error } = await this.supabaseService
      .from('projects')
      .update({
        ...updates,
        updatedat: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async getUserSettings(userId: string) {
    if (!this.supabaseService) return null;
    
    const { data, error } = await this.supabaseService
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
    return data;
  }

  async createUserSettings(userId: string) {
    if (!this.supabaseService) throw new Error('Database not available');
    
    const { data, error } = await this.supabaseService
      .from('user_settings')
      .insert({
        user_id: userId,
        creator: userId
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async updateUserSettings(userId: string, updates: any) {
    if (!this.supabaseService) throw new Error('Database not available');
    
    const { data, error } = await this.supabaseService
      .from('user_settings')
      .update({
        ...updates,
        updater: userId
      })
      .eq('user_id', userId)
      .is('deleted_at', null)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async createJob(jobData: any) {
    if (!this.supabaseService) throw new Error('Database not available');
    
    const { data: job, error } = await this.supabaseService
      .from('jobs')
      .insert({
        projectid: jobData.projectId,
        userid: jobData.userId,
        type: jobData.type,
        prompt: jobData.prompt,
        status: 'PENDING'
      })
      .select()
      .single();
    
    if (error) throw error;
    return job;
  }

  async updateJobStatus(id: string, status: string, output?: any, error?: any, metadata?: any) {
    if (!this.supabaseService) return null;
    
    const { data, error: updateError } = await this.supabaseService
      .from('jobs')
      .update({ status, output, error, metadata })
      .eq('id', id)
      .select()
      .single();
    
    if (updateError) throw updateError;
    return data;
  }

  // Conversation management
  async getConversationsByProjectId(projectId: string, userId: string) {
    if (!this.supabaseService) return [];
    
    const { data, error } = await this.supabaseService
      .from('conversations')
      .select('*')
      .eq('projectId', projectId)
      .eq('userId', userId)
      .is('deletedAt', null)
      .order('updatedAt', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  async createConversation(conversationData: any) {
    if (!this.supabaseService) throw new Error('Database not available');
    
    const { data: conversation, error } = await this.supabaseService
      .from('conversations')
      .insert({
        title: conversationData.title,
        projectId: conversationData.projectId,
        userId: conversationData.userId,
        status: 'ACTIVE'
      })
      .select()
      .single();
    
    if (error) throw error;
    return conversation;
  }

  async getMessagesByConversationId(conversationId: string) {
    if (!this.supabaseService) return [];
    
    const { data, error } = await this.supabaseService
      .from('messages')
      .select('*')
      .eq('conversationId', conversationId)
      .is('deletedAt', null)
      .order('createdAt', { ascending: true });
    
    if (error) throw error;
    return data || [];
  }

  async createMessage(messageData: any) {
    if (!this.supabaseService) throw new Error('Database not available');
    
    const { data: message, error } = await this.supabaseService
      .from('messages')
      .insert({
        content: messageData.content,
        role: messageData.role,
        messageType: messageData.messageType || 'text',
        conversationId: messageData.conversationId,
        userId: messageData.userId,
        metadata: messageData.metadata,
        parentId: messageData.parentId,
        relatedJobId: messageData.relatedJobId
      })
      .select()
      .single();
    
    if (error) throw error;
    return message;
  }

  // GitHub integrations
  async getGitHubIntegration(userId: string) {
    if (!this.supabaseService) return null;
    
    const { data, error } = await this.supabaseService
      .from('github_integrations')
      .select('*')
      .eq('userId', userId)
      .is('deletedAt', null)
      .single();
    
    if (error) return null;
    return data;
  }

  // Service integrations
  async getServiceIntegrations(userId: string) {
    if (!this.supabaseService) return [];
    
    const { data, error } = await this.supabaseService
      .from('service_integrations')
      .select('*')
      .eq('userId', userId)
      .is('deletedAt', null);
    
    if (error) return [];
    return data || [];
  }
}

export { DatabaseService };