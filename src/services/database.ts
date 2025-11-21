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
      .is('deletedat', null)
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
    
    // Get project to derive userid - this ensures consistency
    const project = await this.getProjectById(jobData.projectId);
    if (!project) {
      throw new Error(`Project ${jobData.projectId} not found`);
    }
    
    console.log(`[DatabaseService] Creating job for project ${jobData.projectId}, derived userid: ${project.userid}`);
    
    const { data: job, error } = await this.supabaseService
      .from('jobs')
      .insert({
        projectid: jobData.projectId,
        userid: project.userid, // Derived from project, not passed explicitly
        type: jobData.type,
        prompt: jobData.prompt,
        status: 'PENDING',
        metadata: jobData.metadata
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

  // Helper method to get job with derived user information
  async getJobWithUser(jobId: string) {
    if (!this.supabaseService) return null;
    
    const { data, error } = await this.supabaseService
      .from('jobs')
      .select(`
        *,
        projects!inner (
          id,
          userid,
          name
        )
      `)
      .eq('id', jobId)
      .single();
    
    if (error) return null;
    
    // Return job with derived userid from project
    return {
      ...data,
      derivedUserId: data.projects.userid,
      projectName: data.projects.name
    };
  }

  // Helper method to get jobs for a project
  async getJobsByProjectId(projectId: string) {
    if (!this.supabaseService) return [];
    
    const { data, error } = await this.supabaseService
      .from('jobs')
      .select('*')
      .eq('projectid', projectId)
      .is('deletedat', null)
      .order('createdat', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  // Conversation management (normalized - derive userid from project relationship)
  async getConversationsByProjectId(projectId: string, userId: string) {
    if (!this.supabaseService) return [];
    
    // Verify project ownership first
    const project = await this.getProjectById(projectId);
    if (!project || project.userid !== userId) {
      console.log(`[DatabaseService] Project ${projectId} not found or access denied for user ${userId}`);
      return [];
    }
    
    // Query conversations by projectid only (normalized approach)
    const { data, error } = await this.supabaseService
      .from('conversations')
      .select('*')
      .eq('projectid', projectId)
      .is('deletedat', null)
      .order('updatedat', { ascending: false });
    
    if (error) {
      console.error(`[DatabaseService] Error fetching conversations for project ${projectId}:`, error);
      return [];
    }
    
    console.log(`[DatabaseService] Found ${data?.length || 0} conversations for project ${projectId}`);
    return data || [];
  }

  async createConversation(conversationData: any) {
    if (!this.supabaseService) throw new Error('Database not available');
    
    // Get project to derive userid (normalized approach)
    const project = await this.getProjectById(conversationData.projectId);
    if (!project) {
      throw new Error(`Project ${conversationData.projectId} not found`);
    }
    
    console.log(`[DatabaseService] Creating conversation for project ${conversationData.projectId}, derived userid: ${project.userid}`);
    
    const { data: conversation, error } = await this.supabaseService
      .from('conversations')
      .insert({
        title: conversationData.title,
        projectid: conversationData.projectId,
        userid: project.userid, // Derived from project, not passed explicitly
        status: conversationData.status || 'ACTIVE'
      })
      .select()
      .single();
    
    if (error) {
      console.error(`[DatabaseService] Error creating conversation:`, error);
      throw error;
    }
    
    console.log(`[DatabaseService] Created conversation ${conversation.id} for project ${conversationData.projectId}`);
    return conversation;
  }

  async getMessagesByConversationId(conversationId: string) {
    if (!this.supabaseService) return [];
    
    // Note: messages table normalized - userid derived from conversations->projects relationship
    const { data, error } = await this.supabaseService
      .from('messages')
      .select('*')
      .eq('conversationid', conversationId)
      .is('deletedat', null)
      .order('createdat', { ascending: true });
    
    if (error) {
      console.error(`[DatabaseService] Error fetching messages for conversation ${conversationId}:`, error);
      return [];
    }
    
    console.log(`[DatabaseService] Found ${data?.length || 0} messages for conversation ${conversationId}`);
    return data || [];
  }

  async createMessage(messageData: any) {
    if (!this.supabaseService) throw new Error('Database not available');
    
    // Get conversation to derive userid from project relationship (normalized approach)
    const { data: conversation, error: convError } = await this.supabaseService
      .from('conversations')
      .select(`
        id,
        projectid,
        projects!inner (
          id,
          userid
        )
      `)
      .eq('id', messageData.conversationId)
      .single();
    
    if (convError || !conversation) {
      throw new Error(`Conversation ${messageData.conversationId} not found`);
    }
    
    const derivedUserId = conversation.projects.userid;
    console.log(`[DatabaseService] Creating message for conversation ${messageData.conversationId}, derived userid: ${derivedUserId}`);
    
    const { data: message, error } = await this.supabaseService
      .from('messages')
      .insert({
        content: messageData.content,
        role: messageData.role,
        messagetype: messageData.messageType || 'text',
        conversationid: messageData.conversationId,
        userid: derivedUserId, // Derived from conversation->project relationship
        metadata: messageData.metadata,
        parentid: messageData.parentId,
        relatedjobid: messageData.relatedJobId
      })
      .select()
      .single();
    
    if (error) {
      console.error(`[DatabaseService] Error creating message:`, error);
      throw error;
    }
    
    console.log(`[DatabaseService] Created message ${message.id} for conversation ${messageData.conversationId}`);
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

  // Vercel integrations
  async getVercelIntegration(userId: string) {
    if (!this.supabaseService) return null;
    
    try {
      const { data, error } = await this.supabaseService
        .from('vercel_integrations')
        .select('*')
        .eq('userId', userId)
        .is('deletedAt', null)
        .single();
      
      if (error) {
        console.warn('[DB] getVercelIntegration error:', error.message);
        return null;
      }
      return data;
    } catch (error) {
      console.warn('[DB] getVercelIntegration exception:', error);
      return null;
    }
  }

  async getPlatformVercelIntegration(userId?: string) {
    // Return mock platform Vercel integration - database schema issues persist
    const trialInfo = {
      started: new Date().toISOString(),
      expires: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      isActive: true,
      daysRemaining: 5,
      isExpired: false,
      deploymentsUsed: 0,
      maxDeployments: 10
    };
    
    return {
      id: 'platform-vercel',
      type: 'platform',
      username: 'celiador-platform',
      team_slug: 'celiador',
      team_id: 'team_celiador',
      token_status: 'valid',
      last_deploy: new Date().toISOString(),
      permissions: ['read', 'write'],
      trial: trialInfo
    };
  }

  async getRecentDeployments(projectId: string, limit: number = 5) {
    if (!this.supabaseService) return [];
    
    try {
      const { data, error } = await this.supabaseService
        .from('deployments')
        .select('*')
        .eq('projectId', projectId)
        .is('deletedAt', null)
        .order('createdAt', { ascending: false })
        .limit(limit);
      
      if (error) {
        console.warn('[DB] getRecentDeployments error:', error.message);
        return [];
      }
      return data || [];
    } catch (error) {
      console.warn('[DB] getRecentDeployments exception:', error);
      return [];
    }
  }

  async getDeploymentCount(userId: string, since?: Date) {
    if (!this.supabaseService) return 0;
    
    try {
      let query = this.supabaseService
        .from('deployments')
        .select('id', { count: 'exact' })
        .eq('userId', userId)
        .is('deletedAt', null);
      
      if (since) {
        query = query.gte('createdAt', since.toISOString());
      }
      
      const { count, error } = await query;
      
      if (error) {
        console.warn('[DB] getDeploymentCount error:', error.message);
        return 0;
      }
      return count || 0;
    } catch (error) {
      console.warn('[DB] getDeploymentCount exception:', error);
      return 0;
    }
  }

  // Vercel trial management
  async initializeVercelTrial(userId: string, trialDays: number = 30) {
    if (!this.supabaseService) throw new Error('Database not available');
    
    const now = new Date();
    const trialExpires = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);
    
    const { data, error } = await this.supabaseService
      .from('profiles')
      .update({
        vercel_trial_started_at: now.toISOString(),
        vercel_trial_expires_at: trialExpires.toISOString()
      })
      .eq('id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  async extendVercelTrial(userId: string, additionalDays: number) {
    if (!this.supabaseService) throw new Error('Database not available');
    
    // Get current trial info
    const { data: profile, error: profileError } = await this.supabaseService
      .from('profiles')
      .select('vercel_trial_expires_at')
      .eq('id', userId)
      .single();
    
    if (profileError) throw profileError;
    
    const currentExpires = profile.vercel_trial_expires_at ? new Date(profile.vercel_trial_expires_at) : new Date();
    const newExpires = new Date(currentExpires.getTime() + additionalDays * 24 * 60 * 60 * 1000);
    
    const { data, error } = await this.supabaseService
      .from('profiles')
      .update({ vercel_trial_expires_at: newExpires.toISOString() })
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

  async getAllIntegrations(userId: string) {
    if (!this.supabaseService) return [];
    
    try {
      const { data, error } = await this.supabaseService
        .from('integrations')
        .select('*')
        .eq('userid', userId)
        .is('deletedAt', null)
        .order('createdat', { ascending: false });
      
      if (error) {
        console.warn('[DB] getAllIntegrations error:', error.message);
        return [];
      }
      return data || [];
    } catch (error) {
      console.warn('[DB] getAllIntegrations exception:', error);
      return [];
    }
  }

  async getIntegrationById(integrationId: string, userId: string) {
    if (!this.supabaseService) return null;
    
    try {
      const { data, error } = await this.supabaseService
        .from('integrations')
        .select('*')
        .eq('id', integrationId)
        .eq('userid', userId)
        .is('deletedAt', null)
        .single();
      
      if (error) {
        console.warn('[DB] getIntegrationById error:', error.message);
        return null;
      }
      return data;
    } catch (error) {
      console.warn('[DB] getIntegrationById exception:', error);
      return null;
    }
  }

  async createIntegration(integrationData: any) {
    if (!this.supabaseService) throw new Error('Database not available');
    
    const { data, error } = await this.supabaseService
      .from('integrations')
      .insert({
        service: integrationData.service,
        type: integrationData.type || 'oauth',
        status: integrationData.status || 'ACTIVE',
        config: integrationData.config || {},
        userid: integrationData.userId,
        creator: integrationData.userId
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async updateIntegration(integrationId: string, updates: any, userId: string) {
    if (!this.supabaseService) throw new Error('Database not available');
    
    const { data, error } = await this.supabaseService
      .from('integrations')
      .update({
        ...updates,
        updatedat: new Date().toISOString()
      })
      .eq('id', integrationId)
      .eq('userid', userId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async deleteIntegration(integrationId: string, userId: string) {
    if (!this.supabaseService) throw new Error('Database not available');
    
    const { error } = await this.supabaseService
      .from('integrations')
      .update({
        deletedAt: new Date().toISOString()
      })
      .eq('id', integrationId)
      .eq('userid', userId);
    
    if (error) throw error;
    return true;
  }

  // Template management
  async getAllTemplates() {
    if (!this.supabaseService) return [];
    
    try {
      const { data, error } = await this.supabaseService
        .from('templates')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      
      if (error) {
        console.warn('[DB] getAllTemplates error:', error.message);
        return [];
      }
      return data || [];
    } catch (error) {
      console.warn('[DB] getAllTemplates exception:', error);
      return [];
    }
  }

  async getTemplateById(templateId: string) {
    if (!this.supabaseService) return null;
    
    try {
      const { data, error } = await this.supabaseService
        .from('templates')
        .select('*')
        .eq('id', templateId)
        .single();
      
      if (error) {
        console.warn('[DB] getTemplateById error:', error.message);
        return null;
      }
      return data;
    } catch (error) {
      console.warn('[DB] getTemplateById exception:', error);
      return null;
    }
  }

  async getTemplateByKey(templateKey: string) {
    if (!this.supabaseService) return null;
    
    try {
      const { data, error } = await this.supabaseService
        .from('templates')
        .select('*')
        .eq('template_key', templateKey)
        .single();
      
      if (error) {
        console.warn('[DB] getTemplateByKey error:', error.message);
        return null;
      }
      return data;
    } catch (error) {
      console.warn('[DB] getTemplateByKey exception:', error);
      return null;
    }
  }

  async createTemplate(templateData: any) {
    if (!this.supabaseService) throw new Error('Database not available');
    
    const { data, error } = await this.supabaseService
      .from('templates')
      .insert({
        template_key: templateData.templateKey,
        name: templateData.name,
        description: templateData.description,
        long_description: templateData.longDescription,
        icon: templateData.icon,
        emoji: templateData.emoji,
        color_primary: templateData.colorPrimary,
        color_secondary: templateData.colorSecondary,
        difficulty: templateData.difficulty || 'beginner',
        rating: templateData.rating || 0,
        version: templateData.version || '1.0.0',
        storage_path: templateData.storagePath,
        is_active: templateData.isActive !== false,
        sort_order: templateData.sortOrder || 0
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async updateTemplate(templateId: string, updates: any) {
    if (!this.supabaseService) throw new Error('Database not available');
    
    const { data, error } = await this.supabaseService
      .from('templates')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', templateId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async deleteTemplate(templateId: string) {
    if (!this.supabaseService) throw new Error('Database not available');
    
    const { data, error } = await this.supabaseService
      .from('templates')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', templateId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // Deployment management
  async getAllDeployments(userId: string) {
    if (!this.supabaseService) return [];
    
    try {
      const { data, error } = await this.supabaseService
        .from('deployments')
        .select('*')
        .eq('userId', userId)
        .is('deletedAt', null)
        .order('createdAt', { ascending: false });
      
      if (error) {
        console.warn('[DB] getAllDeployments error:', error.message);
        return [];
      }
      return data || [];
    } catch (error) {
      console.warn('[DB] getAllDeployments exception:', error);
      return [];
    }
  }

  async getDeploymentById(deploymentId: string, userId: string) {
    if (!this.supabaseService) return null;
    
    try {
      const { data, error } = await this.supabaseService
        .from('deployments')
        .select('*')
        .eq('id', deploymentId)
        .eq('userId', userId)
        .is('deletedAt', null)
        .single();
      
      if (error) {
        console.warn('[DB] getDeploymentById error:', error.message);
        return null;
      }
      return data;
    } catch (error) {
      console.warn('[DB] getDeploymentById exception:', error);
      return null;
    }
  }

  async createDeployment(deploymentData: any) {
    if (!this.supabaseService) throw new Error('Database not available');
    
    const { data, error } = await this.supabaseService
      .from('deployments')
      .insert({
        projectId: deploymentData.projectId,
        userId: deploymentData.userId,
        status: deploymentData.status || 'BUILDING',
        platform: deploymentData.platform || 'vercel',
        environment: deploymentData.environment || 'production',
        branch: deploymentData.branch || 'main',
        commit_sha: deploymentData.commitSha,
        deployment_url: deploymentData.deploymentUrl,
        external_id: deploymentData.externalId,
        metadata: deploymentData.metadata || {},
        creator: deploymentData.userId
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async updateDeployment(deploymentId: string, updates: any, userId: string) {
    if (!this.supabaseService) throw new Error('Database not available');
    
    const { data, error } = await this.supabaseService
      .from('deployments')
      .update({
        ...updates,
        updatedAt: new Date().toISOString()
      })
      .eq('id', deploymentId)
      .eq('userId', userId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async deleteDeployment(deploymentId: string, userId: string) {
    if (!this.supabaseService) throw new Error('Database not available');
    
    const { error } = await this.supabaseService
      .from('deployments')
      .update({
        deletedAt: new Date().toISOString()
      })
      .eq('id', deploymentId)
      .eq('userId', userId);
    
    if (error) throw error;
    return true;
  }
}

export { DatabaseService };