import { Vercel } from '@vercel/sdk';
// @ts-ignore
import fetch from 'node-fetch';

interface DeploymentFile {
  file: string;
  data: string | Buffer;
}

interface VercelProject {
  id: string;
  name: string;
  framework: any; // Vercel API returns complex framework object
  targets?: any; // Vercel API returns complex targets object
}

export class VercelService {
  private vercel: Vercel;
  private teamId?: string;
  private token: string;

  constructor(token: string, teamId?: string) {
    this.vercel = new Vercel({
      bearerToken: token,
    });
    this.token = token;
    this.teamId = teamId;
  }

  /**
   * Get the Vercel client instance for direct API access
   */
  get client() {
    return this.vercel;
  }

  /**
   * Get all projects for the authenticated user/team
   */
  async getProjects(): Promise<VercelProject[]> {
    try {
      const response = await this.vercel.projects.getProjects({
        teamId: this.teamId,
      });
      
      return response.projects?.map(project => ({
        id: project.id,
        name: project.name,
        framework: project.framework,
        targets: project.targets,
      })) || [];
    } catch (error) {
      console.error('[VERCEL] Failed to get projects:', error);
      throw error;
    }
  }

  /**
   * Get a specific project by name
   */
  async getProjectByName(name: string): Promise<VercelProject | null> {
    try {
      const projects = await this.getProjects();
      return projects.find(p => p.name === name) || null;
    } catch (error) {
      console.error('[VERCEL] Failed to get project by name:', error);
      return null;
    }
  }

  /**
   * Create a new Vercel project
   */
  async createProject(name: string, framework?: string): Promise<VercelProject> {
    try {
      console.log(`[VERCEL] Creating project with params:`, { name, framework: framework || 'nextjs', teamId: this.teamId });
      
      const projectData: any = {
        name,
      };
      
      // Only add framework if it's provided and not null/undefined
      if (framework && framework.trim()) {
        projectData.framework = framework;
      }
      
      // Only add teamId if it's provided
      if (this.teamId) {
        projectData.teamId = this.teamId;
      }
      
      console.log(`[VERCEL] Final project creation payload:`, projectData);
      
      const response = await this.vercel.projects.createProject(projectData);

      return {
        id: response.id,
        name: response.name,
        framework: response.framework,
        targets: response.targets,
      };
    } catch (error) {
      console.error('[VERCEL] Failed to create project with SDK, trying direct API:', error);
      
      // Fallback to direct API call
      try {
        return await this.createProjectDirect(name, framework);
      } catch (fallbackError) {
        console.error('[VERCEL] Direct API also failed:', fallbackError);
        throw error; // Throw original error
      }
    }
  }

  /**
   * Create project using direct API call (fallback method)
   */
  private async createProjectDirect(name: string, framework?: string): Promise<VercelProject> {
    const projectData: any = { name };
    
    if (framework && framework.trim()) {
      projectData.framework = framework;
    }
    
    const url = this.teamId 
      ? `https://api.vercel.com/v9/projects?teamId=${this.teamId}`
      : 'https://api.vercel.com/v9/projects';
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(projectData),
    });
    
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`API Error ${response.status}: ${errorBody}`);
    }
    
    const project = await response.json();
    console.log(`[VERCEL] Created project via direct API:`, project.name);
    
    return {
      id: project.id,
      name: project.name,
      framework: project.framework,
      targets: project.targets,
    };
  }

  /**
   * Create a deployment from project files
   */
  async createDeployment(
    projectName: string,
    files: DeploymentFile[],
    target: 'production' | 'preview' = 'production'
  ): Promise<any> {
    try {
      // Ensure project exists
      let project = await this.getProjectByName(projectName);
      if (!project) {
        console.log(`[VERCEL] Creating new project: ${projectName}`);
        project = await this.createProject(projectName, 'nextjs');
      }

      console.log(`[VERCEL] Creating deployment for project ${projectName} with ${files.length} files`);
      
      const deploymentData: any = {
        name: projectName,
        files: files.map(f => ({
          file: f.file,
          data: typeof f.data === 'string' ? f.data : f.data.toString('base64'),
        })),
        projectSettings: {
          framework: 'nextjs',
          buildCommand: 'npm run build',
          devCommand: 'npm run dev',
          installCommand: 'npm install',
          outputDirectory: '.next',
        },
        target,
      };
      
      // Only add teamId if it's provided
      if (this.teamId) {
        deploymentData.teamId = this.teamId;
      }
      
      console.log(`[VERCEL] Deployment payload (files truncated):`, {
        ...deploymentData,
        files: `${deploymentData.files.length} files`
      });

      // Create deployment using correct SDK structure
      const deployment = await this.vercel.deployments.createDeployment({
        requestBody: deploymentData
      });

      console.log(`[VERCEL] Created deployment: ${deployment.id}`);
      return deployment;
    } catch (error) {
      console.error('[VERCEL] Failed to create deployment:', error);
      throw error;
    }
  }

  /**
   * Get deployment status
   */
  async getDeployment(deploymentId: string): Promise<any> {
    try {
      const deployment = await this.vercel.deployments.getDeployment({
        idOrUrl: deploymentId,
        teamId: this.teamId,
      });

      return deployment;
    } catch (error) {
      console.error('[VERCEL] Failed to get deployment:', error);
      throw error;
    }
  }

  /**
   * Get deployment logs
   */
  async getDeploymentLogs(deploymentId: string): Promise<any[]> {
    try {
      const response = await this.vercel.deployments.getDeploymentEvents({
        idOrUrl: deploymentId,
        teamId: this.teamId,
      });

      return (response as any)?.events || response || [];
    } catch (error) {
      console.error('[VERCEL] Failed to get deployment logs:', error);
      return [];
    }
  }

  /**
   * Cancel a deployment
   */
  async cancelDeployment(deploymentId: string): Promise<boolean> {
    try {
      await this.vercel.deployments.cancelDeployment({
        id: deploymentId,
        teamId: this.teamId,
      });

      console.log(`[VERCEL] Cancelled deployment: ${deploymentId}`);
      return true;
    } catch (error) {
      console.error('[VERCEL] Failed to cancel deployment:', error);
      return false;
    }
  }

  /**
   * Get recent deployments for a project
   */
  async getProjectDeployments(projectId: string, limit: number = 10): Promise<any[]> {
    try {
      const response = await this.vercel.deployments.getDeployments({
        projectId,
        limit,
        teamId: this.teamId,
      });

      return response.deployments || [];
    } catch (error) {
      console.error('[VERCEL] Failed to get project deployments:', error);
      return [];
    }
  }

  /**
   * Convert file tree to Vercel deployment format
   */
  static async prepareFilesFromGitHub(
    files: any[],
    githubToken: string,
    repoOwner: string,
    repoName: string,
    branch: string = 'main'
  ): Promise<DeploymentFile[]> {
    const deploymentFiles: DeploymentFile[] = [];
    
    console.log(`[VERCEL] Preparing ${files.length} files from GitHub for deployment`);
    console.log(`[VERCEL] First few files:`, files.slice(0, 3).map(f => ({ path: f.path, type: f.type, size: f.size })));

    for (const file of files) {
      if (file.type === 'blob') {
        try {
          console.log(`[VERCEL] Downloading file: ${file.path}`);
          
          // Download file content from GitHub
          const response = await fetch(
            `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${file.path}?ref=${branch}`,
            {
              headers: {
                'Authorization': `token ${githubToken}`,
                'Accept': 'application/vnd.github.v3.raw',
              },
            }
          );

          if (response.ok) {
            const content = await response.text();
            deploymentFiles.push({
              file: file.path,
              data: content,
            });
            console.log(`[VERCEL] Successfully downloaded: ${file.path} (${content.length} chars)`);
          } else {
            console.warn(`[VERCEL] Failed to download ${file.path}: ${response.status} ${response.statusText}`);
          }
        } catch (error) {
          console.warn(`[VERCEL] Failed to download file ${file.path}:`, error);
        }
      } else {
        console.log(`[VERCEL] Skipping non-blob file: ${file.path} (type: ${file.type})`);
      }
    }

    console.log(`[VERCEL] Successfully prepared ${deploymentFiles.length} files for deployment`);
    return deploymentFiles;
  }

  /**
   * Deploy from GitHub repository using Git integration
   */
  async deployFromGitHub(
    projectName: string,
    githubToken: string,
    repoOwner: string,
    repoName: string,
    branch: string = 'main',
    target: 'production' | 'preview' = 'production'
  ): Promise<any> {
    try {
      console.log(`[VERCEL] Setting up Git integration for ${repoOwner}/${repoName}#${branch} to ${projectName}`);

      // Create or get project with Git integration
      let project = await this.getProjectByName(projectName);
      if (!project) {
        console.log(`[VERCEL] Creating new project with Git integration: ${projectName}`);
        project = await this.createProjectWithGitIntegration(projectName, repoOwner, repoName, branch);
      } else {
        console.log(`[VERCEL] Project exists, linking to Git repository: ${projectName}`);
        const linkResult = await this.linkProjectToGitRepo(project.id, repoOwner, repoName, branch, project.name, target);
        
        // If linkProjectToGitRepo returned a deployment (fallback), return it
        if (linkResult && linkResult.id) {
          console.log(`[VERCEL] Using fallback deployment from link process: ${linkResult.id}`);
          return linkResult;
        }
      }

      // Trigger deployment only if we didn't get a fallback deployment
      console.log(`[VERCEL] Triggering deployment for project: ${project.id}`);
      const deployment = await this.triggerDeployment(project.id, branch, target);

      console.log(`[VERCEL] Git-based deployment triggered: ${deployment.id}`);
      return deployment;
    } catch (error) {
      console.error('[VERCEL] Failed to deploy from GitHub with Git integration:', error);
      throw error;
    }
  }

  /**
   * Create project with Git integration using correct Vercel API format
   */
  private async createProjectWithGitIntegration(
    name: string, 
    repoOwner: string, 
    repoName: string, 
    branch: string = 'main'
  ): Promise<VercelProject> {
    // First create the project without Git integration
    const projectData = {
      name,
      framework: 'nextjs'
    };

    const url = this.teamId 
      ? `https://api.vercel.com/v9/projects?teamId=${this.teamId}`
      : 'https://api.vercel.com/v9/projects';
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(projectData),
    });
    
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Failed to create project: ${response.status} ${errorBody}`);
    }
    
    const project = await response.json();
    console.log(`[VERCEL] Created project: ${project.name}`);
    
    // Now link to Git repository using separate API call
    try {
      await this.linkProjectToGitRepo(project.id, repoOwner, repoName, branch, project.name, 'production');
    } catch (linkError) {
      console.warn(`[VERCEL] Failed to link Git repo, project created without Git integration:`, linkError);
      // Continue anyway - project exists, just not linked to Git
    }
    
    return {
      id: project.id,
      name: project.name,
      framework: project.framework,
      targets: project.targets,
    };
  }

  /**
   * Link existing project to Git repository using Vercel's Git connection endpoint
   */
  private async linkProjectToGitRepo(
    projectId: string,
    repoOwner: string,
    repoName: string,
    branch: string = 'main',
    projectName?: string,
    target: 'production' | 'preview' = 'production'
  ): Promise<any | void> {
    console.log(`[VERCEL] Attempting to link project ${projectId} to ${repoOwner}/${repoName}#${branch}`);
    
    // Use the Git repository connection endpoint
    const linkData = {
      type: 'github',
      repo: `${repoOwner}/${repoName}`,
      productionBranch: branch
    };

    const url = this.teamId 
      ? `https://api.vercel.com/v9/projects/${projectId}/link?teamId=${this.teamId}`
      : `https://api.vercel.com/v9/projects/${projectId}/link`;
    
    console.log(`[VERCEL] Using link endpoint: ${url}`);
    console.log(`[VERCEL] Link payload:`, linkData);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(linkData),
    });
    
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[VERCEL] Link failed with status ${response.status}:`, errorBody);
      
      // Check for GitHub App installation requirement
      if (errorBody.includes('install the GitHub integration first')) {
        // For freemium users, fall back to file-based deployment
        console.log(`[VERCEL] GitHub App not installed, falling back to file-based deployment`);
        return await this.deployFromFiles(projectName || 'unknown-project', repoOwner, repoName, branch, target);
      }
      
      // Try alternative approach using project update
      console.log(`[VERCEL] Trying alternative approach: project update`);
      await this.updateProjectGitSettings(projectId, repoOwner, repoName, branch);
      return;
    }
    
    const result = await response.json();
    console.log(`[VERCEL] Successfully linked project to GitHub:`, result);
  }

  /**
   * Alternative method to update project Git settings
   */
  private async updateProjectGitSettings(
    projectId: string,
    repoOwner: string,
    repoName: string,
    branch: string = 'main'
  ): Promise<void> {
    const updateData = {
      link: {
        type: 'github',
        repo: `${repoOwner}/${repoName}`,
        productionBranch: branch
      }
    };

    const url = this.teamId 
      ? `https://api.vercel.com/v9/projects/${projectId}?teamId=${this.teamId}`
      : `https://api.vercel.com/v9/projects/${projectId}`;
    
    console.log(`[VERCEL] Using project update endpoint: ${url}`);
    console.log(`[VERCEL] Update payload:`, updateData);
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });
    
    if (!response.ok) {
      const errorBody = await response.text();
      console.warn(`[VERCEL] Project update also failed: ${response.status} ${errorBody}`);
      throw new Error(`Failed to link project to Git repo via update: ${response.status} ${errorBody}`);
    }
    
    const result = await response.json();
    console.log(`[VERCEL] Successfully updated project Git settings:`, result.name);
  }

  /**
   * Trigger deployment for Git-connected project
   */
  private async triggerDeployment(
    projectId: string,
    branch: string = 'main',
    target: 'production' | 'preview' = 'production'
  ): Promise<any> {
    const deploymentData = {
      name: projectId,
      gitSource: {
        type: 'github',
        ref: branch,
        repoId: projectId
      },
      target
    };

    const url = this.teamId 
      ? `https://api.vercel.com/v13/deployments?teamId=${this.teamId}`
      : 'https://api.vercel.com/v13/deployments';
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(deploymentData),
    });
    
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Failed to trigger deployment: ${response.status} ${errorBody}`);
    }
    
    const deployment = await response.json();
    console.log(`[VERCEL] Triggered deployment: ${deployment.id}`);
    return deployment;
  }

  /**
   * Deploy from files (simplified file-based deployment)
   */
  async deployFromFiles(
    projectName: string,
    repoOwner: string,
    repoName: string,
    branch: string = 'main',
    target: 'production' | 'preview' = 'production'
  ): Promise<any> {
    try {
      console.log(`[VERCEL] Deploying from files (no Git integration) for ${repoOwner}/${repoName}#${branch}`);

      // Get repository files
      const treeResponse = await fetch(
        `https://api.github.com/repos/${repoOwner}/${repoName}/git/trees/${branch}?recursive=1`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.GITHUB_ACCESS_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
          },
        }
      );

      if (!treeResponse.ok) {
        throw new Error(`Failed to get repository tree: ${treeResponse.statusText}`);
      }

      const treeData = await treeResponse.json();
      const files = treeData.tree.filter((item: any) => item.type === 'blob');

      // Prepare files for deployment
      const deploymentFiles = await VercelService.prepareFilesFromGitHub(
        files,
        process.env.GITHUB_ACCESS_TOKEN!,
        repoOwner,
        repoName,
        branch
      );

      console.log(`[VERCEL] Prepared ${deploymentFiles.length} files for file-based deployment`);

      // Create deployment with files (no Git integration)
      const deployment = await this.createDeployment(projectName, deploymentFiles, target);
      
      console.log(`[VERCEL] File-based deployment created: ${deployment.id}`);
      return deployment;
    } catch (error) {
      console.error('[VERCEL] Failed to deploy from files:', error);
      throw error;
    }
  }

  /**
   * Get team information
   */
  async getTeam(): Promise<any> {
    if (!this.teamId) {
      return null;
    }

    try {
      const team = await this.vercel.teams.getTeam({
        teamId: this.teamId,
      });

      return team;
    } catch (error) {
      console.error('[VERCEL] Failed to get team:', error);
      return null;
    }
  }

  /**
   * Check if token is valid
   */
  async validateToken(): Promise<boolean> {
    try {
      await this.vercel.user.getAuthUser();
      return true;
    } catch (error) {
      console.error('[VERCEL] Token validation failed:', error);
      return false;
    }
  }
}