import express from 'express';
import { authenticateUser } from '../middleware/auth.js';
import { DeploymentOrchestrator } from '../deployment-orchestrator.js';
import { VercelService } from '../services/vercel.js';
import { TokenManager } from '../services/token-manager.js';

const router = express.Router();

// Access services from app.locals (set by main index.ts)
const getServices = (req: any) => ({
  supabase: req.app.locals.supabase,
  supabaseService: req.app.locals.supabaseService,
  db: req.app.locals.db
});

// POST /api/deployments/deploy - Deploy a project to Vercel
router.post('/api/deployments/deploy', authenticateUser, async (req: any, res: any) => {
  try {
    console.log('[DEPLOYMENTS] Starting deployment for user:', req.user?.id);
    
    const { supabaseService } = getServices(req);
    if (!supabaseService) {
      return res.status(500).json({ error: 'Database not available' });
    }

    const userId = req.user.id;
    const {
      projectId,
      projectName,
      templateKey,
      files,
      isPrivate = false,
      orgName,
      githubToken,
      vercelToken // Optional - if not provided, will use TokenManager logic
    } = req.body;

    // Validate required fields
    if (!projectId || !projectName || !templateKey || !files) {
      return res.status(400).json({ 
        error: 'projectId, projectName, templateKey, and files are required' 
      });
    }

    // Validate that the project belongs to the user
    const { data: project, error: projectError } = await supabaseService
      .from('projects')
      .select('id, user_id, name')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found or unauthorized' });
    }

    // Use TokenManager to get appropriate Vercel token
    const tokenManager = new TokenManager(supabaseService);
    let tokenResult;
    
    try {
      tokenResult = await tokenManager.selectToken(userId, vercelToken);
    } catch (error: any) {
      return res.status(400).json({ 
        error: error.message,
        code: 'TOKEN_ERROR',
        shouldUpgrade: error.message.includes('limit')
      });
    }

    console.log(`[DEPLOYMENTS] Using ${tokenResult.isSystemToken ? 'system' : 'personal'} token for deployment`);

    // Create deployment orchestrator
    const orchestrator = new DeploymentOrchestrator(supabaseService);

    // Deploy project with selected token
    const deploymentResult = await orchestrator.deployProject({
      projectId,
      projectName,
      templateKey,
      files,
      userId,
      isPrivate,
      orgName,
      githubToken,
      vercelToken: tokenResult.token
    });

    if (deploymentResult.success) {
      // Track system token usage
      await tokenManager.trackDeployment(userId, projectId, tokenResult.isSystemToken);

      console.log(`[DEPLOYMENTS] Deployment successful for project ${projectId}`);
      
      // Check if user should be prompted to upgrade
      const upgradeInfo = await tokenManager.shouldPromptUpgrade(userId);
      
      res.status(201).json({
        success: true,
        deployment: {
          projectId,
          repoUrl: deploymentResult.repoUrl,
          repoFullName: deploymentResult.repoFullName,
          vercelProjectId: deploymentResult.vercelProjectId,
          deploymentUrl: deploymentResult.deploymentUrl,
          steps: deploymentResult.steps,
          usedSystemToken: tokenResult.isSystemToken,
          remainingFreeDeployments: tokenResult.remainingDeployments
        },
        upgrade: upgradeInfo
      });
    } else {
      console.error(`[DEPLOYMENTS] Deployment failed for project ${projectId}:`, deploymentResult.error);
      res.status(500).json({
        success: false,
        error: deploymentResult.error,
        steps: deploymentResult.steps
      });
    }

  } catch (error: any) {
    console.error('[DEPLOYMENTS] Error during deployment:', error);
    res.status(500).json({ error: 'Failed to deploy project' });
  }
});

// GET /api/deployments/status/:projectId - Get deployment status
router.get('/api/deployments/status/:projectId', authenticateUser, async (req: any, res: any) => {
  try {
    const { supabaseService } = getServices(req);
    if (!supabaseService) {
      return res.status(500).json({ error: 'Database not available' });
    }

    const userId = req.user.id;
    const { projectId } = req.params;

    // Validate that the project belongs to the user
    const { data: project, error: projectError } = await supabaseService
      .from('projects')
      .select('id, user_id')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found or unauthorized' });
    }

    // Create deployment orchestrator to get status
    const orchestrator = new DeploymentOrchestrator(supabaseService);
    const status = await orchestrator.getDeploymentStatus(projectId);

    res.json({
      success: true,
      status
    });

  } catch (error: any) {
    console.error('[DEPLOYMENTS] Error getting deployment status:', error);
    res.status(500).json({ error: 'Failed to get deployment status' });
  }
});

// POST /api/deployments/vercel/projects - Create Vercel project
router.post('/api/deployments/vercel/projects', authenticateUser, async (req: any, res: any) => {
  try {
    const { name, framework, gitRepository, vercelToken } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    if (!vercelToken) {
      return res.status(400).json({ error: 'Vercel API token is required' });
    }

    const vercelService = new VercelService(vercelToken);

    // Validate token first
    const isValidToken = await vercelService.validateToken();
    if (!isValidToken) {
      return res.status(401).json({ error: 'Invalid Vercel API token' });
    }

    const project = await vercelService.createProject(name, framework);

    console.log(`[VERCEL] Created project: ${project.name} (${project.id})`);
    res.status(201).json({
      success: true,
      project
    });

  } catch (error: any) {
    console.error('[VERCEL] Error creating project:', error);
    res.status(500).json({ error: 'Failed to create Vercel project' });
  }
});

// GET /api/deployments/vercel/projects - List Vercel projects
router.get('/api/deployments/vercel/projects', authenticateUser, async (req: any, res: any) => {
  try {
    const { vercelToken } = req.query;

    if (!vercelToken) {
      return res.status(400).json({ error: 'Vercel API token is required' });
    }

    const vercelService = new VercelService(vercelToken as string);
    const projects = await vercelService.getProjects();

    res.json({
      success: true,
      projects
    });

  } catch (error: any) {
    console.error('[VERCEL] Error listing projects:', error);
    res.status(500).json({ error: 'Failed to list Vercel projects' });
  }
});

// POST /api/deployments/vercel/deploy - Create Vercel deployment
router.post('/api/deployments/vercel/deploy', authenticateUser, async (req: any, res: any) => {
  try {
    const { projectName, files, target = 'production', vercelToken } = req.body;

    if (!projectName || !files || !vercelToken) {
      return res.status(400).json({ 
        error: 'projectName, files, and vercelToken are required' 
      });
    }

    const vercelService = new VercelService(vercelToken);
    const deployment = await vercelService.createDeployment(projectName, files, target);

    res.status(201).json({
      success: true,
      deployment
    });

  } catch (error: any) {
    console.error('[VERCEL] Error creating deployment:', error);
    res.status(500).json({ error: 'Failed to create Vercel deployment' });
  }
});

// GET /api/deployments/vercel/deployments/:deploymentId - Get deployment details
router.get('/api/deployments/vercel/deployments/:deploymentId', authenticateUser, async (req: any, res: any) => {
  try {
    const { deploymentId } = req.params;
    const { vercelToken } = req.query;

    if (!vercelToken) {
      return res.status(400).json({ error: 'Vercel API token is required' });
    }

    const vercelService = new VercelService(vercelToken as string);
    const deployment = await vercelService.getDeployment(deploymentId);

    res.json({
      success: true,
      deployment
    });

  } catch (error: any) {
    console.error('[VERCEL] Error getting deployment:', error);
    res.status(500).json({ error: 'Failed to get deployment details' });
  }
});

// GET /api/deployments/vercel/deployments/:deploymentId/logs - Get deployment logs
router.get('/api/deployments/vercel/deployments/:deploymentId/logs', authenticateUser, async (req: any, res: any) => {
  try {
    const { deploymentId } = req.params;
    const { vercelToken } = req.query;

    if (!vercelToken) {
      return res.status(400).json({ error: 'Vercel API token is required' });
    }

    const vercelService = new VercelService(vercelToken as string);
    const logs = await vercelService.getDeploymentLogs(deploymentId);

    res.json({
      success: true,
      logs
    });

  } catch (error: any) {
    console.error('[VERCEL] Error getting deployment logs:', error);
    res.status(500).json({ error: 'Failed to get deployment logs' });
  }
});

// DELETE /api/deployments/vercel/deployments/:deploymentId - Cancel deployment
router.delete('/api/deployments/vercel/deployments/:deploymentId', authenticateUser, async (req: any, res: any) => {
  try {
    const { deploymentId } = req.params;
    const { vercelToken } = req.body;

    if (!vercelToken) {
      return res.status(400).json({ error: 'Vercel API token is required' });
    }

    const vercelService = new VercelService(vercelToken);
    const success = await vercelService.cancelDeployment(deploymentId);

    if (success) {
      res.json({
        success: true,
        message: 'Deployment cancelled successfully'
      });
    } else {
      res.status(500).json({ error: 'Failed to cancel deployment' });
    }

  } catch (error: any) {
    console.error('[VERCEL] Error cancelling deployment:', error);
    res.status(500).json({ error: 'Failed to cancel deployment' });
  }
});

// POST /api/deployments/vercel/validate-token - Validate Vercel token
router.post('/api/deployments/vercel/validate-token', authenticateUser, async (req: any, res: any) => {
  try {
    const { vercelToken } = req.body;

    if (!vercelToken) {
      return res.status(400).json({ error: 'Vercel API token is required' });
    }

    const vercelService = new VercelService(vercelToken);
    const isValid = await vercelService.validateToken();

    if (isValid) {
      // Also get user info if token is valid
      try {
        const user = await vercelService.client.user.getAuthUser();
        res.json({
          success: true,
          valid: true,
          user: {
            id: user.user?.id,
            username: user.user?.username,
            email: user.user?.email,
            name: user.user?.name
          }
        });
      } catch (error) {
        res.json({
          success: true,
          valid: true
        });
      }
    } else {
      res.json({
        success: true,
        valid: false
      });
    }

  } catch (error: any) {
    console.error('[VERCEL] Error validating token:', error);
    res.status(500).json({ error: 'Failed to validate token' });
  }
});

// GET /api/deployments/vercel/projects/:projectId/deployments - Get project deployments
router.get('/api/deployments/vercel/projects/:projectId/deployments', authenticateUser, async (req: any, res: any) => {
  try {
    const { projectId } = req.params;
    const { vercelToken, limit = '10' } = req.query;

    if (!vercelToken) {
      return res.status(400).json({ error: 'Vercel API token is required' });
    }

    const vercelService = new VercelService(vercelToken as string);
    const deployments = await vercelService.getProjectDeployments(projectId, parseInt(limit as string));

    res.json({
      success: true,
      deployments
    });

  } catch (error: any) {
    console.error('[VERCEL] Error getting project deployments:', error);
    res.status(500).json({ error: 'Failed to get project deployments' });
  }
});

// GET /api/deployments/token-info - Get user's token info and usage stats
router.get('/api/deployments/token-info', authenticateUser, async (req: any, res: any) => {
  try {
    const { supabaseService } = getServices(req);
    if (!supabaseService) {
      return res.status(500).json({ error: 'Database not available' });
    }

    const userId = req.user.id;
    const tokenManager = new TokenManager(supabaseService);
    
    const tokenInfo = await tokenManager.getUserTokenInfo(userId);
    const upgradeInfo = await tokenManager.shouldPromptUpgrade(userId);

    res.json({
      success: true,
      tokenInfo: {
        hasPersonalToken: tokenInfo.hasPersonalToken,
        deploymentCount: tokenInfo.deploymentCount,
        canUseSystemToken: tokenInfo.canUseSystemToken,
        systemTokenLimit: tokenInfo.systemTokenLimit,
        remainingFreeDeployments: tokenInfo.systemTokenLimit - tokenInfo.deploymentCount
      },
      upgrade: upgradeInfo
    });

  } catch (error: any) {
    console.error('[DEPLOYMENTS] Error getting token info:', error);
    res.status(500).json({ error: 'Failed to get token info' });
  }
});

// POST /api/deployments/save-token - Save user's personal Vercel token
router.post('/api/deployments/save-token', authenticateUser, async (req: any, res: any) => {
  try {
    const { supabaseService } = getServices(req);
    if (!supabaseService) {
      return res.status(500).json({ error: 'Database not available' });
    }

    const userId = req.user.id;
    const { vercelToken } = req.body;

    if (!vercelToken) {
      return res.status(400).json({ error: 'Vercel token is required' });
    }

    const tokenManager = new TokenManager(supabaseService);
    await tokenManager.saveUserToken(userId, vercelToken);

    res.json({
      success: true,
      message: 'Vercel token saved successfully'
    });

  } catch (error: any) {
    console.error('[DEPLOYMENTS] Error saving token:', error);
    res.status(400).json({ error: error.message });
  }
});

// DELETE /api/deployments/remove-token - Remove user's personal Vercel token
router.delete('/api/deployments/remove-token', authenticateUser, async (req: any, res: any) => {
  try {
    const { supabaseService } = getServices(req);
    if (!supabaseService) {
      return res.status(500).json({ error: 'Database not available' });
    }

    const userId = req.user.id;
    const tokenManager = new TokenManager(supabaseService);
    
    await tokenManager.removeUserToken(userId);

    res.json({
      success: true,
      message: 'Vercel token removed successfully'
    });

  } catch (error: any) {
    console.error('[DEPLOYMENTS] Error removing token:', error);
    res.status(500).json({ error: 'Failed to remove token' });
  }
});

// POST /api/deployments/github-to-vercel - Deploy from GitHub to Vercel  
router.post('/api/deployments/github-to-vercel', authenticateUser, async (req: any, res: any) => {
  try {
    const {
      projectName,
      githubToken,
      vercelToken,
      repoOwner,
      repoName,
      branch = 'main',
      target = 'production'
    } = req.body;

    if (!projectName || !githubToken || !vercelToken || !repoOwner || !repoName) {
      return res.status(400).json({ 
        error: 'projectName, githubToken, vercelToken, repoOwner, and repoName are required' 
      });
    }

    const vercelService = new VercelService(vercelToken);
    const deployment = await vercelService.deployFromGitHub(
      projectName,
      githubToken,
      repoOwner,
      repoName,
      branch,
      target
    );

    res.status(201).json({
      success: true,
      deployment
    });

  } catch (error: any) {
    console.error('[VERCEL] Error deploying from GitHub:', error);
    res.status(500).json({ error: 'Failed to deploy from GitHub to Vercel' });
  }
});

export default router;