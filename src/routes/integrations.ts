import express from 'express';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

// Access services from app.locals (set by main index.ts)
const getServices = (req: any) => ({
  supabase: req.app.locals.supabase,
  supabaseService: req.app.locals.supabaseService,
  db: req.app.locals.db,
  vercelService: req.app.locals.vercelService
});

// GET /api/integrations/projects/:id/vercel-status - Get detailed Vercel integration status  
router.get('/api/integrations/projects/:id/vercel-status', authenticateUser, async (req: any, res: any) => {
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

    // Query actual Vercel integrations from database
    const customerVercel: any = null; // TODO: Query customer Vercel integration
    const platformVercel: any = null; // TODO: Query platform Vercel integration
    
    // Platform connection - check if configured
    const platformConnection = {
      type: 'platform',
      connected: true, // Mock connection for development
      username: 'celiador-platform',
      teamSlug: 'celiador',
      teamId: 'team_celiador',
      projectName: project.vercel_integration_type === 'platform' ? project.vercel_project_id : null,
      deploymentUrl: project.vercel_integration_type === 'platform' ? project.deployment_url : null,
      permissions: ['read', 'write'],
      tokenStatus: 'valid',
      lastDeploy: new Date().toISOString(),
      trial: {
        started: new Date().toISOString(),
        expires: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        isActive: true,
        daysRemaining: 5,
        isExpired: false,
        deploymentsUsed: 0,
        maxDeployments: 10
      }
    };

    console.log('[VERCEL] Platform connection - projectName:', project.vercel_project_id, 'deploymentUrl:', project.deployment_url, 'type:', project.vercel_integration_type);

    const customerConnection = {
      type: 'customer',
      connected: !!customerVercel,
      username: customerVercel?.username || null,
      teamSlug: customerVercel?.team_slug || null,
      teamId: customerVercel?.team_id || null,
      projectName: project.vercel_integration_type === 'customer' ? project.vercel_project_id : null,
      deploymentUrl: project.vercel_integration_type === 'customer' ? project.deployment_url : null,
      permissions: customerVercel ? ['read', 'write'] : [],
      tokenStatus: customerVercel?.token_status || 'disconnected',
      lastDeploy: customerVercel?.last_deploy || null
    };

    // Determine which connection is active for this project
    let activeConnection = null;
    if (project.vercel_project_id) {
      // Priority logic similar to GitHub:
      // 1. If customer has Vercel and explicitly set, use customer
      // 2. If platform trial is expired, require customer connection
      // 3. Otherwise use platform (trial active or no trial set)
      if (customerVercel && project.vercel_integration_type === 'customer') {
        activeConnection = 'customer';
      } else if (platformVercel?.trial?.isExpired && !customerVercel) {
        activeConnection = null; // Force user to connect their Vercel
      } else if (platformVercel?.trial?.isExpired && customerVercel) {
        activeConnection = 'customer'; // Auto-migrate to customer Vercel
      } else {
        activeConnection = 'platform'; // Use platform Vercel (trial active or no trial)
      }
    }

    // TODO: Query actual deployment data from database
    const recentDeployments: any[] = [];
    const currentDeployment: any = null;

    const response = {
      customerConnection,
      platformConnection,
      activeConnection,
      projectLinked: !!project.vercel_project_id,
      currentDeployment,
      recentDeployments
    };
    
    res.json(response);
  } catch (error) {
    console.error('[VERCEL] Failed to get Vercel integration status:', error);
    res.status(500).json({ error: 'Failed to get Vercel integration status' });
  }
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

    // Validate repository existence if linked (with timeout)
    let repoStatus = 'unknown';
    let repoValidated = false;
    
    if (project.repoowner && project.reponame) {
      try {
        console.log(`[GITHUB] Validating repo: ${project.repoowner}/${project.reponame}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout for status check
        
        const repoResponse = await fetch(`https://api.github.com/repos/${project.repoowner}/${project.reponame}`, {
          headers: {
            'Authorization': `Bearer ${process.env.GITHUB_ACCESS_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Celiador-Platform/1.0'
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (repoResponse.ok) {
          repoStatus = 'exists';
          repoValidated = true;
          console.log(`[GITHUB] Repository validated: ${project.repoowner}/${project.reponame}`);
        } else if (repoResponse.status === 404) {
          repoStatus = 'not_found';
          repoValidated = false;
          console.log(`[GITHUB] Repository not found: ${project.repoowner}/${project.reponame}`);
        } else if (repoResponse.status === 403) {
          repoStatus = 'access_denied';
          repoValidated = false;
          console.log(`[GITHUB] Repository access denied: ${project.repoowner}/${project.reponame}`);
        } else {
          repoStatus = 'api_error';
          repoValidated = false;
          console.log(`[GITHUB] Repository API error ${repoResponse.status}: ${project.repoowner}/${project.reponame}`);
        }
      } catch (error: unknown) {
        if ((error as Error).name === 'AbortError') {
          repoStatus = 'timeout';
          repoValidated = false;
          console.warn(`[GITHUB] Repository validation timeout: ${project.repoowner}/${project.reponame}`);
        } else {
          repoStatus = 'validation_error';
          repoValidated = false;
          console.warn(`[GITHUB] Repository validation error:`, (error as Error).message);
        }
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
        defaultBranch: project.default_branch || 'main',
        status: repoStatus,
        validated: repoValidated
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

// POST /api/integrations/projects/:id/vercel-platform-connect - Connect platform Vercel account
router.post('/api/integrations/projects/:id/vercel-platform-connect', authenticateUser, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    
    const { db } = getServices(req);
    const project = await db.getProjectById(id);
    if (!project || project.userid !== req.user.id) {
      return res.status(404).json({ error: 'Project not found or access denied' });
    }

    // Initialize trial if user doesn't have one yet
    const platformVercel = await db.getPlatformVercelIntegration(req.user.id);
    if (!platformVercel?.trial) {
      await db.initializeVercelTrial(req.user.id, 5); // 5-day trial for testing
    }

    // Update project to use platform Vercel
    await db.updateProject(id, {
      vercel_integration_type: 'platform',
      vercel_project_id: `${project.name}-${req.user.id.substring(0, 8)}`,
      deployment_url: `https://${project.name}-${req.user.id.substring(0, 8)}.vercel.app`
    });

    console.log(`[VERCEL] Connected platform Vercel for project ${id}`);
    res.json({ success: true, message: 'Platform Vercel connected successfully' });
  } catch (error) {
    console.error('Failed to connect platform Vercel:', error);
    res.status(500).json({ error: 'Failed to connect platform Vercel' });
  }
});

// POST /api/integrations/projects/:id/vercel-disconnect - Disconnect Vercel integration
router.post('/api/integrations/projects/:id/vercel-disconnect', authenticateUser, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { type } = req.body; // 'customer' or 'platform'
    
    const { db } = getServices(req);
    const project = await db.getProjectById(id);
    if (!project || project.userid !== req.user.id) {
      return res.status(404).json({ error: 'Project not found or access denied' });
    }

    if (type === 'customer') {
      // Remove customer Vercel integration (would be implemented when we have user Vercel connections)
      console.log(`Disconnecting customer Vercel for project ${id}`);
      
      // If this project was using customer integration, clear the Vercel info
      if (project.vercel_integration_type === 'customer') {
        await db.updateProject(id, {
          vercel_project_id: null,
          vercel_integration_type: null,
          deployment_url: null
        });
      }
    } else if (type === 'platform') {
      // For platform disconnection, remove project linking
      if (project.vercel_integration_type === 'platform') {
        await db.updateProject(id, {
          vercel_project_id: null,
          vercel_integration_type: null,
          deployment_url: null
        });
      }
    }

    res.json({ success: true, message: `${type} Vercel integration disconnected` });
  } catch (error) {
    console.error('Failed to disconnect Vercel:', error);
    res.status(500).json({ error: 'Failed to disconnect Vercel integration' });
  }
});

// POST /api/integrations/projects/:id/vercel-deploy - Deploy to Vercel
router.post('/api/integrations/projects/:id/vercel-deploy', authenticateUser, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { type } = req.body; // 'customer' or 'platform'
    
    const { db, supabaseService } = getServices(req);
    const project = await db.getProjectById(id);
    if (!project || project.userid !== req.user.id) {
      return res.status(404).json({ error: 'Project not found or access denied' });
    }

    // Initialize Vercel service with platform token and team ID
    const { VercelService } = require('../services/vercel');
    const vercelService = new VercelService(process.env.VERCEL_API_TOKEN, process.env.VERCEL_TEAM_ID);

    // Check if project has GitHub repo configured
    if (!project.repoowner || !project.reponame) {
      return res.status(400).json({ 
        error: 'No repository configured',
        message: 'Please connect a GitHub repository before deploying to Vercel.'
      });
    }

    // Validate that the GitHub repository actually exists (with timeout)
    try {
      console.log(`[VERCEL] Validating GitHub repo exists: ${project.repoowner}/${project.reponame}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const repoResponse = await fetch(`https://api.github.com/repos/${project.repoowner}/${project.reponame}`, {
        headers: {
          'Authorization': `Bearer ${process.env.GITHUB_ACCESS_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Celiador-Platform/1.0'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!repoResponse.ok) {
        if (repoResponse.status === 404) {
          console.log(`[VERCEL] 🚀 LAZY REPO: Repository not found, creating ${project.repoowner}/${project.reponame}`);
          
          // LAZY REPO CREATION: Create the GitHub repository now since deployment requires it
          if (!project.repo_created) {
            try {
              console.log(`[VERCEL] Creating GitHub repository on-demand: ${project.repoowner}/${project.reponame}`);
              
              // ENSURE ONE REPO PER PROJECT: Check if this project already has a repository
              const existingProjects = await db.getProjectsByUserId(req.user.id);
              const conflictingProject = existingProjects.find((p: any) => 
                p.id !== project.id && 
                p.repoowner === project.repoowner && 
                p.reponame === project.reponame && 
                p.repo_created
              );
              
              if (conflictingProject) {
                console.error(`[VERCEL] Repository ${project.repoowner}/${project.reponame} already exists for project ${conflictingProject.id}`);
                return res.status(400).json({ 
                  error: 'Repository conflict',
                  message: `The GitHub repository ${project.repoowner}/${project.reponame} is already used by another project: "${conflictingProject.name}". Please choose a different repository name.`
                });
              }
              
              const { GitHubService } = require('../services/github-service');
              const githubService = new GitHubService(process.env.GITHUB_ACCESS_TOKEN);
              
              const repoData = {
                name: project.reponame,
                description: `${project.name} - Created by Celiador`,
                private: false,
                autoInit: true
              };
              
              let createdRepo;
              if (project.repoowner === 'celiador-repos') {
                // Create in organization
                createdRepo = await githubService.createRepositoryInOrg('celiador-repos', repoData);
              } else {
                // Create in user account (fallback)
                createdRepo = await githubService.createRepository(repoData);
              }
              
              console.log(`[VERCEL] ✅ GitHub repository created: ${createdRepo.html_url}`);
              
              // Update project to mark repo as created
              await db.updateProject(project.id, { 
                repo_created: true,
                repo_url: createdRepo.html_url,
                default_branch: createdRepo.default_branch || 'main'
              });
              
              // Update our local project object
              project.repo_created = true;
              project.repo_url = createdRepo.html_url;
              project.default_branch = createdRepo.default_branch || 'main';
              
              // LAZY REPO: Push all files from Supabase Storage to the new repository
              try {
                console.log(`[VERCEL] Pushing project files from Supabase Storage to GitHub repository`);
                
                // Get all files from Supabase Storage
                // Get all project files using UnifiedFileService (database-first with storage fallback)
                const { fileService } = await import('../services/unified-file-service.js');
                const projectFiles = await fileService.getProjectFiles(project.id, project.userid, {
                  includeBinary: false, // Only text files for GitHub
                  limit: 1000
                });
                
                if (!projectFiles || projectFiles.length === 0) {
                  console.warn(`[VERCEL] No files found for project ${project.id}`);
                } else {
                  console.log(`[VERCEL] Found ${projectFiles.length} files to push to GitHub`);
                  
                  // Prepare files for GitHub push
                  const filesToPush = projectFiles.map(file => ({
                    path: file.path.replace(/%5B/g, '[').replace(/%5D/g, ']'), // Decode URL-encoded paths
                    content: file.content
                  }));
                  
                  if (filesToPush.length > 0) {
                    // Push all files to GitHub at once
                    await githubService.createBatchCommit(
                      project.repoowner,
                      project.reponame,
                      filesToPush,
                      'Initial commit: Deploy project files'
                    );
                    console.log(`[VERCEL] ✅ Pushed ${filesToPush.length} files to GitHub repository`);
                  }
                }
              } catch (pushError) {
                console.warn(`[VERCEL] Warning: Failed to push files to GitHub (deployment can continue):`, pushError);
              }
              
            } catch (repoCreationError) {
              console.error(`[VERCEL] Failed to create GitHub repository:`, repoCreationError);
              return res.status(500).json({ 
                error: 'Repository creation failed',
                message: `Failed to create GitHub repository ${project.repoowner}/${project.reponame}. Error: ${repoCreationError instanceof Error ? repoCreationError.message : 'Unknown error'}`
              });
            }
          } else {
            console.error(`[VERCEL] Repository not found: ${project.repoowner}/${project.reponame}`);
            return res.status(400).json({ 
              error: 'Repository not found',
              message: `The GitHub repository ${project.repoowner}/${project.reponame} does not exist. Please check the repository configuration.`
            });
          }
        } else if (repoResponse.status === 403) {
          console.error(`[VERCEL] Repository access denied: ${project.repoowner}/${project.reponame}`);
          return res.status(400).json({ 
            error: 'Repository access denied',
            message: `Access denied to repository ${project.repoowner}/${project.reponame}. Please check repository permissions.`
          });
        } else {
          console.warn(`[VERCEL] GitHub API error ${repoResponse.status} for ${project.repoowner}/${project.reponame}`);
          return res.status(400).json({ 
            error: 'Repository validation failed',
            message: `Unable to verify repository ${project.repoowner}/${project.reponame}. GitHub API returned status ${repoResponse.status}.`
          });
        }
      }

      const repoData = await repoResponse.json();
      console.log(`[VERCEL] Repository validated: ${repoData.full_name}, default branch: ${repoData.default_branch}`);
      
      // Update project with actual default branch if different
      // Only update if the project doesn't have a default_branch set or it's different
      const currentDefaultBranch = project.default_branch || 'main';
      if (repoData.default_branch && repoData.default_branch !== currentDefaultBranch) {
        try {
          await db.updateProject(id, { default_branch: repoData.default_branch });
          project.default_branch = repoData.default_branch;
          console.log(`[VERCEL] Updated project default branch to: ${repoData.default_branch}`);
        } catch (error) {
          // If default_branch column doesn't exist, ignore the error and continue
          console.log(`[VERCEL] Could not update default_branch (column may not exist), using: ${repoData.default_branch}`);
          project.default_branch = repoData.default_branch;
        }
      }
      
    } catch (repoError: unknown) {
      if ((repoError as Error).name === 'AbortError') {
        console.error('[VERCEL] Repository validation timeout');
        return res.status(400).json({ 
          error: 'Repository validation timeout',
          message: `Timeout while validating repository ${project.repoowner}/${project.reponame}. Please try again or check your repository configuration.`
        });
      }
      
      console.error('[VERCEL] Repository validation error:', (repoError as Error).message);
      return res.status(400).json({ 
        error: 'Repository validation failed',
        message: `Unable to validate repository ${project.repoowner}/${project.reponame}. Error: ${(repoError as Error).message}`
      });
    }

    // Check trial limits for platform deployments
    if (type === 'platform') {
      const platformVercel = await db.getPlatformVercelIntegration(req.user.id);
      if (platformVercel?.trial?.isExpired) {
        return res.status(403).json({ 
          error: 'Platform trial expired',
          message: 'Your Vercel platform trial has expired. Please connect your own Vercel account to continue deployments.'
        });
      }
    }

    // Create real Vercel deployment

    // Create simplified Vercel deployment (files only, no Git integration)
    try {
      console.log(`[VERCEL] Starting file-based deployment for ${project.repoowner}/${project.reponame}`);
      console.log(`[VERCEL] Using team ID for deployment:`, process.env.VERCEL_TEAM_ID || 'No team ID');
      
      const projectName = type === 'platform' 
        ? `${project.name}-${req.user.id.substring(0, 8)}`
        : project.name;

      // Deploy via simple file upload (no GitHub integration complexity)
      const defaultBranch = project.default_branch || 'main';
      const deployment = await vercelService.deployFromFiles(
        projectName,
        project.repoowner,
        project.reponame,
        defaultBranch,
        'production'
      );

      // Log deployment creation (skip database record for now due to schema issues)
      console.log(`[VERCEL] Created deployment ${deployment.id} for project ${id}`);

      // Get the real deployment URL from Vercel response
      const deploymentUrl = deployment.url ? `https://${deployment.url}` : `https://${deployment.id}.vercel.app`;
      
      try {
        await db.updateProject(id, {
          deployment_url: deploymentUrl,
          vercel_integration_type: type,
          vercel_project_id: type === 'platform' 
            ? `${project.name}-${req.user.id.substring(0, 8)}`
            : project.name
        });
        console.log(`[VERCEL] Updated project ${id} with real deployment URL:`, deploymentUrl);
      } catch (updateError) {
        console.warn('[VERCEL] Failed to update project with deployment URL:', updateError);
      }

      res.json({ 
        success: true, 
        deploymentId: deployment.id,
        url: deploymentUrl,
        status: deployment.readyState?.toUpperCase() || deployment.status?.toUpperCase() || deployment.state?.toUpperCase() || 'BUILDING',
        message: 'Vercel deployment started successfully',
        buildLogs: `https://vercel.com/deployments/${deployment.id}`
      });
    } catch (deployError: unknown) {
      console.error('[VERCEL] Real deployment failed:', deployError);
      
      // Fallback to mock deployment on API failure
      const deploymentId = `dep_${Date.now()}`;
      const deploymentUrl = type === 'platform' 
        ? `https://${project.name}-${req.user.id.substring(0, 8)}.vercel.app`
        : `https://${project.name}.vercel.app`;

      // Update project with fallback deployment URL
      try {
        await db.updateProject(id, {
          deployment_url: deploymentUrl,
          vercel_integration_type: type,
          vercel_project_id: type === 'platform' 
            ? `${project.name}-${req.user.id.substring(0, 8)}`
            : project.name
        });
        console.log(`[VERCEL] Updated project ${id} with fallback deployment URL:`, deploymentUrl);
      } catch (updateError) {
        console.warn('[VERCEL] Failed to update project with fallback deployment URL:', updateError);
      }

      res.json({ 
        success: true, 
        deploymentId,
        url: deploymentUrl,
        status: 'ERROR',
        message: `Real deployment failed, using fallback URL: ${(deployError as Error).message}`,
        error: (deployError as Error).message
      });
    }
  } catch (error) {
    console.error('Failed to deploy to Vercel:', error);
    res.status(500).json({ error: 'Failed to deploy to Vercel' });
  }
});

// GET /api/integrations/projects/:id/vercel-deployment/:deploymentId - Get deployment status
router.get('/api/integrations/projects/:id/vercel-deployment/:deploymentId', authenticateUser, async (req: any, res: any) => {
  try {
    const { id, deploymentId } = req.params;
    
    const { db } = getServices(req);
    const project = await db.getProjectById(id);
    if (!project || project.userid !== req.user.id) {
      return res.status(404).json({ error: 'Project not found or access denied' });
    }

    // Initialize Vercel service with platform token and team ID
    const vercelService = new (require('../services/vercel').VercelService)(process.env.VERCEL_API_TOKEN, process.env.VERCEL_TEAM_ID);
    if (!vercelService) {
      return res.status(500).json({ error: 'Vercel service not available' });
    }

    try {
      // Get deployment status from Vercel
      console.log(`[VERCEL] Getting deployment status for: ${deploymentId}`);
      console.log(`[VERCEL] Using Vercel token:`, process.env.VERCEL_API_TOKEN ? 'Token available' : 'No token');
      console.log(`[VERCEL] Using team ID:`, process.env.VERCEL_TEAM_ID || 'No team ID');
      const deployment = await vercelService.getDeployment(deploymentId);
      console.log(`[VERCEL] Raw deployment response:`, JSON.stringify(deployment, null, 2));
      
      // Calculate deployment phase and progress information
      const now = Date.now();
      const createdTime = deployment.createdAt ? new Date(deployment.createdAt).getTime() : now;
      const buildingTime = deployment.buildingAt ? new Date(deployment.buildingAt).getTime() : null;
      const readyTime = deployment.readyAt ? new Date(deployment.readyAt).getTime() : null;
      
      console.log(`[VERCEL] Progress calculation - now: ${now}, created: ${createdTime}, building: ${buildingTime}, ready: ${readyTime}`);
      
      let phase = 'initializing';
      let progress = 0;
      let progressMessage = 'Initializing deployment...';
      
      const status = deployment.readyState?.toUpperCase() || deployment.status?.toUpperCase() || deployment.state?.toUpperCase() || 'UNKNOWN';
      console.log(`[VERCEL] Calculated status: ${status}`);
      
      if (status === 'QUEUED' || status === 'PENDING') {
        phase = 'queued';
        progress = 10;
        progressMessage = 'Deployment queued, waiting to start...';
      } else if (status === 'BUILDING') {
        phase = 'building';
        if (buildingTime) {
          // If we have a building timestamp, calculate progress based on typical build time (3-5 minutes)
          const buildDuration = now - buildingTime;
          const estimatedBuildTime = 4 * 60 * 1000; // 4 minutes
          progress = Math.min(90, 20 + Math.floor((buildDuration / estimatedBuildTime) * 70));
        } else {
          progress = 20;
        }
        progressMessage = buildingTime 
          ? `Building application... (${Math.floor((now - buildingTime) / 1000)}s elapsed)`
          : 'Building application...';
      } else if (status === 'READY') {
        phase = 'ready';
        progress = 100;
        const totalTime = readyTime ? Math.floor((readyTime - createdTime) / 1000) : 'unknown';
        progressMessage = `Deployment successful! (completed in ${totalTime}s)`;
        console.log(`[VERCEL] READY status - phase: ${phase}, progress: ${progress}, message: ${progressMessage}`);
      } else if (status === 'ERROR') {
        phase = 'error';
        progress = 100;
        progressMessage = 'Build failed - check deployment logs for details';
        console.log(`[VERCEL] ERROR status - phase: ${phase}, progress: ${progress}, message: ${progressMessage}`);
      } else if (status === 'CANCELED') {
        phase = 'canceled';
        progress = 100;
        progressMessage = 'Deployment was canceled';
        console.log(`[VERCEL] CANCELED status - phase: ${phase}, progress: ${progress}, message: ${progressMessage}`);
      } else {
        phase = 'unknown';
        progress = 15;
        progressMessage = `Status: ${status} - processing...`;
        console.log(`[VERCEL] UNKNOWN status - phase: ${phase}, progress: ${progress}, message: ${progressMessage}`);
      }

      // Get deployment logs for additional context
      let buildLogs = [];
      try {
        const logs = await vercelService.getDeploymentLogs(deploymentId);
        buildLogs = logs.slice(-5).map((log: any) => ({
          timestamp: log.created,
          message: log.text || log.payload?.text || 'Build step completed',
          type: log.type
        }));
      } catch (logError) {
        console.warn('[VERCEL] Failed to get deployment logs:', logError);
      }
      
      const response = {
        deploymentId: deployment.id || deploymentId,
        status,
        phase,
        progress,
        progressMessage,
        url: deployment.url || project.deployment_url,
        createdAt: deployment.createdAt,
        buildingAt: deployment.buildingAt,
        readyAt: deployment.readyAt,
        inspectorUrl: deployment.inspectorUrl,
        buildLogs,
        timing: {
          created: createdTime,
          building: buildingTime,
          ready: readyTime,
          totalDuration: readyTime ? readyTime - createdTime : now - createdTime
        }
      };

      console.log(`[VERCEL] Final response data:`, JSON.stringify({
        deploymentId: response.deploymentId,
        status: response.status,
        phase: response.phase,
        progress: response.progress,
        progressMessage: response.progressMessage,
        url: response.url
      }, null, 2));

      res.json(response);
    } catch (vercelError) {
      console.warn('[VERCEL] Failed to get deployment status:', vercelError);
      
      // Return fallback status with progressive information
      const startTime = Date.now() - (5 * 60 * 1000); // Assume started 5 minutes ago for fallback
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      res.json({
        deploymentId,
        status: 'BUILDING',
        phase: 'building',
        progress: Math.min(70, 20 + Math.floor(elapsed / 10)), // Progressive fallback
        progressMessage: 'Building application (status check failed, but deployment may still be in progress)...',
        url: project.deployment_url,
        fallback: true,
        timing: {
          created: startTime,
          building: startTime + 30000, // 30s after start
          totalDuration: Date.now() - startTime
        }
      });
    }
  } catch (error) {
    console.error('Failed to get deployment status:', error);
    res.status(500).json({ error: 'Failed to get deployment status' });
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
        try {
          await db.updateProject(id, {
            repoowner: null,
            reponame: null,
            github_integration_type: null,
            repo_private: null,
            default_branch: null
          });
        } catch (error) {
          // If default_branch column doesn't exist, update without it
          await db.updateProject(id, {
            repoowner: null,
            reponame: null,
            github_integration_type: null,
            repo_private: null
          });
        }
      }
    } else if (type === 'platform') {
      // For platform disconnection, we just remove project linking since
      // the platform token is managed by you globally
      if (project.github_integration_type === 'platform') {
        try {
          await db.updateProject(id, {
            repoowner: null,
            reponame: null,
            github_integration_type: null,
            repo_private: null,
            default_branch: null
          });
        } catch (error) {
          // If default_branch column doesn't exist, update without it
          await db.updateProject(id, {
            repoowner: null,
            reponame: null,
            github_integration_type: null,
            repo_private: null
          });
        }
      }
    }

    res.json({ success: true, message: `${type} GitHub integration disconnected` });
  } catch (error) {
    console.error('Failed to disconnect GitHub:', error);
    res.status(500).json({ error: 'Failed to disconnect GitHub integration' });
  }
});

export default router;