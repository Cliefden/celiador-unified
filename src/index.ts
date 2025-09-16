// Unified Celiador service - API + Job Processing
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = parseInt(process.env.PORT || '8080', 10);

console.log('=== STARTING UNIFIED CELIADOR SERVICE ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', port);

// Initialize Supabase with error handling
let supabase: any = null;
let supabaseService: any = null;
try {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
    );
    supabaseService = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    console.log('✅ Supabase clients initialized');
  } else {
    console.log('⚠️ Supabase credentials not found, running in limited mode');
  }
} catch (error) {
  console.error('❌ Failed to initialize Supabase:', error);
}

// Basic middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://celiador-web.vercel.app', 'https://celiador.ai']
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
};
app.use(cors(corsOptions));

// Database helpers
const db = {
  getProjectsByUserId: async (userId: string) => {
    if (!supabaseService) return [];
    
    const { data, error } = await supabaseService
      .from('projects')
      .select('*')
      .eq('userid', userId)
      .is('deletedAt', null)
      .order('updatedat', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },
  
  createProject: async (projectData: any) => {
    if (!supabaseService) throw new Error('Database not available');
    
    const { data: project, error } = await supabaseService
      .from('projects')
      .insert({
        name: projectData.name,
        templatekey: projectData.templateKey || 'next-prisma-supabase',
        repoprovider: projectData.repoProvider || 'github',
        repoowner: projectData.repoOwner,
        reponame: projectData.repoName,
        userid: projectData.userId,
        status: 'READY'
      })
      .select()
      .single();
    
    if (error) throw error;
    return project;
  },
  
  getProjectById: async (id: string) => {
    if (!supabaseService) return null;
    
    const { data, error } = await supabaseService
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) return null;
    return data;
  },
  
  createJob: async (jobData: any) => {
    if (!supabaseService) throw new Error('Database not available');
    
    const { data: job, error } = await supabaseService
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
  },
  
  updateJobStatus: async (id: string, status: string, output?: any, error?: any, metadata?: any) => {
    if (!supabaseService) return null;
    
    const { data, error: updateError } = await supabaseService
      .from('jobs')
      .update({ status, output, error, metadata })
      .eq('id', id)
      .select()
      .single();
    
    if (updateError) throw updateError;
    return data;
  }
};

// Simple in-memory job processing queue
const jobQueue: any[] = [];
let isProcessingJobs = false;

// Job processor function
async function processJob(job: any) {
  console.log(`Processing job ${job.id}:`, job.type);
  
  try {
    // Update job status to running
    await db.updateJobStatus(job.id, 'RUNNING');
    
    // Simple job processing logic
    let result;
    switch (job.type) {
      case 'SCAFFOLD':
        result = await processScaffoldJob(job);
        break;
      case 'CODEGEN':
        result = await processCodegenJob(job);
        break;
      default:
        result = { message: `Job type ${job.type} processed successfully` };
    }
    
    // Update job status to completed
    await db.updateJobStatus(job.id, 'COMPLETED', result);
    console.log(`✅ Job ${job.id} completed successfully`);
    
  } catch (error: any) {
    console.error(`❌ Job ${job.id} failed:`, error);
    await db.updateJobStatus(job.id, 'FAILED', null, error.message);
  }
}

// Scaffold job processor
async function processScaffoldJob(job: any) {
  console.log(`Scaffolding project with template: ${job.templateKey}`);
  
  // Simulate scaffold work
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  return {
    success: true,
    message: `Project scaffolded with ${job.templateKey} template`,
    timestamp: new Date().toISOString()
  };
}

// Codegen job processor
async function processCodegenJob(job: any) {
  console.log(`Generating code for prompt: ${job.prompt}`);
  
  // Simulate codegen work
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  return {
    success: true,
    message: `Code generated for: ${job.prompt}`,
    timestamp: new Date().toISOString()
  };
}

// Job queue processor (runs in background)
async function processJobQueue() {
  if (isProcessingJobs || jobQueue.length === 0) return;
  
  isProcessingJobs = true;
  
  while (jobQueue.length > 0) {
    const job = jobQueue.shift();
    if (job) {
      await processJob(job);
    }
  }
  
  isProcessingJobs = false;
}

// Start job processor (check every 5 seconds)
setInterval(processJobQueue, 5000);

// Authentication middleware
const authenticateUser = async (req: any, res: any, next: any) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    if (!supabase) {
      // If Supabase not available, create a mock user for development
      req.user = { id: 'dev-user', email: 'dev@example.com' };
      return next();
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

// Health checks
app.get('/', (req: any, res: any) => {
  res.status(200).json({
    status: 'ok',
    message: 'Unified Celiador Service is running',
    timestamp: new Date().toISOString(),
    port: port,
    database: !!supabaseService,
    jobQueue: { length: jobQueue.length, processing: isProcessingJobs }
  });
});

app.get('/health', (req: any, res: any) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/healthz', (req: any, res: any) => {
  res.status(200).send('OK');
});

// API status
app.get('/api/status', (req: any, res: any) => {
  res.json({ 
    message: 'Unified Celiador API is running',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    features: {
      database: !!supabaseService,
      jobProcessing: true
    }
  });
});

// Projects endpoints
app.get('/projects', authenticateUser, async (req: any, res: any) => {
  try {
    if (!supabaseService) {
      return res.json([]);
    }

    const projects = await db.getProjectsByUserId(req.user.id);
    res.json(projects);
  } catch (error) {
    console.error('Projects fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

app.post('/projects', authenticateUser, async (req: any, res: any) => {
  try {
    const { name, templateKey, repo } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    const defaultRepoName = name.toLowerCase()
      .replace(/[^a-z0-9\\s-]/g, '')
      .replace(/\\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    const finalTemplateKey = templateKey || 'blank-nextjs';
    
    const project = await db.createProject({
      name,
      templateKey: finalTemplateKey,
      repoProvider: repo?.provider || 'github',
      repoOwner: repo?.owner || 'user',
      repoName: repo?.name || defaultRepoName,
      userId: req.user.id
    });

    console.log(`Project created: ${project.id} with template: ${finalTemplateKey}`);

    // Auto-scaffold with template - add to job queue
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

        // Add to in-memory queue
        jobQueue.push(jobData);
        console.log(`Scaffold job ${job.id} queued successfully`);
      } catch (scaffoldError) {
        console.error('Failed to enqueue scaffold job:', scaffoldError);
      }
    }

    res.status(201).json(project);
  } catch (error) {
    console.error('Failed to create project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

app.get('/projects/:id', authenticateUser, async (req: any, res: any) => {
  try {
    const { id } = req.params;
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

app.delete('/projects/:id', authenticateUser, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const project = await db.getProjectById(id);
    
    if (!project || project.userid !== req.user.id) {
      return res.status(404).json({ error: 'Project not found or access denied' });
    }

    // Soft delete the project
    if (supabaseService) {
      await supabaseService
        .from('projects')
        .update({ 
          deletedAt: new Date().toISOString(),
          updatedat: new Date().toISOString()
        })
        .eq('id', id)
        .eq('userid', req.user.id);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Project delete error:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// Job endpoints
app.post('/projects/:id/jobs', authenticateUser, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { type, prompt } = req.body;

    if (!type) {
      return res.status(400).json({ error: 'Job type is required' });
    }

    const project = await db.getProjectById(id);
    if (!project || project.userid !== req.user.id) {
      return res.status(404).json({ error: 'Project not found or access denied' });
    }

    // Create job in database
    const job = await db.createJob({
      type,
      prompt,
      projectId: id,
      userId: req.user.id
    });

    // Add job to processing queue
    const jobData = {
      id: job.id,
      projectId: id,
      userId: req.user.id,
      type,
      prompt,
      templateKey: project.templatekey,
      repo: {
        provider: project.repoprovider,
        owner: project.repoowner,
        name: project.reponame
      }
    };

    jobQueue.push(jobData);
    console.log(`Job ${job.id} queued for processing`);

    res.status(201).json(job);
  } catch (error) {
    console.error('Failed to create job:', error);
    res.status(500).json({ error: 'Failed to create job' });
  }
});

// Update job status (internal endpoint)
app.patch('/jobs/:id', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { status, output, error, metadata } = req.body;

    await db.updateJobStatus(id, status, output, error, metadata);
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to update job:', error);
    res.status(500).json({ error: 'Failed to update job' });
  }
});

// Start server
const server = app.listen(port, '0.0.0.0', () => {
  console.log('=== SERVER STARTED SUCCESSFULLY ===');
  console.log(`🚀 Server running on port ${port}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`💾 Database: ${supabaseService ? 'CONNECTED' : 'DISCONNECTED'}`);
  console.log(`⚡ Job Processing: ENABLED`);
  console.log('✅ Health endpoints: /, /health, /healthz');
  console.log('✅ API endpoints: /api/status, /projects, /jobs');
}).on('error', (err: any) => {
  console.error('=== SERVER START FAILED ===');
  console.error('Error:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received: closing server');
  server.close(() => console.log('Server closed'));
});

console.log('✅ Unified Celiador service initialized successfully');