// Vercel API service for project and deployment management
import fetch from 'node-fetch';
class VercelService {
    constructor(apiToken, teamId) {
        this.baseUrl = 'https://api.vercel.com';
        this.apiToken = apiToken;
        this.teamId = teamId;
    }
    /**
     * Create a new Vercel project connected to GitHub repo
     */
    async createProject(projectData) {
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
        }
        catch (error) {
            console.error('❌ Vercel project creation failed:', error.message);
            throw new Error(`Vercel project creation failed: ${error.message}`);
        }
    }
    /**
     * Deploy a project to Vercel
     */
    async createDeployment(deploymentData) {
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
        }
        catch (error) {
            console.error('❌ Vercel deployment failed:', error.message);
            throw new Error(`Vercel deployment failed: ${error.message}`);
        }
    }
    /**
     * Get project information
     */
    async getProject(projectId) {
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
        }
        catch (error) {
            console.error('❌ Failed to get Vercel project:', error.message);
            throw new Error(`Failed to get Vercel project: ${error.message}`);
        }
    }
    /**
     * Get deployment status
     */
    async getDeployment(deploymentId) {
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
        }
        catch (error) {
            console.error('❌ Failed to get Vercel deployment:', error.message);
            throw new Error(`Failed to get Vercel deployment: ${error.message}`);
        }
    }
    /**
     * List deployments for a project
     */
    async getProjectDeployments(projectId) {
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
        }
        catch (error) {
            console.error('❌ Failed to get project deployments:', error.message);
            throw new Error(`Failed to get project deployments: ${error.message}`);
        }
    }
    /**
     * Connect a project to a GitHub repository
     */
    async connectGitHubRepo(projectId, repoFullName) {
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
        }
        catch (error) {
            console.error('❌ Failed to connect GitHub repo:', error.message);
            throw new Error(`Failed to connect GitHub repo: ${error.message}`);
        }
    }
    /**
     * Monitor deployment until completion
     */
    async waitForDeployment(deploymentId, maxWaitTime = 300000) {
        const startTime = Date.now();
        const pollInterval = 5000; // 5 seconds
        console.log(`🔄 Monitoring deployment ${deploymentId} (max wait: ${maxWaitTime}ms)`);
        while (Date.now() - startTime < maxWaitTime) {
            try {
                const deployment = await this.getDeployment(deploymentId);
                console.log(`Deployment status: ${deployment.readyState || 'QUEUED'}`);
                if (deployment.readyState === 'READY') {
                    console.log(`✅ Deployment completed: https://${deployment.url}`);
                    return {
                        success: true,
                        deploymentId,
                        deploymentUrl: `https://${deployment.url}`,
                        status: 'READY',
                        duration: Date.now() - startTime
                    };
                }
                else if (deployment.readyState === 'ERROR' || deployment.readyState === 'CANCELED') {
                    throw new Error(`Deployment failed with status: ${deployment.readyState}`);
                }
                // Wait before next poll
                await new Promise(resolve => setTimeout(resolve, pollInterval));
            }
            catch (error) {
                console.error('❌ Error monitoring deployment:', error.message);
                throw error;
            }
        }
        throw new Error(`Deployment timeout after ${maxWaitTime}ms`);
    }
    /**
     * Get deployment logs
     */
    async getDeploymentLogs(deploymentId) {
        try {
            const url = this.teamId
                ? `${this.baseUrl}/v2/deployments/${deploymentId}/events?teamId=${this.teamId}`
                : `${this.baseUrl}/v2/deployments/${deploymentId}/events`;
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${this.apiToken}`
                }
            });
            if (!response.ok) {
                throw new Error(`Failed to get deployment logs: ${response.status}`);
            }
            const result = await response.json();
            return result;
        }
        catch (error) {
            console.error('❌ Failed to get deployment logs:', error.message);
            throw new Error(`Failed to get deployment logs: ${error.message}`);
        }
    }
    /**
     * Check if deployment is ready
     */
    async isDeploymentReady(deploymentId) {
        try {
            const deployment = await this.getDeployment(deploymentId);
            return deployment.readyState === 'READY';
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Get deployment metrics
     */
    async getDeploymentMetrics(deploymentId) {
        try {
            const deployment = await this.getDeployment(deploymentId);
            const logs = await this.getDeploymentLogs(deploymentId);
            return {
                deploymentId,
                status: deployment.readyState,
                url: deployment.url ? `https://${deployment.url}` : null,
                createdAt: deployment.createdAt,
                readyAt: deployment.readyAt,
                duration: deployment.readyAt ?
                    new Date(deployment.readyAt).getTime() - new Date(deployment.createdAt).getTime() : null,
                buildTime: logs.length > 0 ? this.calculateBuildTime(logs) : null
            };
        }
        catch (error) {
            console.error('❌ Failed to get deployment metrics:', error.message);
            throw new Error(`Failed to get deployment metrics: ${error.message}`);
        }
    }
    /**
     * Calculate build time from deployment logs
     */
    calculateBuildTime(logs) {
        const buildStart = logs.find(log => log.type === 'command' && log.payload?.text?.includes('npm run build'));
        const buildEnd = logs.find(log => log.type === 'command-exit');
        if (buildStart && buildEnd) {
            return new Date(buildEnd.created).getTime() - new Date(buildStart.created).getTime();
        }
        return null;
    }
    /**
     * Get all domains for a project
     */
    async getProjectDomains(projectId) {
        try {
            const url = this.teamId
                ? `${this.baseUrl}/v9/projects/${projectId}/domains?teamId=${this.teamId}`
                : `${this.baseUrl}/v9/projects/${projectId}/domains`;
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${this.apiToken}`
                }
            });
            if (!response.ok) {
                throw new Error(`Failed to get project domains: ${response.status}`);
            }
            const result = await response.json();
            return result.domains || [];
        }
        catch (error) {
            console.error('❌ Failed to get project domains:', error.message);
            throw new Error(`Failed to get project domains: ${error.message}`);
        }
    }
    /**
     * Get framework detection for a repository
     */
    getFrameworkForTemplate(templateKey) {
        const frameworkMap = {
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
export function createVercelService(apiToken, teamId) {
    const token = apiToken || process.env.VERCEL_API_TOKEN;
    if (!token) {
        throw new Error('Vercel API token is required. Set VERCEL_API_TOKEN environment variable or provide token.');
    }
    return new VercelService(token, teamId);
}
export { VercelService };
