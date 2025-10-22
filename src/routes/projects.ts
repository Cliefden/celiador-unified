import express from 'express';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

// Access services from app.locals (set by main index.ts)
const getServices = (req: any) => ({
  supabase: req.app.locals.supabase,
  supabaseService: req.app.locals.supabaseService,
  db: req.app.locals.db
});

// Simple in-memory job processing queue (shared with legacy-routes for now)
// TODO: Move to a dedicated service
declare const jobQueue: any[];

// GET /projects - List all projects for the authenticated user
router.get('/', authenticateUser, async (req: any, res: any) => {
  try {
    console.log('GET /projects - User:', req.user?.id);
    
    const { supabaseService, db } = getServices(req);
    if (!supabaseService) {
      console.log('No Supabase service available');
      return res.json([]);
    }

    const projects = await db.getProjectsByUserId(req.user.id);
    console.log(`Found ${projects.length} projects for user ${req.user.id}`);
    res.json(projects);
  } catch (error) {
    console.error('Projects fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// POST /projects - Create a new project
router.post('/', authenticateUser, async (req: any, res: any) => {
  console.log(`🚀 [CREATE PROJECT] Request received:`, {
    name: req.body.name,
    templateKey: req.body.templateKey,
    userId: req.user?.id,
    timestamp: new Date().toISOString()
  });
  
  try {
    const { name, templateKey, repo, createGitHubRepo } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    const { supabaseService, db } = getServices(req);
    if (!supabaseService || !db) {
      return res.status(500).json({ error: 'Database service not available' });
    }

    // Check for duplicate project names for this user
    console.log(`🔍 [CREATE PROJECT] Checking for duplicate project name: "${name}"`);
    const { data: existingProjects, error: duplicateCheckError } = await supabaseService
      .from('projects')
      .select('id, name')
      .eq('userid', req.user.id)
      .eq('name', name)
      .is('deletedAt', null);
    
    if (duplicateCheckError) {
      console.error('[CREATE PROJECT] Failed to check for duplicate names:', duplicateCheckError);
      return res.status(500).json({ error: 'Failed to validate project name' });
    }
    
    if (existingProjects && existingProjects.length > 0) {
      console.log(`❌ [CREATE PROJECT] Duplicate project name found: "${name}"`);
      return res.status(400).json({ 
        error: 'Project name already exists',
        details: `You already have a project named "${name}". Please choose a different name.`
      });
    }
    
    console.log(`✅ [CREATE PROJECT] Project name "${name}" is available`);

    const defaultRepoName = name.toLowerCase()
      .replace(/[^a-z0-9\\s-]/g, '')
      .replace(/\\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    const finalTemplateKey = templateKey || 'blank-nextjs';
    const shouldCreateRepo = createGitHubRepo !== false; // Default to true
    const repoOwner = repo?.owner || 'celiador-repos'; // Use organization
    const repoName = repo?.name || defaultRepoName;
    
    console.log(`🚀 [CREATE PROJECT] Creating project in database...`);
    
    const project = await Promise.race([
      db.createProject({
        name,
        templateKey: finalTemplateKey,
        repoProvider: shouldCreateRepo ? 'github' : null,
        repoOwner: shouldCreateRepo ? repoOwner : null,
        repoName: shouldCreateRepo ? repoName : null,
        repoUrl: null, // Will be set by GitHub repo creation job
        repoCreated: false,
        userId: req.user.id
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database operation timeout after 30 seconds')), 30000)
      )
    ]);

    console.log(`✅ [CREATE PROJECT] Project created: ${project.id} with template: ${finalTemplateKey}`);

    // Store scaffold job data for processing after GitHub repo creation
    let scaffoldJobForLater = null;

    // Auto-scaffold with template - prepare job but don't queue yet
    if (finalTemplateKey) {
      try {
        const job = await db.createJob({
          projectId: project.id,
          userId: req.user.id,
          type: 'SCAFFOLD',
          prompt: `Initialize project with ${finalTemplateKey} template`
        });

        const jobData = {
          id: job.id,
          projectId: project.id,
          userId: req.user.id,
          type: 'SCAFFOLD',
          templateKey: finalTemplateKey,
          repo: repo || {
            provider: 'github',
            owner: 'user',
            name: defaultRepoName
          }
        };

        // Store scaffold job data for later (after GitHub repo creation)
        scaffoldJobForLater = jobData;
        console.log(`Scaffold job ${job.id} created, waiting for GitHub repo creation`);
      } catch (scaffoldError) {
        console.error('Failed to enqueue scaffold job:', scaffoldError);
      }
    }

    // Create GitHub repository if requested - MUST happen before scaffold
    if (shouldCreateRepo) {
      try {
        const githubJob = await db.createJob({
          projectId: project.id,
          userId: req.user.id,
          type: 'GITHUB_REPO_CREATE',
          prompt: `Create GitHub repository: ${repoOwner}/${repoName}`
        });

        const githubJobData = {
          id: githubJob.id,
          projectId: project.id,
          userId: req.user.id,
          type: 'GITHUB_REPO_CREATE',
          repoName: repoName,
          repoOwner: repoOwner,
          projectName: name
        };

        // Add GitHub repo creation to queue FIRST
        jobQueue.push(githubJobData);
        console.log(`GitHub repo creation job ${githubJob.id} queued successfully`);
        
        // Now add scaffold job AFTER GitHub repo creation
        if (scaffoldJobForLater) {
          jobQueue.push(scaffoldJobForLater);
          console.log(`Scaffold job ${scaffoldJobForLater.id} queued successfully (after GitHub repo creation)`);
        }
      } catch (githubError) {
        console.error('Failed to enqueue GitHub repo creation job:', githubError);
      }
    } else if (scaffoldJobForLater) {
      // If no GitHub repo needed, queue scaffold job directly
      jobQueue.push(scaffoldJobForLater);
      console.log(`Scaffold job ${scaffoldJobForLater.id} queued successfully (no GitHub repo needed)`);
    }

    console.log(`📤 [CREATE PROJECT] Sending response for project: ${project.id}`);
    res.status(201).json(project);
    console.log(`✅ [CREATE PROJECT] Response sent successfully`);
  } catch (error) {
    console.error('❌ [CREATE PROJECT] Failed to create project:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create project';
    res.status(500).json({ error: errorMessage });
    console.log(`💀 [CREATE PROJECT] Error response sent: ${errorMessage}`);
  }
});

// GET /projects/:id - Get a specific project
router.get('/:id', authenticateUser, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    
    const { supabaseService, db } = getServices(req);
    if (!db) {
      return res.status(500).json({ error: 'Database service not available' });
    }
    
    const project = await db.getProjectById(id);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (project.userid !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(project);
  } catch (error) {
    console.error('Failed to fetch project:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// DELETE /projects/:id - Soft delete a project
router.delete('/:id', authenticateUser, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    
    const { supabaseService, db } = getServices(req);
    if (!supabaseService || !db) {
      return res.status(500).json({ error: 'Database service not available' });
    }
    
    const project = await db.getProjectById(id);
    
    if (!project || project.userid !== req.user.id) {
      return res.status(404).json({ error: 'Project not found or access denied' });
    }

    // Soft delete the project
    await supabaseService
      .from('projects')
      .update({ 
        deletedAt: new Date().toISOString(),
        updatedat: new Date().toISOString()
      })
      .eq('id', id)
      .eq('userid', req.user.id);

    res.json({ success: true });
  } catch (error) {
    console.error('Project delete error:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// GET /projects/:id/backups - Get project backup history  
router.get('/:id/backups', authenticateUser, async (req: any, res: any) => {
  try {
    const { id: projectId } = req.params;
    const { limit = 50 } = req.query;
    
    // TODO: Implement backup service
    // For now, return empty array as backups feature is not yet implemented
    console.log(`[Backups] Fetching backup history for project ${projectId} (limit: ${limit})`);
    
    res.json({ backups: [] });
  } catch (error: any) {
    console.error('Failed to fetch backup history:', error);
    res.status(500).json({ error: 'Failed to fetch backup history' });
  }
});


// POST /projects/:id/backups/cleanup - Clean up old backups
router.post('/:id/backups/cleanup', authenticateUser, async (req: any, res: any) => {
  try {
    const { id: projectId } = req.params;
    
    // TODO: Implement backup service
    console.log(`[Backups] Cleanup request for project ${projectId} (not implemented)`);
    
    res.status(501).json({ error: 'Backup cleanup functionality not implemented yet' });
  } catch (error: any) {
    console.error('Failed to cleanup backups:', error);
    res.status(500).json({ error: 'Failed to cleanup backups' });
  }
});

export default router;