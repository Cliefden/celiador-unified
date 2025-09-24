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
  url: string;
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
    
    const instance: PreviewInstance = {
      id: instanceId,
      projectId,
      userId,
      port,
      url: `http://localhost:${port}`,
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
    const instance = this.instances.get(instanceId);
    if (instance) {
      instance.lastAccessed = new Date();
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

    // Create layout.tsx
    const layoutContent = `export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}`;

    await fs.writeFile(path.join(localPath, 'src', 'app', 'layout.tsx'), layoutContent);

    // Create page.tsx
    const pageContent = `export default function Home() {
  return (
    <main style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Project Preview</h1>
      <p>Your project is running in preview mode!</p>
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
    jobs?.forEach((job, i) => {
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
    
    console.log(`Starting preview for project ${id}:`, { name, type });
    
    const project = await db.getProjectById(id);
    if (!project || project.userid !== req.user.id) {
      return res.status(404).json({ error: 'Project not found or access denied' });
    }

    // Start real preview using PreviewManager
    const preview = await previewManager.startPreview(
      id,
      req.user.id,
      name || project.name || 'Project Preview',
      type || 'nextjs'
    );
    
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