import { DatabaseService } from './database.js';
import { WebSocketService } from './websocket.js';
import fs from 'fs/promises';
import path from 'path';

export interface JobData {
  id: string;
  projectId: string;
  userId?: string; // Optional - will be derived from project if not provided
  type: string;
  prompt?: string;
  templateKey?: string;
  repo?: {
    provider?: string;
    owner?: string;
    name?: string;
  };
  filePath?: string;
  content?: string;
  actions?: any[];
  metadata?: any;
}

export class JobService {
  private jobQueue: JobData[] = [];
  private isProcessingJobs = false;
  private db: DatabaseService;
  private supabaseService: any;
  private wsService?: WebSocketService;

  constructor(db: DatabaseService, supabaseService: any, wsService?: WebSocketService) {
    this.db = db;
    this.supabaseService = supabaseService;
    this.wsService = wsService;
    
    // Start job processor (check every 5 seconds)
    setInterval(() => this.processJobQueue(), 5000);
  }

  // Add job to queue
  async addJob(jobData: JobData): Promise<void> {
    // Derive userId from project if not provided
    const jobWithUser = await this.ensureJobHasUserId(jobData);
    
    this.jobQueue.push(jobWithUser);
    console.log(`Job ${jobWithUser.id} queued for processing (userId: ${jobWithUser.userId})`);
    
    // Notify that job was queued
    this.notifyJobStatusChange(jobWithUser.userId!, jobWithUser.id, jobWithUser.projectId, 'QUEUED');
  }

  // Helper method to ensure job has userId derived from project
  private async ensureJobHasUserId(jobData: JobData): Promise<JobData & { userId: string }> {
    if (jobData.userId) {
      return jobData as JobData & { userId: string };
    }
    
    // Derive userId from project
    const project = await this.db.getProjectById(jobData.projectId);
    if (!project) {
      throw new Error(`Project ${jobData.projectId} not found`);
    }
    
    console.log(`[JobService] Derived userId ${project.userid} from project ${jobData.projectId}`);
    
    return {
      ...jobData,
      userId: project.userid
    };
  }

  // Helper method to notify job status changes via WebSocket
  private notifyJobStatusChange(userId: string, jobId: string, projectId: string, status: string, metadata?: any) {
    if (this.wsService) {
      this.wsService.notifyJobStatusChange(userId, jobId, projectId, status, metadata);
    }
  }

  // Remove job from queue
  removeJobFromQueue(jobId: string): boolean {
    const queueIndex = this.jobQueue.findIndex(job => job.id === jobId);
    if (queueIndex >= 0) {
      this.jobQueue.splice(queueIndex, 1);
      console.log(`Job ${jobId} removed from queue`);
      return true;
    }
    return false;
  }

  // Get queue status
  getQueueStatus(): { length: number; processing: boolean } {
    return {
      length: this.jobQueue.length,
      processing: this.isProcessingJobs
    };
  }

  // Job queue processor (runs in background)
  private async processJobQueue(): Promise<void> {
    if (this.isProcessingJobs || this.jobQueue.length === 0) return;
    
    this.isProcessingJobs = true;
    
    while (this.jobQueue.length > 0) {
      const job = this.jobQueue.shift();
      if (job) {
        await this.processJob(job);
      }
    }
    
    this.isProcessingJobs = false;
  }

  // Job processor function
  private async processJob(job: JobData): Promise<void> {
    console.log(`Processing job ${job.id}:`, job.type);
    
    try {
      // Ensure job has userId for processing
      const jobWithUser = await this.ensureJobHasUserId(job);
      
      // Update job status to running
      await this.db.updateJobStatus(job.id, 'RUNNING');
      this.notifyJobStatusChange(jobWithUser.userId, job.id, job.projectId, 'RUNNING');
      
      // Process different job types
      switch (job.type) {
        case 'SCAFFOLD':
          await this.processScaffoldJob(jobWithUser);
          break;
        case 'CODEGEN':
          await this.processCodegenJob(jobWithUser);
          break;
        case 'EDIT':
          await this.processEditJob(jobWithUser);
          break;
        case 'GITHUB_REPO':
          await this.processGitHubRepoJob(jobWithUser);
          break;
        default:
          console.log(`Unknown job type: ${job.type}`);
          await this.db.updateJobStatus(job.id, 'COMPLETED');
          this.notifyJobStatusChange(jobWithUser.userId, job.id, job.projectId, 'COMPLETED');
      }
      
    } catch (error) {
      console.error(`Job ${job.id} failed:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.db.updateJobStatus(job.id, 'FAILED', null, errorMessage);
      
      // Try to get userId for error notification
      try {
        const jobWithUser = await this.ensureJobHasUserId(job);
        this.notifyJobStatusChange(jobWithUser.userId, job.id, job.projectId, 'FAILED', { error: errorMessage });
      } catch (userError) {
        console.error(`Failed to notify job failure - could not derive userId:`, userError);
      }
    }
  }

  private async processScaffoldJob(job: JobData & { userId: string }): Promise<void> {
    console.log(`🚀 [SCAFFOLD] Processing SCAFFOLD job ${job.id} for project ${job.projectId}, user ${job.userId}`);
    
    try {
      const templateKey = job.templateKey || 'ai-chat-app';
      
      // Get template info from database
      const template = await this.db.getTemplateByKey(templateKey);
      if (!template) {
        throw new Error(`Template ${templateKey} not found in database`);
      }
      
      if (!template.is_active) {
        throw new Error(`Template ${templateKey} is not active`);
      }
      
      console.log(`📁 [SCAFFOLD] Using template: ${template.name} (${template.storage_path})`);
      
      // Define paths with environment-aware configuration
      const templatesBaseDir = process.env.TEMPLATES_PATH || 
        (process.env.NODE_ENV === 'production' 
          ? path.resolve('./templates') 
          : path.resolve('/Users/scw/Private/Programming/bether/templates'));
      
      const templateDir = path.join(templatesBaseDir, template.storage_path);
      
      const projectsBaseDir = process.env.PROJECTS_PATH || 
        (process.env.NODE_ENV === 'production' 
          ? path.resolve('./projects') 
          : path.resolve('/Users/scw/Private/Programming/bether/projects'));
      
      const projectDir = path.join(projectsBaseDir, job.projectId, templateKey);
      
      console.log(`📂 [SCAFFOLD] Template source: ${templateDir}`);
      console.log(`📂 [SCAFFOLD] Project destination: ${projectDir}`);
      console.log(`📂 [SCAFFOLD] Environment: ${process.env.NODE_ENV || 'development'}`);
      
      // Check if template directory exists, if not try to create from storage
      let templateExists = false;
      try {
        await fs.access(templateDir);
        templateExists = true;
        console.log(`✅ [SCAFFOLD] Template directory found: ${templateDir}`);
      } catch (error) {
        console.warn(`⚠️ [SCAFFOLD] Template directory not found: ${templateDir}`);
        console.log(`🔄 [SCAFFOLD] Attempting to download template from Supabase Storage...`);
        
        // Try to download template from Supabase Storage as fallback
        try {
          const downloadSuccess = await this.downloadTemplateFromStorage(templateKey, templateDir);
          if (downloadSuccess) {
            templateExists = true;
            console.log(`✅ [SCAFFOLD] Template downloaded from storage: ${templateDir}`);
          }
        } catch (downloadError) {
          console.error(`❌ [SCAFFOLD] Failed to download template from storage:`, downloadError);
        }
      }
      
      if (!templateExists) {
        throw new Error(`Template not available: ${templateKey}. Neither local directory nor storage backup found.`);
      }
      
      // Create project directory
      await fs.mkdir(projectDir, { recursive: true });
      
      // Copy template files to project directory and upload to storage
      const uploadResults = await this.copyAndUploadTemplateFiles(templateDir, projectDir, job.projectId);
      
      console.log(`✅ [SCAFFOLD] Successfully copied and uploaded ${uploadResults.uploadedFiles} files for project ${job.projectId}`);
      
      // CRITICAL: Migrate files from storage to database for file tree functionality
      console.log(`🔄 [SCAFFOLD] Starting file migration from storage to database...`);
      const { fileService } = await import('./unified-file-service.js');
      const migrationResult = await fileService.migrateStorageFilesToDatabase(job.projectId, job.userId);
      
      if (!migrationResult.success) {
        console.warn(`⚠️ [SCAFFOLD] File migration partially failed: ${migrationResult.errors.join(', ')}`);
      } else {
        console.log(`🎉 [SCAFFOLD] Successfully migrated ${migrationResult.migratedFiles} files to database`);
      }
      
      const metadata = { 
        scaffolded: true,
        templateKey: templateKey,
        templateName: template.name,
        templatePath: template.storage_path,
        projectPath: projectDir,
        files: uploadResults.copiedFiles,
        fileCount: uploadResults.copiedFiles.length,
        uploadedFiles: uploadResults.uploadedFiles,
        uploadErrors: uploadResults.errors,
        migration: {
          migratedFiles: migrationResult.migratedFiles,
          migrationErrors: migrationResult.errors,
          migrationSuccess: migrationResult.success
        }
      };
      
      await this.db.updateJobStatus(job.id, 'COMPLETED', metadata);
      this.notifyJobStatusChange(job.userId, job.id, job.projectId, 'COMPLETED', metadata);
      
    } catch (error) {
      console.error(`❌ [SCAFFOLD] Error in scaffold job ${job.id}:`, error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown scaffolding error';
      await this.db.updateJobStatus(job.id, 'FAILED', null, errorMessage);
      this.notifyJobStatusChange(job.userId, job.id, job.projectId, 'FAILED', errorMessage);
    }
  }

  // Enhanced method to copy template files and upload to storage
  private async copyAndUploadTemplateFiles(sourceDir: string, destDir: string, projectId: string, relativePath: string = ''): Promise<{
    copiedFiles: string[];
    uploadedFiles: number;
    errors: string[];
  }> {
    const copiedFiles: string[] = [];
    const errors: string[] = [];
    let uploadedFiles = 0;
    
    try {
      const entries = await fs.readdir(sourceDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const sourcePath = path.join(sourceDir, entry.name);
        const destPath = path.join(destDir, entry.name);
        const relativeFilePath = path.join(relativePath, entry.name);
        
        // Skip node_modules, .git, and other unnecessary directories
        if (entry.isDirectory() && ['node_modules', '.git', '.next', 'dist', 'build'].includes(entry.name)) {
          console.log(`⏭️  [SCAFFOLD] Skipping directory: ${relativeFilePath}`);
          continue;
        }
        
        if (entry.isDirectory()) {
          await fs.mkdir(destPath, { recursive: true });
          const subResults = await this.copyAndUploadTemplateFiles(sourcePath, destPath, projectId, relativeFilePath);
          copiedFiles.push(...subResults.copiedFiles);
          uploadedFiles += subResults.uploadedFiles;
          errors.push(...subResults.errors);
        } else {
          // Copy file locally
          await fs.copyFile(sourcePath, destPath);
          copiedFiles.push(relativeFilePath);
          console.log(`📄 [SCAFFOLD] Copied: ${relativeFilePath}`);
          
          // Upload file to Supabase Storage
          try {
            const fileContent = await fs.readFile(sourcePath);
            const storagePath = `${projectId}/${relativeFilePath}`;
            
            const { error: uploadError } = await this.supabaseService.storage
              .from('project-files')
              .upload(storagePath, fileContent, {
                contentType: this.getFileContentType(relativeFilePath),
                upsert: false
              });

            if (uploadError) {
              const errorMsg = `Failed to upload ${relativeFilePath}: ${uploadError.message}`;
              console.error(`❌ [SCAFFOLD] ${errorMsg}`);
              errors.push(errorMsg);
            } else {
              uploadedFiles++;
              console.log(`☁️ [SCAFFOLD] Uploaded: ${relativeFilePath}`);
            }
          } catch (uploadError) {
            const errorMsg = `Upload error for ${relativeFilePath}: ${uploadError}`;
            console.error(`❌ [SCAFFOLD] ${errorMsg}`);
            errors.push(errorMsg);
          }
        }
      }
    } catch (error) {
      console.error(`❌ [SCAFFOLD] Error copying and uploading files from ${sourceDir}:`, error);
      throw error;
    }
    
    return { copiedFiles, uploadedFiles, errors };
  }

  // Helper method to recursively copy template files (legacy - now used for local-only operations)
  private async copyTemplateFiles(sourceDir: string, destDir: string, relativePath: string = ''): Promise<string[]> {
    const copiedFiles: string[] = [];
    
    try {
      const entries = await fs.readdir(sourceDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const sourcePath = path.join(sourceDir, entry.name);
        const destPath = path.join(destDir, entry.name);
        const relativeFilePath = path.join(relativePath, entry.name);
        
        // Skip node_modules, .git, and other unnecessary directories
        if (entry.isDirectory() && ['node_modules', '.git', '.next', 'dist', 'build'].includes(entry.name)) {
          console.log(`⏭️  [SCAFFOLD] Skipping directory: ${relativeFilePath}`);
          continue;
        }
        
        if (entry.isDirectory()) {
          await fs.mkdir(destPath, { recursive: true });
          const subFiles = await this.copyTemplateFiles(sourcePath, destPath, relativeFilePath);
          copiedFiles.push(...subFiles);
        } else {
          await fs.copyFile(sourcePath, destPath);
          copiedFiles.push(relativeFilePath);
          console.log(`📄 [SCAFFOLD] Copied: ${relativeFilePath}`);
        }
      }
    } catch (error) {
      console.error(`❌ [SCAFFOLD] Error copying files from ${sourceDir}:`, error);
      throw error;
    }
    
    return copiedFiles;
  }

  private async processCodegenJob(job: JobData & { userId: string }): Promise<void> {
    console.log(`Processing CODEGEN job ${job.id} for project ${job.projectId}, user ${job.userId}`);
    
    // Mock code generation logic
    await new Promise(resolve => setTimeout(resolve, 3000)); // Simulate AI work
    
    if (job.filePath) {
      // Single file generation
      const storagePath = `${job.projectId}/${job.filePath}`;
      
      // Save to Supabase Storage
      const { data, error } = await this.supabaseService.storage
        .from('project-files')
        .upload(storagePath, job.content || '', {
          contentType: this.getFileContentType(job.filePath),
          upsert: false // Don't overwrite existing files
        });

      if (error) {
        throw new Error(`Failed to save generated file: ${error.message}`);
      }

      const metadata = {
        generatedFile: job.filePath,
        storageKey: data.path
      };
      await this.db.updateJobStatus(job.id, 'COMPLETED', metadata);
      this.notifyJobStatusChange(job.userId, job.id, job.projectId, 'COMPLETED', metadata);
    } else {
      // General code generation
      const metadata = {
        generated: true,
        prompt: job.prompt
      };
      await this.db.updateJobStatus(job.id, 'COMPLETED', metadata);
      this.notifyJobStatusChange(job.userId, job.id, job.projectId, 'COMPLETED', metadata);
    }
  }

  private async processEditJob(job: JobData & { userId: string }): Promise<void> {
    console.log(`Processing EDIT job ${job.id} for project ${job.projectId}, user ${job.userId}`);
    
    if (job.actions && job.actions.length > 0) {
      // Batch file operations
      const results = [];
      
      for (const action of job.actions) {
        const storagePath = `${job.projectId}/${action.filePath}`;
        
        // Update file in Supabase Storage
        const { data, error } = await this.supabaseService.storage
          .from('project-files')
          .upload(storagePath, action.content || '', {
            contentType: this.getFileContentType(action.filePath),
            upsert: true // Overwrite existing file
          });

        if (error) {
          console.error(`Failed to update file ${action.filePath}:`, error);
          results.push({ filePath: action.filePath, success: false, error: error.message });
        } else {
          results.push({ filePath: action.filePath, success: true, storageKey: data.path });
        }
      }
      
      const metadata = {
        batchEdit: true,
        results
      };
      await this.db.updateJobStatus(job.id, 'COMPLETED', metadata);
      this.notifyJobStatusChange(job.userId, job.id, job.projectId, 'COMPLETED', metadata);
    } else if (job.filePath) {
      // Single file edit
      const storagePath = `${job.projectId}/${job.filePath}`;
      
      // Update file in Supabase Storage
      const { data, error } = await this.supabaseService.storage
        .from('project-files')
        .upload(storagePath, job.content || '', {
          contentType: this.getFileContentType(job.filePath),
          upsert: true // Overwrite existing file
        });

      if (error) {
        throw new Error(`Failed to update file: ${error.message}`);
      }

      const metadata = {
        editedFile: job.filePath,
        storageKey: data.path
      };
      await this.db.updateJobStatus(job.id, 'COMPLETED', metadata);
      this.notifyJobStatusChange(job.userId, job.id, job.projectId, 'COMPLETED', metadata);
    }
  }

  private async processGitHubRepoJob(job: JobData & { userId: string }): Promise<void> {
    console.log(`Processing GITHUB_REPO job ${job.id} for project ${job.projectId}, user ${job.userId}`);
    
    // Mock GitHub repository creation
    await new Promise(resolve => setTimeout(resolve, 5000)); // Simulate GitHub API calls
    
    const repoName = `${job.repo?.name || 'generated-project'}`;
    const repoOwner = job.repo?.owner || 'celiador-repos';
    
    const metadata = {
      repositoryCreated: true,
      repoUrl: `https://github.com/${repoOwner}/${repoName}`,
      repoOwner,
      repoName
    };
    await this.db.updateJobStatus(job.id, 'COMPLETED', metadata);
    this.notifyJobStatusChange(job.userId, job.id, job.projectId, 'COMPLETED', metadata);
  }

  private getFileContentType(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase();
    const types: any = {
      'js': 'application/javascript',
      'jsx': 'application/javascript',
      'ts': 'application/typescript',
      'tsx': 'application/typescript',
      'json': 'application/json',
      'md': 'text/markdown',
      'txt': 'text/plain',
      'css': 'text/css',
      'html': 'text/html'
    };
    return types[ext || ''] || 'text/plain';
  }

  /**
   * Download template files from Supabase Storage and create local directory structure
   * This is used as a fallback when template directories don't exist locally (production)
   */
  private async downloadTemplateFromStorage(templateKey: string, templateDir: string): Promise<boolean> {
    console.log(`📥 [TEMPLATE DOWNLOAD] Starting download of template '${templateKey}' to '${templateDir}'`);
    
    try {
      // List all files for this template in Supabase Storage
      const { data: files, error: listError } = await this.supabaseService.storage
        .from('templates')
        .list(templateKey, { limit: 1000, sortBy: { column: 'name', order: 'asc' } });

      if (listError) {
        console.error(`❌ [TEMPLATE DOWNLOAD] Failed to list template files:`, listError);
        return false;
      }

      if (!files || files.length === 0) {
        console.warn(`⚠️ [TEMPLATE DOWNLOAD] No files found for template '${templateKey}'`);
        return false;
      }

      console.log(`📁 [TEMPLATE DOWNLOAD] Found ${files.length} files for template '${templateKey}'`);

      // Create template directory
      await fs.mkdir(templateDir, { recursive: true });

      // Download each file and recreate directory structure
      let downloadedCount = 0;
      for (const file of files) {
        try {
          // Skip directories (they have size 0 and no extension)
          if (file.name.endsWith('/') || !file.name.includes('.')) {
            continue;
          }

          const filePath = path.join(templateDir, file.name);
          const fileDir = path.dirname(filePath);

          // Create directory structure
          await fs.mkdir(fileDir, { recursive: true });

          // Download file content
          const { data: fileData, error: downloadError } = await this.supabaseService.storage
            .from('templates')
            .download(`${templateKey}/${file.name}`);

          if (downloadError) {
            console.error(`❌ [TEMPLATE DOWNLOAD] Failed to download ${file.name}:`, downloadError);
            continue;
          }

          // Convert blob to text
          const fileContent = await fileData.text();

          // Write file to local filesystem
          await fs.writeFile(filePath, fileContent, 'utf-8');
          downloadedCount++;
          console.log(`✅ [TEMPLATE DOWNLOAD] Downloaded: ${file.name}`);

        } catch (fileError) {
          console.error(`❌ [TEMPLATE DOWNLOAD] Error processing file ${file.name}:`, fileError);
        }
      }

      console.log(`🎉 [TEMPLATE DOWNLOAD] Successfully downloaded ${downloadedCount} files for template '${templateKey}'`);
      return downloadedCount > 0;

    } catch (error) {
      console.error(`❌ [TEMPLATE DOWNLOAD] Failed to download template '${templateKey}':`, error);
      return false;
    }
  }
}