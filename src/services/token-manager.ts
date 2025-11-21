import { VercelService } from './vercel.js';

interface UserTokenInfo {
  hasPersonalToken: boolean;
  personalToken?: string;
  deploymentCount: number;
  canUseSystemToken: boolean;
  systemTokenLimit: number;
}

interface TokenSelectionResult {
  token: string;
  isSystemToken: boolean;
  remainingDeployments?: number;
  shouldUpgrade: boolean;
  vercelService: VercelService;
}

export class TokenManager {
  private systemToken: string | null;
  private systemTokenLimit: number = 3; // Allow 3 free deployments
  private supabaseService: any;

  constructor(supabaseService: any, systemToken?: string) {
    this.supabaseService = supabaseService;
    this.systemToken = systemToken || process.env.VERCEL_API_TOKEN || null;
  }

  /**
   * Get user's Vercel token info and usage stats
   */
  async getUserTokenInfo(userId: string): Promise<UserTokenInfo> {
    try {
      // Get user's personal token from integrations table
      const { data: integration } = await this.supabaseService
        .from('integrations')
        .select('config')
        .eq('user_id', userId)
        .eq('service', 'vercel')
        .eq('is_active', true)
        .single();

      const hasPersonalToken = !!(integration?.config?.apiToken);
      const personalToken = integration?.config?.apiToken;

      // Count deployments made with system token
      const { count: deploymentCount } = await this.supabaseService
        .from('projects')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
        .eq('vercel_connected', true)
        .eq('used_system_token', true);

      const canUseSystemToken = (deploymentCount || 0) < this.systemTokenLimit;

      return {
        hasPersonalToken,
        personalToken,
        deploymentCount: deploymentCount || 0,
        canUseSystemToken,
        systemTokenLimit: this.systemTokenLimit
      };
    } catch (error) {
      console.error('[TOKEN_MANAGER] Error getting user token info:', error);
      return {
        hasPersonalToken: false,
        deploymentCount: 0,
        canUseSystemToken: true,
        systemTokenLimit: this.systemTokenLimit
      };
    }
  }

  /**
   * Select the appropriate token for deployment
   */
  async selectToken(userId: string, userProvidedToken?: string): Promise<TokenSelectionResult> {
    const tokenInfo = await this.getUserTokenInfo(userId);

    // 1. If user provided a token explicitly, use it
    if (userProvidedToken) {
      const vercelService = new VercelService(userProvidedToken);
      const isValid = await vercelService.validateToken();
      
      if (!isValid) {
        throw new Error('Provided Vercel token is invalid');
      }

      return {
        token: userProvidedToken,
        isSystemToken: false,
        shouldUpgrade: false,
        vercelService
      };
    }

    // 2. If user has their own token saved, use it
    if (tokenInfo.hasPersonalToken && tokenInfo.personalToken) {
      const vercelService = new VercelService(tokenInfo.personalToken);
      const isValid = await vercelService.validateToken();
      
      if (isValid) {
        return {
          token: tokenInfo.personalToken,
          isSystemToken: false,
          shouldUpgrade: false,
          vercelService
        };
      } else {
        // Their saved token is invalid, fall back to system token
        console.warn(`[TOKEN_MANAGER] User ${userId} has invalid saved token, falling back to system token`);
      }
    }

    // 3. Use system token if available and user hasn't exceeded limit
    if (this.systemToken && tokenInfo.canUseSystemToken) {
      const vercelService = new VercelService(this.systemToken);
      const remainingDeployments = this.systemTokenLimit - tokenInfo.deploymentCount;
      
      return {
        token: this.systemToken,
        isSystemToken: true,
        remainingDeployments,
        shouldUpgrade: remainingDeployments <= 1,
        vercelService
      };
    }

    // 4. No valid token available
    if (!this.systemToken) {
      throw new Error('System Vercel token not configured');
    }

    if (!tokenInfo.canUseSystemToken) {
      throw new Error(`You've reached the limit of ${this.systemTokenLimit} free deployments. Please add your own Vercel API token to continue.`);
    }

    throw new Error('No valid Vercel token available');
  }

  /**
   * Track deployment usage for system token
   */
  async trackDeployment(userId: string, projectId: string, usedSystemToken: boolean): Promise<void> {
    if (!usedSystemToken) return;

    try {
      // Update project to mark it used system token
      await this.supabaseService
        .from('projects')
        .update({ 
          used_system_token: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId)
        .eq('user_id', userId);

      console.log(`[TOKEN_MANAGER] Tracked system token usage for project ${projectId}`);
    } catch (error) {
      console.error('[TOKEN_MANAGER] Error tracking deployment:', error);
    }
  }

  /**
   * Check if user should be prompted to upgrade
   */
  async shouldPromptUpgrade(userId: string): Promise<{ shouldPrompt: boolean; reason?: string; deploymentCount?: number; limit?: number }> {
    const tokenInfo = await this.getUserTokenInfo(userId);

    if (tokenInfo.hasPersonalToken) {
      return { shouldPrompt: false };
    }

    if (tokenInfo.deploymentCount >= this.systemTokenLimit) {
      return {
        shouldPrompt: true,
        reason: 'limit_reached',
        deploymentCount: tokenInfo.deploymentCount,
        limit: this.systemTokenLimit
      };
    }

    if (tokenInfo.deploymentCount >= this.systemTokenLimit - 1) {
      return {
        shouldPrompt: true,
        reason: 'approaching_limit',
        deploymentCount: tokenInfo.deploymentCount,
        limit: this.systemTokenLimit
      };
    }

    return { shouldPrompt: false };
  }

  /**
   * Save user's personal Vercel token
   */
  async saveUserToken(userId: string, vercelToken: string): Promise<boolean> {
    try {
      // Validate token first
      const vercelService = new VercelService(vercelToken);
      const isValid = await vercelService.validateToken();
      
      if (!isValid) {
        throw new Error('Invalid Vercel token');
      }

      // Get user info for the token
      let userInfo = null;
      try {
        const user = await vercelService.client.user.getAuthUser();
        userInfo = {
          id: user.user?.id,
          username: user.user?.username,
          email: user.user?.email,
          name: user.user?.name
        };
      } catch (error) {
        console.warn('[TOKEN_MANAGER] Could not get user info for token');
      }

      // Save or update integration
      const { error } = await this.supabaseService
        .from('integrations')
        .upsert({
          user_id: userId,
          service: 'vercel',
          config: {
            apiToken: vercelToken,
            userInfo: userInfo
          },
          is_active: true,
          connected_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,service'
        });

      if (error) {
        throw error;
      }

      console.log(`[TOKEN_MANAGER] Saved Vercel token for user ${userId}`);
      return true;
    } catch (error) {
      console.error('[TOKEN_MANAGER] Error saving user token:', error);
      throw error;
    }
  }

  /**
   * Remove user's personal token
   */
  async removeUserToken(userId: string): Promise<void> {
    try {
      await this.supabaseService
        .from('integrations')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('service', 'vercel');

      console.log(`[TOKEN_MANAGER] Removed Vercel token for user ${userId}`);
    } catch (error) {
      console.error('[TOKEN_MANAGER] Error removing user token:', error);
      throw error;
    }
  }
}