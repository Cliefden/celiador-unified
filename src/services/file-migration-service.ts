import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

interface FileRecord {
  file_path: string;
  file_name: string;
  file_extension: string;
  file_size: number;
  file_content: {
    content: string;
    encoding: string;
  };
  content_hash: string;
  content_type: string;
  is_text_file: boolean;
}

/**
 * Service to migrate files from Supabase Storage to database JSONB storage
 * This provides 10-50x faster access for AI analysis
 */
export class FileMigrationService {
  private supabase: any;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  /**
   * Migrate all files for a project from storage to database
   */
  async migrateProjectFiles(projectId: string, userId: string): Promise<{
    migrated: number;
    skipped: number;
    errors: number;
  }> {
    console.log(`Starting file migration for project ${projectId}`);
    
    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    try {
      // Recursively list all files in project storage
      const getAllFiles = async (prefix: string = ''): Promise<any[]> => {
        const path = prefix ? `${projectId}/${prefix}` : projectId;
        const { data: items, error } = await this.supabase.storage
          .from('project-files')
          .list(path, { limit: 1000 });
        
        if (error || !items) {
          console.warn(`Failed to list path ${path}:`, error?.message);
          return [];
        }

        const allFiles: any[] = [];
        
        for (const item of items) {
          const itemPath = prefix ? `${prefix}/${item.name}` : item.name;
          
          if (item.metadata === null && item.id === null) {
            // This is a folder, recurse into it
            console.log(`Found directory: ${itemPath}, recursing for migration...`);
            const subFiles = await getAllFiles(itemPath);
            allFiles.push(...subFiles);
          } else {
            // This is a file
            allFiles.push({
              ...item,
              name: itemPath, // Use full path as name
              size: item.metadata?.size || 0,
              updatedAt: item.updated_at || item.created_at
            });
          }
        }
        
        return allFiles;
      };

      const files = await getAllFiles();

      if (!files || files.length === 0) {
        console.error(`No files found in storage for project ${projectId}`);
        return { migrated: 0, skipped: 0, errors: 1 };
      }

      console.log(`Found ${files.length} files recursively in storage for project ${projectId}`);

      // Process each file
      for (const file of files) {
        try {
          // Check if file already exists in database
          const { data: existing } = await this.supabase
            .from('project_files')
            .select('id')
            .eq('project_id', projectId)
            .eq('file_path', file.name)
            .single();

          if (existing) {
            skipped++;
            continue;
          }

          // Download file content
          const { data: fileData, error: downloadError } = await this.supabase.storage
            .from('project-files')
            .download(`${projectId}/${file.name}`);

          if (downloadError || !fileData) {
            console.error(`Error downloading file ${file.name}:`, downloadError);
            errors++;
            continue;
          }

          // Get file content as text
          const content = await fileData.text();
          
          // Create file record with full path
          const fileRecord = this.createFileRecord(file.name, content, file.size || content.length);
          
          // Insert into database
          const { error: insertError } = await this.supabase
            .from('project_files')
            .insert({
              project_id: projectId,
              user_id: userId,
              ...fileRecord
            });

          if (insertError) {
            console.error(`Error inserting file ${file.name}:`, insertError);
            errors++;
          } else {
            migrated++;
            console.log(`✅ Migrated ${file.name} to database`);
          }

        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error);
          errors++;
        }
      }

      console.log(`Migration completed for project ${projectId}: ${migrated} migrated, ${skipped} skipped, ${errors} errors`);
      
      return { migrated, skipped, errors };

    } catch (error) {
      console.error(`Migration failed for project ${projectId}:`, error);
      return { migrated, skipped, errors: errors + 1 };
    }
  }

  /**
   * Create a file record for database storage
   */
  private createFileRecord(fileName: string, content: string, size: number): FileRecord {
    const fileExtension = this.getFileExtension(fileName);
    const isTextFile = this.isTextFile(fileName, content);
    const contentHash = crypto.createHash('sha256').update(content).digest('hex');

    return {
      file_path: fileName,
      file_name: fileName,
      file_extension: fileExtension,
      file_size: size,
      file_content: {
        content,
        encoding: 'utf8'
      },
      content_hash: contentHash,
      content_type: this.getContentType(fileName),
      is_text_file: isTextFile
    };
  }

  /**
   * Get file extension without the dot
   */
  private getFileExtension(fileName: string): string {
    const lastDot = fileName.lastIndexOf('.');
    return lastDot > 0 ? fileName.substring(lastDot + 1).toLowerCase() : '';
  }

  /**
   * Determine if file is text-based for AI analysis
   */
  private isTextFile(fileName: string, content: string): boolean {
    const textExtensions = [
      'js', 'jsx', 'ts', 'tsx', 'json', 'md', 'txt', 'css', 'scss', 'html', 'htm',
      'xml', 'yml', 'yaml', 'toml', 'ini', 'env', 'gitignore', 'py', 'java', 'c',
      'cpp', 'h', 'php', 'rb', 'go', 'rs', 'swift', 'kt', 'sql', 'sh', 'bat'
    ];

    const extension = this.getFileExtension(fileName);
    
    // Check by extension first
    if (textExtensions.includes(extension)) {
      return true;
    }

    // Check by content (simple heuristic)
    try {
      // If content is valid UTF-8 and doesn't contain too many null bytes, consider it text
      const nullBytes = (content.match(/\0/g) || []).length;
      const nullRatio = nullBytes / content.length;
      return nullRatio < 0.1; // Less than 10% null bytes
    } catch {
      return false;
    }
  }

  /**
   * Get MIME content type for file
   */
  private getContentType(fileName: string): string {
    const extension = this.getFileExtension(fileName);
    
    const mimeTypes: { [key: string]: string } = {
      'js': 'application/javascript',
      'jsx': 'application/javascript',
      'ts': 'application/typescript',
      'tsx': 'application/typescript',
      'json': 'application/json',
      'md': 'text/markdown',
      'txt': 'text/plain',
      'css': 'text/css',
      'scss': 'text/css',
      'html': 'text/html',
      'htm': 'text/html',
      'xml': 'application/xml',
      'yml': 'application/yaml',
      'yaml': 'application/yaml',
      'env': 'text/plain'
    };

    return mimeTypes[extension] || 'text/plain';
  }

  /**
   * Get migration status for a project
   */
  async getProjectMigrationStatus(projectId: string): Promise<{
    storageFileCount: number;
    databaseFileCount: number;
    migrationNeeded: boolean;
  }> {
    try {
      // Count files in storage
      const { data: storageFiles } = await this.supabase.storage
        .from('project-files')
        .list(projectId, { limit: 1000 });

      const storageFileCount = storageFiles?.length || 0;

      // Count files in database
      const { count: databaseFileCount } = await this.supabase
        .from('project_files')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', projectId);

      return {
        storageFileCount,
        databaseFileCount: databaseFileCount || 0,
        migrationNeeded: storageFileCount > (databaseFileCount || 0)
      };

    } catch (error) {
      console.error(`Error checking migration status for project ${projectId}:`, error);
      return {
        storageFileCount: 0,
        databaseFileCount: 0,
        migrationNeeded: false
      };
    }
  }

  /**
   * Migrate all projects that need migration
   */
  async migrateAllProjects(): Promise<void> {
    try {
      // Get all projects
      const { data: projects } = await this.supabase
        .from('projects')
        .select('id, user_id, name');

      if (!projects) {
        console.log('No projects found');
        return;
      }

      console.log(`Found ${projects.length} projects to check for migration`);

      for (const project of projects) {
        const status = await this.getProjectMigrationStatus(project.id);
        
        if (status.migrationNeeded) {
          console.log(`\n🚀 Migrating project: ${project.name} (${project.id})`);
          console.log(`Storage files: ${status.storageFileCount}, Database files: ${status.databaseFileCount}`);
          
          const result = await this.migrateProjectFiles(project.id, project.user_id);
          
          console.log(`✅ Migration completed: ${result.migrated} migrated, ${result.skipped} skipped, ${result.errors} errors\n`);
        } else {
          console.log(`✅ Project ${project.name} already migrated or no files to migrate`);
        }
      }

    } catch (error) {
      console.error('Error during bulk migration:', error);
    }
  }
}

// Export factory function
export function createFileMigrationService(): FileMigrationService {
  return new FileMigrationService();
}