import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { GitTemplateService } from './git-template-service.js';

const execAsync = promisify(exec);

export interface GitProject {
  id: string;
  name: string;
  repoUrl: string;
  localPath: string;
  branch: string;
}

export class GitProjectService {
  private tempDir: string;
  private gitTemplateService: GitTemplateService;

  constructor(supabaseService: any) {
    this.tempDir = '/tmp/celiador-projects';
    this.gitTemplateService = new GitTemplateService(supabaseService);
  }

  /**
   * Initialize a new Git-based project from a template
   */
  async initializeProject(
    projectId: string,
    projectName: string,
    templateRepoUrl: string,
    userRepoUrl: string,
    userId: string
  ): Promise<GitProject> {
    console.log(`[GitProject] Initializing project ${projectId} from template ${templateRepoUrl}`);
    
    const projectPath = path.join(this.tempDir, projectId);
    
    try {
      // Ensure temp directory exists
      await fs.mkdir(this.tempDir, { recursive: true });

      // Remove existing directory if it exists
      try {
        await fs.rm(projectPath, { recursive: true, force: true });
      } catch (error) {
        // Directory doesn't exist, that's fine
      }

      // Step 1: Clone template repository
      console.log(`[GitProject] Cloning template: ${templateRepoUrl}`);
      let templatePath: string;
      try {
        templatePath = await this.gitTemplateService.cloneTemplate(templateRepoUrl);
      } catch (cloneError) {
        console.warn(`[GitProject] Git clone failed, trying ZIP download: ${cloneError}`);
        templatePath = await this.gitTemplateService.downloadTemplateZip(templateRepoUrl);
      }

      // Step 2: Copy template files to project directory
      console.log(`[GitProject] Copying template files to ${projectPath}`);
      await this.copyTemplateToProject(templatePath, projectPath);

      // Step 3: Initialize new Git repository
      console.log(`[GitProject] Initializing Git repository`);
      await this.initializeGitRepo(projectPath, projectName);

      // Step 4: Add GitHub remote and push
      console.log(`[GitProject] Adding remote and pushing to: ${userRepoUrl}`);
      await this.setupRemoteAndPush(projectPath, userRepoUrl);

      // Cleanup template directory (only if it was cloned, not local)
      if (!templatePath.startsWith('/Users/')) {
        await this.gitTemplateService.cleanup(templatePath);
      }

      console.log(`[GitProject] Project ${projectId} initialized successfully`);

      return {
        id: projectId,
        name: projectName,
        repoUrl: userRepoUrl,
        localPath: projectPath,
        branch: 'main'
      };

    } catch (error) {
      // Cleanup on error
      try {
        await fs.rm(projectPath, { recursive: true, force: true });
      } catch {}
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to initialize Git project: ${errorMessage}`);
    }
  }

  /**
   * Copy template files to project directory (preserving structure)
   */
  private async copyTemplateToProject(templatePath: string, projectPath: string): Promise<void> {
    const skipPatterns = [
      '.git',
      'node_modules',
      '.next',
      'dist',
      'build',
      '.DS_Store',
      'upload-template.js',
      '*.log'
    ];

    const shouldSkip = (filePath: string): boolean => {
      const relativePath = path.relative(templatePath, filePath);
      return skipPatterns.some(pattern => {
        if (pattern.includes('*')) {
          return relativePath.includes(pattern.replace('*', ''));
        }
        return relativePath.includes(pattern);
      });
    };

    const copyRecursive = async (srcDir: string, destDir: string): Promise<void> => {
      await fs.mkdir(destDir, { recursive: true });
      const items = await fs.readdir(srcDir, { withFileTypes: true });

      for (const item of items) {
        const srcPath = path.join(srcDir, item.name);
        const destPath = path.join(destDir, item.name);

        if (shouldSkip(srcPath)) {
          continue;
        }

        if (item.isDirectory()) {
          await copyRecursive(srcPath, destPath);
        } else {
          await fs.copyFile(srcPath, destPath);
        }
      }
    };

    await copyRecursive(templatePath, projectPath);
  }

  /**
   * Initialize Git repository with initial commit
   */
  private async initializeGitRepo(projectPath: string, projectName: string): Promise<void> {
    const commands = [
      'git init',
      'git add .',
      `git commit -m "Initial commit: ${projectName}

Created from Celiador template with Git-based architecture.
All dynamic routes like [slug] are preserved perfectly.

🚀 Generated with Celiador"`
    ];

    for (const command of commands) {
      console.log(`[GitProject] Executing: ${command}`);
      await execAsync(command, { cwd: projectPath });
    }
  }

  /**
   * Set up remote origin and push to GitHub
   */
  private async setupRemoteAndPush(projectPath: string, repoUrl: string): Promise<void> {
    const commands = [
      `git remote add origin "${repoUrl}"`,
      'git branch -M main',
      'git push -u origin main'
    ];

    for (const command of commands) {
      console.log(`[GitProject] Executing: ${command}`);
      await execAsync(command, { cwd: projectPath });
    }
  }

  /**
   * Clone an existing project repository
   */
  async cloneProject(projectId: string, repoUrl: string, branch: string = 'main'): Promise<string> {
    const projectPath = path.join(this.tempDir, projectId);
    
    console.log(`[GitProject] Cloning project ${projectId} from ${repoUrl}`);

    try {
      // Ensure temp directory exists
      await fs.mkdir(this.tempDir, { recursive: true });

      // Remove existing directory if it exists
      try {
        await fs.rm(projectPath, { recursive: true, force: true });
      } catch (error) {
        // Directory doesn't exist, that's fine
      }

      // Clone the repository
      const cloneCommand = `git clone --branch ${branch} "${repoUrl}" "${projectPath}"`;
      await execAsync(cloneCommand);

      console.log(`[GitProject] Successfully cloned project to ${projectPath}`);
      return projectPath;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[GitProject] Failed to clone project: ${errorMessage}`);
      throw new Error(`Failed to clone project from ${repoUrl}: ${errorMessage}`);
    }
  }

  /**
   * Read a file from project repository
   */
  async readProjectFile(projectPath: string, filePath: string): Promise<string> {
    try {
      const fullPath = path.join(projectPath, filePath);
      const content = await fs.readFile(fullPath, 'utf-8');
      return content;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to read file ${filePath}: ${errorMessage}`);
    }
  }

  /**
   * Write a file to project repository
   */
  async writeProjectFile(projectPath: string, filePath: string, content: string): Promise<void> {
    try {
      const fullPath = path.join(projectPath, filePath);
      const dirPath = path.dirname(fullPath);
      
      // Ensure directory exists
      await fs.mkdir(dirPath, { recursive: true });
      
      // Write file
      await fs.writeFile(fullPath, content, 'utf-8');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to write file ${filePath}: ${errorMessage}`);
    }
  }

  /**
   * Get file tree structure from project repository
   */
  async getProjectFileTree(projectPath: string): Promise<any[]> {
    const skipPatterns = [
      '.git',
      'node_modules',
      '.next',
      'dist',
      'build',
      '.DS_Store'
    ];

    const shouldSkip = (filePath: string): boolean => {
      const relativePath = path.relative(projectPath, filePath);
      return skipPatterns.some(pattern => relativePath.includes(pattern));
    };

    const buildTree = async (dirPath: string): Promise<any[]> => {
      const items = await fs.readdir(dirPath, { withFileTypes: true });
      const result: any[] = [];

      for (const item of items) {
        const fullPath = path.join(dirPath, item.name);
        
        if (shouldSkip(fullPath)) {
          continue;
        }

        const relativePath = path.relative(projectPath, fullPath);

        if (item.isDirectory()) {
          const children = await buildTree(fullPath);
          result.push({
            name: item.name,
            type: 'directory',
            path: relativePath,
            children
          });
        } else {
          const stats = await fs.stat(fullPath);
          result.push({
            name: item.name,
            type: 'file',
            path: relativePath,
            size: stats.size
          });
        }
      }

      return result;
    };

    return buildTree(projectPath);
  }

  /**
   * Commit and push changes to repository
   */
  async commitAndPush(projectPath: string, message: string): Promise<void> {
    const commands = [
      'git add .',
      `git commit -m "${message}"`,
      'git push'
    ];

    for (const command of commands) {
      console.log(`[GitProject] Executing: ${command}`);
      try {
        await execAsync(command, { cwd: projectPath });
      } catch (error) {
        // If no changes to commit, that's okay
        const errorString = error instanceof Error ? error.message : String(error);
        if (command.includes('commit') && errorString.includes('nothing to commit')) {
          console.log(`[GitProject] No changes to commit`);
          continue;
        }
        throw error;
      }
    }
  }

  /**
   * Cleanup project directory
   */
  async cleanup(projectPath: string): Promise<void> {
    try {
      await fs.rm(projectPath, { recursive: true, force: true });
      console.log(`[GitProject] Cleaned up project directory: ${projectPath}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(`[GitProject] Failed to cleanup ${projectPath}: ${errorMessage}`);
    }
  }

  /**
   * Generate repository name from project name
   */
  static generateRepoName(projectName: string): string {
    return projectName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
}