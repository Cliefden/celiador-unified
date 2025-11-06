// Deployment orchestrator - coordinates GitHub repo creation, file upload, and Vercel deployment
import { createGitHubService, GitHubService } from './github-service.js';
import { createVercelService, VercelService } from './vercel-service.js';

interface ProjectFiles {
  [path: string]: string;
}

interface DeploymentConfig {
  projectId: string;
  projectName: string;
  templateKey: string;
  files: ProjectFiles;
  userId: string;
  isPrivate?: boolean;
  orgName?: string;
  githubToken?: string;
  vercelToken?: string;
}

interface DeploymentResult {
  success: boolean;
  repoUrl?: string;
  repoFullName?: string;
  vercelProjectId?: string;
  deploymentUrl?: string;
  error?: string;
  steps: DeploymentStep[];
}

interface DeploymentStep {
  step: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  message: string;
  timestamp: Date;
  error?: string;
}

enum DeploymentStepType {
  VALIDATE = 'validate',
  CREATE_REPO = 'create_repo',
  PUSH_FILES = 'push_files',
  CREATE_VERCEL_PROJECT = 'create_vercel_project',
  CONNECT_VERCEL_GITHUB = 'connect_vercel_github',
  TRIGGER_DEPLOYMENT = 'trigger_deployment',
  MONITOR_DEPLOYMENT = 'monitor_deployment'
}

class DeploymentOrchestrator {
  private githubService: GitHubService | null = null;
  private vercelService: VercelService | null = null;
  private steps: DeploymentStep[] = [];

  constructor(private supabaseService: any) {}

  /**
   * Main deployment orchestration method
   */
  async deployProject(config: DeploymentConfig): Promise<DeploymentResult> {
    console.log(`🚀 Starting deployment for project: ${config.projectName}`);
    
    this.steps = [];
    
    try {
      // Initialize services
      await this.initializeServices(config);
      
      // Step 1: Validate configuration
      await this.executeStep(DeploymentStepType.VALIDATE, () => this.validateConfig(config));
      
      // Step 2: Create GitHub repository
      const repoResult = await this.executeStep(DeploymentStepType.CREATE_REPO, () => 
        this.createGitHubRepository(config));
      
      // Step 3: Push project files
      await this.executeStep(DeploymentStepType.PUSH_FILES, () => 
        this.pushProjectFiles(config, repoResult));
      
      // Step 4: Create Vercel project
      const vercelProject = await this.executeStep(DeploymentStepType.CREATE_VERCEL_PROJECT, () =>
        this.createVercelProject(config, repoResult));
      
      // Step 5: Connect GitHub to Vercel
      await this.executeStep(DeploymentStepType.CONNECT_VERCEL_GITHUB, () =>
        this.connectVercelToGitHub(vercelProject, repoResult));
      
      // Step 6: Trigger deployment
      const deployment = await this.executeStep(DeploymentStepType.TRIGGER_DEPLOYMENT, () =>
        this.triggerVercelDeployment(vercelProject, repoResult));
      
      // Step 7: Monitor deployment (initial status check)
      await this.executeStep(DeploymentStepType.MONITOR_DEPLOYMENT, () =>
        this.monitorDeployment(deployment));

      // Update database with deployment info
      await this.updateProjectDatabase(config.projectId, {
        repoUrl: repoResult.repoUrl,
        repoFullName: repoResult.fullName,
        vercelProjectId: vercelProject.projectId,
        deploymentUrl: deployment.deploymentUrl,
        repoCreated: true,
        vercelConnected: true
      });

      console.log(`✅ Deployment completed successfully for ${config.projectName}`);
      
      return {
        success: true,
        repoUrl: repoResult.repoUrl,
        repoFullName: repoResult.fullName,
        vercelProjectId: vercelProject.projectId,
        deploymentUrl: deployment.deploymentUrl,
        steps: this.steps
      };

    } catch (error: any) {
      console.error(`❌ Deployment failed for ${config.projectName}:`, error.message);
      
      return {
        success: false,
        error: error.message,
        steps: this.steps
      };
    }
  }

  /**
   * Execute a deployment step with proper error handling and logging
   */
  private async executeStep<T>(stepType: DeploymentStepType, operation: () => Promise<T>): Promise<T> {
    const step: DeploymentStep = {
      step: stepType,
      status: 'in_progress',
      message: this.getStepMessage(stepType, 'in_progress'),
      timestamp: new Date()
    };
    
    this.steps.push(step);
    console.log(`🔄 ${step.message}`);

    try {
      const result = await operation();
      
      step.status = 'completed';
      step.message = this.getStepMessage(stepType, 'completed');
      console.log(`✅ ${step.message}`);
      
      return result;
    } catch (error: any) {
      step.status = 'failed';
      step.error = error.message;
      step.message = this.getStepMessage(stepType, 'failed');
      console.error(`❌ ${step.message}: ${error.message}`);
      
      throw error;
    }
  }

  /**
   * Get human-readable step message
   */
  private getStepMessage(stepType: DeploymentStepType, status: string): string {
    const messages = {
      [DeploymentStepType.VALIDATE]: {
        in_progress: 'Validating deployment configuration',
        completed: 'Configuration validated successfully',
        failed: 'Configuration validation failed'
      },
      [DeploymentStepType.CREATE_REPO]: {
        in_progress: 'Creating GitHub repository',
        completed: 'GitHub repository created',
        failed: 'Failed to create GitHub repository'
      },
      [DeploymentStepType.PUSH_FILES]: {
        in_progress: 'Pushing project files to GitHub',
        completed: 'Project files pushed successfully',
        failed: 'Failed to push project files'
      },
      [DeploymentStepType.CREATE_VERCEL_PROJECT]: {
        in_progress: 'Creating Vercel project',
        completed: 'Vercel project created',
        failed: 'Failed to create Vercel project'
      },
      [DeploymentStepType.CONNECT_VERCEL_GITHUB]: {
        in_progress: 'Connecting Vercel to GitHub repository',
        completed: 'Vercel connected to GitHub',
        failed: 'Failed to connect Vercel to GitHub'
      },
      [DeploymentStepType.TRIGGER_DEPLOYMENT]: {
        in_progress: 'Triggering Vercel deployment',
        completed: 'Deployment triggered successfully',
        failed: 'Failed to trigger deployment'
      },
      [DeploymentStepType.MONITOR_DEPLOYMENT]: {
        in_progress: 'Monitoring deployment status',
        completed: 'Deployment monitoring initialized',
        failed: 'Failed to monitor deployment'
      }
    };

    const stepMessages = messages[stepType] as { [key: string]: string };
    return stepMessages?.[status] || `${stepType} ${status}`;
  }

  /**
   * Initialize GitHub and Vercel services
   */
  private async initializeServices(config: DeploymentConfig): Promise<void> {
    if (config.githubToken) {
      this.githubService = createGitHubService(config.githubToken);
    } else if (process.env.GITHUB_ACCESS_TOKEN) {
      this.githubService = createGitHubService();
    } else {
      throw new Error('GitHub access token is required');
    }

    if (config.vercelToken) {
      this.vercelService = createVercelService(config.vercelToken);
    } else if (process.env.VERCEL_API_TOKEN) {
      this.vercelService = createVercelService();
    } else {
      throw new Error('Vercel API token is required');
    }
  }

  /**
   * Validate deployment configuration
   */
  private async validateConfig(config: DeploymentConfig): Promise<void> {
    if (!config.projectName || config.projectName.length < 3) {
      throw new Error('Project name must be at least 3 characters long');
    }
    
    if (!config.files || Object.keys(config.files).length === 0) {
      throw new Error('Project files are required');
    }
    
    if (!config.templateKey) {
      throw new Error('Template key is required');
    }

    // Validate GitHub access
    if (this.githubService && config.orgName) {
      const orgExists = await this.githubService.organizationExists(config.orgName);
      if (!orgExists) {
        throw new Error(`Organization ${config.orgName} does not exist or user lacks access`);
      }
    }
  }

  /**
   * Create GitHub repository
   */
  private async createGitHubRepository(config: DeploymentConfig): Promise<any> {
    if (!this.githubService) throw new Error('GitHub service not initialized');

    const repoData = {
      name: config.projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      description: `Generated project: ${config.projectName}`,
      private: config.isPrivate || false,
      auto_init: true
    };

    if (config.orgName) {
      return await this.githubService.createRepositoryInOrg(config.orgName, repoData);
    } else {
      return await this.githubService.createRepository(repoData);
    }
  }

  /**
   * Push project files to GitHub
   */
  private async pushProjectFiles(config: DeploymentConfig, repoResult: any): Promise<any> {
    if (!this.githubService) throw new Error('GitHub service not initialized');

    const files = Object.entries(config.files).map(([path, content]) => ({
      path,
      content
    }));

    return await this.githubService.createBatchCommit(
      repoResult.owner,
      repoResult.name,
      files,
      'Initial project setup via Celiador deployment'
    );
  }

  /**
   * Create Vercel project
   */
  private async createVercelProject(config: DeploymentConfig, repoResult: any): Promise<any> {
    if (!this.vercelService) throw new Error('Vercel service not initialized');

    const projectData = {
      name: config.projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      framework: this.vercelService.getFrameworkForTemplate(config.templateKey),
      gitRepository: {
        type: 'github' as const,
        repo: repoResult.fullName
      }
    };

    return await this.vercelService.createProject(projectData);
  }

  /**
   * Connect Vercel project to GitHub
   */
  private async connectVercelToGitHub(vercelProject: any, repoResult: any): Promise<any> {
    if (!this.vercelService) throw new Error('Vercel service not initialized');

    return await this.vercelService.connectGitHubRepo(
      vercelProject.projectId,
      repoResult.fullName
    );
  }

  /**
   * Trigger Vercel deployment
   */
  private async triggerVercelDeployment(vercelProject: any, repoResult: any): Promise<any> {
    if (!this.vercelService) throw new Error('Vercel service not initialized');

    const deploymentData = {
      projectId: vercelProject.projectId,
      gitSource: {
        type: 'github' as const,
        repo: repoResult.fullName,
        ref: 'main'
      }
    };

    return await this.vercelService.createDeployment(deploymentData);
  }

  /**
   * Monitor deployment status
   */
  private async monitorDeployment(deployment: any): Promise<any> {
    if (!this.vercelService) throw new Error('Vercel service not initialized');

    // Initial status check
    const status = await this.vercelService.getDeployment(deployment.deploymentId);
    console.log(`Deployment status: ${status.readyState || 'QUEUED'}`);
    
    return status;
  }

  /**
   * Update project in database with deployment information
   */
  private async updateProjectDatabase(projectId: string, deploymentInfo: any): Promise<void> {
    try {
      const { error } = await this.supabaseService
        .from('projects')
        .update({
          repo_url: deploymentInfo.repoUrl,
          repo_created: deploymentInfo.repoCreated,
          vercel_project_id: deploymentInfo.vercelProjectId,
          vercel_connected: deploymentInfo.vercelConnected,
          vercel_deployment_url: deploymentInfo.deploymentUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId);

      if (error) {
        console.error('Failed to update project in database:', error);
        throw new Error(`Database update failed: ${error.message}`);
      }

      console.log(`✅ Project ${projectId} updated in database`);
    } catch (error: any) {
      console.error('Database update error:', error);
      throw error;
    }
  }

  /**
   * Get deployment status by project ID
   */
  async getDeploymentStatus(projectId: string): Promise<any> {
    try {
      const { data: project, error } = await this.supabaseService
        .from('projects')
        .select('vercel_project_id, vercel_deployment_url, repo_url, repo_created, vercel_connected')
        .eq('id', projectId)
        .single();

      if (error) throw new Error(`Failed to get project: ${error.message}`);
      if (!project) throw new Error('Project not found');

      let vercelStatus = null;
      if (project.vercel_project_id && this.vercelService) {
        try {
          const deployments = await this.vercelService.getProjectDeployments(project.vercel_project_id);
          vercelStatus = deployments[0] || null; // Get latest deployment
        } catch (error) {
          console.error('Failed to get Vercel deployment status:', error);
        }
      }

      return {
        projectId,
        github: {
          repoUrl: project.repo_url,
          repoCreated: project.repo_created || false
        },
        vercel: {
          projectId: project.vercel_project_id,
          deploymentUrl: project.vercel_deployment_url,
          connected: project.vercel_connected || false,
          latestDeployment: vercelStatus
        }
      };
    } catch (error: any) {
      console.error('Failed to get deployment status:', error);
      throw error;
    }
  }
}

export { DeploymentOrchestrator, DeploymentConfig, DeploymentResult, DeploymentStep, DeploymentStepType };