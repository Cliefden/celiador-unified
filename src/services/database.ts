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

  async getPlatformGitHubIntegration(userId?: string) {
    // Platform GitHub integration is managed globally, not per user
    // For trial management, we need to check user's trial status
    let trialInfo = null;
    
    if (userId) {
      // Get user's profile for trial calculation
      const { data: profile, error } = await this.supabaseService
        .from('profiles')
        .select('github_trial_started_at, github_trial_expires_at, creator')
        .eq('id', userId)
        .single();
      
      if (profile) {
        let trialStarted = null;
        let trialExpires = null;
        
        // Use proper trial fields if available
        if (profile.github_trial_started_at && profile.github_trial_expires_at) {
          trialStarted = new Date(profile.github_trial_started_at);
          trialExpires = new Date(profile.github_trial_expires_at);
        } else {
          // Fallback: Auto-initialize trial for any user without trial data
          const now = new Date();
          
          if (profile.creator) {
            // Use account creation date as trial start
            trialStarted = new Date(profile.creator);
          } else {
            // No creator timestamp available, use current time
            trialStarted = now;
          }
          
          // Default 30-day trial, but shorter for testing migration prompts
          trialExpires = new Date(trialStarted.getTime() + 5 * 24 * 60 * 60 * 1000);
          
          // Initialize trial fields in database
          await this.supabaseService
            .from('profiles')
            .update({
              github_trial_started_at: trialStarted.toISOString(),
              github_trial_expires_at: trialExpires.toISOString()
            })
            .eq('id', userId);
        }
        
        if (trialStarted && trialExpires) {
          const now = new Date();
          
          trialInfo = {
            started: trialStarted.toISOString(),
            expires: trialExpires.toISOString(),
            isActive: now < trialExpires,
            daysRemaining: Math.max(0, Math.ceil((trialExpires.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))),
            isExpired: now >= trialExpires
          };
        }
      }
    }
    
    return {
      id: 'platform-github',
      type: 'platform',
      github_username: 'celiador-platform',
      token_status: 'valid',
      last_sync: new Date().toISOString(),
      permissions: ['public_repo', 'read:org'],
      trial: trialInfo
    };
  }

  async removeGitHubIntegration(userId: string) {
    if (!this.supabaseService) return null;
    
    const { error } = await this.supabaseService
      .from('github_integrations')
      .update({ 
        deletedAt: new Date().toISOString(),
        deleter: userId 
      })
      .eq('userId', userId)
      .is('deletedAt', null);
    
    if (error) throw error;
    return true;
  }

  // GitHub trial management
  async initializeGitHubTrial(userId: string, trialDays: number = 30) {
    if (!this.supabaseService) throw new Error('Database not available');
    
    const now = new Date();
    const trialExpires = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);
    
    const { data, error } = await this.supabaseService
      .from('profiles')
      .update({
        github_trial_started_at: now.toISOString(),
        github_trial_expires_at: trialExpires.toISOString()
      })
      .eq('id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  async extendGitHubTrial(userId: string, additionalDays: number) {
    if (!this.supabaseService) throw new Error('Database not available');
    
    // Get current trial info
    const { data: profile, error: profileError } = await this.supabaseService
      .from('profiles')
      .select('github_trial_expires_at')
      .eq('id', userId)
      .single();
    
    if (profileError) throw profileError;
    
    const currentExpires = profile.github_trial_expires_at ? new Date(profile.github_trial_expires_at) : new Date();
    const newExpires = new Date(currentExpires.getTime() + additionalDays * 24 * 60 * 60 * 1000);
    
    const { data, error } = await this.supabaseService
      .from('profiles')
      .update({ github_trial_expires_at: newExpires.toISOString() })
      .eq('id', userId)
      .select()
      .single();
    
    if (error) throw error;
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