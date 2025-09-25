// GitHub API service for repository management
import { Octokit } from '@octokit/rest';

interface GitHubRepoData {
  name: string;
  description?: string;
  private?: boolean;
  auto_init?: boolean;
}

interface GitHubCommitData {
  owner: string;
  repo: string;
  message: string;
  content: string;
  path: string;
  branch?: string;
}

class GitHubService {
  private octokit: Octokit;
  private defaultOwner: string;

  constructor(accessToken: string, defaultOwner: string = 'Cliefden') {
    this.octokit = new Octokit({
      auth: accessToken,
    });
    this.defaultOwner = defaultOwner;
  }

  /**
   * Create a new GitHub repository
   */
  async createRepository(repoData: GitHubRepoData): Promise<any> {
    try {
      console.log(`Creating GitHub repo: ${repoData.name}`);
      
      const response = await this.octokit.rest.repos.createForAuthenticatedUser({
        name: repoData.name,
        description: repoData.description || `Generated project: ${repoData.name}`,
        private: repoData.private || false,
        auto_init: repoData.auto_init || true,
        gitignore_template: 'Node',
        license_template: 'mit'
      });

      console.log(`✅ GitHub repo created: ${response.data.html_url}`);
      return {
        success: true,
        repoUrl: response.data.html_url,
        cloneUrl: response.data.clone_url,
        sshUrl: response.data.ssh_url,
        owner: response.data.owner.login,
        name: response.data.name,
        fullName: response.data.full_name,
        repoId: response.data.id
      };
    } catch (error: any) {
      console.error('❌ GitHub repo creation failed:', error.message);
      throw new Error(`GitHub repo creation failed: ${error.message}`);
    }
  }

  /**
   * Create initial commit with project files
   */
  async createInitialCommit(commitData: GitHubCommitData): Promise<any> {
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
    } catch (error: any) {
      console.error('❌ GitHub commit failed:', error.message);
      throw new Error(`GitHub commit failed: ${error.message}`);
    }
  }

  /**
   * Get repository information
   */
  async getRepository(owner: string, repo: string): Promise<any> {
    try {
      const response = await this.octokit.rest.repos.get({
        owner,
        repo
      });
      
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to get repository:', error.message);
      throw new Error(`Failed to get repository: ${error.message}`);
    }
  }

  /**
   * Check if repository exists
   */
  async repositoryExists(owner: string, repo: string): Promise<boolean> {
    try {
      await this.getRepository(owner, repo);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Create multiple files in a single commit (batch commit)
   */
  async createBatchCommit(owner: string, repo: string, files: Array<{path: string, content: string}>, message: string): Promise<any> {
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
        mode: '100644' as const,
        type: 'blob' as const,
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
    } catch (error: any) {
      console.error('❌ Batch commit failed:', error.message);
      throw new Error(`Batch commit failed: ${error.message}`);
    }
  }
}

// Factory function to create GitHub service with token from environment or integration
export function createGitHubService(accessToken?: string): GitHubService {
  const token = accessToken || process.env.GITHUB_ACCESS_TOKEN;
  
  if (!token) {
    throw new Error('GitHub access token is required. Set GITHUB_ACCESS_TOKEN environment variable or provide token.');
  }

  return new GitHubService(token);
}

export { GitHubService };
export type { GitHubRepoData, GitHubCommitData };