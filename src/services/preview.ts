import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import * as net from 'net';

const fsPromises = fs.promises;

export interface PreviewInstance {
  id: string;
  projectId: string;
  userId: string;
  port: number;
  url: string; // External proxy URL for client access
  internalUrl?: string; // Internal URL for server-side proxy fetching
  status: 'syncing' | 'starting' | 'running' | 'stopped' | 'error';
  process?: ChildProcess;
  localPath?: string;
  startTime: Date;
  lastAccessed: Date;
  syncResult?: {
    success: boolean;
    filesDownloaded: number;
    errors: string[];
  };
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
      const server = net.createServer();
      server.listen(port, () => {
        server.close(() => resolve(true));
      });
      server.on('error', () => resolve(false));
    });
  }
}

export class PreviewService {
  private instances = new Map<string, PreviewInstance>();
  private portManager = new PortManager();
  private readonly basePreviewDir = '/tmp/celiador-previews';
  private db: any;
  private supabaseService: any;

  constructor(db: any, supabaseService: any) {
    this.db = db;
    this.supabaseService = supabaseService;
  }

  async startPreview(projectId: string, userId: string, name: string, type: string = 'nextjs', req?: any): Promise<PreviewInstance> {
    console.log(`🚀 [PreviewManager] Starting preview for project ${projectId}, user ${userId}, name: ${name}`);
    console.log(`🚀 [PreviewManager] Environment: NODE_ENV=${process.env.NODE_ENV}, Platform: ${process.platform}`);
    console.log(`🚀 [PreviewManager] Current instances: ${this.instances.size}`);
    
    const instanceId = `${projectId}-${Date.now()}`;
    console.log(`🚀 [PreviewManager] Generated instance ID: ${instanceId}`);
    
    const port = await this.portManager.allocatePort();
    console.log(`🚀 [PreviewManager] Allocated port: ${port}`);
    
    // Construct the proxy URL for Railway deployment
    let baseUrl = process.env.NODE_ENV === 'production' 
      ? (process.env.RAILWAY_PUBLIC_DOMAIN || 'https://celiador-unified-production.up.railway.app')
      : 'http://localhost:' + (process.env.PORT || '4000');
    
    // Ensure production URLs always have https:// protocol
    if (process.env.NODE_ENV === 'production' && !baseUrl.startsWith('http')) {
      baseUrl = `https://${baseUrl}`;
    }
    
    const proxyUrl = `${baseUrl}/projects/${projectId}/preview/${instanceId}/proxy/`;
    const internalUrl = `http://localhost:${port}`; // Keep internal URL for server-side fetching
    
    console.log(`[PreviewManager] URL construction:`, {
      NODE_ENV: process.env.NODE_ENV,
      RAILWAY_PUBLIC_DOMAIN: process.env.RAILWAY_PUBLIC_DOMAIN,
      baseUrl,
      proxyUrl
    });
    
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
      console.log(`[PreviewManager] Local path: ${localPath}`);
      
      // Update status to starting
      instance.status = 'starting';
      console.log(`[PreviewManager] Status updated to: starting`);
      
      // Sync files from Supabase Storage
      console.log(`[PreviewManager] Starting file sync...`);
      const syncResult = await this.syncProjectFiles(projectId, localPath, req);
      instance.syncResult = syncResult;
      console.log(`[PreviewManager] File sync result:`, { success: syncResult.success, files: syncResult.filesDownloaded, errors: syncResult.errors.length });
      
      if (!syncResult.success) {
        instance.status = 'error';
        instance.errorMessage = `File sync failed: ${syncResult.errors.join(', ')}`;
        console.error(`[PreviewManager] ❌ File sync failed, releasing port ${port}`);
        this.portManager.releasePort(port);
        throw new Error(instance.errorMessage);
      }
      
      if (syncResult.filesDownloaded === 0) {
        console.log(`[PreviewManager] No project files found, but continuing with basic structure`);
      }
      
      // Always start the dev server for proper preview rendering
      // Even in production, we need the dev server to compile and serve the React app
      console.log(`[PreviewManager] Starting npm dev server for proper website preview`);
      try {
        await this.startDevServer(instance, type);
        instance.status = 'running';
        console.log(`[PreviewManager] Preview ${instanceId} running at ${instance.url}`);
      } catch (devServerError) {
        console.error(`[PreviewManager] ❌ Failed to start dev server:`, devServerError);
        // Fallback to static mode if dev server fails
        console.log(`[PreviewManager] Falling back to static file serving mode`);
        instance.status = 'running';
        instance.errorMessage = `Dev server failed, using static mode: ${devServerError instanceof Error ? devServerError.message : 'Unknown error'}`;
      }
      
    } catch (error) {
      console.error(`[PreviewManager] Failed to start preview ${instanceId}:`, error);
      instance.status = 'error';
      instance.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[PreviewManager] ❌ Error occurred, releasing port ${port}`);
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
    
    // Remove from instances map
    this.instances.delete(instanceId);
  }

  getPreview(instanceId: string): PreviewInstance | undefined {
    console.log(`🔍 [PreviewManager] Looking for preview instance: ${instanceId}`);
    console.log(`🔍 [PreviewManager] Total instances in memory: ${this.instances.size}`);
    console.log(`🔍 [PreviewManager] Available instance IDs:`, Array.from(this.instances.keys()));
    
    const instance = this.instances.get(instanceId);
    if (instance) {
      console.log(`✅ [PreviewManager] Found instance: ${instanceId}, status: ${instance.status}`);
      
      // Check if process is actually alive when status is 'running'
      if (instance.status === 'running' && instance.process) {
        try {
          // Check if process is still alive (will throw if process is dead)
          process.kill(instance.process.pid!, 0);
          console.log(`✅ [PreviewManager] Process ${instance.process.pid} is alive`);
        } catch (error) {
          console.log(`💀 [PreviewManager] Process ${instance.process.pid} is dead, updating status to stopped`);
          instance.status = 'stopped';
        }
      }
      
      // Update last accessed time
      instance.lastAccessed = new Date();
    } else {
      console.log(`❌ [PreviewManager] Instance not found: ${instanceId}`);
    }
    return instance;
  }

  getPreviewsForProject(projectId: string): PreviewInstance[] {
    return Array.from(this.instances.values()).filter(instance => instance.projectId === projectId);
  }

  private async syncProjectFiles(projectId: string, localPath: string, req?: any): Promise<{
    success: boolean;
    filesDownloaded: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let filesDownloaded = 0;

    try {
      if (!this.supabaseService) {
        console.log(`[PreviewManager] No Supabase service available, creating basic structure`);
        await this.createBasicNextjsStructure(localPath, projectId);
        return {
          success: true,
          filesDownloaded: 1,
          errors
        };
      }

      const project = await this.db.getProjectById(projectId);
      if (!project) {
        console.log(`[PreviewManager] Project not found: ${projectId}, creating basic structure`);
        await this.createBasicNextjsStructure(localPath, projectId);
        return {
          success: true,
          filesDownloaded: 1,
          errors
        };
      }

      console.log(`[PreviewManager] 🚀 UNIFIED STORAGE: Syncing files for project ${projectId} from DATABASE (fast JSONB storage)`);

      // SINGLE SOURCE OF TRUTH: Always sync from DATABASE first (fast)
      try {
        // Clean up any existing directory
        try {
          await fsPromises.rm(localPath, { recursive: true, force: true });
          await fsPromises.mkdir(localPath, { recursive: true });
        } catch (cleanupError) {
          console.warn(`[PreviewManager] Cleanup warning: ${cleanupError}`);
        }

        console.log(`[PreviewManager] ✅ DATABASE SOURCE: Downloading files from database for project ${projectId}`);
        
        // Download all files from DATABASE using UnifiedFileService
        const databaseResult = await this.syncFromDatabase(localPath, projectId);
        filesDownloaded = databaseResult.filesDownloaded;
        errors.push(...databaseResult.errors);
        
        if (filesDownloaded > 0) {
          console.log(`[PreviewManager] ✅ Successfully downloaded ${filesDownloaded} files from database`);
          // Files found in database - we're done, no need to check other sources
          console.log(`[PreviewManager] ✅ Database sync complete, skipping other sources`);
        } else {
          console.log(`[PreviewManager] ⚠️ No files found in database, checking Git repository as fallback`);
          
          // Fallback: Check if project has a Git repository only if no files in storage
          if (project.repoowner && project.reponame && project.repoprovider === 'github') {
            console.log(`[PreviewManager] 🔄 Fallback: Using GitHub API for ${project.repoowner}/${project.reponame}`);
            
            try {
              console.log(`[PreviewManager] Attempting GitHub API download for ${project.repoowner}/${project.reponame}`);
              console.log(`[PreviewManager] GitHub token available: ${!!process.env.GITHUB_ACCESS_TOKEN}`);
              console.log(`[PreviewManager] Environment: NODE_ENV=${process.env.NODE_ENV}`);
              
              // Download repository using GitHub API (no cloning required!)
              const { createGitHubFileTreeService } = await import('../github-filetree-service.js');
              console.log(`[PreviewManager] Creating GitHub service...`);
              const githubFileTreeService = createGitHubFileTreeService();
              console.log(`[PreviewManager] GitHub service created, downloading to: ${localPath}`);
              
              filesDownloaded = await githubFileTreeService.downloadRepositoryToPath(
                project.repoowner,
                project.reponame,
                localPath
              );
              
              console.log(`[PreviewManager] ✅ Downloaded repository via GitHub API with ${filesDownloaded} files`);
              
            } catch (githubApiError) {
              console.error(`[PreviewManager] 🚨 GitHub API download FAILED for ${project.repoowner}/${project.reponame}:`);
              console.error(`[PreviewManager] 🚨 Error details:`, githubApiError);
              errors.push(`GitHub API download failed: ${githubApiError instanceof Error ? githubApiError.message : 'Unknown error'}`);
              
              // Ultimate fallback to basic structure
              console.log(`[PreviewManager] 🔄 Final fallback: Creating basic structure`);
              await this.createBasicNextjsStructure(localPath, projectId);
              filesDownloaded = 1;
            }
          } else {
            console.log(`[PreviewManager] 🔄 No Git repository, creating basic structure`);
            await this.createBasicNextjsStructure(localPath, projectId);
            filesDownloaded = 1;
          }
        }
        
      } catch (storageError) {
        console.error(`[PreviewManager] 🚨 Supabase Storage sync failed:`, storageError);
        errors.push(`Supabase Storage sync failed: ${storageError instanceof Error ? storageError.message : 'Unknown error'}`);
        
        // Final fallback
        await this.createBasicNextjsStructure(localPath, projectId);
        filesDownloaded = 1;
      }

      console.log(`[PreviewManager] Successfully synced ${filesDownloaded} files to ${localPath}`);

      return {
        success: true,
        filesDownloaded,
        errors
      };
      
    } catch (error) {
      const errorMsg = `File sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(`[PreviewManager] ${errorMsg}`);
      errors.push(errorMsg);

      return {
        success: false,
        filesDownloaded,
        errors
      };
    }
  }

  private async createBasicNextjsStructure(localPath: string, projectId: string): Promise<void> {
    try {
      // Create directory structure
      await fsPromises.mkdir(localPath, { recursive: true });
      await fsPromises.mkdir(path.join(localPath, 'pages'), { recursive: true });
      await fsPromises.mkdir(path.join(localPath, 'public'), { recursive: true });
      await fsPromises.mkdir(path.join(localPath, 'styles'), { recursive: true });

      // Create package.json
      const packageJson = {
        name: `preview-${projectId}`,
        version: '1.0.0',
        private: true,
        scripts: {
          dev: 'next dev',
          build: 'next build',
          start: 'next start'
        },
        dependencies: {
          next: '^13.0.0',
          react: '^18.0.0',
          'react-dom': '^18.0.0'
        },
        devDependencies: {
          '@types/node': '^18.0.0',
          '@types/react': '^18.0.0',
          '@types/react-dom': '^18.0.0',
          typescript: '^4.9.0'
        }
      };

      await fsPromises.writeFile(
        path.join(localPath, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      // Create basic index page
      const indexPage = `import React from 'react';

export default function Home() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
      <h1>Preview Project</h1>
      <p>This is a preview of your project.</p>
      <p>Project ID: ${projectId}</p>
    </div>
  );
}`;

      await fsPromises.writeFile(
        path.join(localPath, 'pages', 'index.tsx'),
        indexPage
      );

      // Create next.config.js
      const nextConfig = `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
}

module.exports = nextConfig`;

      await fsPromises.writeFile(
        path.join(localPath, 'next.config.js'),
        nextConfig
      );

      console.log(`[PreviewManager] Created basic Next.js structure at ${localPath}`);
    } catch (error) {
      console.error(`[PreviewManager] Failed to create basic structure:`, error);
      throw error;
    }
  }

  private async syncFromDatabase(localPath: string, projectId: string): Promise<{
    filesDownloaded: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let filesDownloaded = 0;

    try {
      console.log(`[PreviewManager] 🔄 DATABASE: Downloading all files from database JSONB storage for project ${projectId}`);

      // Import UnifiedFileService dynamically
      const { fileService } = await import('./unified-file-service.js');
      
      // Get all project files from database
      const files = await fileService.getProjectFiles(projectId, 'system');
      
      if (!files || files.length === 0) {
        console.log(`[PreviewManager] ⚠️ No files found in database for project ${projectId}`);
        return { filesDownloaded: 0, errors };
      }

      console.log(`[PreviewManager] Found ${files.length} files in database, writing to ${localPath}`);

      // Write each file to the local filesystem
      for (const file of files) {
        try {
          const fullPath = path.join(localPath, file.path);
          const dirPath = path.dirname(fullPath);
          
          // Create directory structure
          await fsPromises.mkdir(dirPath, { recursive: true });
          
          // Write file content
          await fsPromises.writeFile(fullPath, file.content);
          filesDownloaded++;
          
          console.log(`[PreviewManager] ✅ Written file: ${file.path} (${file.size} bytes)`);
        } catch (fileError) {
          const errorMsg = `Failed to write file ${file.path}: ${fileError}`;
          console.error(`[PreviewManager] ${errorMsg}`);
          errors.push(errorMsg);
        }
      }

      console.log(`[PreviewManager] ✅ Successfully wrote ${filesDownloaded} files from database to ${localPath}`);
      
    } catch (error) {
      const errorMsg = `Database sync failed: ${error}`;
      console.error(`[PreviewManager] ${errorMsg}`);
      errors.push(errorMsg);
    }

    return { filesDownloaded, errors };
  }

  private async syncFromSupabaseStorage(localPath: string, projectId: string): Promise<{
    filesDownloaded: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let filesDownloaded = 0;

    try {
      console.log(`[PreviewManager] 🔄 UNIFIED STORAGE: Downloading all files from Supabase Storage for project ${projectId}`);

      // Recursively get all files from Supabase Storage (same logic as file tree API)
      const getAllFiles = async (prefix: string = ''): Promise<any[]> => {
        const path = prefix ? `${projectId}/${prefix}` : projectId;
        const { data: items, error } = await this.supabaseService.storage
          .from('project-files')
          .list(path, { limit: 1000 });
        
        if (error || !items) {
          console.warn(`[PreviewManager] Failed to list path ${path}:`, error?.message);
          return [];
        }

        const allFiles: any[] = [];
        
        for (const item of items) {
          const itemPath = prefix ? `${prefix}/${item.name}` : item.name;
          
          if (item.metadata === null && item.id === null) {
            // This is a folder, recurse into it
            console.log(`[PreviewManager] Found directory: ${itemPath}, recursing...`);
            const subFiles = await getAllFiles(itemPath);
            allFiles.push(...subFiles);
          } else {
            // This is a file
            console.log(`[PreviewManager] Found file: ${itemPath}`);
            allFiles.push({
              ...item,
              name: itemPath  // Full path from project root
            });
          }
        }
        
        return allFiles;
      };

      // Get all files using UnifiedFileService (database-first with storage fallback)
      const { fileService } = await import('./unified-file-service.js');
      const projectFiles = await fileService.getProjectFiles(projectId, 'system', {
        limit: 1000,
        includeBinary: false // Only text files for preview
      });
      
      if (!projectFiles || projectFiles.length === 0) {
        console.log(`[PreviewManager] ⚠️ No files found for project ${projectId}`);
        return { filesDownloaded: 0, errors: ['No files found'] };
      }

      console.log(`[PreviewManager] ✅ Found ${projectFiles.length} files via UnifiedFileService, creating preview...`);

      // Process each file and recreate directory structure
      for (const file of projectFiles) {
        try {
          // Decode URL-encoded path components (brackets for Next.js dynamic routes)
          const decodedPath = file.path.replace(/%5B/g, '[').replace(/%5D/g, ']');
          const fullLocalPath = path.join(localPath, decodedPath);
          const directory = path.dirname(fullLocalPath);

          console.log(`[PreviewManager] Creating file: ${decodedPath}`);

          // Create directory structure
          await fsPromises.mkdir(directory, { recursive: true });

          // Write file content to local filesystem (already available from database)
          await fsPromises.writeFile(fullLocalPath, file.content, 'utf-8');
          filesDownloaded++;

          console.log(`[PreviewManager] ✅ Created: ${decodedPath} (${file.content.length} chars)`);
        } catch (fileError) {
          console.error(`[PreviewManager] Error creating file ${file.path}:`, fileError);
          errors.push(`Error creating ${file.path}: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`);
        }
      }

      console.log(`[PreviewManager] 🎉 UNIFIED STORAGE: Successfully downloaded ${filesDownloaded} files from Supabase Storage`);

    } catch (error) {
      const errorMsg = `Supabase Storage download failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(`[PreviewManager] ${errorMsg}`);
      errors.push(errorMsg);
    }

    return { filesDownloaded, errors };
  }

  private async syncFromLocalTemplate(localPath: string, projectId: string, project: any): Promise<{
    filesDownloaded: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let filesDownloaded = 0;

    try {
      const templateKey = project.templatekey || 'next-prisma-supabase';
      console.log(`[PreviewManager] Using template key: ${templateKey}`);
      
      // Define paths
      const projectsBaseDir = path.resolve('/Users/scw/Private/Programming/bether/projects');
      const projectTemplateDir = path.join(projectsBaseDir, projectId, templateKey);
      
      console.log(`[PreviewManager] Template source: ${projectTemplateDir}`);
      console.log(`[PreviewManager] Preview destination: ${localPath}`);
      
      // Check if scaffolded template directory exists
      try {
        await fsPromises.access(projectTemplateDir);
        console.log(`[PreviewManager] ✅ Scaffolded template found at ${projectTemplateDir}`);
        
        // Clean up any existing directory
        try {
          await fsPromises.rm(localPath, { recursive: true, force: true });
          await fsPromises.mkdir(localPath, { recursive: true });
        } catch (cleanupError) {
          console.warn(`[PreviewManager] Cleanup warning: ${cleanupError}`);
        }
        
        // Copy all files from scaffolded template
        filesDownloaded = await this.copyTemplateFiles(projectTemplateDir, localPath);
        console.log(`[PreviewManager] ✅ Copied ${filesDownloaded} files from scaffolded template`);
        
      } catch (accessError) {
        console.warn(`[PreviewManager] ⚠️  Scaffolded template not found at ${projectTemplateDir}, falling back to basic structure`);
        errors.push(`Scaffolded template not found: ${projectTemplateDir}`);
        
        // Fall back to basic structure if scaffolded template doesn't exist
        await this.createBasicNextjsStructure(localPath, projectId);
        filesDownloaded = 1;
      }
      
    } catch (error) {
      const errorMsg = `Template sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(`[PreviewManager] ${errorMsg}`);
      errors.push(errorMsg);
      
      // Ultimate fallback to basic structure
      await this.createBasicNextjsStructure(localPath, projectId);
      filesDownloaded = 1;
    }

    return { filesDownloaded, errors };
  }

  private async copyTemplateFiles(sourceDir: string, destDir: string, relativePath: string = ''): Promise<number> {
    let copiedFiles = 0;
    
    try {
      const entries = await fsPromises.readdir(sourceDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const sourcePath = path.join(sourceDir, entry.name);
        const destPath = path.join(destDir, entry.name);
        const relativeFilePath = path.join(relativePath, entry.name);
        
        // Skip node_modules, .git, and other unnecessary directories
        if (entry.isDirectory() && ['node_modules', '.git', '.next', 'dist', 'build'].includes(entry.name)) {
          console.log(`⏭️  [PreviewManager] Skipping directory: ${relativeFilePath}`);
          continue;
        }
        
        if (entry.isDirectory()) {
          await fsPromises.mkdir(destPath, { recursive: true });
          const subFiles = await this.copyTemplateFiles(sourcePath, destPath, relativeFilePath);
          copiedFiles += subFiles;
        } else {
          await fsPromises.copyFile(sourcePath, destPath);
          copiedFiles++;
          console.log(`📄 [PreviewManager] Copied: ${relativeFilePath}`);
        }
      }
    } catch (error) {
      console.error(`❌ [PreviewManager] Error copying files from ${sourceDir}:`, error);
      throw error;
    }
    
    return copiedFiles;
  }

  private async startDevServer(instance: PreviewInstance, type: string): Promise<void> {
    if (!instance.localPath) {
      throw new Error('Local path not set for preview instance');
    }

    console.log(`[PreviewManager] Starting dev server process for ${instance.id}`);
    console.log(`[PreviewManager] Local path: ${instance.localPath}`);
    console.log(`[PreviewManager] Port: ${instance.port}`);
    console.log(`[PreviewManager] Platform: ${process.platform}, Environment: ${process.env.NODE_ENV}`);

    // Install dependencies first
    try {
      console.log(`[PreviewManager] Installing dependencies...`);
      await this.installDependencies(instance);
      console.log(`[PreviewManager] ✅ Dependencies installed successfully`);
    } catch (error) {
      console.error(`[PreviewManager] ❌ Failed to install dependencies:`, error);
      throw error;
    }
    
    // Start dev server
    console.log(`[PreviewManager] Starting dev server for ${instance.id} on port ${instance.port} using npm`);
    
    const devProcess = spawn('npm', ['run', 'dev'], {
      cwd: instance.localPath,
      env: {
        ...process.env,
        PORT: instance.port.toString(),
        NODE_ENV: 'development'
      },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    console.log(`[PreviewManager] Spawned npm process with PID: ${devProcess.pid}`);
    instance.process = devProcess;

    // Handle process errors
    devProcess.on('error', (error) => {
      console.error(`[PreviewManager] ❌ Process spawn error for ${instance.id}:`, error);
      instance.status = 'error';
      instance.errorMessage = `Process spawn failed: ${error.message}`;
    });

    // Handle process output
    devProcess.stdout?.on('data', (data) => {
      console.log(`[Preview ${instance.id}] ${data.toString().trim()}`);
    });

    devProcess.stderr?.on('data', (data) => {
      console.error(`[Preview ${instance.id}] ${data.toString().trim()}`);
    });

    devProcess.on('close', (code) => {
      console.log(`[Preview ${instance.id}] Process exited with code ${code}`);
      instance.status = 'stopped';
    });

    // Wait for server to be ready
    await this.waitForServer(instance.port);
  }

  private async installDependencies(instance: PreviewInstance): Promise<void> {
    if (!instance.localPath) {
      throw new Error('Local path not set for preview instance');
    }

    console.log(`[PreviewManager] Installing dependencies for ${instance.id}`);
    console.log(`[PreviewManager] Working directory: ${instance.localPath}`);
    console.log(`[PreviewManager] Environment: NODE_ENV=${process.env.NODE_ENV}`);
    
    return new Promise((resolve, reject) => {
      const installProcess = spawn('npm', ['install'], {
        cwd: instance.localPath,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let installOutput = '';
      let installError = '';

      installProcess.stdout?.on('data', (data) => {
        const output = data.toString();
        installOutput += output;
        console.log(`[PreviewManager] npm install: ${output.trim()}`);
      });

      installProcess.stderr?.on('data', (data) => {
        const output = data.toString();
        installError += output;
        console.error(`[PreviewManager] npm install error: ${output.trim()}`);
      });

      installProcess.on('close', (code) => {
        console.log(`[PreviewManager] npm install completed with code: ${code}`);
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`npm install failed with code ${code}. Error: ${installError}`));
        }
      });

      installProcess.on('error', (error) => {
        console.error(`[PreviewManager] npm install process error:`, error);
        reject(new Error(`npm install process error: ${error.message}`));
      });
    });
  }

  private async waitForServer(port: number, timeout: number = 60000): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const isAvailable = await this.isPortListening(port);
        if (isAvailable) {
          console.log(`[PreviewManager] Server is ready on port ${port}`);
          return;
        }
      } catch (error) {
        // Server not ready yet
      }
      
      // Wait 1 second before checking again
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error(`Server failed to start on port ${port} within ${timeout}ms`);
  }

  private async isPortListening(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(1000);
      
      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });
      
      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });
      
      socket.on('error', () => {
        socket.destroy();
        resolve(false);
      });
      
      socket.connect(port, 'localhost');
    });
  }
}