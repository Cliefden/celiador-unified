// Unified Celiador service - API + Job Processing
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { JSDOM } = require('jsdom');
const { aiService } = require('./ai-service');

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

// CORS configuration - temporarily more permissive for debugging
const corsOptions = {
  origin: true,  // Temporarily allow all origins to debug the 502 issue
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  optionsSuccessStatus: 200
};
// Add CORS and request logging middleware
app.use((req: any, res: any, next: any) => {
  const origin = req.headers.origin;
  console.log(`🌐 [REQUEST] ${req.method} ${req.path} from origin: ${origin || 'no origin'}`);
  
  // Add error handling for better debugging
  res.on('finish', () => {
    if (res.statusCode >= 400) {
      console.log(`❌ [ERROR] ${req.method} ${req.path} - Status: ${res.statusCode}`);
    }
  });
  
  next();
});

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
  
  getUserSettings: async (userId: string) => {
    if (!supabaseService) return null;
    
    const { data, error } = await supabaseService
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
    return data;
  },
  
  createUserSettings: async (userId: string) => {
    if (!supabaseService) throw new Error('Database not available');
    
    const { data, error } = await supabaseService
      .from('user_settings')
      .insert({
        user_id: userId,
        creator: userId
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
  
  updateUserSettings: async (userId: string, updates: any) => {
    if (!supabaseService) throw new Error('Database not available');
    
    const { data, error } = await supabaseService
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
    // Use fullPath from recursive traversal, or fall back to name
    const filePath = file.fullPath || file.name;
    const parts = filePath.split('/');
    let currentLevel = tree;
    let currentPath = '';
    
    parts.forEach((part: string, index: number) => {
      currentPath += (currentPath ? '/' : '') + part;
      
      if (index === parts.length - 1) {
        // Check if this is actually a file (has metadata/id) or empty folder
        const isFile = file.id || file.metadata;
        if (isFile) {
          // It's a file
          currentLevel.push({
            name: part,
            type: 'file',
            path: currentPath,
            size: file.metadata?.size || 0,
            updatedAt: file.updated_at
          });
        } else {
          // It's an empty folder - only add if not already exists
          let folder = currentLevel.find(item => item.name === part && item.type === 'directory');
          if (!folder) {
            folder = {
              name: part,
              type: 'directory',
              path: currentPath,
              children: []
            };
            currentLevel.push(folder);
          }
        }
      } else {
        // It's a folder in the path
        let folder = currentLevel.find(item => item.name === part && item.type === 'directory');
        if (!folder) {
          folder = {
            name: part,
            type: 'directory',
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

// Preview functionality classes
interface SyncResult {
  success: boolean;
  filesDownloaded: number;
  errors: string[];
  localPath: string;
}

interface PreviewInstance {
  id: string;
  projectId: string;
  userId: string;
  port: number;
  url: string; // External proxy URL for client access
  internalUrl?: string; // Internal localhost URL for server-side fetching
  status: 'syncing' | 'starting' | 'running' | 'error' | 'stopped';
  process?: any;
  localPath?: string;
  syncResult?: SyncResult;
  startTime: Date;
  lastAccessed: Date;
  errorMessage?: string;
}

class PortManager {
  private usedPorts = new Set<number>();
  private readonly startPort = 3100;
  private readonly endPort = 3200;

  async allocatePort(): Promise<number> {
    for (let port = this.startPort; port <= this.endPort; port++) {
      if (!this.usedPorts.has(port)) {
        // Check if port is actually available
        const isAvailable = await this.isPortAvailable(port);
        if (isAvailable) {
          this.usedPorts.add(port);
          return port;
        }
      }
    }
    throw new Error('No available ports');
  }

  releasePort(port: number): void {
    this.usedPorts.delete(port);
  }

  private async isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const net = require('net');
      const server = net.createServer();
      
      server.listen(port, () => {
        server.once('close', () => resolve(true));
        server.close();
      });
      
      server.on('error', () => resolve(false));
    });
  }
}

class PreviewManager {
  private instances = new Map<string, PreviewInstance>();
  private portManager = new PortManager();
  private readonly basePreviewDir = '/tmp/celiador-previews';

  async startPreview(projectId: string, userId: string, name: string, type: string = 'nextjs'): Promise<PreviewInstance> {
    const instanceId = `${projectId}-${Date.now()}`;
    const port = await this.portManager.allocatePort();
    
    // Construct the proxy URL for Railway deployment
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? (process.env.RAILWAY_PUBLIC_DOMAIN || 'https://celiador-unified-production.up.railway.app')
      : 'http://localhost:' + (process.env.PORT || '4000');
    
    const proxyUrl = `${baseUrl}/projects/${projectId}/preview/${instanceId}/proxy/`;
    const internalUrl = `http://localhost:${port}`; // Keep internal URL for server-side fetching
    
    const instance: PreviewInstance = {
      id: instanceId,
      projectId,
      userId,
      port,
      url: proxyUrl, // External URL for client access
      internalUrl, // Internal URL for server-side proxy fetching
      status: 'syncing',
      startTime: new Date(),
      lastAccessed: new Date()
    };

    this.instances.set(instanceId, instance);

    try {
      console.log(`[PreviewManager] Starting preview for ${name} on port ${port}`);
      
      // Create local directory for project
      const localPath = `${this.basePreviewDir}/${userId}-${projectId}`;
      instance.localPath = localPath;
      
      // Update status to starting
      instance.status = 'starting';
      
      // Sync files from Supabase Storage
      const syncResult = await this.syncProjectFiles(projectId, localPath);
      instance.syncResult = syncResult;
      
      if (!syncResult.success) {
        instance.status = 'error';
        instance.errorMessage = `File sync failed: ${syncResult.errors.join(', ')}`;
        this.portManager.releasePort(port);
        throw new Error(instance.errorMessage);
      }
      
      if (syncResult.filesDownloaded === 0) {
        console.log(`[PreviewManager] No project files found, but continuing with basic structure`);
      }
      
      // Start development server
      await this.startDevServer(instance, type);
      
      instance.status = 'running';
      console.log(`[PreviewManager] Preview ${instanceId} running at ${instance.url}`);
      
    } catch (error) {
      console.error(`[PreviewManager] Failed to start preview ${instanceId}:`, error);
      instance.status = 'error';
      instance.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.portManager.releasePort(port);
    }

    return instance;
  }

  async stopPreview(instanceId: string): Promise<void> {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error('Preview instance not found');
    }

    console.log(`[PreviewManager] Stopping preview ${instanceId}`);
    
    // Kill the process if it exists
    if (instance.process) {
      instance.process.kill('SIGTERM');
    }
    
    // Release the port
    this.portManager.releasePort(instance.port);
    
    // Update status
    instance.status = 'stopped';
    
    // Remove from instances
    this.instances.delete(instanceId);
  }

  getPreview(instanceId: string): PreviewInstance | undefined {
    console.log(`🔍 [PreviewManager] Looking for preview instance: ${instanceId}`);
    console.log(`🔍 [PreviewManager] Total instances in memory: ${this.instances.size}`);
    console.log(`🔍 [PreviewManager] Available instance IDs:`, Array.from(this.instances.keys()));
    
    const instance = this.instances.get(instanceId);
    if (instance) {
      console.log(`✅ [PreviewManager] Found instance: ${instanceId}, status: ${instance.status}`);
      instance.lastAccessed = new Date();
    } else {
      console.log(`❌ [PreviewManager] Instance not found: ${instanceId}`);
    }
    return instance;
  }

  getPreviewsForProject(projectId: string): PreviewInstance[] {
    return Array.from(this.instances.values()).filter(
      instance => instance.projectId === projectId
    );
  }

  getAllPreviews(): PreviewInstance[] {
    return Array.from(this.instances.values());
  }

  private async syncProjectFiles(projectId: string, localPath: string): Promise<SyncResult> {
    const fs = require('fs').promises;
    const path = require('path');
    const errors: string[] = [];
    let filesDownloaded = 0;
    
    try {
      // Ensure directory exists
      await fs.mkdir(localPath, { recursive: true });
      
      if (!supabaseService) {
        console.log(`[PreviewManager] No Supabase service available, creating basic structure`);
        await this.createBasicNextjsStructure(localPath, projectId);
        return {
          success: true,
          filesDownloaded: 1, // Basic structure created
          errors: [],
          localPath
        };
      }

      // Get project details to get userId
      const project = await db.getProjectById(projectId);
      if (!project) {
        console.log(`[PreviewManager] Project not found: ${projectId}, creating basic structure`);
        await this.createBasicNextjsStructure(localPath, projectId);
        return {
          success: true,
          filesDownloaded: 1, // Basic structure created
          errors: [],
          localPath
        };
      }

      console.log(`[PreviewManager] Downloading files for project ${projectId}, user ${project.userid}`);

      // Get all files recursively from Supabase Storage using correct path pattern
      const basePath = `${project.userid}/${projectId}`;
      const allFiles = await this.getAllFilesRecursively(basePath);
      
      console.log(`[PreviewManager] Found ${allFiles.length} files to download`);

      if (allFiles.length === 0) {
        console.log(`[PreviewManager] No files found in storage for ${basePath}, creating basic structure`);
        await this.createBasicNextjsStructure(localPath, projectId);
        return {
          success: true,
          filesDownloaded: 1, // Basic structure created
          errors: [],
          localPath
        };
      }
      
      // Download and save each file
      for (const file of allFiles) {
        // Skip directories (items without id/metadata are directories)
        if (!file.id && !file.metadata) {
          console.log(`[PreviewManager] Skipping directory: ${file.fullPath || file.name}`);
          continue;
        }
        
        if (file.fullPath || file.name) {
          const filePath = file.fullPath || file.name;
          try {
            const { data: fileData, error: downloadError } = await supabaseService.storage
              .from('project-files')
              .download(`${basePath}/${filePath}`);

            if (!downloadError && fileData) {
              const localFilePath = path.join(localPath, filePath);
              const dir = path.dirname(localFilePath);
              
              // Ensure directory exists
              await fs.mkdir(dir, { recursive: true });
              
              // Write file
              const content = await fileData.text();
              await fs.writeFile(localFilePath, content);
              filesDownloaded++;
              console.log(`[PreviewManager] Downloaded: ${filePath} (${content.length} chars)`);
            } else {
              const errorMsg = `Failed to download ${filePath}: ${downloadError?.message || 'Unknown error'}`;
              console.warn(`[PreviewManager] ${errorMsg}`);
              errors.push(errorMsg);
            }
          } catch (fileError) {
            const errorMsg = `Failed to download ${filePath}: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`;
            console.warn(`[PreviewManager] ${errorMsg}`);
            errors.push(errorMsg);
          }
        }
      }

      console.log(`[PreviewManager] Successfully downloaded ${filesDownloaded} files to ${localPath}`);
      
      if (filesDownloaded === 0) {
        console.log(`[PreviewManager] No files were downloaded, creating basic structure`);
        await this.createBasicNextjsStructure(localPath, projectId);
        filesDownloaded = 1; // Basic structure created
      }

      return {
        success: errors.length === 0,
        filesDownloaded,
        errors,
        localPath
      };
      
    } catch (error) {
      const errorMsg = `File sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(`[PreviewManager] ${errorMsg}`);
      errors.push(errorMsg);

      return {
        success: false,
        filesDownloaded,
        errors,
        localPath
      };
    }
  }

  /**
   * Get all files recursively from a path in Supabase Storage
   */
  private async getAllFilesRecursively(basePath: string, currentPath = ''): Promise<any[]> {
    const fullPath = currentPath ? `${basePath}/${currentPath}` : basePath;
    
    try {
      const { data, error } = await supabaseService!.storage
        .from('project-files')
        .list(fullPath, {
          limit: 1000,
          offset: 0
        });
        
      if (error) {
        console.error(`[PreviewManager] Failed to list files at ${fullPath}:`, error);
        return [];
      }
      
      let allFiles: any[] = [];
      
      for (const item of data || []) {
        if (!item.name) continue;
        
        const itemPath = currentPath ? `${currentPath}/${item.name}` : item.name;
        
        // Add the current item with its path
        allFiles.push({
          ...item,
          fullPath: itemPath
        });
        
        // If this is a directory (no metadata means it's a folder), recursively get its contents
        if (!item.id && !item.metadata) {
          const childFiles = await this.getAllFilesRecursively(basePath, itemPath);
          allFiles.push(...childFiles);
        }
      }
      
      return allFiles;
    } catch (error) {
      console.error(`[PreviewManager] Error in getAllFilesRecursively:`, error);
      return [];
    }
  }

  private async createBasicNextjsStructure(localPath: string, projectId: string): Promise<void> {
    const fs = require('fs').promises;
    const path = require('path');

    // Create package.json
    const packageJson = {
      name: `project-${projectId}`,
      version: '0.1.0',
      private: true,
      scripts: {
        dev: 'next dev',
        build: 'next build',
        start: 'next start'
      },
      dependencies: {
        next: '^14.0.0',
        react: '^18.0.0',
        'react-dom': '^18.0.0'
      }
    };

    await fs.writeFile(
      path.join(localPath, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );

    // Create src/app structure
    await fs.mkdir(path.join(localPath, 'src', 'app'), { recursive: true });

    // Create inspection overlay component
    const inspectionOverlayContent = `'use client';
    
import { useEffect, useState } from 'react';

interface InspectableElement {
  id: string;
  type: string;
  text: string;
  selector: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function InspectionOverlay() {
  const [elements, setElements] = useState<InspectableElement[]>([]);
  const [isInspectionMode, setIsInspectionMode] = useState(false);

  useEffect(() => {
    // Check if inspection mode is enabled via URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const inspectionEnabled = urlParams.get('inspection') === 'true';
    setIsInspectionMode(inspectionEnabled);
    
    if (!inspectionEnabled) return;

    const scanForElements = () => {
      // Find interactive elements
      const selectors = [
        'button',
        'input',
        'a[href]',
        'div[onclick]',
        'nav',
        'header',
        'main',
        'section',
        '[role="button"]',
        '.clickable'
      ];
      
      const foundElements: InspectableElement[] = [];
      
      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach((element, index) => {
          if (element.classList.contains('inspection-overlay')) return; // Skip our own overlays
          
          const rect = element.getBoundingClientRect();
          const computedStyle = window.getComputedStyle(element);
          
          // Only include visible elements with some size
          if (rect.width > 0 && rect.height > 0 && computedStyle.display !== 'none') {
            foundElements.push({
              id: \`\${selector.replace(/[^a-zA-Z0-9]/g, '_')}_\${index}\`,
              type: element.tagName.toLowerCase(),
              text: element.textContent?.trim().substring(0, 50) || '',
              selector: selector,
              x: rect.left + window.scrollX,
              y: rect.top + window.scrollY,
              width: rect.width,
              height: rect.height
            });
          }
        });
      });
      
      setElements(foundElements);
    };

    // Initial scan
    scanForElements();
    
    // Rescan on resize or scroll
    const handleRescan = () => setTimeout(scanForElements, 100);
    window.addEventListener('resize', handleRescan);
    window.addEventListener('scroll', handleRescan);
    
    return () => {
      window.removeEventListener('resize', handleRescan);
      window.removeEventListener('scroll', handleRescan);
    };
  }, []);

  const handleElementClick = (element: InspectableElement) => {
    // Post message to parent frame (if in iframe)
    const message = {
      type: 'INSPECTION_ELEMENT_CLICKED',
      element: element
    };
    
    if (window.parent !== window) {
      window.parent.postMessage(message, '*');
    }
    
    console.log('Inspection element clicked:', element);
  };

  if (!isInspectionMode || elements.length === 0) {
    return null;
  }

  return (
    <>
      {elements.map((element) => (
        <div
          key={element.id}
          className="inspection-overlay"
          onClick={() => handleElementClick(element)}
          style={{
            position: 'absolute',
            left: element.x,
            top: element.y,
            width: element.width,
            height: element.height,
            backgroundColor: 'rgba(59, 130, 246, 0.3)',
            border: '2px solid rgb(59, 130, 246)',
            cursor: 'pointer',
            zIndex: 10000,
            pointerEvents: 'auto',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.3)';
          }}
        >
          <div
            style={{
              position: 'absolute',
              bottom: '100%',
              left: 0,
              backgroundColor: 'rgb(59, 130, 246)',
              color: 'white',
              padding: '2px 6px',
              fontSize: '12px',
              borderRadius: '2px',
              whiteSpace: 'nowrap',
              maxWidth: '200px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {element.type}: {element.text}
          </div>
        </div>
      ))}
    </>
  );
}`;

    await fs.writeFile(path.join(localPath, 'src', 'app', 'InspectionOverlay.tsx'), inspectionOverlayContent);

    // Create layout.tsx with inspection support
    const layoutContent = `import InspectionOverlay from './InspectionOverlay';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <InspectionOverlay />
      </body>
    </html>
  );
}`;

    await fs.writeFile(path.join(localPath, 'src', 'app', 'layout.tsx'), layoutContent);

    // Create page.tsx with interactive elements
    const pageContent = `'use client';

export default function Home() {
  return (
    <main style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Project Preview</h1>
      <p>Your project is running in preview mode!</p>
      <button onClick={() => alert('Button clicked!')}>
        Click me!
      </button>
      <nav style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#f3f4f6' }}>
        <a href="#" style={{ marginRight: '1rem' }}>Home</a>
        <a href="#" style={{ marginRight: '1rem' }}>About</a>
        <a href="#" style={{ marginRight: '1rem' }}>Contact</a>
      </nav>
    </main>
  );
}`;

    await fs.writeFile(path.join(localPath, 'src', 'app', 'page.tsx'), pageContent);

    // Create next.config.js
    const nextConfig = `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
}

module.exports = nextConfig`;

    await fs.writeFile(path.join(localPath, 'next.config.js'), nextConfig);
  }

  private async ensureInspectionOverlay(localPath: string): Promise<void> {
    const fs = require('fs').promises;
    const path = require('path');
    
    // Create InspectionOverlay.tsx in the app directory
    const inspectionOverlayPath = path.join(localPath, 'app', 'InspectionOverlay.tsx');
    const inspectionOverlayContent = `'use client';
    
import { useEffect, useState } from 'react';

interface InspectableElement {
  id: string;
  type: string;
  text: string;
  selector: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function InspectionOverlay() {
  const [elements, setElements] = useState<InspectableElement[]>([]);
  const [isInspectionMode, setIsInspectionMode] = useState(false);

  useEffect(() => {
    // Check if inspection mode is enabled via URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const inspectionEnabled = urlParams.get('inspection') === 'true';
    setIsInspectionMode(inspectionEnabled);
    
    if (!inspectionEnabled) return;

    const scanForElements = () => {
      // Find interactive elements
      const selectors = [
        'button',
        'input',
        'a[href]',
        'div[onclick]',
        'nav',
        'header',
        'main',
        'section',
        '[role="button"]',
        '.clickable'
      ];
      
      const foundElements: InspectableElement[] = [];
      
      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach((element, index) => {
          if (element.classList.contains('inspection-overlay')) return; // Skip our own overlays
          
          const rect = element.getBoundingClientRect();
          const computedStyle = window.getComputedStyle(element);
          
          // Only include visible elements with some size
          if (rect.width > 0 && rect.height > 0 && computedStyle.display !== 'none') {
            foundElements.push({
              id: \`\${selector.replace(/[^a-zA-Z0-9]/g, '_')}_\${index}\`,
              type: element.tagName.toLowerCase(),
              text: element.textContent?.trim().substring(0, 50) || '',
              selector: selector,
              x: rect.left + window.scrollX,
              y: rect.top + window.scrollY,
              width: rect.width,
              height: rect.height
            });
          }
        });
      });
      
      setElements(foundElements);
    };

    // Initial scan
    scanForElements();
    
    // Rescan on resize or scroll
    const handleRescan = () => setTimeout(scanForElements, 100);
    window.addEventListener('resize', handleRescan);
    window.addEventListener('scroll', handleRescan);
    
    return () => {
      window.removeEventListener('resize', handleRescan);
      window.removeEventListener('scroll', handleRescan);
    };
  }, []);

  const handleElementClick = (element: InspectableElement) => {
    // Post message to parent frame (if in iframe)
    const message = {
      type: 'INSPECTION_ELEMENT_CLICKED',
      element: element
    };
    
    if (window.parent !== window) {
      window.parent.postMessage(message, '*');
    }
    
    console.log('Inspection element clicked:', element);
  };

  if (!isInspectionMode || elements.length === 0) {
    return null;
  }

  return (
    <>
      {elements.map((element) => (
        <div
          key={element.id}
          className="inspection-overlay"
          onClick={() => handleElementClick(element)}
          style={{
            position: 'absolute',
            left: element.x,
            top: element.y,
            width: element.width,
            height: element.height,
            backgroundColor: 'rgba(59, 130, 246, 0.3)',
            border: '2px solid rgb(59, 130, 246)',
            cursor: 'pointer',
            zIndex: 10000,
            pointerEvents: 'auto',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.3)';
          }}
        >
          <div
            style={{
              position: 'absolute',
              bottom: '100%',
              left: 0,
              backgroundColor: 'rgb(59, 130, 246)',
              color: 'white',
              padding: '2px 6px',
              fontSize: '12px',
              borderRadius: '2px',
              whiteSpace: 'nowrap',
              maxWidth: '200px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {element.type}: {element.text}
          </div>
        </div>
      ))}
    </>
  );
}`;

    try {
      await fs.mkdir(path.join(localPath, 'app'), { recursive: true });
      await fs.writeFile(inspectionOverlayPath, inspectionOverlayContent);
      console.log(`[PreviewManager] Created InspectionOverlay.tsx`);
    } catch (error) {
      console.warn(`[PreviewManager] Failed to create InspectionOverlay.tsx:`, error);
    }
  }

  private injectInspectionOverlay(layoutContent: string): string {
    // Check if InspectionOverlay is already imported
    if (layoutContent.includes('InspectionOverlay')) {
      return layoutContent;
    }
    
    try {
      // Try to inject import and usage
      let modifiedContent = layoutContent;
      
      // Add import after other imports
      const lastImportMatch = modifiedContent.match(/^import.*$/gm);
      if (lastImportMatch && lastImportMatch.length > 0) {
        const lastImportLine = lastImportMatch[lastImportMatch.length - 1];
        const lastImportIndex = modifiedContent.indexOf(lastImportLine) + lastImportLine.length;
        modifiedContent = modifiedContent.slice(0, lastImportIndex) + 
                         '\nimport InspectionOverlay from \'./InspectionOverlay\'' + 
                         modifiedContent.slice(lastImportIndex);
      }
      
      // Add component before closing </body> tag
      modifiedContent = modifiedContent.replace(
        '</body>',
        '        <InspectionOverlay />\n      </body>'
      );
      
      console.log(`[PreviewManager] Injected InspectionOverlay into layout.tsx`);
      return modifiedContent;
    } catch (error) {
      console.warn(`[PreviewManager] Failed to inject InspectionOverlay:`, error);
      return layoutContent;
    }
  }

  private async startDevServer(instance: PreviewInstance, type: string): Promise<void> {
    const { spawn } = require('child_process');
    const path = require('path');
    const fs = require('fs').promises;

    if (!instance.localPath) {
      throw new Error('Local path not set');
    }

    // Detect package manager and install dependencies
    console.log(`[PreviewManager] Installing dependencies for ${instance.id}`);
    
    const packageManager = await this.detectPackageManager(instance.localPath);
    console.log(`[PreviewManager] Detected package manager: ${packageManager}`);
    
    // Clean up conflicting lock files if necessary
    await this.cleanupLockFiles(instance.localPath, packageManager);
    
    const installCmd = packageManager === 'pnpm' ? 'pnpm' : 'npm';
    const installArgs = packageManager === 'pnpm' ? ['install'] : ['install'];
    
    const installProcess = spawn(installCmd, installArgs, {
      cwd: instance.localPath,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    await new Promise((resolve, reject) => {
      installProcess.on('close', (code: number) => {
        if (code === 0) {
          resolve(void 0);
        } else {
          reject(new Error(`npm install failed with code ${code}`));
        }
      });
    });

    // Start dev server
    console.log(`[PreviewManager] Starting dev server for ${instance.id} on port ${instance.port} using ${packageManager}`);
    
    const devCmd = packageManager === 'pnpm' ? 'pnpm' : (packageManager === 'yarn' ? 'yarn' : 'npm');
    const devArgs = packageManager === 'yarn' ? ['dev'] : ['run', 'dev'];
    
    const devProcess = spawn(devCmd, devArgs, {
      cwd: instance.localPath,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PORT: instance.port.toString()
      }
    });

    instance.process = devProcess;

    // Wait for server to be ready
    return new Promise((resolve, reject) => {
      let output = '';
      
      const timeout = setTimeout(() => {
        reject(new Error('Server startup timeout'));
      }, 60000); // 60 second timeout

      devProcess.stdout.on('data', (data: any) => {
        output += data.toString();
        console.log(`[Preview ${instance.id}]:`, data.toString().trim());
        
        // Check if server is ready
        if (output.includes('Ready') || output.includes('ready') || output.includes(`localhost:${instance.port}`)) {
          clearTimeout(timeout);
          resolve(void 0);
        }
      });

      devProcess.stderr.on('data', (data: any) => {
        console.error(`[Preview ${instance.id} ERROR]:`, data.toString().trim());
      });

      devProcess.on('close', (code: number) => {
        clearTimeout(timeout);
        if (code !== 0) {
          reject(new Error(`Dev server exited with code ${code}`));
        }
      });
    });
  }

  /**
   * Detect which package manager to use based on lock files
   */
  private async detectPackageManager(projectPath: string): Promise<'npm' | 'pnpm' | 'yarn'> {
    const fs = require('fs').promises;
    const path = require('path');
    
    try {
      // Check for pnpm-lock.yaml first
      await fs.access(path.join(projectPath, 'pnpm-lock.yaml'));
      return 'pnpm';
    } catch {}
    
    try {
      // Check for yarn.lock
      await fs.access(path.join(projectPath, 'yarn.lock'));
      return 'yarn';
    } catch {}
    
    // Default to npm
    return 'npm';
  }

  /**
   * Clean up conflicting lock files
   */
  private async cleanupLockFiles(projectPath: string, packageManager: 'npm' | 'pnpm' | 'yarn'): Promise<void> {
    const fs = require('fs').promises;
    const path = require('path');
    
    try {
      if (packageManager === 'pnpm') {
        // Remove npm and yarn lock files if using pnpm
        try {
          await fs.unlink(path.join(projectPath, 'package-lock.json'));
          console.log(`[PreviewManager] Removed conflicting package-lock.json`);
        } catch {}
        try {
          await fs.unlink(path.join(projectPath, 'yarn.lock'));
          console.log(`[PreviewManager] Removed conflicting yarn.lock`);
        } catch {}
        // Also remove node_modules to start fresh
        try {
          await fs.rm(path.join(projectPath, 'node_modules'), { recursive: true, force: true });
          console.log(`[PreviewManager] Removed existing node_modules`);
        } catch {}
      } else if (packageManager === 'yarn') {
        // Remove npm and pnpm lock files if using yarn
        try {
          await fs.unlink(path.join(projectPath, 'package-lock.json'));
          console.log(`[PreviewManager] Removed conflicting package-lock.json`);
        } catch {}
        try {
          await fs.unlink(path.join(projectPath, 'pnpm-lock.yaml'));
          console.log(`[PreviewManager] Removed conflicting pnpm-lock.yaml`);
        } catch {}
        // Also remove node_modules to start fresh
        try {
          await fs.rm(path.join(projectPath, 'node_modules'), { recursive: true, force: true });
          console.log(`[PreviewManager] Removed existing node_modules`);
        } catch {}
      } else {
        // Using npm - remove other lock files
        try {
          await fs.unlink(path.join(projectPath, 'pnpm-lock.yaml'));
          console.log(`[PreviewManager] Removed conflicting pnpm-lock.yaml`);
        } catch {}
        try {
          await fs.unlink(path.join(projectPath, 'yarn.lock'));
          console.log(`[PreviewManager] Removed conflicting yarn.lock`);
        } catch {}
        // Also remove node_modules to start fresh
        try {
          await fs.rm(path.join(projectPath, 'node_modules'), { recursive: true, force: true });
          console.log(`[PreviewManager] Removed existing node_modules`);
        } catch {}
      }
    } catch (error) {
      console.warn(`[PreviewManager] Error cleaning up lock files:`, error);
    }
  }
}

// Global preview manager instance
const previewManager = new PreviewManager();

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
    
    // Debug: Log token info
    if (req.path.includes('/activity')) {
      console.log(`[DEBUG] Activity endpoint token length: ${token.length}, starts with: ${token.substring(0, 20)}...`);
    }
    
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

// Settings API endpoints
app.get('/api/settings', authenticateUser, async (req: any, res: any) => {
  try {
    console.log('GET /api/settings - User:', req.user?.id);
    
    if (!supabaseService) {
      console.log('No Supabase service available');
      return res.status(500).json({ error: 'Database not available' });
    }

    const { data: settings, error } = await supabaseService
      .from('user_settings')
      .select('*')
      .eq('user_id', req.user.id)
      .is('deleted_at', null)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Settings fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch settings' });
    }

    // If no settings found, create default settings
    if (!settings) {
      const { data: newSettings, error: createError } = await supabaseService
        .from('user_settings')
        .insert({
          user_id: req.user.id,
          creator: req.user.id
        })
        .select()
        .single();

      if (createError) {
        console.error('Settings creation error:', createError);
        return res.status(500).json({ error: 'Failed to create settings' });
      }

      return res.json({ settings: newSettings });
    }

    res.json({ settings });
  } catch (error) {
    console.error('Settings API error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

app.put('/api/settings', authenticateUser, async (req: any, res: any) => {
  try {
    console.log('PUT /api/settings - User:', req.user?.id);
    
    if (!supabaseService) {
      return res.status(500).json({ error: 'Database not available' });
    }

    const updates = req.body;
    
    // Remove system fields that shouldn't be updated directly
    delete updates.id;
    delete updates.user_id;
    delete updates.creator;
    delete updates.created_at;
    delete updates.updated_at;

    const { data: settings, error } = await supabaseService
      .from('user_settings')
      .update({
        ...updates,
        updater: req.user.id
      })
      .eq('user_id', req.user.id)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) {
      console.error('Settings update error:', error);
      return res.status(500).json({ error: 'Failed to update settings' });
    }

    res.json({ settings });
  } catch (error) {
    console.error('Settings update API error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

app.delete('/api/settings', authenticateUser, async (req: any, res: any) => {
  try {
    console.log('DELETE /api/settings - User:', req.user?.id);
    
    if (!supabaseService) {
      return res.status(500).json({ error: 'Database not available' });
    }

    // Reset to defaults by creating new settings row
    const { data: settings, error } = await supabaseService
      .from('user_settings')
      .update({
        deleter: req.user.id,
        deleted_at: new Date().toISOString()
      })
      .eq('user_id', req.user.id)
      .is('deleted_at', null);

    if (error) {
      console.error('Settings delete error:', error);
      return res.status(500).json({ error: 'Failed to reset settings' });
    }

    // Create new default settings
    const { data: newSettings, error: createError } = await supabaseService
      .from('user_settings')
      .insert({
        user_id: req.user.id,
        creator: req.user.id
      })
      .select()
      .single();

    if (createError) {
      console.error('Settings creation error:', createError);
      return res.status(500).json({ error: 'Failed to create default settings' });
    }

    res.json({ settings: newSettings });
  } catch (error) {
    console.error('Settings reset API error:', error);
    res.status(500).json({ error: 'Failed to reset settings' });
  }
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

// Chat endpoint for AI conversations
app.post('/projects/:id/chat', authenticateUser, async (req: any, res: any) => {
  const { id: projectId } = req.params;
  const { message, conversationId, history, provider = 'openai' } = req.body;
  
  try {
    console.log(`[Chat] Processing message for project ${projectId}, conversation ${conversationId}`);
    console.log(`[Chat] Message length: ${message?.length || 0}, History length: ${history?.length || 0}`);
    
    if (!aiService.isAvailable()) {
      throw new Error('AI service not available - check API keys in environment variables');
    }
    
    // Get project details and files for context
    console.log(`[Chat] Fetching project files for context...`);
    const projectFiles = await getProjectFilesForAI(projectId, req.user.id);
    console.log(`[Chat] Found ${Object.keys(projectFiles.file_contents).length} project files`);
    
    // Build conversation messages for AI
    const messages: any[] = [];
    
    // Add system prompt with project context including files
    const systemPrompt = aiService.createDevelopmentSystemPrompt({
      name: `Project ${projectId}`,
      description: 'A Next.js project with Celiador inspection capabilities',
      tech_stack: ['Next.js', 'React', 'TypeScript', 'Tailwind CSS'],
      current_files: projectFiles.current_files,
      file_contents: projectFiles.file_contents
    });
    messages.push({ role: 'system', content: systemPrompt });
    
    // Add conversation history
    if (history && Array.isArray(history)) {
      messages.push(...history);
    }
    
    // Add current user message
    messages.push({ role: 'user', content: message });
    
    console.log(`[Chat] Calling AI service with ${messages.length} messages`);
    
    // Get AI response
    const aiResult = await aiService.generateResponse(messages, { provider });
    
    // Parse actions from response
    const parsedActions = aiService.parseActionsFromResponse(aiResult.content);
    
    const aiResponse = {
      response: aiResult.content,
      actions: parsedActions.hasActions ? parsedActions.actions : null,
      conversationId,
      timestamp: new Date().toISOString(),
      usage: aiResult.usage
    };
    
    console.log(`[Chat] AI response generated: ${aiResult.content.length} chars, ${parsedActions.actions.length} actions`);
    res.json(aiResponse);
    
  } catch (error: any) {
    console.error(`Failed to process chat message for project ${projectId}:`, error);
    res.status(500).json({ 
      error: 'Failed to process chat message',
      details: error.message 
    });
  }
});

// Helper function to get project files for AI context
async function getProjectFilesForAI(projectId: string, userId: string): Promise<{
  current_files: string[];
  file_contents: { [key: string]: string };
}> {
  try {
    // Use the correct path pattern from bucket exploration: userId/projectId
    console.log(`[Chat] Using discovered path pattern: ${userId}/${projectId}`);
    const basePath = `${userId}/${projectId}`;
    console.log(`[Chat] Looking for files at: ${basePath}`);
    
    // Get all files using the correct path
    const allFiles = await getAllFilesRecursivelyForAI(basePath);
    console.log(`[Chat] Found ${allFiles.length} files at: ${basePath}`);
    
    if (allFiles.length === 0) {
      console.log(`[Chat] No files found in any path pattern, exploring root bucket...`);
      
      // Explore the bucket structure to understand what's actually there
      try {
        const { data: rootFiles, error: rootError } = await supabaseService!.storage
          .from('project-files')
          .list('', { limit: 100 });
        
        if (!rootError && rootFiles) {
          console.log(`[Chat] Root bucket contains ${rootFiles.length} items:`, rootFiles.map((f: any) => f.name));
          
          // Try to find any folder that might contain our project
          for (const rootItem of rootFiles) {
            if (rootItem.name && !rootItem.id) { // It's a folder
              console.log(`[Chat] Exploring folder: ${rootItem.name}`);
              const { data: folderFiles, error: folderError } = await supabaseService!.storage
                .from('project-files')
                .list(rootItem.name, { limit: 50 });
              
              if (!folderError && folderFiles) {
                console.log(`[Chat] Folder ${rootItem.name} contains:`, folderFiles.map((f: any) => f.name));
              }
            }
          }
        }
      } catch (explorationError) {
        console.error(`[Chat] Error exploring bucket:`, explorationError);
      }
      
      return { current_files: [], file_contents: {} };
    }
    
    const fileContents: { [key: string]: string } = {};
    const currentFiles: string[] = [];
    
    // Download and read key project files (limit to important ones for AI context)
    const importantFiles = allFiles.filter(file => {
      const filePath = file.fullPath || file.name;
      return (
        filePath.endsWith('.tsx') ||
        filePath.endsWith('.ts') ||
        filePath.endsWith('.jsx') ||
        filePath.endsWith('.js') ||
        filePath.endsWith('.json') ||
        filePath.includes('layout') ||
        filePath.includes('page') ||
        filePath.includes('component') ||
        filePath === 'package.json' ||
        filePath === 'tailwind.config.js' ||
        filePath === 'next.config.js'
      );
    }).slice(0, 15); // Limit to 15 most important files
    
    console.log(`[Chat] Downloading ${importantFiles.length} important files for AI context`);
    
    for (const file of importantFiles) {
      // Skip directories
      if (!file.id && !file.metadata) {
        continue;
      }
      
      const filePath = file.fullPath || file.name;
      try {
        const { data: fileData, error: downloadError } = await supabaseService!.storage
          .from('project-files')
          .download(`${basePath}/${filePath}`);
          
        if (!downloadError && fileData) {
          const content = await fileData.text();
          fileContents[filePath] = content;
          currentFiles.push(filePath);
          console.log(`[Chat] Downloaded: ${filePath} (${content.length} chars)`);
        } else {
          console.warn(`[Chat] Failed to download ${filePath}:`, downloadError?.message);
        }
      } catch (fileError) {
        console.warn(`[Chat] Error downloading ${filePath}:`, fileError);
      }
    }
    
    console.log(`[Chat] Successfully loaded ${Object.keys(fileContents).length} files for AI context`);
    return { current_files: currentFiles, file_contents: fileContents };
    
  } catch (error) {
    console.error(`[Chat] Error fetching project files:`, error);
    return { current_files: [], file_contents: {} };
  }
}

// Get all files recursively for AI context (reuse PreviewManager logic)
async function getAllFilesRecursivelyForAI(basePath: string, currentPath = ''): Promise<any[]> {
  const fullPath = currentPath ? `${basePath}/${currentPath}` : basePath;
  
  try {
    console.log(`[Chat] Listing files at: ${fullPath}`);
    const { data, error } = await supabaseService!.storage
      .from('project-files')
      .list(fullPath, {
        limit: 1000,
        offset: 0
      });
      
    if (error) {
      console.error(`[Chat] Failed to list files at ${fullPath}:`, error);
      return [];
    }
    
    console.log(`[Chat] Found ${data?.length || 0} items at ${fullPath}:`, data?.map((item: any) => `${item.name} (id: ${item.id})`));
    
    let allFiles: any[] = [];
    
    for (const item of data || []) {
      if (!item.name) continue;
      
      const itemPath = currentPath ? `${currentPath}/${item.name}` : item.name;
      
      // Add the current item with its path
      allFiles.push({
        ...item,
        fullPath: itemPath
      });
      
      // If this is a directory (no metadata means it's a folder), recursively get its contents
      if (!item.id && !item.metadata) {
        console.log(`[Chat] Recursing into directory: ${itemPath}`);
        const childFiles = await getAllFilesRecursivelyForAI(basePath, itemPath);
        allFiles.push(...childFiles);
      }
    }
    
    return allFiles;
  } catch (error) {
    console.error(`[Chat] Error in getAllFilesRecursivelyForAI:`, error);
    return [];
  }
}

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
      .eq('is_active', true)
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
    
    console.log(`[ACTIVITY] NEW REQUEST for project ${id}, showAll: ${showAll}, time: ${new Date().toISOString()}`);
    
    const project = await db.getProjectById(id);
    if (!project || project.userid !== req.user.id) {
      return res.status(404).json({ error: 'Project not found or access denied' });
    }
    
    console.log('[DEBUG] Project createdat:', project.createdat);

    if (!supabaseService) {
      return res.json([]);
    }

    // Get comprehensive activity from multiple sources
    const limit = showAll === 'true' ? 50 : 10;
    
    // Get jobs activity - order by updatedat first, then createdat
    const { data: jobs, error: jobsError } = await supabaseService
      .from('jobs')
      .select('id, type, status, createdat, updatedat, prompt, output, error, metadata, userid')
      .eq('projectid', id)
      .order('updatedat', { ascending: false, nullsLast: true })
      .order('createdat', { ascending: false })
      .limit(limit);

    if (jobsError) {
      console.error('Error fetching jobs for activity:', jobsError);
      return res.status(500).json({ error: 'Failed to get activity' });
    }

    console.log(`[DEBUG] Found ${jobs?.length || 0} jobs for project ${id}`);
    console.log('[DEBUG] Jobs with timestamps:');
    jobs?.forEach((job: any, i: number) => {
      console.log(`  Job ${i}: ${job.type} - created: ${job.createdat}, updated: ${job.updatedat}`);
    });

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
        title: 'Conversation started',
        description: conv.title || 'Untitled conversation',
        timestamp: conv.createdat,
        metadata: {
          conversationId: conv.id
        }
      })) || [];
    } catch (convError) {
      // Conversations table might not exist, ignore
      console.log('Conversations table not available, skipping conversation activity');
    }

    // Convert jobs to activity format with rich data
    const jobActivities = jobs?.map((job: any) => ({
      id: job.id,
      type: 'job',
      title: getJobTitle(job.type, job.status),
      description: job.prompt || 'No description available',
      timestamp: job.updatedat || job.createdat,
      status: job.status,
      metadata: {
        jobId: job.id,
        jobType: job.type,
        output: job.output,
        error: job.error,
        jobMetadata: job.metadata,
        userId: job.userid
      }
    })) || [];


    // Helper function to get better job titles
    function getJobTitle(type: string, status: string) {
      const typeMap: { [key: string]: string } = {
        'SCAFFOLD': 'Project Setup',
        'AI_ACTION': 'AI Code Generation', 
        'EDIT': 'Code Modification',
        'TEST': 'Test Execution',
        'DEPLOY': 'Deployment',
        'BUILD': 'Build Process'
      };
      
      const statusMap: { [key: string]: string } = {
        'PENDING': 'queued',
        'RUNNING': 'in progress',
        'COMPLETED': 'completed',
        'FAILED': 'failed',
        'CANCELLED': 'cancelled'
      };
      
      const jobType = typeMap[type] || type;
      const jobStatus = statusMap[status] || status.toLowerCase();
      
      return `${jobType} ${jobStatus}`;
    }

    // Combine all activities including project creation
    const allActivities = [
      ...jobActivities, 
      ...conversationActivities,
      {
        id: 'project_created',
        type: 'system',
        title: 'Project created',
        description: `Project "${project.name}" was created`,
        timestamp: project.createdat,
        status: 'COMPLETED'
      }
    ];
    
    // Sort all activities by timestamp (newest first)
    allActivities.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeB - timeA; // newest first (larger timestamp first)
    });
    
    const finalActivities = allActivities.slice(0, limit);
    console.log(`[DEBUG] Returning ${finalActivities.length} activities for project ${id}`);
    console.log('[DEBUG] Final activity order:');
    finalActivities.forEach((activity, i) => {
      console.log(`  ${i}: ${activity.title} - ${activity.timestamp}`);
    });
    res.json({ activities: finalActivities });
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
    
    console.log(`🚀 [PREVIEW START] Starting preview for project ${id}:`, { name, type });
    console.log(`🔧 [PREVIEW START] Environment: NODE_ENV=${process.env.NODE_ENV}, PORT=${process.env.PORT}`);
    console.log(`💾 [PREVIEW START] Memory usage:`, process.memoryUsage());
    console.log(`🌍 [PREVIEW START] Platform:`, process.platform, process.arch);
    
    const project = await db.getProjectById(id);
    if (!project || project.userid !== req.user.id) {
      return res.status(404).json({ error: 'Project not found or access denied' });
    }

    // Start real preview using PreviewManager
    console.log(`📋 [PREVIEW START] Project found:`, { name: project.name, userid: project.userid });
    console.log(`⚡ [PREVIEW START] Calling previewManager.startPreview...`);
    
    const preview = await previewManager.startPreview(
      id,
      req.user.id,
      name || project.name || 'Project Preview',
      type || 'nextjs'
    );
    
    console.log(`✅ [PREVIEW START] Preview created successfully:`, { id: preview.id, status: preview.status, url: preview.url });
    
    res.status(201).json({
      success: true,
      preview: {
        id: preview.id,
        projectId: preview.projectId,
        userId: preview.userId,
        name: name || project.name || 'Project Preview',
        type: type || 'nextjs',
        status: preview.status,
        url: preview.url,
        port: preview.port,
        localPath: preview.localPath,
        syncResult: preview.syncResult,
        startTime: preview.startTime.toISOString(),
        lastAccessed: preview.lastAccessed.toISOString(),
        errorMessage: preview.errorMessage
      }
    });
  } catch (error) {
    console.error(`❌ [PREVIEW START] Failed to start preview for project ${req.params.id}:`, error);
    console.error(`❌ [PREVIEW START] Error type:`, error instanceof Error ? error.constructor.name : typeof error);
    console.error(`❌ [PREVIEW START] Error message:`, error instanceof Error ? error.message : String(error));
    console.error(`❌ [PREVIEW START] Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
    console.log(`💾 [PREVIEW START] Memory usage after error:`, process.memoryUsage());
    
    res.status(500).json({ 
      error: 'Failed to start preview', 
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined 
    });
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

    // Stop real preview using PreviewManager
    await previewManager.stopPreview(previewId);
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

    // Get real preview status
    const preview = previewManager.getPreview(previewId);
    
    if (!preview) {
      return res.status(404).json({ error: 'Preview not found' });
    }
    
    res.json({
      success: true,
      preview: {
        id: preview.id,
        projectId: preview.projectId,
        userId: preview.userId,
        status: preview.status,
        url: preview.url,
        port: preview.port,
        localPath: preview.localPath,
        syncResult: preview.syncResult,
        startTime: preview.startTime.toISOString(),
        lastAccessed: preview.lastAccessed.toISOString(),
        errorMessage: preview.errorMessage
      }
    });
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

    // Get real preview list for project
    const previews = previewManager.getPreviewsForProject(id);
    
    const previewList = previews.map(preview => ({
      id: preview.id,
      projectId: preview.projectId,
      userId: preview.userId,
      name: `Preview ${preview.id.split('-')[1]}`,
      type: 'nextjs',
      status: preview.status,
      url: preview.url,
      port: preview.port,
      localPath: preview.localPath,
      syncResult: preview.syncResult,
      startTime: preview.startTime.toISOString(),
      lastAccessed: preview.lastAccessed.toISOString(),
      errorMessage: preview.errorMessage
    }));
    
    res.json({
      success: true,
      previews: previewList
    });
  } catch (error) {
    console.error('Failed to list previews:', error);
    res.status(500).json({ error: 'Failed to list previews' });
  }
});

console.log('✅ [Preview Proxy] Routes registered at /projects/:id/preview/:previewId/proxy/*');

// Proxy handler function
const handleProxyRequest = async (req: any, res: any) => {
  console.log(`🔄 [Preview Proxy] Request received for project ${req.params.id}, preview ${req.params.previewId}`);
  console.log(`🔄 [Preview Proxy] Full request URL: ${req.url}`);
  console.log(`🔄 [Preview Proxy] Request method: ${req.method}`);
  console.log(`🔄 [Preview Proxy] Request params:`, req.params);
  console.log(`🔄 [Preview Proxy] Query parameters:`, req.query);
  console.log(`🔄 [Preview Proxy] Headers:`, { 
    'user-agent': req.headers['user-agent'], 
    'referer': req.headers['referer'],
    'origin': req.headers['origin']
  });
  
  // Handle authentication via query parameter for iframe requests
  const token = req.query.token;
  if (!token) {
    console.log(`❌ [Preview Proxy] No token provided in query parameters`);
    return res.status(401).json({ error: 'Authentication token required' });
  }
  
  console.log(`🔑 [Preview Proxy] Token found, verifying authentication...`);
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid authentication token' });
    }
    req.user = user;
  } catch (error) {
    return res.status(401).json({ error: 'Authentication failed' });
  }
  try {
    const { id, previewId } = req.params;
    const enableInspection = req.query.inspection === 'true';
    
    console.log(`[Preview Proxy] Proxying preview ${previewId} with inspection: ${enableInspection}`);
    
    // Get the preview instance
    console.log(`🔍 [Preview Proxy] Looking for preview: ${previewId}`);
    const preview = previewManager.getPreview(previewId);
    console.log(`🔍 [Preview Proxy] Found preview:`, preview ? { id: preview.id, status: preview.status, url: preview.url } : 'null');
    
    if (!preview || preview.status !== 'running') {
      console.log(`❌ [Preview Proxy] Preview not found or not running. Status: ${preview?.status || 'null'}`);
      return res.status(404).json({ error: 'Preview not found or not running' });
    }
    
    // Build target URL - append the additional path from the request
    const additionalPath = req.params[0] || ''; // Get the wildcard part
    const baseUrl = preview.internalUrl || `http://localhost:${preview.port}`;
    const targetUrl = additionalPath ? `${baseUrl}/${additionalPath}` : baseUrl;
    
    // Fetch the original preview content
    console.log(`📡 [Preview Proxy] Fetching content from: ${targetUrl}`);
    const originalResponse = await fetch(targetUrl);
    if (!originalResponse.ok) {
      return res.status(originalResponse.status).json({ error: 'Failed to fetch preview content' });
    }
    
    const contentType = originalResponse.headers.get('content-type') || 'text/html';
    
    // Only inject inspection script for the root HTML page (not for CSS/JS assets)
    const isRootRequest = !additionalPath || additionalPath === '';
    if (contentType.includes('text/html') && enableInspection && isRootRequest) {
      let html = await originalResponse.text();
      
      // Rewrite relative URLs to go through the proxy
      const proxyBasePath = `/projects/${id}/preview/${previewId}/proxy`;
      
      // Rewrite _next URLs to go through proxy
      html = html.replace(/href="(\/_next\/[^"]+)"/g, `href="${proxyBasePath}$1"`);
      html = html.replace(/src="(\/_next\/[^"]+)"/g, `src="${proxyBasePath}$1"`);
      html = html.replace(/href='(\/_next\/[^']+)'/g, `href='${proxyBasePath}$1'`);
      html = html.replace(/src='(\/_next\/[^']+)'/g, `src='${proxyBasePath}$1'`);
      
      console.log('✅ [Preview Proxy] Rewritten relative URLs to use proxy paths');
      
      // Simple inspection script
      const inspectionScript = `
<script>
console.log('🎯 Celiador Inspection Script Loaded');

window.celiadorInspection = {
  enabled: false,
  elements: [],
  
  scan: function() {
    console.log('🔍 Scanning for elements...');
    this.elements = [];
    
    const selectors = 'button, input, a[href], div[class], nav, header, main, section';
    const foundElements = document.querySelectorAll(selectors);
    
    foundElements.forEach((el, i) => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 10 && rect.height > 10) {
        this.elements.push({
          id: 'element-' + i,
          type: el.tagName.toLowerCase(),
          selector: el.className ? el.tagName.toLowerCase() + '.' + el.className.split(' ')[0] : el.tagName.toLowerCase(),
          boundingBox: {
            x: rect.left,
            y: rect.top,
            width: rect.width,
            height: rect.height
          },
          text: el.textContent?.slice(0, 50) || ''
        });
      }
    });
    
    // Send elements to parent
    window.parent.postMessage({
      type: 'ELEMENTS_MAPPED',
      elements: this.elements
    }, '*');
    
    console.log('📡 Found and sent', this.elements.length, 'elements');
  },
  
  toggle: function(enabled) {
    this.enabled = enabled;
    console.log('🔄 Inspection', enabled ? 'enabled' : 'disabled');
    if (enabled) {
      this.scan();
    } else {
      this.elements = [];
    }
  }
};

// Listen for messages from parent
window.addEventListener('message', (event) => {
  if (event.data.type === 'ENABLE_INSPECTION') {
    window.celiadorInspection.toggle(true);
  } else if (event.data.type === 'DISABLE_INSPECTION') {
    window.celiadorInspection.toggle(false);
  }
});

console.log('✅ Celiador Inspection Ready');
</script>`;
      
      // Inject before closing </body> tag
      if (html.includes('</body>')) {
        html = html.replace('</body>', inspectionScript + '\n</body>');
      } else {
        html += inspectionScript;
      }
      
      console.log('✅ [Preview Proxy] Injected inspection script');
      
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } else if (contentType.includes('text/html') && isRootRequest) {
      // HTML without inspection - still need to rewrite URLs
      let html = await originalResponse.text();
      
      // Rewrite relative URLs to go through the proxy
      const proxyBasePath = `/projects/${id}/preview/${previewId}/proxy`;
      
      // Rewrite _next URLs to go through proxy
      html = html.replace(/href="(\/_next\/[^"]+)"/g, `href="${proxyBasePath}$1"`);
      html = html.replace(/src="(\/_next\/[^"]+)"/g, `src="${proxyBasePath}$1"`);
      html = html.replace(/href='(\/_next\/[^']+)'/g, `href='${proxyBasePath}$1'`);
      html = html.replace(/src='(\/_next\/[^']+)'/g, `src='${proxyBasePath}$1'`);
      
      console.log('✅ [Preview Proxy] Rewritten URLs for HTML without inspection');
      
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } else {
      // For non-HTML content (CSS, JS, images), just proxy through
      const buffer = await originalResponse.arrayBuffer();
      res.setHeader('Content-Type', contentType);
      res.send(Buffer.from(buffer));
    }
    
  } catch (error) {
    console.error('Preview proxy error:', error);
    res.status(500).json({ error: 'Failed to proxy preview content' });
  }
};

// Register both routes - root and wildcard paths
app.get('/projects/:id/preview/:previewId/proxy', handleProxyRequest);
app.get('/projects/:id/preview/:previewId/proxy/*', handleProxyRequest);

console.log('✅ [Inspection Preview] Route registered at /projects/:id/preview/:previewId/inspection');

// New inspection preview endpoint - generates server-side inspection overlay
app.get('/projects/:id/preview/:previewId/inspection', async (req: any, res: any) => {
  console.log(`🔍 [Inspection Preview] Request for project ${req.params.id}, preview ${req.params.previewId}`);
  
  // Handle authentication via query parameter for iframe requests
  const token = req.query.token;
  if (!token) {
    console.log(`❌ [Inspection Preview] No token provided`);
    return res.status(401).json({ error: 'Authentication token required' });
  }
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid authentication token' });
    }
    req.user = user;
  } catch (error) {
    return res.status(401).json({ error: 'Authentication failed' });
  }
  
  try {
    const { id, previewId } = req.params;
    
    console.log(`[Inspection Preview] Generating inspection layer for preview ${previewId}`);
    
    // Get the preview instance
    console.log(`🔍 [Inspection Preview] Looking for preview: ${previewId}`);
    const preview = previewManager.getPreview(previewId);
    console.log(`🔍 [Inspection Preview] Found preview:`, preview ? { id: preview.id, status: preview.status, url: preview.url } : 'null');
    
    if (!preview || preview.status !== 'running') {
      console.log(`❌ [Inspection Preview] Preview not found or not running. Status: ${preview?.status || 'null'}`);
      return res.status(404).json({ error: 'Preview not found or not running' });
    }
    
    // Fetch the original preview HTML
    console.log(`📡 [Inspection Preview] Fetching original content from: ${preview.url}`);
    const originalResponse = await fetch(preview.url);
    if (!originalResponse.ok) {
      return res.status(originalResponse.status).json({ error: 'Failed to fetch preview content' });
    }
    
    const originalHtml = await originalResponse.text();
    
    // Generate inspection overlay HTML with URL rewriting for assets
    const inspectionHtml = await generateInspectionOverlay(originalHtml, id, previewId, preview.url);
    
    console.log('✅ [Inspection Preview] Generated inspection overlay HTML');
    
    res.setHeader('Content-Type', 'text/html');
    res.send(inspectionHtml);
    
  } catch (error) {
    console.error('Inspection preview error:', error);
    res.status(500).json({ error: 'Failed to generate inspection preview' });
  }
});

// Generate inspection overlay HTML with clickable elements
async function generateInspectionOverlay(originalHtml: string, projectId: string, previewId: string, originalPreviewUrl: string): Promise<string> {
  console.log('🔍 [Inspection Overlay] Parsing HTML and generating inspection layer');
  
  try {
    // Parse the HTML with JSDOM
    const dom = new JSDOM(originalHtml);
    const document = dom.window.document;
    
    // Find all interactive elements
    const selectors = [
      'button',
      'input',
      'a[href]',
      'div[onclick]',
      'span[onclick]',
      '[role="button"]',
      'nav',
      'header',
      'main',
      'section',
      '.btn',
      '.button',
      '[class*="btn"]'
    ];
    
    const elements: any[] = [];
    let elementIndex = 0;
    
    // Scan for elements using each selector
    selectors.forEach(selector => {
      const foundElements = document.querySelectorAll(selector);
      foundElements.forEach((el: any) => {
        // Skip elements that are too small or hidden
        const computedStyle = el.style || {};
        if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden') {
          return;
        }
        
        // Get element info
        const tagName = el.tagName.toLowerCase();
        const className = el.className || '';
        const id = el.id || '';
        const textContent = (el.textContent || '').trim().substring(0, 100);
        
        // Create unique selector
        let elementSelector = tagName;
        if (id) elementSelector += `#${id}`;
        if (className && typeof className === 'string') {
          const firstClass = className.split(' ')[0];
          if (firstClass) elementSelector += `.${firstClass}`;
        }
        
        const elementData = {
          index: elementIndex++,
          tagName,
          selector: elementSelector,
          className: className,
          id: id,
          textContent,
          type: getElementType(tagName, className, textContent)
        };
        
        elements.push(elementData);
        
        // Add inspection data attributes to the element
        el.setAttribute('data-celiador-element', JSON.stringify(elementData));
        el.setAttribute('data-celiador-index', elementData.index.toString());
      });
    });
    
    console.log(`🔍 [Inspection Overlay] Found ${elements.length} interactive elements`);
    
    // Rewrite relative URLs to point to original preview server using string replacement
    let htmlString = dom.serialize();
    
    // Debug: Log a sample of the HTML to see what URLs actually exist
    const sampleHtml = htmlString.substring(0, 2000);
    console.log(`🔍 [Debug] Sample HTML before URL rewriting:`, sampleHtml);
    
    // Count matches before replacement
    const nextHrefMatches = (htmlString.match(/href="(\/_next\/[^"]+)"/g) || []).length;
    const nextSrcMatches = (htmlString.match(/src="(\/_next\/[^"]+)"/g) || []).length;
    console.log(`🔍 [Debug] Found ${nextHrefMatches} href="_next" and ${nextSrcMatches} src="_next" matches`);
    
    // Replace all relative URLs with absolute URLs pointing to the original preview server
    htmlString = htmlString.replace(/href="(\/_next\/[^"]+)"/g, `href="${originalPreviewUrl}$1"`);
    htmlString = htmlString.replace(/src="(\/_next\/[^"]+)"/g, `src="${originalPreviewUrl}$1"`);
    htmlString = htmlString.replace(/href='(\/_next\/[^']+)'/g, `href='${originalPreviewUrl}$1'`);
    htmlString = htmlString.replace(/src='(\/_next\/[^']+)'/g, `src='${originalPreviewUrl}$1'`);
    
    // Also fix any other relative URLs that start with /
    htmlString = htmlString.replace(/href="(\/[^"_][^"]*(?<!\/_next)[^"]*\.(css|js|ico|png|jpg|jpeg|svg|woff|woff2))"/g, `href="${originalPreviewUrl}$1"`);
    htmlString = htmlString.replace(/src="(\/[^"_][^"]*(?<!\/_next)[^"]*\.(js|png|jpg|jpeg|svg|woff|woff2))"/g, `src="${originalPreviewUrl}$1"`);
    
    // Fix WebSocket connections and dynamic imports
    const previewBaseUrl = originalPreviewUrl.replace('http://', '').replace('https://', ''); // Get host:port
    htmlString = htmlString.replace(/'_next\/webpack-hmr'/g, `'ws://${previewBaseUrl}/_next/webpack-hmr'`);
    htmlString = htmlString.replace(/"_next\/webpack-hmr"/g, `"ws://${previewBaseUrl}/_next/webpack-hmr"`);
    
    // Fix dynamic imports and chunk loading
    htmlString = htmlString.replace(/__webpack_require__\.p\s*=\s*["'][^"']*["']/g, `__webpack_require__.p = "${originalPreviewUrl}/"`);
    
    console.log(`✅ [Inspection Overlay] Rewritten asset URLs and WebSocket connections for: ${originalPreviewUrl}`);
    
    // Add inspection overlay styles and script directly to the HTML string
    const inspectionStyles = `
<style id="celiador-inspection-styles">
  [data-celiador-element] {
    position: relative;
    cursor: pointer !important;
  }
  
  [data-celiador-element]:hover {
    outline: 2px solid #3b82f6 !important;
    outline-offset: -2px !important;
    background-color: rgba(59, 130, 246, 0.1) !important;
  }
  
  [data-celiador-element]:hover::after {
    content: attr(data-celiador-type) " - " attr(data-celiador-text);
    position: absolute;
    top: -30px;
    left: 0;
    background: #3b82f6;
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    white-space: nowrap;
    z-index: 10000;
    max-width: 300px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .celiador-inspection-active [data-celiador-element] {
    pointer-events: auto !important;
  }
</style>`;

    const inspectionScript = `
<script id="celiador-inspection-script">
  console.log('🎯 Celiador Server-Side Inspection Ready');
  
  // Add inspection class to body
  document.body.classList.add('celiador-inspection-active');
  
  // Handle element clicks
  document.addEventListener('click', function(event) {
    const element = event.target.closest('[data-celiador-element]');
    if (element) {
      event.preventDefault();
      event.stopPropagation();
      
      const elementData = JSON.parse(element.getAttribute('data-celiador-element') || '{}');
      console.log('🎯 Celiador Element Clicked:', elementData);
      
      // Send element data to parent window (Celiador dashboard)
      window.parent.postMessage({
        type: 'ELEMENT_SELECTED',
        element: elementData
      }, '*');
    }
  });
  
  // Add hover data attributes for CSS tooltips
  document.querySelectorAll('[data-celiador-element]').forEach(function(el, index) {
    const data = JSON.parse(el.getAttribute('data-celiador-element') || '{}');
    el.setAttribute('data-celiador-type', data.type || 'element');
    el.setAttribute('data-celiador-text', (data.textContent || data.selector || '').substring(0, 50));
  });
  
  console.log('🎯 Celiador Inspection Layer Active - ' + document.querySelectorAll('[data-celiador-element]').length + ' elements ready');
</script>`;
    
    // Add base tag for proper URL resolution and insert styles before </head>
    const baseTag = `<base href="${originalPreviewUrl}/">`;
    const nextjsCompatScript = `
<script>
  // Fix Next.js runtime configuration for inspection mode
  if (typeof window !== 'undefined') {
    // Override fetch to use absolute URLs when needed
    const originalFetch = window.fetch;
    window.fetch = function(url, options) {
      if (typeof url === 'string' && url.startsWith('/_next/')) {
        url = '${originalPreviewUrl}' + url;
      }
      return originalFetch.call(this, url, options);
    };
    
    // Override WebSocket constructor for HMR
    const originalWebSocket = window.WebSocket;
    window.WebSocket = function(url, protocols) {
      if (typeof url === 'string' && url.includes('_next/webpack-hmr')) {
        url = url.replace(/^ws:\/\/[^\/]+/, 'ws://${previewBaseUrl}');
      }
      return new originalWebSocket(url, protocols);
    };
  }
</script>`;
    
    if (htmlString.includes('</head>')) {
      htmlString = htmlString.replace('</head>', baseTag + nextjsCompatScript + inspectionStyles + '\n</head>');
    }
    
    // Insert script before </body> in HTML string  
    if (htmlString.includes('</body>')) {
      htmlString = htmlString.replace('</body>', inspectionScript + '\n</body>');
    } else {
      // If no </body> tag, append at end
      htmlString += inspectionScript;
    }
    
    console.log('✅ [Inspection Overlay] Generated inspection overlay with server-side element detection and URL rewriting');
    
    return htmlString;
    
  } catch (error) {
    console.error('❌ [Inspection Overlay] Error generating overlay:', error);
    // Fallback: return original HTML with basic inspection layer
    return originalHtml + `
<script>
  console.log('⚠️ Celiador Inspection - Fallback mode');
  window.parent.postMessage({ type: 'INSPECTION_ERROR', error: 'Failed to generate overlay' }, '*');
</script>`;
  }
}

// Helper function to determine element type
function getElementType(tagName: string, className: string, textContent: string): string {
  if (tagName === 'button' || className.includes('btn') || className.includes('button')) {
    return 'button';
  }
  if (tagName === 'input') return 'input';
  if (tagName === 'a') return 'link';
  if (tagName === 'nav') return 'navigation';
  if (tagName === 'header') return 'header';
  if (tagName === 'main') return 'main-content';
  if (tagName === 'section') return 'section';
  if (className.includes('card')) return 'card';
  if (className.includes('menu')) return 'menu';
  if (textContent.toLowerCase().includes('search')) return 'search';
  return 'interactive-element';
}

// Recursive file listing helper function
async function getAllFilesRecursively(supabaseService: any, basePath: string, currentPath = ''): Promise<any[]> {
  const fullPath = currentPath ? `${basePath}/${currentPath}` : basePath;
  
  const { data, error } = await supabaseService.storage
    .from('project-files')
    .list(fullPath, {
      limit: 1000,
      offset: 0
    });
    
  if (error) {
    console.error(`Failed to list files at ${fullPath}:`, error);
    return [];
  }
  
  let allFiles: any[] = [];
  
  for (const item of data) {
    if (!item.name) continue;
    
    const itemPath = currentPath ? `${currentPath}/${item.name}` : item.name;
    
    // Add the current item with its path
    allFiles.push({
      ...item,
      fullPath: itemPath
    });
    
    // If this is a directory (no metadata means it's a folder), recursively get its contents
    if (!item.id && !item.metadata) {
      const childFiles = await getAllFilesRecursively(supabaseService, basePath, itemPath);
      allFiles.push(...childFiles);
    }
  }
  
  return allFiles;
}

// File management endpoints
app.get('/projects/:id/files/tree', authenticateUser, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    console.log(`[DEBUG] File tree request for project ${id}, user ${req.user?.id}`);
    
    const project = await db.getProjectById(id);
    console.log(`[DEBUG] Project lookup result:`, project ? 'found' : 'not found');
    if (!project || project.userid !== req.user.id) {
      console.log(`[DEBUG] Access denied - project.userid: ${project?.userid}, req.user.id: ${req.user.id}`);
      return res.status(404).json({ error: 'Project not found or access denied' });
    }

    if (!supabaseService) {
      console.log(`[DEBUG] Supabase service not available`);
      return res.status(500).json({ error: 'Database not available' });
    }
    
    console.log(`[DEBUG] Attempting to list files from storage for project ${id} using path: ${req.user.id}/${id}/`);

    // Get real file tree from Supabase Storage using recursive traversal
    try {
      const basePath = `${req.user.id}/${id}`;
      console.log(`[DEBUG] Getting all files recursively from: ${basePath}`);
      
      const allFiles = await getAllFilesRecursively(supabaseService, basePath);
      console.log(`[DEBUG] Recursive traversal found ${allFiles.length} total files`);

      if (allFiles.length === 0) {
        console.log(`[DEBUG] No files found, falling back to template`);
        const templateFiles = await getTemplateFileStructure(project.templatekey || 'next-prisma-supabase');
        console.log(`[DEBUG] Returning template files:`, templateFiles?.length || 0);
        return res.json({ tree: templateFiles });
      }

      console.log(`[DEBUG] Building file tree from ${allFiles.length} storage files`);
      // Convert storage files to tree structure
      const fileTree = await buildFileTreeFromStorage(allFiles || [], id);
      console.log(`[DEBUG] Built file tree with ${Array.isArray(fileTree) ? fileTree.length : 'non-array'} items`);
      res.json({ tree: fileTree });
      
    } catch (storageError) {
      console.error('Storage not configured, returning template structure:', storageError);
      // Fallback to template-based structure
      const templateFiles = await getTemplateFileStructure(project.templatekey || 'next-prisma-supabase');
      res.json({ tree: templateFiles });
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

// =============================================================================
// USER SETTINGS API
// =============================================================================

// Get user settings
app.get('/api/settings', authenticateUser, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    
    let settings = await db.getUserSettings(userId);
    
    // If no settings exist, create default settings
    if (!settings) {
      settings = await db.createUserSettings(userId);
    }
    
    res.json({ settings });
  } catch (error) {
    console.error('Failed to get user settings:', error);
    res.status(500).json({ error: 'Failed to retrieve settings' });
  }
});

// Update user settings
app.put('/api/settings', authenticateUser, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const updates = req.body;
    
    // Validate required fields if provided
    if (updates.theme && !['light', 'dark', 'system'].includes(updates.theme)) {
      return res.status(400).json({ error: 'Invalid theme value' });
    }
    if (updates.ai_response_style && !['concise', 'balanced', 'detailed'].includes(updates.ai_response_style)) {
      return res.status(400).json({ error: 'Invalid AI response style' });
    }
    if (updates.layout_density && !['compact', 'comfortable'].includes(updates.layout_density)) {
      return res.status(400).json({ error: 'Invalid layout density' });
    }
    
    // Validate numeric ranges
    if (updates.editor_font_size && (updates.editor_font_size < 8 || updates.editor_font_size > 32)) {
      return res.status(400).json({ error: 'Font size must be between 8 and 32' });
    }
    if (updates.editor_tab_size && (updates.editor_tab_size < 1 || updates.editor_tab_size > 8)) {
      return res.status(400).json({ error: 'Tab size must be between 1 and 8' });
    }
    if (updates.sidebar_width && (updates.sidebar_width < 200 || updates.sidebar_width > 600)) {
      return res.status(400).json({ error: 'Sidebar width must be between 200 and 600' });
    }
    if (updates.auto_save_interval && (updates.auto_save_interval < 5 || updates.auto_save_interval > 300)) {
      return res.status(400).json({ error: 'Auto-save interval must be between 5 and 300 seconds' });
    }
    
    let settings = await db.getUserSettings(userId);
    
    // If no settings exist, create them first
    if (!settings) {
      settings = await db.createUserSettings(userId);
    }
    
    // Update settings
    const updatedSettings = await db.updateUserSettings(userId, updates);
    
    res.json({ settings: updatedSettings });
  } catch (error) {
    console.error('Failed to update user settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Reset user settings to defaults
app.delete('/api/settings', authenticateUser, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    
    // Soft delete current settings
    await supabaseService
      .from('user_settings')
      .update({ 
        deleted_at: new Date().toISOString(),
        deleter: userId 
      })
      .eq('user_id', userId)
      .is('deleted_at', null);
    
    // Create new default settings
    const settings = await db.createUserSettings(userId);
    
    res.json({ settings });
  } catch (error) {
    console.error('Failed to reset user settings:', error);
    res.status(500).json({ error: 'Failed to reset settings' });
  }
});

// Start server
const server = app.listen(port, '0.0.0.0', () => {
  console.log('=== SERVER STARTED SUCCESSFULLY ===');
  console.log(`🚀 Server running on port ${port}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔒 CORS Debug: ${process.env.CORS_DEBUG || 'false'}`);
  console.log(`🌐 CORS Origins: ${JSON.stringify(corsOptions.origin)}`);
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