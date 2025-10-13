// Vercel API service for project and deployment management
import fetch from 'node-fetch';

interface VercelProjectData {
  name: string;
  gitRepository?: {
    type: 'github';
    repo: string; // "owner/repo"
  };
  framework?: string;
  environmentVariables?: Array<{
    key: string;
    value: string;
    target: string[];
  }>;
}

interface VercelDeploymentData {
  projectId: string;
  gitSource?: {
    type: 'github';
    repo: string;
    ref: string;
  };
}

class VercelService {
  private apiToken: string;
  private teamId?: string;
  private baseUrl = 'https://api.vercel.com';

  constructor(apiToken: string, teamId?: string) {
    this.apiToken = apiToken;
    this.teamId = teamId;
  }

  /**
   * Create a new Vercel project connected to GitHub repo
   */
  async createProject(projectData: VercelProjectData): Promise<any> {
    try {
      console.log(`Creating Vercel project: ${projectData.name}`);
      
      const requestBody = {
        name: projectData.name,
        gitRepository: projectData.gitRepository,
        framework: projectData.framework || 'nextjs',
        environmentVariables: projectData.environmentVariables || []
      };

      const url = this.teamId 
        ? `${this.baseUrl}/v9/projects?teamId=${this.teamId}`
        : `${this.baseUrl}/v9/projects`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Vercel project creation failed: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log(`✅ Vercel project created: ${result.name} (${result.id})`);

      return {
        success: true,
        projectId: result.id,
        projectName: result.name,
        projectUrl: `https://vercel.com/${result.accountId}/${result.name}`,
        deploymentUrl: result.alias?.[0]?.domain ? `https://${result.alias[0].domain}` : null
      };
    } catch (error: any) {
      console.error('❌ Vercel project creation failed:', error.message);
      throw new Error(`Vercel project creation failed: ${error.message}`);
    }
  }

  /**
   * Deploy a project to Vercel
   */
  async createDeployment(deploymentData: VercelDeploymentData): Promise<any> {
    try {
      console.log(`Creating Vercel deployment for project: ${deploymentData.projectId}`);

      const requestBody = {
        name: deploymentData.projectId,
        gitSource: deploymentData.gitSource,
        target: 'production'
      };

      const url = this.teamId 
        ? `${this.baseUrl}/v13/deployments?teamId=${this.teamId}`
        : `${this.baseUrl}/v13/deployments`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Vercel deployment failed: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log(`✅ Vercel deployment created: ${result.id}`);

      return {
        success: true,
        deploymentId: result.id,
        deploymentUrl: `https://${result.url}`,
        status: result.readyState,
        createdAt: result.createdAt
      };
    } catch (error: any) {
      console.error('❌ Vercel deployment failed:', error.message);
      throw new Error(`Vercel deployment failed: ${error.message}`);
    }
  }

  /**
   * Get project information
   */
  async getProject(projectId: string): Promise<any> {
    try {
      const url = this.teamId 
        ? `${this.baseUrl}/v9/projects/${projectId}?teamId=${this.teamId}`
        : `${this.baseUrl}/v9/projects/${projectId}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.apiToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get Vercel project: ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error('❌ Failed to get Vercel project:', error.message);
      throw new Error(`Failed to get Vercel project: ${error.message}`);
    }
  }

  /**
   * Get deployment status
   */
  async getDeployment(deploymentId: string): Promise<any> {
    try {
      const url = this.teamId 
        ? `${this.baseUrl}/v13/deployments/${deploymentId}?teamId=${this.teamId}`
        : `${this.baseUrl}/v13/deployments/${deploymentId}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.apiToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get Vercel deployment: ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error('❌ Failed to get Vercel deployment:', error.message);
      throw new Error(`Failed to get Vercel deployment: ${error.message}`);
    }
  }

  /**
   * List deployments for a project
   */
  async getProjectDeployments(projectId: string): Promise<any> {
    try {
      const url = this.teamId 
        ? `${this.baseUrl}/v6/deployments?projectId=${projectId}&teamId=${this.teamId}`
        : `${this.baseUrl}/v6/deployments?projectId=${projectId}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.apiToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get project deployments: ${response.status}`);
      }

      const result = await response.json();
      return result.deployments || [];
    } catch (error: any) {
      console.error('❌ Failed to get project deployments:', error.message);
      throw new Error(`Failed to get project deployments: ${error.message}`);
    }
  }

  /**
   * Connect a project to a GitHub repository
   */
  async connectGitHubRepo(projectId: string, repoFullName: string): Promise<any> {
    try {
      console.log(`Connecting Vercel project ${projectId} to GitHub repo ${repoFullName}`);

      const url = this.teamId 
        ? `${this.baseUrl}/v9/projects/${projectId}?teamId=${this.teamId}`
        : `${this.baseUrl}/v9/projects/${projectId}`;

      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          gitRepository: {
            type: 'github',
            repo: repoFullName
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to connect GitHub repo: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log(`✅ GitHub repo connected to Vercel project`);

      return {
        success: true,
        projectId: result.id,
        connectedRepo: result.link?.repo
      };
    } catch (error: any) {
      console.error('❌ Failed to connect GitHub repo:', error.message);
      throw new Error(`Failed to connect GitHub repo: ${error.message}`);
    }
  }

  /**
   * Get framework detection for a repository
   */
  getFrameworkForTemplate(templateKey: string): string {
    const frameworkMap: Record<string, string> = {
      'nextjs': 'nextjs',
      'next-prisma-supabase': 'nextjs',
      'react-typescript': 'create-react-app',
      'blog-platform': 'nextjs',
      'ai-chat-app': 'nextjs',
      'ecommerce-storefront': 'nextjs',
      'landing-page': 'nextjs',
      'dashboard-app': 'nextjs',
      'ai-saas-dashboard': 'nextjs',
      'next-saas-starter': 'nextjs'
    };

    return frameworkMap[templateKey] || 'nextjs';
  }
}

// Factory function to create Vercel service with token from environment
export function createVercelService(apiToken?: string, teamId?: string): VercelService {
  const token = apiToken || process.env.VERCEL_API_TOKEN;
  
  if (!token) {
    throw new Error('Vercel API token is required. Set VERCEL_API_TOKEN environment variable or provide token.');
  }

  return new VercelService(token, teamId);
}

export { VercelService };
export type { VercelProjectData, VercelDeploymentData };