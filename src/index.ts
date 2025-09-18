// Unified Celiador service - API + Job Processing
require('dotenv').config();
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
    ? ['https://celiador-web.vercel.app', 'https://celiador.ai', 'https://www.celiador.ai']
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
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
  },

  // Conversation management
  getConversationsByProjectId: async (projectId: string, userId: string) => {
    if (!supabaseService) return [];
    
    const { data, error } = await supabaseService
      .from('conversations')
      .select('*')
      .eq('projectId', projectId)
      .eq('userId', userId)
      .is('deletedAt', null)
      .order('updatedAt', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  createConversation: async (conversationData: any) => {
    if (!supabaseService) throw new Error('Database not available');
    
    const { data: conversation, error } = await supabaseService
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
  },

  getMessagesByConversationId: async (conversationId: string) => {
    if (!supabaseService) return [];
    
    const { data, error } = await supabaseService
      .from('messages')
      .select('*')
      .eq('conversationId', conversationId)
      .is('deletedAt', null)
      .order('createdAt', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  createMessage: async (messageData: any) => {
    if (!supabaseService) throw new Error('Database not available');
    
    const { data: message, error } = await supabaseService
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
  },

  // GitHub integrations
  getGitHubIntegration: async (userId: string) => {
    if (!supabaseService) return null;
    
    const { data, error } = await supabaseService
      .from('github_integrations')
      .select('*')
      .eq('userId', userId)
      .is('deletedAt', null)
      .single();
    
    if (error) return null;
    return data;
  },

  // Service integrations
  getServiceIntegrations: async (userId: string) => {
    if (!supabaseService) return [];
    
    const { data, error } = await supabaseService
      .from('service_integrations')
      .select('*')
      .eq('userId', userId)
      .is('deletedAt', null);
    
    if (error) return [];
    return data || [];
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

// Helper functions for file management
async function getTemplateFileStructure(templateKey: string) {
  // Return template-based file structure
  const structures: any = {
    'next-prisma-supabase': [
      {
        name: 'src',
        type: 'folder',
        path: 'src',
        children: [
          {
            name: 'app',
            type: 'folder',
            path: 'src/app',
            children: [
              { name: 'page.tsx', type: 'file', path: 'src/app/page.tsx', size: 1024 },
              { name: 'layout.tsx', type: 'file', path: 'src/app/layout.tsx', size: 2048 },
              { name: 'globals.css', type: 'file', path: 'src/app/globals.css', size: 512 }
            ]
          },
          {
            name: 'components',
            type: 'folder',
            path: 'src/components',
            children: []
          },
          {
            name: 'lib',
            type: 'folder',
            path: 'src/lib',
            children: [
              { name: 'supabase.ts', type: 'file', path: 'src/lib/supabase.ts', size: 800 }
            ]
          }
        ]
      },
      { name: 'package.json', type: 'file', path: 'package.json', size: 512 },
      { name: 'README.md', type: 'file', path: 'README.md', size: 256 },
      { name: '.env.local.example', type: 'file', path: '.env.local.example', size: 200 }
    ],
    'blank-nextjs': [
      {
        name: 'src',
        type: 'folder',
        path: 'src',
        children: [
          {
            name: 'app',
            type: 'folder',
            path: 'src/app',
            children: [
              { name: 'page.tsx', type: 'file', path: 'src/app/page.tsx', size: 512 },
              { name: 'layout.tsx', type: 'file', path: 'src/app/layout.tsx', size: 1024 }
            ]
          }
        ]
      },
      { name: 'package.json', type: 'file', path: 'package.json', size: 400 },
      { name: 'README.md', type: 'file', path: 'README.md', size: 150 }
    ]
  };
  
  return structures[templateKey] || structures['blank-nextjs'];
}

async function buildFileTreeFromStorage(files: any[], projectId: string) {
  // Convert flat file list to tree structure
  const tree: any[] = [];
  const folderMap = new Map();
  
  files.forEach(file => {
    const parts = file.name.split('/');
    let currentLevel = tree;
    let currentPath = '';
    
    parts.forEach((part: string, index: number) => {
      currentPath += (currentPath ? '/' : '') + part;
      
      if (index === parts.length - 1) {
        // It's a file
        currentLevel.push({
          name: part,
          type: 'file',
          path: currentPath,
          size: file.metadata?.size || 0,
          updatedAt: file.updated_at
        });
      } else {
        // It's a folder
        let folder = currentLevel.find(item => item.name === part && item.type === 'folder');
        if (!folder) {
          folder = {
            name: part,
            type: 'folder',
            path: currentPath,
            children: []
          };
          currentLevel.push(folder);
        }
        currentLevel = folder.children;
      }
    });
  });
  
  return tree;
}

async function getTemplateFileContent(path: string, project: any) {
  const templates: any = {
    'package.json': JSON.stringify({
      name: project.name,
      version: '1.0.0',
      private: true,
      scripts: {
        dev: 'next dev',
        build: 'next build',
        start: 'next start',
        lint: 'next lint'
      },
      dependencies: {
        next: '^14.0.0',
        react: '^18.0.0',
        'react-dom': '^18.0.0'
      },
      devDependencies: {
        '@types/node': '^20.0.0',
        '@types/react': '^18.0.0',
        '@types/react-dom': '^18.0.0',
        eslint: '^8.0.0',
        'eslint-config-next': '^14.0.0',
        typescript: '^5.0.0'
      }
    }, null, 2),
    'src/app/page.tsx': `export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">
          Welcome to ${project.name}
        </h1>
        <p className="text-lg text-gray-600">
          Get started by editing <code className="bg-gray-100 px-2 py-1 rounded">src/app/page.tsx</code>
        </p>
      </div>
    </main>
  );
}`,
    'src/app/layout.tsx': `import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '${project.name}',
  description: 'Generated by Celiador',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}`,
    'README.md': `# ${project.name}

This is a [Next.js](https://nextjs.org/) project generated with Celiador.

## Getting Started

First, run the development server:

\`\`\`bash
npm run dev
# or
yarn dev
# or
pnpm dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
`,
    '.env.local.example': `# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
`,
    'src/lib/supabase.ts': `import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
`
  };
  
  if (templates[path]) {
    return templates[path];
  }
  
  // Generate content based on file extension
  if (path.endsWith('.tsx') || path.endsWith('.ts')) {
    const componentName = path.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'Component';
    return `// ${path}
export default function ${componentName}() {
  return (
    <div>
      <h1>Hello from ${componentName}</h1>
    </div>
  );
}`;
  }
  
  if (path.endsWith('.css')) {
    return `/* ${path} */
@tailwind base;
@tailwind components;
@tailwind utilities;
`;
  }
  
  return `# ${path}

This file was generated automatically.
`;
}

function getFileContentType(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  const types: any = {
    'js': 'application/javascript',
    'jsx': 'application/javascript',
    'ts': 'application/typescript',
    'tsx': 'application/typescript',
    'json': 'application/json',
    'css': 'text/css',
    'html': 'text/html',
    'md': 'text/markdown',
    'txt': 'text/plain'
  };
  return types[ext || ''] || 'text/plain';
}

// Authentication middleware
const authenticateUser = async (req: any, res: any, next: any) => {
  try {
    console.log(`${req.method} ${req.path} - Auth check`);
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Missing or invalid authorization header');
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    if (!supabase) {
      // If Supabase not available, create a mock user for development
      console.log('No Supabase available, using mock user');
      req.user = { id: 'dev-user', email: 'dev@example.com' };
      return next();
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      console.log('Invalid token:', error?.message);
      return res.status(401).json({ error: 'Invalid token' });
    }

    console.log('User authenticated:', user.id);
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
    console.log('GET /projects - User:', req.user?.id);
    
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
app.get('/projects/:id/jobs', authenticateUser, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { type, status } = req.query;
    
    const project = await db.getProjectById(id);
    if (!project || project.userid !== req.user.id) {
      return res.status(404).json({ error: 'Project not found or access denied' });
    }

    if (!supabaseService) {
      return res.json([]);
    }

    let query = supabaseService
      .from('jobs')
      .select('*')
      .eq('projectid', id)
      .order('createdat', { ascending: false });
    
    if (type) {
      query = query.eq('type', type);
    }
    
    if (status) {
      const statusArray = status.toString().split(',');
      query = query.in('status', statusArray);
    }

    const { data: jobs, error } = await query;
    
    if (error) throw error;
    
    res.json(jobs || []);
  } catch (error) {
    console.error('Failed to get jobs:', error);
    res.status(500).json({ error: 'Failed to get jobs' });
  }
});

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

app.post('/jobs/:id/cancel', authenticateUser, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    
    // Remove from queue if pending
    const queueIndex = jobQueue.findIndex(job => job.id === id);
    if (queueIndex >= 0) {
      jobQueue.splice(queueIndex, 1);
      console.log(`Job ${id} removed from queue`);
    }
    
    // Update status in database
    await db.updateJobStatus(id, 'CANCELLED');
    
    res.json({ success: true, message: 'Job cancelled' });
  } catch (error) {
    console.error('Failed to cancel job:', error);
    res.status(500).json({ error: 'Failed to cancel job' });
  }
});

app.post('/jobs/:id/retry', authenticateUser, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    
    if (!supabaseService) {
      return res.status(500).json({ error: 'Database not available' });
    }
    
    // Get job details
    const { data: job, error } = await supabaseService
      .from('jobs')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    // Reset status and add back to queue
    await db.updateJobStatus(id, 'PENDING');
    
    const jobData = {
      id: job.id,
      projectId: job.projectid,
      userId: job.userid,
      type: job.type,
      prompt: job.prompt
    };
    
    jobQueue.push(jobData);
    console.log(`Job ${id} retried and added to queue`);
    
    res.json({ success: true, message: 'Job retried' });
  } catch (error) {
    console.error('Failed to retry job:', error);
    res.status(500).json({ error: 'Failed to retry job' });
  }
});

// Conversation endpoints
app.get('/projects/:id/conversations', authenticateUser, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    
    const project = await db.getProjectById(id);
    if (!project || project.userid !== req.user.id) {
      return res.status(404).json({ error: 'Project not found or access denied' });
    }

    try {
      const conversations = await db.getConversationsByProjectId(id, req.user.id);
      res.json(conversations);
    } catch (error) {
      // Conversations table might not exist
      console.log('Conversations table does not exist, returning empty array');
      res.json([]);
    }
  } catch (error) {
    console.error('Failed to get conversations:', error);
    res.status(500).json({ error: 'Failed to get conversations' });
  }
});

app.post('/projects/:id/conversations', authenticateUser, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { title } = req.body;
    
    const project = await db.getProjectById(id);
    if (!project || project.userid !== req.user.id) {
      return res.status(404).json({ error: 'Project not found or access denied' });
    }

    try {
      const conversation = await db.createConversation({
        title: title || 'New Conversation',
        projectId: id,
        userId: req.user.id
      });
      
      res.status(201).json(conversation);
    } catch (error) {
      console.error('Failed to create conversation (table may not exist):', error);
      res.status(500).json({ error: 'Conversations feature not available' });
    }
  } catch (error) {
    console.error('Failed to create conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

app.get('/conversations/:id/messages', authenticateUser, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    
    try {
      const messages = await db.getMessagesByConversationId(id);
      res.json(messages);
    } catch (error) {
      // Messages table might not exist
      console.log('Messages table does not exist, returning empty array');
      res.json([]);
    }
  } catch (error) {
    console.error('Failed to get messages:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

app.post('/conversations/:id/messages', authenticateUser, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { content, role, messageType, metadata, parentId, relatedJobId } = req.body;
    
    if (!content || !role) {
      return res.status(400).json({ error: 'Content and role are required' });
    }

    try {
      const message = await db.createMessage({
        content,
        role,
        messageType: messageType || 'text',
        conversationId: id,
        userId: req.user.id,
        metadata,
        parentId,
        relatedJobId
      });
      
      res.status(201).json(message);
    } catch (error) {
      console.error('Failed to create message (table may not exist):', error);
      res.status(500).json({ error: 'Messages feature not available' });
    }
  } catch (error) {
    console.error('Failed to create message:', error);
    res.status(500).json({ error: 'Failed to create message' });
  }
});

// Templates endpoint
app.get('/templates', async (req: any, res: any) => {
  try {
    if (!supabaseService) {
      return res.status(500).json({ error: 'Database not available' });
    }

    const { data: templates, error } = await supabaseService
      .from('templates')
      .select('*')
      .eq('isActive', true)
      .order('rating', { ascending: false });

    if (error) {
      console.error('Database error fetching templates:', error);
      return res.status(500).json({ error: 'Failed to fetch templates' });
    }
    
    res.json({ templates: templates || [] });
  } catch (error) {
    console.error('Failed to get templates:', error);
    res.status(500).json({ error: 'Failed to get templates' });
  }
});

// Activity stream endpoint
app.get('/projects/:id/activity', authenticateUser, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { showAll } = req.query;
    
    const project = await db.getProjectById(id);
    if (!project || project.userid !== req.user.id) {
      return res.status(404).json({ error: 'Project not found or access denied' });
    }

    if (!supabaseService) {
      return res.json([]);
    }

    // Get comprehensive activity from multiple sources
    const limit = showAll === 'true' ? 50 : 10;
    
    // Get jobs activity
    const { data: jobs, error: jobsError } = await supabaseService
      .from('jobs')
      .select('id, type, status, createdat, updatedat, prompt')
      .eq('projectid', id)
      .order('createdat', { ascending: false })
      .limit(limit);

    if (jobsError) {
      console.error('Error fetching jobs for activity:', jobsError);
      return res.status(500).json({ error: 'Failed to get activity' });
    }

    // Get conversation activity if conversations exist
    let conversationActivities = [];
    try {
      const { data: conversations } = await supabaseService
        .from('conversations')
        .select('id, title, createdat, updatedat')
        .eq('projectId', id)
        .is('deletedAt', null)
        .order('createdat', { ascending: false })
        .limit(5);
      
      conversationActivities = conversations?.map((conv: any) => ({
        id: `conv_${conv.id}`,
        type: 'conversation',
        message: `Conversation started: ${conv.title || 'Untitled'}`,
        timestamp: conv.createdat,
        user: req.user.email || 'Unknown user',
        status: 'COMPLETED'
      })) || [];
    } catch (convError) {
      // Conversations table might not exist, ignore
      console.log('Conversations table not available, skipping conversation activity');
    }

    // Convert jobs to activity format
    const jobActivities = jobs?.map((job: any) => ({
      id: job.id,
      type: job.type.toLowerCase(),
      message: job.status === 'COMPLETED' 
        ? `${job.type} job completed: ${job.prompt || 'No description'}`
        : `${job.type} job ${job.status.toLowerCase()}: ${job.prompt || 'No description'}`,
      timestamp: job.updatedat || job.createdat,
      user: req.user.email || 'Unknown user',
      status: job.status
    })) || [];

    // Combine all activities
    const allActivities = [...jobActivities, ...conversationActivities];
    
    // Sort by timestamp and add project creation
    allActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    allActivities.unshift({
      id: 'project_created',
      type: 'project_created',
      message: `Project "${project.name}" created`,
      timestamp: project.createdat,
      user: req.user.email || 'Unknown user',
      status: 'COMPLETED'
    });
    
    res.json(allActivities.slice(0, limit));
  } catch (error) {
    console.error('Failed to get activity:', error);
    res.status(500).json({ error: 'Failed to get activity' });
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

// Preview service endpoints
app.post('/projects/:id/preview/start', authenticateUser, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { name, type } = req.body;
    
    console.log(`Starting preview for project ${id}:`, { name, type });
    
    const project = await db.getProjectById(id);
    if (!project || project.userid !== req.user.id) {
      return res.status(404).json({ error: 'Project not found or access denied' });
    }

    // Simulate preview creation
    const previewId = `preview_${Date.now()}`;
    const preview = {
      id: previewId,
      projectId: id,
      name: name || 'Project Preview',
      type: type || 'nextjs',
      status: 'starting',
      url: `https://preview-${previewId}.mock.com`,
      createdAt: new Date().toISOString()
    };

    // In a real implementation, you'd start a preview container/service here
    console.log(`Preview ${previewId} created for project ${id}`);
    
    res.status(201).json(preview);
  } catch (error) {
    console.error('Failed to start preview:', error);
    res.status(500).json({ error: 'Failed to start preview' });
  }
});

app.delete('/projects/:id/preview/:previewId', authenticateUser, async (req: any, res: any) => {
  try {
    const { id, previewId } = req.params;
    
    console.log(`Stopping preview ${previewId} for project ${id}`);
    
    const project = await db.getProjectById(id);
    if (!project || project.userid !== req.user.id) {
      return res.status(404).json({ error: 'Project not found or access denied' });
    }

    // In a real implementation, you'd stop the preview container/service here
    console.log(`Preview ${previewId} stopped for project ${id}`);
    
    res.json({ success: true, message: `Preview ${previewId} stopped` });
  } catch (error) {
    console.error('Failed to stop preview:', error);
    res.status(500).json({ error: 'Failed to stop preview' });
  }
});

app.get('/projects/:id/preview/:previewId/status', authenticateUser, async (req: any, res: any) => {
  try {
    const { id, previewId } = req.params;
    
    console.log(`Getting status for preview ${previewId} of project ${id}`);
    
    const project = await db.getProjectById(id);
    if (!project || project.userid !== req.user.id) {
      return res.status(404).json({ error: 'Project not found or access denied' });
    }

    // Mock preview status
    const status = {
      id: previewId,
      projectId: id,
      status: 'running',
      url: `https://preview-${previewId}.mock.com`,
      logs: ['Preview service started', 'Application deployed', 'Ready to serve requests'],
      updatedAt: new Date().toISOString()
    };
    
    res.json(status);
  } catch (error) {
    console.error('Failed to get preview status:', error);
    res.status(500).json({ error: 'Failed to get preview status' });
  }
});

app.get('/projects/:id/preview/list', authenticateUser, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    
    console.log(`Listing previews for project ${id}`);
    
    const project = await db.getProjectById(id);
    if (!project || project.userid !== req.user.id) {
      return res.status(404).json({ error: 'Project not found or access denied' });
    }

    // Mock preview list - in real implementation, you'd query preview database/service
    const previews = [
      {
        id: `preview_${Date.now() - 3600000}`,
        projectId: id,
        name: 'Main Preview',
        type: 'nextjs',
        status: 'running',
        url: `https://preview-main.mock.com`,
        createdAt: new Date(Date.now() - 3600000).toISOString()
      }
    ];
    
    res.json(previews);
  } catch (error) {
    console.error('Failed to list previews:', error);
    res.status(500).json({ error: 'Failed to list previews' });
  }
});

// File management endpoints
app.get('/projects/:id/files/tree', authenticateUser, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    
    const project = await db.getProjectById(id);
    if (!project || project.userid !== req.user.id) {
      return res.status(404).json({ error: 'Project not found or access denied' });
    }

    if (!supabaseService) {
      return res.status(500).json({ error: 'Database not available' });
    }

    // Get real file tree from Supabase Storage
    try {
      const { data: files, error } = await supabaseService.storage
        .from('project-files')
        .list(`${id}/`, {
          limit: 100,
          offset: 0
        });

      if (error) {
        console.error('Storage error:', error);
        // Return template-based file structure if storage is empty
        const templateFiles = await getTemplateFileStructure(project.templatekey || 'next-prisma-supabase');
        return res.json(templateFiles);
      }

      // Convert storage files to tree structure
      const fileTree = await buildFileTreeFromStorage(files || [], id);
      res.json(fileTree);
      
    } catch (storageError) {
      console.error('Storage not configured, returning template structure:', storageError);
      // Fallback to template-based structure
      const templateFiles = await getTemplateFileStructure(project.templatekey || 'next-prisma-supabase');
      res.json(templateFiles);
    }
  } catch (error) {
    console.error('Failed to get file tree:', error);
    res.status(500).json({ error: 'Failed to get file tree' });
  }
});

app.get('/projects/:id/files/:path(*)', authenticateUser, async (req: any, res: any) => {
  try {
    const { id, path } = req.params;
    
    const project = await db.getProjectById(id);
    if (!project || project.userid !== req.user.id) {
      return res.status(404).json({ error: 'Project not found or access denied' });
    }

    if (!supabaseService) {
      return res.status(500).json({ error: 'Database not available' });
    }

    try {
      // Get real file content from Supabase Storage
      const { data, error } = await supabaseService.storage
        .from('project-files')
        .download(`${id}/${path}`);

      if (error) {
        console.error('File not found in storage, generating template content:', error);
        // Generate template-based content
        const content = await getTemplateFileContent(path, project);
        return res.json({ content, path, updatedAt: new Date().toISOString() });
      }

      const content = await data.text();
      res.json({ content, path, updatedAt: new Date().toISOString() });
      
    } catch (storageError) {
      console.error('Storage error, generating template content:', storageError);
      // Fallback to template-based content
      const content = await getTemplateFileContent(path, project);
      res.json({ content, path, updatedAt: new Date().toISOString() });
    }
  } catch (error) {
    console.error('Failed to get file:', error);
    res.status(500).json({ error: 'Failed to get file' });
  }
});

app.post('/projects/:id/files/save', authenticateUser, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { path, content } = req.body;
    
    const project = await db.getProjectById(id);
    if (!project || project.userid !== req.user.id) {
      return res.status(404).json({ error: 'Project not found or access denied' });
    }

    if (!supabaseService) {
      return res.status(500).json({ error: 'Database not available' });
    }

    console.log(`Saving file ${path} for project ${id}`);
    
    try {
      // Save to Supabase Storage
      const { data, error } = await supabaseService.storage
        .from('project-files')
        .upload(`${id}/${path}`, content, {
          contentType: getFileContentType(path),
          upsert: true
        });

      if (error) {
        console.error('Storage save error:', error);
        return res.status(500).json({ error: 'Failed to save file to storage' });
      }

      const result = {
        success: true,
        path,
        size: content?.length || 0,
        updatedAt: new Date().toISOString(),
        storageKey: data.path
      };
      
      res.json(result);
    } catch (storageError) {
      console.error('Storage not configured, file save skipped:', storageError);
      // Return success even if storage fails (for development)
      const result = {
        success: true,
        path,
        size: content?.length || 0,
        updatedAt: new Date().toISOString(),
        note: 'Storage not configured, file not persisted'
      };
      res.json(result);
    }
  } catch (error) {
    console.error('Failed to save file:', error);
    res.status(500).json({ error: 'Failed to save file' });
  }
});

app.post('/projects/:id/files/create', authenticateUser, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { name, type, path, content } = req.body;
    
    const project = await db.getProjectById(id);
    if (!project || project.userid !== req.user.id) {
      return res.status(404).json({ error: 'Project not found or access denied' });
    }

    console.log(`Creating ${type} '${name}' in project ${id}`);
    
    const fullPath = path ? `${path}/${name}` : name;
    
    // Mock file/folder creation
    const result = {
      success: true,
      name,
      type,
      path: fullPath,
      content: content || '',
      createdAt: new Date().toISOString()
    };
    
    res.json(result);
  } catch (error) {
    console.error('Failed to create file/folder:', error);
    res.status(500).json({ error: 'Failed to create file/folder' });
  }
});

app.delete('/projects/:id/files/:path(*)', authenticateUser, async (req: any, res: any) => {
  try {
    const { id, path } = req.params;
    
    const project = await db.getProjectById(id);
    if (!project || project.userid !== req.user.id) {
      return res.status(404).json({ error: 'Project not found or access denied' });
    }

    console.log(`Deleting file ${path} from project ${id}`);
    
    res.json({ success: true, message: `File ${path} deleted` });
  } catch (error) {
    console.error('Failed to delete file:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

app.post('/projects/:id/files/delete-folder', authenticateUser, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { path } = req.body;
    
    const project = await db.getProjectById(id);
    if (!project || project.userid !== req.user.id) {
      return res.status(404).json({ error: 'Project not found or access denied' });
    }

    console.log(`Deleting folder ${path} from project ${id}`);
    
    res.json({ success: true, message: `Folder ${path} deleted` });
  } catch (error) {
    console.error('Failed to delete folder:', error);
    res.status(500).json({ error: 'Failed to delete folder' });
  }
});

app.post('/projects/:id/files/upload', authenticateUser, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { fileName, content, path } = req.body;
    
    console.log(`Uploading file to project ${id}:`, fileName);
    
    const project = await db.getProjectById(id);
    if (!project || project.userid !== req.user.id) {
      return res.status(404).json({ error: 'Project not found or access denied' });
    }

    // Mock file upload - in real implementation, you'd save to storage
    const uploadResult = {
      success: true,
      fileName,
      path: path || '/',
      size: content?.length || 0,
      uploadedAt: new Date().toISOString(),
      url: `https://storage.mock.com/${id}/${fileName}`
    };
    
    console.log(`File ${fileName} uploaded to project ${id}`);
    res.json(uploadResult);
  } catch (error) {
    console.error('Failed to upload file:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Integration endpoints
app.get('/api/integrations/projects/:id/status', authenticateUser, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    
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

app.get('/api/integrations/projects/:id/deployment-options', authenticateUser, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    
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

app.post('/api/integrations/projects/:id/deploy', authenticateUser, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { type, commitMessage, branch } = req.body;
    
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

app.get('/api/integrations/vercel/teams', authenticateUser, async (req: any, res: any) => {
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

app.get('/api/integrations/vercel/projects', authenticateUser, async (req: any, res: any) => {
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

app.post('/api/integrations/projects/:id/vercel', authenticateUser, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { vercelProjectId, vercelTeamId, accessToken, domain } = req.body;
    
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

app.delete('/api/integrations/projects/:id/vercel', authenticateUser, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    
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