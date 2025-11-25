import express from 'express';
import { authenticateUser } from '../middleware/auth.js';
import fs from 'fs/promises';
import path from 'path';

const router = express.Router();

// Access services from app.locals (set by main index.ts)
const getServices = (req: any) => ({
  supabase: req.app.locals.supabase,
  supabaseService: req.app.locals.supabaseService,
  db: req.app.locals.db,
  jobService: req.app.locals.jobService
});

// POST /projects/:projectId/migrate-files - Migrate files from storage to database
router.post('/:projectId/migrate-files', authenticateUser, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { user } = req as any;
    
    if (!user?.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    console.log(`🔄 [MIGRATION] Manual file migration requested for project ${projectId}, user ${user.id}`);

    // Import UnifiedFileService
    const { fileService } = await import('../services/unified-file-service.js');
    
    // Check current status
    const status = await fileService.checkProjectFilesStatus(projectId);
    console.log(`📊 [MIGRATION] Current status - DB: ${status.databaseFiles}, Storage: ${status.storageFiles}, Migration needed: ${status.migrationNeeded}`);
    
    if (!status.migrationNeeded && status.databaseFiles > 0) {
      return res.json({
        success: true,
        message: 'No migration needed - files already in database',
        status
      });
    }

    if (status.storageFiles === 0) {
      return res.status(404).json({
        error: 'No files found in storage for this project',
        status
      });
    }

    // Perform migration
    const migrationResult = await fileService.migrateStorageFilesToDatabase(projectId, user.id);
    
    console.log(`🎉 [MIGRATION] Migration completed - Success: ${migrationResult.success}, Migrated: ${migrationResult.migratedFiles}, Errors: ${migrationResult.errors.length}`);

    return res.json({
      success: migrationResult.success,
      migratedFiles: migrationResult.migratedFiles,
      errors: migrationResult.errors,
      status: await fileService.checkProjectFilesStatus(projectId)
    });

  } catch (error) {
    console.error('❌ [MIGRATION] Error in file migration:', error);
    return res.status(500).json({
      error: 'Failed to migrate files',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Helper function to copy template files to Supabase Storage
async function copyTemplateFilesToStorage(templateKey: string, projectId: string, supabaseService: any) {
  console.log(`📁 [TEMPLATE COPY] Starting template copy for ${templateKey} to project ${projectId}`);
  
  // Use environment-aware template path
  const templatesBaseDir = process.env.TEMPLATES_PATH || 
    (process.env.NODE_ENV === 'production' 
      ? path.resolve('./templates') 
      : path.resolve('/Users/scw/Private/Programming/bether/templates'));
  
  const templatePath = path.join(templatesBaseDir, templateKey);
  
  try {
    // Check if template directory exists
    await fs.access(templatePath);
    
    // Recursively copy all files from template to Supabase Storage
    async function copyDirectory(dirPath: string, relativePath: string = '') {
      const items = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item.name);
        const itemRelativePath = relativePath ? `${relativePath}/${item.name}` : item.name;
        
        // Skip node_modules and other build directories
        if (item.name === 'node_modules' || item.name === '.next' || item.name === 'dist' || item.name === '.git') {
          continue;
        }
        
        if (item.isDirectory()) {
          await copyDirectory(itemPath, itemRelativePath);
        } else {
          // Copy file to Supabase Storage
          try {
            const fileContent = await fs.readFile(itemPath, 'utf-8');
            // URL encode the path to handle special characters like brackets
            const encodedPath = itemRelativePath.replace(/\[/g, '%5B').replace(/\]/g, '%5D');
            const storageKey = `${projectId}/${encodedPath}`;
            
            const { error } = await supabaseService.storage
              .from('project-files')
              .upload(storageKey, fileContent, {
                contentType: getFileContentType(item.name),
                upsert: true
              });
            
            if (error) {
              console.error(`📁 [TEMPLATE COPY] Failed to upload ${itemRelativePath}:`, error);
            } else {
              console.log(`📁 [TEMPLATE COPY] ✅ Copied ${itemRelativePath}`);
            }
          } catch (fileError) {
            console.error(`📁 [TEMPLATE COPY] Failed to read ${itemPath}:`, fileError);
          }
        }
      }
    }
    
    await copyDirectory(templatePath);
    console.log(`📁 [TEMPLATE COPY] ✅ Template ${templateKey} copied to project ${projectId}`);
    return true;
    
  } catch (error) {
    console.error(`📁 [TEMPLATE COPY] ❌ Failed to copy template ${templateKey}:`, error);
    return false;
  }
}

// Helper function to determine file content type
function getFileContentType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  const contentTypes: { [key: string]: string } = {
    'js': 'application/javascript',
    'jsx': 'application/javascript', 
    'ts': 'application/typescript',
    'tsx': 'application/typescript',
    'json': 'application/json',
    'css': 'text/css',
    'html': 'text/html',
    'htm': 'text/html',
    'md': 'text/markdown',
    'txt': 'text/plain',
    'yml': 'text/yaml',
    'yaml': 'text/yaml'
  };
  
  return contentTypes[ext || ''] || 'text/plain';
}

// GET /projects - List all projects for the authenticated user
router.get('/', authenticateUser, async (req: any, res: any) => {
  try {
    console.log('🔍 [GET /projects] Request details:', {
      userId: req.user?.id,
      userEmail: req.user?.email,
      timestamp: new Date().toISOString(),
      authHeader: req.headers.authorization ? 'Present' : 'Missing'
    });
    
    const { supabaseService, db } = getServices(req);
    if (!supabaseService) {
      console.error('🚨 [GET /projects] No Supabase service available');
      return res.json([]);
    }

    const projects = await db.getProjectsByUserId(req.user.id);
    
    console.log('📊 [GET /projects] Results:', {
      userId: req.user.id,
      userEmail: req.user?.email,
      projectCount: projects.length,
      projectIds: projects.map((p: any) => p.id),
      projectUserIds: projects.map((p: any) => ({ id: p.id, userid: p.userid, name: p.name }))
    });
    
    // Security check: Verify all projects belong to the requesting user
    const wrongProjects = projects.filter((p: any) => p.userid !== req.user.id);
    if (wrongProjects.length > 0) {
      console.error('🚨🚨🚨 [SECURITY ALERT] Projects returned that don\'t belong to user:', {
        requestingUser: req.user.id,
        wrongProjects: wrongProjects.map((p: any) => ({ id: p.id, userid: p.userid, name: p.name }))
      });
    }
    
    res.json(projects);
  } catch (error) {
    console.error('❌ [GET /projects] Error:', error);
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

    const { supabaseService, db, jobService } = getServices(req);
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
      .is('deletedat', null);
    
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
    
    // LAZY REPO CREATION: Only set repo config if explicitly requested, don't create yet
    const shouldPrepareForRepo = createGitHubRepo !== false; // Default to true
    const repoOwner = repo?.owner || 'celiador-repos'; // Use organization
    const repoName = repo?.name || defaultRepoName;
    
    console.log(`🚀 [CREATE PROJECT] Creating project in database (lazy repo creation)...`);
    
    const project = await Promise.race([
      db.createProject({
        name,
        templateKey: finalTemplateKey,
        // LAZY REPO: Store config but don't create repo until actually needed
        repoProvider: shouldPrepareForRepo ? 'github' : null,
        repoOwner: shouldPrepareForRepo ? repoOwner : null,
        repoName: shouldPrepareForRepo ? repoName : null,
        repoUrl: null, // Will be set when repo is actually created
        repoCreated: false, // Not created yet - will be created on first push
        userId: req.user.id
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database operation timeout after 30 seconds')), 30000)
      )
    ]);

    console.log(`✅ [CREATE PROJECT] Project created: ${project.id} with template: ${finalTemplateKey}`);

    // Copy template files to Supabase Storage (working directory)
    console.log(`📁 [CREATE PROJECT] Debug template copy: finalTemplateKey=${finalTemplateKey}, supabaseService=${!!supabaseService}`);
    if (finalTemplateKey && finalTemplateKey !== 'blank-nextjs') {
      console.log(`📁 [CREATE PROJECT] Copying template files to Supabase Storage...`);
      const templateCopySuccess = await copyTemplateFilesToStorage(finalTemplateKey, project.id, supabaseService);
      if (templateCopySuccess) {
        console.log(`✅ [CREATE PROJECT] Template files copied to storage for project ${project.id}`);
      } else {
        console.warn(`⚠️ [CREATE PROJECT] Failed to copy template files to storage for project ${project.id}`);
      }
    } else {
      console.log(`❌ [CREATE PROJECT] Skipping template copy: finalTemplateKey=${finalTemplateKey}`);
    }

    // LAZY REPO: Only create scaffolding job, no GitHub repo creation yet
    // Auto-scaffold with template immediately
    if (finalTemplateKey) {
      try {
        const job = await db.createJob({
          projectId: project.id,
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

        // Queue scaffold job immediately (no waiting for repo creation)
        await jobService.addJob(jobData);
        console.log(`✅ [LAZY REPO] Scaffold job ${job.id} queued successfully (no GitHub repo created yet)`);
      } catch (scaffoldError) {
        console.error('Failed to enqueue scaffold job:', scaffoldError);
      }
    }

    // LAZY REPO: GitHub repository will be created later when actually needed (e.g., during deployment)

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
        deletedat: new Date().toISOString(),
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