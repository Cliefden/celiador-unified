import { fileService } from './unified-file-service.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export interface ToolCallResult {
  success: boolean;
  data?: any;
  error?: string;
}

export class AIToolsService {
  constructor(
    private projectId: string,
    private userId: string
  ) {}

  /**
   * Execute a tool call and return the result
   */
  async executeToolCall(toolName: string, args: any): Promise<ToolCallResult> {
    console.log(`[AITools] Executing tool: ${toolName} with args:`, args);

    try {
      switch (toolName) {
        case 'readFile':
          return await this.readFile(args.path);
        
        case 'searchFiles':
          return await this.searchFiles(args.query, args.filePattern, args.extension);
        
        case 'getFileTree':
          return await this.getFileTree(args.directory);
        
        case 'getProjectFiles':
          return await this.getProjectFiles(args.extensions, args.maxFiles);
        
        case 'editFile':
          return await this.editFile(args.path, args.content);
        
        case 'createFile':
          return await this.createFile(args.path, args.content);
        
        case 'runCommand':
          return await this.runCommand(args.command);
        
        default:
          return {
            success: false,
            error: `Unknown tool: ${toolName}`
          };
      }
    } catch (error) {
      console.error(`[AITools] Error executing ${toolName}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Read a specific file
   */
  private async readFile(path: string): Promise<ToolCallResult> {
    try {
      const file = await fileService.getFile(this.projectId, path, this.userId);
      
      if (!file) {
        return {
          success: false,
          error: `File not found: ${path}`
        };
      }

      return {
        success: true,
        data: {
          path: file.path,
          content: file.content,
          lastModified: file.lastModified
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to read file ${path}: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Search for files containing specific text
   */
  private async searchFiles(query: string, filePattern?: string, extension?: string): Promise<ToolCallResult> {
    try {
      // Get all project files first
      const allFiles = await fileService.getProjectFileList(this.projectId, this.userId);
      
      if (!allFiles || allFiles.length === 0) {
        return {
          success: true,
          data: []
        };
      }

      // Filter by extension if provided
      let filteredFiles = allFiles;
      if (extension) {
        filteredFiles = allFiles.filter(file => 
          file.path.toLowerCase().endsWith(`.${extension.toLowerCase()}`)
        );
      }

      // Filter by file pattern if provided (simple glob-like matching)
      if (filePattern) {
        const pattern = filePattern.replace(/\*/g, '.*');
        const regex = new RegExp(pattern);
        filteredFiles = filteredFiles.filter(file => regex.test(file.path));
      }

      // Search for query in file contents
      const matchingFiles: Array<{ path: string; matches: string[] }> = [];
      
      for (const file of filteredFiles.slice(0, 20)) { // Limit to first 20 files for performance
        try {
          const fileContent = await fileService.getFile(this.projectId, file.path, this.userId);
          if (fileContent && fileContent.content.toLowerCase().includes(query.toLowerCase())) {
            // Extract lines containing the query
            const lines = fileContent.content.split('\n');
            const matchingLines = lines
              .map((line, index) => ({ line: line.trim(), lineNumber: index + 1 }))
              .filter(({ line }) => line.toLowerCase().includes(query.toLowerCase()))
              .slice(0, 5) // Max 5 matches per file
              .map(({ line, lineNumber }) => `Line ${lineNumber}: ${line}`);

            matchingFiles.push({
              path: file.path,
              matches: matchingLines
            });
          }
        } catch (error) {
          console.warn(`[AITools] Failed to read file for search: ${file.path}`, error);
        }
      }

      return {
        success: true,
        data: matchingFiles
      };
    } catch (error) {
      return {
        success: false,
        error: `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get file tree structure
   */
  private async getFileTree(directory?: string): Promise<ToolCallResult> {
    try {
      // For now, return the full project file list organized as a tree
      const files = await fileService.getProjectFileList(this.projectId, this.userId);
      
      if (!files || files.length === 0) {
        return {
          success: true,
          data: { tree: [] }
        };
      }

      // Build a simple tree structure
      const tree = this.buildFileTree(files, directory);

      return {
        success: true,
        data: { tree }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get file tree: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get project files with optional filtering
   */
  private async getProjectFiles(extensions?: string[], maxFiles = 20): Promise<ToolCallResult> {
    try {
      const files = await fileService.getProjectFileList(this.projectId, this.userId);
      
      if (!files || files.length === 0) {
        return {
          success: true,
          data: []
        };
      }

      let filteredFiles = files;

      // Filter by extensions if provided
      if (extensions && extensions.length > 0) {
        filteredFiles = files.filter(file => {
          const ext = file.path.split('.').pop()?.toLowerCase();
          return ext && extensions.map(e => e.toLowerCase()).includes(ext);
        });
      }

      // Sort by modification time (newest first) and limit
      const sortedFiles = filteredFiles
        .sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime())
        .slice(0, maxFiles);

      return {
        success: true,
        data: sortedFiles.map(file => ({
          path: file.path,
          size: file.size,
          lastModified: file.lastModified
        }))
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get project files: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Helper method to build file tree from flat file list
   */
  private buildFileTree(files: any[], filterDirectory?: string): any[] {
    const tree: any[] = [];
    const pathMap = new Map();

    // Filter files if directory specified
    let filteredFiles = files;
    if (filterDirectory && filterDirectory !== '.' && filterDirectory !== '/') {
      filteredFiles = files.filter(file => file.path.startsWith(filterDirectory));
    }

    for (const file of filteredFiles.slice(0, 50)) { // Limit for performance
      const pathParts = file.path.split('/');
      let currentPath = '';
      
      for (let i = 0; i < pathParts.length; i++) {
        const part = pathParts[i];
        const parentPath = currentPath;
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        
        if (i === pathParts.length - 1) {
          // This is a file
          const fileNode = {
            name: part,
            type: 'file',
            path: currentPath,
            size: file.size || 0
          };
          
          if (parentPath) {
            const parent = pathMap.get(parentPath);
            if (parent) {
              parent.children = parent.children || [];
              parent.children.push(fileNode);
            }
          } else {
            tree.push(fileNode);
          }
        } else {
          // This is a directory
          if (!pathMap.has(currentPath)) {
            const dirNode = {
              name: part,
              type: 'directory',
              path: currentPath,
              children: []
            };
            
            pathMap.set(currentPath, dirNode);
            
            if (parentPath) {
              const parent = pathMap.get(parentPath);
              if (parent) {
                parent.children = parent.children || [];
                parent.children.push(dirNode);
              }
            } else {
              tree.push(dirNode);
            }
          }
        }
      }
    }

    return tree;
  }

  /**
   * Edit an existing file
   */
  private async editFile(path: string, content: string): Promise<ToolCallResult> {
    try {
      // First check if file exists
      const existingFile = await fileService.getFile(this.projectId, path, this.userId);
      if (!existingFile) {
        return {
          success: false,
          error: `File does not exist: ${path}. Use createFile to create new files.`
        };
      }

      // Save the updated content using UnifiedFileService
      const result = await fileService.saveFile(this.projectId, path, content, this.userId);
      
      if (!result.success) {
        return {
          success: false,
          error: `Failed to save file: ${result.error || 'Unknown error'}`
        };
      }

      console.log(`[AITools] ✅ Successfully edited file: ${path} (${content.length} chars)`);
      
      return {
        success: true,
        data: {
          path: path,
          size: content.length,
          message: `File ${path} updated successfully`
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to edit file ${path}: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Create a new file
   */
  private async createFile(path: string, content: string): Promise<ToolCallResult> {
    try {
      // Check if file already exists
      const existingFile = await fileService.getFile(this.projectId, path, this.userId);
      if (existingFile) {
        return {
          success: false,
          error: `File already exists: ${path}. Use editFile to modify existing files.`
        };
      }

      // Create the new file using UnifiedFileService
      const result = await fileService.saveFile(this.projectId, path, content, this.userId);
      
      if (!result.success) {
        return {
          success: false,
          error: `Failed to create file: ${result.error || 'Unknown error'}`
        };
      }

      console.log(`[AITools] ✅ Successfully created file: ${path} (${content.length} chars)`);
      
      return {
        success: true,
        data: {
          path: path,
          size: content.length,
          message: `File ${path} created successfully`
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to create file ${path}: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Run a shell command in the project directory (with security restrictions)
   */
  private async runCommand(command: string): Promise<ToolCallResult> {
    try {
      // Security: Only allow safe commands
      const allowedCommands = [
        // NPM commands
        /^npm\s+(install|i|run\s+\w+|start|build|test|lint|audit|outdated|list|ls)(\s+.*)?$/,
        // Git commands (read-only)
        /^git\s+(status|log|diff|branch|remote|show|ls-files)(\s+.*)?$/,
        // Build tools
        /^yarn\s+(install|run\s+\w+|start|build|test|lint)(\s+.*)?$/,
        /^pnpm\s+(install|run\s+\w+|start|build|test|lint)(\s+.*)?$/,
        // TypeScript
        /^tsc(\s+.*)?$/,
        /^tsx\s+.*$/,
        // Linting/formatting
        /^eslint(\s+.*)?$/,
        /^prettier(\s+.*)?$/,
        // Package info
        /^node\s+(--version|-v)$/,
        /^npm\s+(--version|-v)$/,
      ];

      const isAllowed = allowedCommands.some(pattern => pattern.test(command.trim()));
      
      if (!isAllowed) {
        return {
          success: false,
          error: `Command not allowed for security reasons: ${command}. Only npm, git (read-only), build tools, and linting commands are permitted.`
        };
      }

      console.log(`[AITools] Running command: ${command}`);

      // Determine the working directory (project root)
      const projectsBaseDir = path.resolve('/Users/scw/Private/Programming/bether/projects');
      const workingDir = path.join(projectsBaseDir, this.projectId);

      // Execute the command with timeout
      const { stdout, stderr } = await execAsync(command, {
        cwd: workingDir,
        timeout: 60000, // 60 second timeout
        maxBuffer: 1024 * 1024, // 1MB buffer limit
        env: {
          ...process.env,
          // Ensure npm uses the project's node_modules
          PATH: `${workingDir}/node_modules/.bin:${process.env.PATH}`
        }
      });

      const output = stdout.trim();
      const errors = stderr.trim();

      console.log(`[AITools] ✅ Command completed: ${command}`);
      if (output) console.log(`[AITools] Output:`, output.substring(0, 500));
      if (errors) console.warn(`[AITools] Stderr:`, errors.substring(0, 500));

      return {
        success: true,
        data: {
          command,
          stdout: output,
          stderr: errors,
          workingDirectory: workingDir
        }
      };

    } catch (error: any) {
      console.error(`[AITools] Command failed: ${command}`, error);
      
      return {
        success: false,
        error: `Command failed: ${command}\nError: ${error.message || error}`
      };
    }
  }
}