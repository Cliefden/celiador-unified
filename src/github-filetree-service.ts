// GitHub API-based file tree service (no cloning required)
import { Octokit } from '@octokit/rest';

interface GitHubFileItem {
  name: string;
  path: string;
  type: 'file' | 'dir';
  size?: number;
  sha: string;
  url: string;
  download_url?: string;
}

interface FileTreeItem {
  name: string;
  type: 'file' | 'directory';
  path: string;
  size?: number;
  children?: FileTreeItem[];
}

export class GitHubFileTreeService {
  private octokit: Octokit;

  constructor(accessToken?: string) {
    this.octokit = new Octokit({
      auth: accessToken || undefined, // undefined auth allows public repo access
    });
  }

  /**
   * Get complete file tree from GitHub repository using API (no cloning)
   */
  async getRepositoryFileTree(owner: string, repo: string, branch: string = 'main'): Promise<FileTreeItem[]> {
    console.log(`[GitHubFileTree] Getting file tree for ${owner}/${repo}#${branch} via API`);
    
    try {
      // Get repository tree recursively
      const { data: tree } = await this.octokit.rest.git.getTree({
        owner,
        repo,
        tree_sha: branch,
        recursive: 'true'
      });

      console.log(`[GitHubFileTree] Found ${tree.tree.length} items in repository`);

      // Filter out unwanted files and convert to our format
      const filteredItems = tree.tree.filter(item => 
        item.path && 
        item.type && 
        !this.shouldSkipPath(item.path)
      );

      console.log(`[GitHubFileTree] After filtering: ${filteredItems.length} items`);

      // Build hierarchical file tree
      const fileTree = this.buildFileTree(filteredItems);
      
      console.log(`[GitHubFileTree] ✅ File tree built with ${this.countItems(fileTree)} items`);
      return fileTree;

    } catch (error: any) {
      console.error(`[GitHubFileTree] ❌ Failed to get file tree:`, error.message);
      throw new Error(`Failed to get repository file tree: ${error.message}`);
    }
  }

  /**
   * Get file content from GitHub repository using API
   */
  async getFileContent(owner: string, repo: string, path: string, branch: string = 'main'): Promise<string> {
    console.log(`[GitHubFileTree] Getting file content for ${owner}/${repo}/${path}#${branch}`);
    
    try {
      const { data } = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path,
        ref: branch
      });

      // Handle file content (not directory)
      if ('content' in data && data.type === 'file') {
        const content = Buffer.from(data.content, 'base64').toString('utf-8');
        console.log(`[GitHubFileTree] ✅ Got file content (${content.length} chars)`);
        return content;
      } else {
        throw new Error(`Path ${path} is not a file`);
      }

    } catch (error: any) {
      console.error(`[GitHubFileTree] ❌ Failed to get file content:`, error.message);
      throw new Error(`Failed to get file content: ${error.message}`);
    }
  }

  /**
   * Download all repository files to local directory using GitHub API (replacement for Git clone)
   */
  async downloadRepositoryToPath(owner: string, repo: string, localPath: string, branch: string = 'main'): Promise<number> {
    console.log(`[GitHubFileTree] Downloading ${owner}/${repo}#${branch} to ${localPath} via API`);
    
    try {
      const fs = await import('fs');
      const path = await import('path');
      const fsPromises = fs.promises;

      // Ensure local directory exists
      await fsPromises.mkdir(localPath, { recursive: true });

      // Get complete file tree
      const fileTree = await this.getRepositoryFileTree(owner, repo, branch);
      
      // Download all files
      let downloadedCount = 0;
      await this.downloadFileTreeItems(owner, repo, branch, fileTree, localPath);
      
      // Count downloaded files
      const countFiles = async (dirPath: string): Promise<number> => {
        let count = 0;
        const items = await fsPromises.readdir(dirPath, { withFileTypes: true });
        
        for (const item of items) {
          const fullPath = path.join(dirPath, item.name);
          if (item.isFile()) {
            count++;
          } else if (item.isDirectory()) {
            count += await countFiles(fullPath);
          }
        }
        return count;
      };
      
      downloadedCount = await countFiles(localPath);
      console.log(`[GitHubFileTree] ✅ Downloaded ${downloadedCount} files to ${localPath}`);
      return downloadedCount;

    } catch (error: any) {
      console.error(`[GitHubFileTree] ❌ Failed to download repository:`, error.message);
      throw new Error(`Failed to download repository: ${error.message}`);
    }
  }

  /**
   * Download file tree items recursively with parallel file downloads
   */
  private async downloadFileTreeItems(owner: string, repo: string, branch: string, items: FileTreeItem[], basePath: string): Promise<void> {
    const fs = await import('fs');
    const path = await import('path');
    const fsPromises = fs.promises;

    // Create all directories first
    for (const item of items) {
      if (item.type === 'directory') {
        const localItemPath = path.join(basePath, item.path);
        await fsPromises.mkdir(localItemPath, { recursive: true });
      }
    }

    // Collect all file download promises for parallel execution
    const fileDownloadPromises: Promise<void>[] = [];

    const downloadFile = async (item: FileTreeItem): Promise<void> => {
      const localItemPath = path.join(basePath, item.path);
      
      try {
        const content = await this.getFileContent(owner, repo, item.path, branch);
        
        // Ensure parent directory exists
        const parentDir = path.dirname(localItemPath);
        await fsPromises.mkdir(parentDir, { recursive: true });
        
        // Write file
        await fsPromises.writeFile(localItemPath, content, 'utf-8');
        console.log(`[GitHubFileTree] Downloaded file: ${item.path}`);
        
      } catch (fileError) {
        console.warn(`[GitHubFileTree] Failed to download file ${item.path}: ${fileError}`);
      }
    };

    const processItems = (itemList: FileTreeItem[]) => {
      for (const item of itemList) {
        if (item.type === 'file') {
          fileDownloadPromises.push(downloadFile(item));
        } else if (item.type === 'directory' && item.children) {
          // Recursively process directory children
          processItems(item.children);
        }
      }
    };

    // Process all items to collect file download promises
    processItems(items);

    // Execute all file downloads in parallel (with some concurrency limit)
    console.log(`[GitHubFileTree] Starting parallel download of ${fileDownloadPromises.length} files...`);
    
    // Download files in batches of 10 to avoid hitting API rate limits
    const batchSize = 10;
    for (let i = 0; i < fileDownloadPromises.length; i += batchSize) {
      const batch = fileDownloadPromises.slice(i, i + batchSize);
      await Promise.all(batch);
      console.log(`[GitHubFileTree] Downloaded batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(fileDownloadPromises.length / batchSize)}`);
    }
    
    console.log(`[GitHubFileTree] ✅ Completed parallel download of all files`);
  }

  /**
   * Check if repository exists and is accessible
   */
  async repositoryExists(owner: string, repo: string): Promise<boolean> {
    try {
      await this.octokit.rest.repos.get({ owner, repo });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get repository information
   */
  async getRepositoryInfo(owner: string, repo: string): Promise<any> {
    try {
      const { data } = await this.octokit.rest.repos.get({ owner, repo });
      return {
        name: data.name,
        full_name: data.full_name,
        description: data.description,
        default_branch: data.default_branch,
        size: data.size,
        created_at: data.created_at,
        updated_at: data.updated_at,
        file_count: null // Will be populated when getting file tree
      };
    } catch (error: any) {
      throw new Error(`Failed to get repository info: ${error.message}`);
    }
  }

  /**
   * Build hierarchical file tree from flat GitHub tree
   */
  private buildFileTree(items: any[]): FileTreeItem[] {
    const tree: FileTreeItem[] = [];
    const pathMap = new Map<string, FileTreeItem>();

    // Sort items by path to ensure parents are processed before children
    items.sort((a, b) => a.path.localeCompare(b.path));

    for (const item of items) {
      const pathParts = item.path.split('/');
      const fileName = pathParts[pathParts.length - 1];
      
      const fileItem: FileTreeItem = {
        name: fileName,
        type: item.type === 'tree' ? 'directory' : 'file',
        path: item.path,
        size: item.size || undefined
      };

      // Add to path map
      pathMap.set(item.path, fileItem);

      // Find parent directory
      if (pathParts.length === 1) {
        // Root level item
        tree.push(fileItem);
      } else {
        // Find or create parent directories
        let parentPath = '';
        let currentLevel = tree;
        
        for (let i = 0; i < pathParts.length - 1; i++) {
          const dirName = pathParts[i];
          parentPath = parentPath ? `${parentPath}/${dirName}` : dirName;
          
          // Find existing directory at this level
          let existingDir = currentLevel.find(item => 
            item.name === dirName && item.type === 'directory'
          );
          
          if (!existingDir) {
            // Create missing directory
            existingDir = {
              name: dirName,
              type: 'directory',
              path: parentPath,
              children: []
            };
            currentLevel.push(existingDir);
            pathMap.set(parentPath, existingDir);
          }
          
          if (!existingDir.children) {
            existingDir.children = [];
          }
          
          currentLevel = existingDir.children;
        }
        
        // Add file to its parent directory
        currentLevel.push(fileItem);
      }
    }

    return tree;
  }

  /**
   * Check if path should be skipped (similar to GitTemplateService)
   */
  private shouldSkipPath(path: string): boolean {
    const skipPatterns = [
      '.git',
      'node_modules',
      '.next',
      'dist',
      'build',
      '.DS_Store',
      'celiador.json',
      'upload-template.js',
      '.env.local',
      'package-lock.json',
      'yarn.lock'
    ];

    return skipPatterns.some(pattern => {
      if (pattern.includes('*')) {
        return path.includes(pattern.replace('*', ''));
      }
      return path.includes(pattern);
    });
  }

  /**
   * Count total items in file tree (for logging)
   */
  private countItems(tree: FileTreeItem[]): number {
    let count = 0;
    for (const item of tree) {
      count++;
      if (item.children) {
        count += this.countItems(item.children);
      }
    }
    return count;
  }
}

// Factory function
function createGitHubFileTreeService(accessToken?: string): GitHubFileTreeService {
  const token = accessToken || process.env.GITHUB_ACCESS_TOKEN;
  
  // Allow creation without token for public repositories
  // The Octokit constructor will work without auth for public repos
  console.log(`[GitHubFileTree] Creating service with token: ${token ? 'PROVIDED' : 'NONE (public repos only)'}`);
  
  return new GitHubFileTreeService(token || '');
}

// Export the factory function
export { createGitHubFileTreeService };