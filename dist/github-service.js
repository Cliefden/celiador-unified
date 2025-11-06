// GitHub API service for repository management
import { Octokit } from '@octokit/rest';
class GitHubService {
    constructor(accessToken, defaultOwner = 'Cliefden') {
        this.octokit = new Octokit({
            auth: accessToken,
        });
        this.defaultOwner = defaultOwner;
    }
    /**
     * Create a new GitHub repository (personal account)
     */
    async createRepository(repoData) {
        try {
            console.log(`Creating personal GitHub repo: ${repoData.name}`);
            const response = await this.octokit.rest.repos.createForAuthenticatedUser({
                name: repoData.name,
                description: repoData.description || `Generated project: ${repoData.name}`,
                private: repoData.private || false,
                auto_init: repoData.auto_init !== undefined ? repoData.auto_init : false
            });
            console.log(`✅ Personal GitHub repo created: ${response.data.html_url}`);
            return this.formatRepoResponse(response.data);
        }
        catch (error) {
            console.error('❌ Personal GitHub repo creation failed:', error.message);
            throw new Error(`GitHub repo creation failed: ${error.message}`);
        }
    }
    /**
     * Create a new GitHub repository in an organization
     */
    async createRepositoryInOrg(orgName, repoData) {
        try {
            console.log(`Creating GitHub repo in org ${orgName}: ${repoData.name}`);
            const response = await this.octokit.rest.repos.createInOrg({
                org: orgName,
                name: repoData.name,
                description: repoData.description || `Generated project: ${repoData.name}`,
                private: repoData.private || false,
                auto_init: repoData.auto_init !== undefined ? repoData.auto_init : false
            });
            console.log(`✅ Organization GitHub repo created: ${response.data.html_url}`);
            return this.formatRepoResponse(response.data);
        }
        catch (error) {
            console.error(`❌ Organization GitHub repo creation failed:`, error.message);
            throw new Error(`GitHub repo creation failed: ${error.message}`);
        }
    }
    /**
     * Format repository response data consistently
     */
    formatRepoResponse(repoData) {
        return {
            success: true,
            repoUrl: repoData.html_url,
            cloneUrl: repoData.clone_url,
            sshUrl: repoData.ssh_url,
            owner: repoData.owner.login,
            name: repoData.name,
            fullName: repoData.full_name,
            repoId: repoData.id
        };
    }
    /**
     * Create initial commit with project files
     */
    async createInitialCommit(commitData) {
        try {
            console.log(`Creating initial commit for ${commitData.owner}/${commitData.repo}`);
            // Create or update file
            const response = await this.octokit.rest.repos.createOrUpdateFileContents({
                owner: commitData.owner,
                repo: commitData.repo,
                path: commitData.path,
                message: commitData.message,
                content: Buffer.from(commitData.content).toString('base64'),
                branch: commitData.branch || 'main'
            });
            console.log(`✅ Initial commit created: ${response.data.commit.sha}`);
            return {
                success: true,
                commitSha: response.data.commit.sha,
                commitUrl: response.data.commit.html_url
            };
        }
        catch (error) {
            console.error('❌ GitHub commit failed:', error.message);
            throw new Error(`GitHub commit failed: ${error.message}`);
        }
    }
    /**
     * Get repository information
     */
    async getRepository(owner, repo) {
        try {
            const response = await this.octokit.rest.repos.get({
                owner,
                repo
            });
            return response.data;
        }
        catch (error) {
            console.error('❌ Failed to get repository:', error.message);
            throw new Error(`Failed to get repository: ${error.message}`);
        }
    }
    /**
     * Check if repository exists
     */
    async repositoryExists(owner, repo) {
        try {
            await this.getRepository(owner, repo);
            return true;
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Check if organization exists and user has access
     */
    async organizationExists(orgName) {
        try {
            await this.octokit.rest.orgs.get({ org: orgName });
            return true;
        }
        catch (error) {
            console.error(`❌ Organization ${orgName} not found or no access:`, error.message);
            return false;
        }
    }
    /**
     * Get organization information
     */
    async getOrganization(orgName) {
        try {
            const response = await this.octokit.rest.orgs.get({ org: orgName });
            return response.data;
        }
        catch (error) {
            console.error(`❌ Failed to get organization ${orgName}:`, error.message);
            throw new Error(`Failed to get organization: ${error.message}`);
        }
    }
    /**
     * Create multiple files in a single commit (batch commit)
     */
    async createBatchCommit(owner, repo, files, message) {
        try {
            console.log(`Creating batch commit for ${owner}/${repo} with ${files.length} files`);
            // Get the current commit SHA
            const { data: ref } = await this.octokit.rest.git.getRef({
                owner,
                repo,
                ref: 'heads/main'
            });
            const currentCommitSha = ref.object.sha;
            // Get the current tree
            const { data: currentCommit } = await this.octokit.rest.git.getCommit({
                owner,
                repo,
                commit_sha: currentCommitSha
            });
            const currentTreeSha = currentCommit.tree.sha;
            // Create tree with new files
            const tree = files.map(file => ({
                path: file.path,
                mode: '100644',
                type: 'blob',
                content: file.content
            }));
            const { data: newTree } = await this.octokit.rest.git.createTree({
                owner,
                repo,
                base_tree: currentTreeSha,
                tree
            });
            // Create commit
            const { data: newCommit } = await this.octokit.rest.git.createCommit({
                owner,
                repo,
                message,
                tree: newTree.sha,
                parents: [currentCommitSha]
            });
            // Update reference
            await this.octokit.rest.git.updateRef({
                owner,
                repo,
                ref: 'heads/main',
                sha: newCommit.sha
            });
            console.log(`✅ Batch commit created: ${newCommit.sha}`);
            return {
                success: true,
                commitSha: newCommit.sha,
                commitUrl: newCommit.html_url
            };
        }
        catch (error) {
            console.error('❌ Batch commit failed:', error.message);
            throw new Error(`Batch commit failed: ${error.message}`);
        }
    }
}
// Factory function to create GitHub service with token from environment or integration
export function createGitHubService(accessToken) {
    const token = accessToken || process.env.GITHUB_ACCESS_TOKEN;
    if (!token) {
        throw new Error('GitHub access token is required. Set GITHUB_ACCESS_TOKEN environment variable or provide token.');
    }
    return new GitHubService(token);
}
export { GitHubService };
