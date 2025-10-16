import express from 'express';
import { authenticateUser } from '../middleware/auth';

const router = express.Router();

// Access services from app.locals (set by main index.ts)
const getServices = (req: any) => ({
  supabase: req.app.locals.supabase,
  supabaseService: req.app.locals.supabaseService,
  db: req.app.locals.db
});

// GET /api/integrations/projects/:id/github-status - Get detailed GitHub integration status
router.get('/api/integrations/projects/:id/github-status', authenticateUser, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    
    const { supabaseService, db } = getServices(req);
    const project = await db.getProjectById(id);
    if (!project || project.userid !== req.user.id) {
      return res.status(404).json({ error: 'Project not found or access denied' });
    }

    if (!supabaseService) {
      return res.status(500).json({ error: 'Database not available' });
    }

    // Get both customer and platform GitHub connections
    const customerGitHub = await db.getGitHubIntegration(req.user.id);
    const platformGitHub = await db.getPlatformGitHubIntegration(req.user.id); // Include user ID for trial tracking
    
    // Platform connection with trial information
    const platformConnection = {
      type: 'platform',
      connected: platformGitHub?.trial?.isActive !== false, // Connected if trial is active or not set
      username: platformGitHub?.github_username || 'celiador-platform',
      permissions: platformGitHub?.permissions || ['public_repo', 'read:org'],
      tokenStatus: platformGitHub?.trial?.isExpired ? 'expired' : (platformGitHub?.token_status || 'valid'),
      lastSync: platformGitHub?.last_sync || new Date().toISOString(),
      trial: platformGitHub?.trial
    };

    const customerConnection = {
      type: 'customer',
      connected: !!customerGitHub,
      username: customerGitHub?.github_username || null,
      repoUrl: project.repoowner && project.reponame 
        ? `https://github.com/${project.repoowner}/${project.reponame}`
        : null,
      permissions: customerGitHub ? ['repo', 'user:email'] : [],
      tokenStatus: customerGitHub?.token_status || 'disconnected',
      lastSync: customerGitHub?.last_sync || null
    };

    // Determine which connection is active for this project
    let activeConnection = null;
    if (project.repoowner && project.reponame) {
      // Priority logic:
      // 1. If customer has GitHub and explicitly set, use customer
      // 2. If platform trial is expired, require customer connection
      // 3. Otherwise use platform (trial active or no trial set)
      if (customerGitHub && project.github_integration_type === 'customer') {
        activeConnection = 'customer';
      } else if (platformGitHub?.trial?.isExpired && !customerGitHub) {
        activeConnection = null; // Force user to connect their GitHub
      } else if (platformGitHub?.trial?.isExpired && customerGitHub) {
        activeConnection = 'customer'; // Auto-migrate to customer GitHub
      } else {
        activeConnection = 'platform'; // Use platform GitHub (trial active or no trial)
      }
    }

    const response = {
      customerConnection,
      platformConnection,
      activeConnection,
      projectLinked: !!project.repoowner && !!project.reponame,
      repoInfo: project.repoowner && project.reponame ? {
        owner: project.repoowner,
        name: project.reponame,
        fullName: `${project.repoowner}/${project.reponame}`,
        private: project.repo_private || false,
        defaultBranch: project.default_branch || 'main'
      } : null
    };
    
    res.json(response);
  } catch (error) {
    console.error('Failed to get GitHub integration status:', error);
    res.status(500).json({ error: 'Failed to get GitHub integration status' });
  }
});

// GET /api/integrations/projects/:id/status - Get integration status for a project
router.get('/api/integrations/projects/:id/status', authenticateUser, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    
    const { supabaseService, db } = getServices(req);
    const project = await db.getProjectById(id);
    if (!project || project.userid !== req.user.id) {
      return res.status(404).json({ error: 'Project not found or access denied' });
    }

    if (!supabaseService) {
      return res.status(500).json({ error: 'Database not available' });
    }

    // Get real integration status from database using helpers
    const githubIntegration = await db.getGitHubIntegration(req.user.id);
    const serviceIntegrations = await db.getServiceIntegrations(req.user.id);
    
    const vercelIntegration = serviceIntegrations.find((s: any) => s.service === 'vercel');
    
    const response = {
      github: {
        connected: !!githubIntegration,
        projectLinked: !!project.repoowner && !!project.reponame,
        repoUrl: project.repoowner && project.reponame 
          ? `https://github.com/${project.repoowner}/${project.reponame}`
          : null
      },
      vercel: {
        connected: !!vercelIntegration && vercelIntegration.status === 'ACTIVE',
        projectId: vercelIntegration?.config?.projectId || null,
        domain: vercelIntegration?.config?.domain || null
      },
      deploymentMode: project.repoprovider?.toUpperCase() + '_ONLY' || 'GITHUB_ONLY'
    };
    
    res.json(response);
  } catch (error) {
    console.error('Failed to get integration status:', error);
    res.status(500).json({ error: 'Failed to get integration status' });
  }
});

// GET /api/integrations/projects/:id/deployment-options - Get deployment options
router.get('/api/integrations/projects/:id/deployment-options', authenticateUser, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    
    const { db } = getServices(req);
    const project = await db.getProjectById(id);
    if (!project || project.userid !== req.user.id) {
      return res.status(404).json({ error: 'Project not found or access denied' });
    }

    // Mock deployment options
    const mockStrategy = {
      type: 'GITHUB_ONLY',
      target: 'main',
      options: ['github']
    };
    
    res.json(mockStrategy);
  } catch (error) {
    console.error('Failed to get deployment options:', error);
    res.status(500).json({ error: 'Failed to get deployment options' });
  }
});

// POST /api/integrations/projects/:id/deploy - Deploy project
router.post('/api/integrations/projects/:id/deploy', authenticateUser, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { type, commitMessage, branch } = req.body;
    
    const { db } = getServices(req);
    const project = await db.getProjectById(id);
    if (!project || project.userid !== req.user.id) {
      return res.status(404).json({ error: 'Project not found or access denied' });
    }

    console.log(`Deploying project ${id} with type: ${type}`);
    
    // Mock deployment result
    const result = {
      success: true,
      deploymentId: `dep_${Date.now()}`,
      urls: {
        github: `https://github.com/user/${project.reponame}/commit/abc123`
      },
      branch: branch || 'main',
      commitSha: 'abc123'
    };
    
    res.json(result);
  } catch (error) {
    console.error('Failed to deploy:', error);
    res.status(500).json({ error: 'Deployment failed' });
  }
});

// GET /api/integrations/vercel/teams - Get Vercel teams
router.get('/api/integrations/vercel/teams', authenticateUser, async (req: any, res: any) => {
  try {
    // Mock Vercel teams
    const teams = [
      {
        id: 'team_123',
        slug: 'my-team',
        name: 'My Team'
      }
    ];
    
    res.json(teams);
  } catch (error) {
    console.error('Failed to get Vercel teams:', error);
    res.status(500).json({ error: 'Failed to get Vercel teams' });
  }
});

// GET /api/integrations/vercel/projects - Get Vercel projects
router.get('/api/integrations/vercel/projects', authenticateUser, async (req: any, res: any) => {
  try {
    // Mock Vercel projects
    const projects = [
      {
        id: 'proj_123',
        name: 'my-project',
        framework: 'nextjs',
        targets: {
          production: {
            domain: 'my-project.vercel.app'
          }
        }
      }
    ];
    
    res.json(projects);
  } catch (error) {
    console.error('Failed to get Vercel projects:', error);
    res.status(500).json({ error: 'Failed to get Vercel projects' });
  }
});

// POST /api/integrations/projects/:id/vercel - Connect project to Vercel
router.post('/api/integrations/projects/:id/vercel', authenticateUser, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { vercelProjectId, vercelTeamId, accessToken, domain } = req.body;
    
    const { db } = getServices(req);
    const project = await db.getProjectById(id);
    if (!project || project.userid !== req.user.id) {
      return res.status(404).json({ error: 'Project not found or access denied' });
    }

    console.log(`Connecting project ${id} to Vercel project ${vercelProjectId}`);
    
    // Mock Vercel connection
    res.json({ success: true, message: 'Project connected to Vercel' });
  } catch (error) {
    console.error('Failed to connect to Vercel:', error);
    res.status(500).json({ error: 'Failed to connect to Vercel' });
  }
});

// DELETE /api/integrations/projects/:id/vercel - Disconnect Vercel integration
router.delete('/api/integrations/projects/:id/vercel', authenticateUser, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    
    const { db } = getServices(req);
    const project = await db.getProjectById(id);
    if (!project || project.userid !== req.user.id) {
      return res.status(404).json({ error: 'Project not found or access denied' });
    }

    console.log(`Disconnecting Vercel integration for project ${id}`);
    
    res.json({ success: true, message: 'Vercel integration disconnected' });
  } catch (error) {
    console.error('Failed to disconnect Vercel:', error);
    res.status(500).json({ error: 'Failed to disconnect Vercel integration' });
  }
});

// POST /api/integrations/projects/:id/github-disconnect - Disconnect GitHub integration
router.post('/api/integrations/projects/:id/github-disconnect', authenticateUser, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { type } = req.body; // 'customer' or 'platform'
    
    const { supabaseService, db } = getServices(req);
    const project = await db.getProjectById(id);
    if (!project || project.userid !== req.user.id) {
      return res.status(404).json({ error: 'Project not found or access denied' });
    }

    if (!supabaseService) {
      return res.status(500).json({ error: 'Database not available' });
    }

    if (type === 'customer') {
      // Remove customer GitHub integration
      await db.removeGitHubIntegration(req.user.id);
      
      // If this project was using customer integration, clear the repo info
      if (project.github_integration_type === 'customer') {
        await db.updateProject(id, {
          repoowner: null,
          reponame: null,
          github_integration_type: null,
          repo_private: null,
          default_branch: null
        });
      }
    } else if (type === 'platform') {
      // For platform disconnection, we just remove project linking since
      // the platform token is managed by you globally
      if (project.github_integration_type === 'platform') {
        await db.updateProject(id, {
          repoowner: null,
          reponame: null,
          github_integration_type: null,
          repo_private: null,
          default_branch: null
        });
      }
    }

    res.json({ success: true, message: `${type} GitHub integration disconnected` });
  } catch (error) {
    console.error('Failed to disconnect GitHub:', error);
    res.status(500).json({ error: 'Failed to disconnect GitHub integration' });
  }
});

export default router;