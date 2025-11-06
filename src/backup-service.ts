import { SupabaseClient } from '@supabase/supabase-js';

interface FileBackup {
  id: string;
  userId: string;
  projectId: string;
  filePath: string;
  originalContent: string;
  backupTimestamp: string;
  operationType: 'update' | 'delete';
  jobId?: string;
}

export class BackupService {
  private supabase: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
  }

  /**
   * Create a backup of a file before modification
   */
  async createBackup(
    userId: string,
    projectId: string,
    filePath: string,
    originalContent: string,
    operationType: 'update' | 'delete',
    jobId?: string
  ): Promise<string> {
    try {
      console.log(`[BackupService] Creating backup for ${filePath} in project ${projectId}`);

      const backupData = {
        userid: userId,
        projectid: projectId,
        filepath: filePath,
        originalcontent: originalContent,
        backuptimestamp: new Date().toISOString(),
        operationtype: operationType,
        jobid: jobId
      };

      const { data, error } = await this.supabase
        .from('file_backups')
        .insert([backupData])
        .select()
        .single();

      if (error) {
        // Check if error is due to missing table - if so, log warning and return mock ID
        if (error.message.includes('table') && error.message.includes('not') && error.message.includes('found')) {
          console.warn(`[BackupService] file_backups table not found - backup disabled`);
          return 'backup-disabled';
        }
        throw new Error(`Failed to create backup: ${error.message}`);
      }

      console.log(`[BackupService] Backup created with ID: ${data.id}`);
      return data.id;
    } catch (error: any) {
      console.error(`[BackupService] Error creating backup:`, error);
      // Check if error is due to missing table - if so, log warning and return mock ID
      if (error.message.includes('table') && error.message.includes('not') && error.message.includes('found')) {
        console.warn(`[BackupService] file_backups table not found - backup disabled`);
        return 'backup-disabled';
      }
      throw error;
    }
  }

  /**
   * Restore a file from backup
   */
  async restoreFromBackup(backupId: string, userId: string): Promise<{
    projectId: string;
    filePath: string;
    content: string;
  }> {
    try {
      console.log(`[BackupService] Restoring from backup ID: ${backupId}`);

      // Get backup record
      const { data: backup, error: fetchError } = await this.supabase
        .from('file_backups')
        .select('*')
        .eq('id', backupId)
        .eq('userid', userId)
        .single();

      if (fetchError || !backup) {
        throw new Error(`Backup not found or access denied: ${fetchError?.message || 'Not found'}`);
      }

      // Store the file content back to storage
      const storagePath = `${userId}/${backup.projectid}/${backup.filepath}`;
      const { error: storageError } = await this.supabase.storage
        .from('project-files')
        .upload(storagePath, backup.originalcontent, {
          upsert: true
        });

      if (storageError) {
        throw new Error(`Failed to restore file to storage: ${storageError.message}`);
      }

      console.log(`[BackupService] File restored successfully: ${backup.filepath}`);

      return {
        projectId: backup.projectid,
        filePath: backup.filepath,
        content: backup.originalcontent
      };
    } catch (error: any) {
      console.error(`[BackupService] Error restoring backup:`, error);
      throw error;
    }
  }

  /**
   * Get backup history for a project
   */
  async getBackupHistory(
    projectId: string,
    userId: string,
    limit = 50
  ): Promise<FileBackup[]> {
    try {
      const { data, error } = await this.supabase
        .from('file_backups')
        .select('*')
        .eq('projectid', projectId)
        .eq('userid', userId)
        .order('backuptimestamp', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`Failed to fetch backup history: ${error.message}`);
      }

      return (data || []).map(backup => ({
        id: backup.id,
        userId: backup.userid,
        projectId: backup.projectid,
        filePath: backup.filepath,
        originalContent: backup.originalcontent,
        backupTimestamp: backup.backuptimestamp,
        operationType: backup.operationtype,
        jobId: backup.jobid
      }));
    } catch (error: any) {
      console.error(`[BackupService] Error fetching backup history:`, error);
      throw error;
    }
  }

  /**
   * Clean up old backups (keep only last N backups per file)
   */
  async cleanupOldBackups(
    projectId: string,
    userId: string,
    keepCount = 10
  ): Promise<number> {
    try {
      console.log(`[BackupService] Cleaning up old backups for project ${projectId}`);

      // Get all backups for the project
      const { data: allBackups, error: fetchError } = await this.supabase
        .from('file_backups')
        .select('id, filepath, backuptimestamp')
        .eq('projectid', projectId)
        .eq('userid', userId)
        .order('backuptimestamp', { ascending: false });

      if (fetchError) {
        throw new Error(`Failed to fetch backups for cleanup: ${fetchError.message}`);
      }

      if (!allBackups || allBackups.length === 0) {
        return 0;
      }

      // Group by file path and find old backups to delete
      const fileGroups: { [filePath: string]: any[] } = {};
      allBackups.forEach(backup => {
        if (!fileGroups[backup.filepath]) {
          fileGroups[backup.filepath] = [];
        }
        fileGroups[backup.filepath].push(backup);
      });

      const backupsToDelete: string[] = [];
      Object.values(fileGroups).forEach(backups => {
        if (backups.length > keepCount) {
          const oldBackups = backups.slice(keepCount);
          backupsToDelete.push(...oldBackups.map(b => b.id));
        }
      });

      if (backupsToDelete.length === 0) {
        return 0;
      }

      // Delete old backups
      const { error: deleteError } = await this.supabase
        .from('file_backups')
        .delete()
        .in('id', backupsToDelete);

      if (deleteError) {
        throw new Error(`Failed to delete old backups: ${deleteError.message}`);
      }

      console.log(`[BackupService] Deleted ${backupsToDelete.length} old backups`);
      return backupsToDelete.length;
    } catch (error: any) {
      console.error(`[BackupService] Error during backup cleanup:`, error);
      throw error;
    }
  }

  /**
   * Get file content for backup (fetches from storage)
   */
  async getFileContentForBackup(
    userId: string,
    projectId: string,
    filePath: string
  ): Promise<string> {
    try {
      const storagePath = `${userId}/${projectId}/${filePath}`;
      
      const { data, error } = await this.supabase.storage
        .from('project-files')
        .download(storagePath);

      if (error) {
        // File might not exist, return empty content
        console.warn(`[BackupService] Could not fetch file for backup: ${error.message}`);
        return '';
      }

      const content = await data.text();
      return content;
    } catch (error: any) {
      console.error(`[BackupService] Error fetching file content for backup:`, error);
      return '';
    }
  }
}

export default BackupService;