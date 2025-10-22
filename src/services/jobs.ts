import { DatabaseService } from './database.js';

export interface JobData {
  id: string;
  projectId: string;
  userId: string;
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
}

export class JobService {
  private jobQueue: JobData[] = [];
  private isProcessingJobs = false;
  private db: DatabaseService;
  private supabaseService: any;

  constructor(db: DatabaseService, supabaseService: any) {
    this.db = db;
    this.supabaseService = supabaseService;
    
    // Start job processor (check every 5 seconds)
    setInterval(() => this.processJobQueue(), 5000);
  }

  // Add job to queue
  addJob(jobData: JobData): void {
    this.jobQueue.push(jobData);
    console.log(`Job ${jobData.id} queued for processing`);
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
      // Update job status to running
      await this.db.updateJobStatus(job.id, 'RUNNING');
      
      // Process different job types
      switch (job.type) {
        case 'SCAFFOLD':
          await this.processScaffoldJob(job);
          break;
        case 'CODEGEN':
          await this.processCodegenJob(job);
          break;
        case 'EDIT':
          await this.processEditJob(job);
          break;
        case 'GITHUB_REPO':
          await this.processGitHubRepoJob(job);
          break;
        default:
          console.log(`Unknown job type: ${job.type}`);
          await this.db.updateJobStatus(job.id, 'COMPLETED');
      }
      
    } catch (error) {
      console.error(`Job ${job.id} failed:`, error);
      await this.db.updateJobStatus(job.id, 'FAILED', null, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async processScaffoldJob(job: JobData): Promise<void> {
    console.log(`Processing SCAFFOLD job ${job.id} for project ${job.projectId}`);
    
    // Mock scaffolding logic
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate work
    
    await this.db.updateJobStatus(job.id, 'COMPLETED', { 
      scaffolded: true,
      templateKey: job.templateKey || 'next-prisma-supabase',
      files: ['package.json', 'README.md', 'src/pages/index.tsx']
    });
  }

  private async processCodegenJob(job: JobData): Promise<void> {
    console.log(`Processing CODEGEN job ${job.id} for project ${job.projectId}`);
    
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

      await this.db.updateJobStatus(job.id, 'COMPLETED', {
        generatedFile: job.filePath,
        storageKey: data.path
      });
    } else {
      // General code generation
      await this.db.updateJobStatus(job.id, 'COMPLETED', {
        generated: true,
        prompt: job.prompt
      });
    }
  }

  private async processEditJob(job: JobData): Promise<void> {
    console.log(`Processing EDIT job ${job.id} for project ${job.projectId}`);
    
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
      
      await this.db.updateJobStatus(job.id, 'COMPLETED', {
        batchEdit: true,
        results
      });
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

      await this.db.updateJobStatus(job.id, 'COMPLETED', {
        editedFile: job.filePath,
        storageKey: data.path
      });
    }
  }

  private async processGitHubRepoJob(job: JobData): Promise<void> {
    console.log(`Processing GITHUB_REPO job ${job.id} for project ${job.projectId}`);
    
    // Mock GitHub repository creation
    await new Promise(resolve => setTimeout(resolve, 5000)); // Simulate GitHub API calls
    
    const repoName = `${job.repo?.name || 'generated-project'}`;
    const repoOwner = job.repo?.owner || 'celiador-repos';
    
    await this.db.updateJobStatus(job.id, 'COMPLETED', {
      repositoryCreated: true,
      repoUrl: `https://github.com/${repoOwner}/${repoName}`,
      repoOwner,
      repoName
    });
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
}