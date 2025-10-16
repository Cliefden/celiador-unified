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
    const instanceId = `${projectId}-${Date.now()}`;
    const port = await this.portManager.allocatePort();
    
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
      
      // Update status to starting
      instance.status = 'starting';
      
      // Sync files from Supabase Storage
      const syncResult = await this.syncProjectFiles(projectId, localPath, req);
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

      console.log(`[PreviewManager] Syncing files for project ${projectId} from Git repository`);

      // Check if project has a Git repository
      if (project.repoowner && project.reponame && project.repoprovider === 'github') {
        console.log(`[PreviewManager] Using GitHub API for ${project.repoowner}/${project.reponame}`);
        
        try {
          // Clean up any existing directory
          try {
            await fsPromises.rm(localPath, { recursive: true, force: true });
            await fsPromises.mkdir(localPath, { recursive: true });
          } catch (cleanupError) {
            console.warn(`[PreviewManager] Cleanup warning: ${cleanupError}`);
          }

          // Download repository using GitHub API (no cloning required!)
          const { createGitHubFileTreeService } = await import('../github-filetree-service');
          const githubFileTreeService = createGitHubFileTreeService();
          filesDownloaded = await githubFileTreeService.downloadRepositoryToPath(
            project.repoowner,
            project.reponame,
            localPath
          );
          
          console.log(`[PreviewManager] ✅ Downloaded repository via GitHub API with ${filesDownloaded} files`);
          
        } catch (githubApiError) {
          console.error(`[PreviewManager] GitHub API download failed: ${githubApiError}`);
          errors.push(`GitHub API download failed: ${githubApiError instanceof Error ? githubApiError.message : 'Unknown error'}`);
          
          // Fall back to basic structure
          await this.createBasicNextjsStructure(localPath, projectId);
          filesDownloaded = 1;
        }
        
      } else {
        console.log(`[PreviewManager] No Git repository configured for project ${projectId}, creating basic structure`);
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

  private async startDevServer(instance: PreviewInstance, type: string): Promise<void> {
    if (!instance.localPath) {
      throw new Error('Local path not set for preview instance');
    }

    // Install dependencies first
    await this.installDependencies(instance);
    
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

    instance.process = devProcess;

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

  private async waitForServer(port: number, timeout: number = 30000): Promise<void> {
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