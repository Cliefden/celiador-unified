import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);
export class GitTemplateService {
    constructor(supabaseService) {
        this.supabaseService = supabaseService;
        this.tempDir = '/tmp/celiador-templates';
        this.allowedSources = [
            'https://github.com/celiador-templates/',
            'https://github.com/your-org/private-templates/' // For enterprise
        ];
    }
    /**
     * Get validated template from Supabase and return template metadata
     */
    async getValidatedTemplate(templateKey) {
        console.log(`[GitTemplate] Validating template: ${templateKey}`);
        try {
            const { data: template, error } = await this.supabaseService
                .from('templates')
                .select('*')
                .eq('template_key', templateKey)
                .eq('is_active', true)
                .single();
            if (error || !template) {
                throw new Error(`Template '${templateKey}' not found or inactive`);
            }
            // Validate the storage_path is from allowed sources
            if (!this.isValidTemplateSource(template.storage_path)) {
                throw new Error(`Template '${templateKey}' has invalid repository source: ${template.storage_path}`);
            }
            console.log(`[GitTemplate] ✅ Template validated: ${template.name} -> ${template.storage_path}`);
            return template;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`[GitTemplate] ❌ Template validation failed: ${errorMessage}`);
            throw new Error(`Template validation failed: ${errorMessage}`);
        }
    }
    /**
     * Get all available templates from Supabase with Git validation status
     */
    async getAvailableTemplates() {
        console.log(`[GitTemplate] Fetching available templates with Git validation`);
        try {
            const { data: templates, error } = await this.supabaseService
                .from('templates')
                .select(`
          *,
          templates_categories!inner(
            template_categories(*)
          ),
          templates_features(
            template_features(*)
          )
        `)
                .eq('is_active', true)
                .order('rating', { ascending: false });
            if (error) {
                throw new Error(`Failed to fetch templates: ${error.message}`);
            }
            console.log(`[GitTemplate] ✅ Found ${templates?.length || 0} active templates`);
            // Add Git validation status to each template
            const templatesWithGitStatus = templates?.map((template) => {
                const hasValidGitRepo = this.isValidTemplateSource(template.storage_path);
                const isGitRepo = template.storage_path?.startsWith('https://github.com/');
                return {
                    ...template,
                    git_status: {
                        has_valid_repo: hasValidGitRepo,
                        is_git_repo: isGitRepo,
                        repo_url: template.storage_path,
                        debug_info: hasValidGitRepo ? '✅ Git Ready' : '❌ No Git Repo'
                    }
                };
            }) || [];
            // Log debug information
            const gitReady = templatesWithGitStatus.filter((t) => t.git_status.has_valid_repo);
            const noGit = templatesWithGitStatus.filter((t) => !t.git_status.has_valid_repo);
            console.log(`[GitTemplate] 📊 Git Status Summary:`);
            console.log(`   ✅ Git Ready: ${gitReady.length} templates`);
            if (gitReady.length > 0) {
                gitReady.forEach((t) => console.log(`      • ${t.template_key}: ${t.storage_path}`));
            }
            console.log(`   ❌ No Git Repo: ${noGit.length} templates`);
            if (noGit.length > 0) {
                noGit.forEach((t) => console.log(`      • ${t.template_key}: ${t.storage_path || 'null'}`));
            }
            return templatesWithGitStatus;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`[GitTemplate] ❌ Failed to fetch templates: ${errorMessage}`);
            throw new Error(`Failed to fetch templates: ${errorMessage}`);
        }
    }
    /**
     * Clone a validated template repository to a temporary directory
     */
    async cloneValidatedTemplate(templateKey, branch = 'main') {
        // First validate the template through Supabase
        const template = await this.getValidatedTemplate(templateKey);
        // Then clone from the validated repository URL
        return await this.cloneTemplate(template.storage_path, branch);
    }
    /**
     * Clone a Git repository to a temporary directory
     */
    async cloneTemplate(repoUrl, branch = 'main') {
        const templateId = this.generateTemplateId(repoUrl);
        const templatePath = path.join(this.tempDir, templateId);
        console.log(`[GitTemplate] Cloning ${repoUrl}#${branch} to ${templatePath}`);
        try {
            // Ensure temp directory exists
            await fs.mkdir(this.tempDir, { recursive: true });
            // Remove existing directory if it exists
            try {
                await fs.rm(templatePath, { recursive: true, force: true });
            }
            catch (error) {
                // Directory doesn't exist, that's fine
            }
            // Clone the repository
            const cloneCommand = `git clone --depth 1 --branch ${branch} "${repoUrl}" "${templatePath}"`;
            const { stdout, stderr } = await execAsync(cloneCommand);
            if (stderr && !stderr.includes('Cloning into')) {
                console.warn(`[GitTemplate] Git clone warnings: ${stderr}`);
            }
            console.log(`[GitTemplate] Successfully cloned template to ${templatePath}`);
            return templatePath;
        }
        catch (error) {
            console.error(`[GitTemplate] Failed to clone template: ${error}`);
            throw new Error(`Failed to clone template from ${repoUrl}: ${error}`);
        }
    }
    /**
     * Download validated template as ZIP (fallback for GitHub repos)
     */
    async downloadValidatedTemplateZip(templateKey, commitSha) {
        // First validate the template through Supabase
        const template = await this.getValidatedTemplate(templateKey);
        // Then download from the validated repository URL
        return await this.downloadTemplateZip(template.storage_path, commitSha);
    }
    /**
     * Download template as ZIP (fallback for GitHub repos)
     */
    async downloadTemplateZip(repoUrl, commitSha) {
        const templateId = this.generateTemplateId(repoUrl);
        const templatePath = path.join(this.tempDir, templateId);
        console.log(`[GitTemplate] Downloading ${repoUrl} as ZIP to ${templatePath}`);
        try {
            // Convert GitHub repo URL to download URL
            const zipUrl = this.getGitHubZipUrl(repoUrl, commitSha);
            // Ensure temp directory exists
            await fs.mkdir(this.tempDir, { recursive: true });
            // Remove existing directory if it exists
            try {
                await fs.rm(templatePath, { recursive: true, force: true });
            }
            catch (error) {
                // Directory doesn't exist, that's fine
            }
            // Download and extract ZIP
            const downloadCommand = `curl -L "${zipUrl}" -o "${templatePath}.zip" && unzip -q "${templatePath}.zip" -d "${templatePath}" && rm "${templatePath}.zip"`;
            await execAsync(downloadCommand);
            // GitHub ZIP extracts to a subfolder, move contents up
            const contents = await fs.readdir(templatePath);
            const subDir = contents.find(item => item.includes('-'));
            if (subDir) {
                const subDirPath = path.join(templatePath, subDir);
                const subContents = await fs.readdir(subDirPath);
                // Move all contents from subdirectory to template path
                for (const item of subContents) {
                    await execAsync(`mv "${path.join(subDirPath, item)}" "${templatePath}"/`);
                }
                // Remove empty subdirectory
                await fs.rmdir(subDirPath);
            }
            console.log(`[GitTemplate] Successfully downloaded template to ${templatePath}`);
            return templatePath;
        }
        catch (error) {
            console.error(`[GitTemplate] Failed to download template: ${error}`);
            throw new Error(`Failed to download template from ${repoUrl}: ${error}`);
        }
    }
    /**
     * Get template metadata from celiador.json file
     */
    async getTemplateMetadata(templatePath) {
        try {
            const metadataPath = path.join(templatePath, 'celiador.json');
            const metadataContent = await fs.readFile(metadataPath, 'utf-8');
            return JSON.parse(metadataContent);
        }
        catch (error) {
            console.warn(`[GitTemplate] No celiador.json found in template: ${error}`);
            return null;
        }
    }
    /**
     * List all files in template directory recursively
     */
    async listTemplateFiles(templatePath) {
        const skipPatterns = [
            '.git',
            'node_modules',
            '.next',
            'dist',
            'build',
            '.DS_Store',
            'celiador.json',
            'upload-template.js',
            '*.log'
        ];
        const shouldSkip = (filePath) => {
            const relativePath = path.relative(templatePath, filePath);
            return skipPatterns.some(pattern => {
                if (pattern.includes('*')) {
                    return relativePath.includes(pattern.replace('*', ''));
                }
                return relativePath.includes(pattern);
            });
        };
        const buildTree = async (dirPath) => {
            const items = await fs.readdir(dirPath, { withFileTypes: true });
            const result = [];
            for (const item of items) {
                const fullPath = path.join(dirPath, item.name);
                if (shouldSkip(fullPath)) {
                    continue;
                }
                const relativePath = path.relative(templatePath, fullPath);
                if (item.isDirectory()) {
                    const children = await buildTree(fullPath);
                    result.push({
                        name: item.name,
                        type: 'directory',
                        path: relativePath,
                        children
                    });
                }
                else {
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
        return buildTree(templatePath);
    }
    /**
     * Copy template files to user's project in Supabase Storage
     */
    async copyToUserProject(templatePath, projectId, userId) {
        console.log(`[GitTemplate] Copying template files to project ${projectId}`);
        const copyFile = async (filePath) => {
            const fullPath = path.join(templatePath, filePath);
            const stats = await fs.stat(fullPath);
            if (stats.isFile()) {
                const content = await fs.readFile(fullPath);
                const storageKey = `${userId}/${projectId}/${filePath}`;
                console.log(`[GitTemplate] Uploading file: ${filePath} -> ${storageKey}`);
                const { error } = await this.supabaseService.storage
                    .from('project-files')
                    .upload(storageKey, content, {
                    contentType: this.getContentType(filePath),
                    upsert: true
                });
                if (error) {
                    console.error(`[GitTemplate] Failed to upload ${filePath}: ${error.message}`);
                    throw new Error(`Failed to upload ${filePath}: ${error.message}`);
                }
            }
        };
        const copyDirectory = async (dirPath) => {
            const fullPath = path.join(templatePath, dirPath);
            const items = await fs.readdir(fullPath, { withFileTypes: true });
            for (const item of items) {
                const itemPath = path.join(dirPath, item.name);
                const fullItemPath = path.join(templatePath, itemPath);
                // Skip patterns
                if (this.shouldSkipFile(fullItemPath, templatePath)) {
                    continue;
                }
                if (item.isDirectory()) {
                    await copyDirectory(itemPath);
                }
                else {
                    await copyFile(itemPath);
                }
            }
        };
        // Start copying from root
        await copyDirectory('');
        console.log(`[GitTemplate] Successfully copied template to project ${projectId}`);
    }
    /**
     * Cleanup temporary template directory
     */
    async cleanup(templatePath) {
        try {
            await fs.rm(templatePath, { recursive: true, force: true });
            console.log(`[GitTemplate] Cleaned up template directory: ${templatePath}`);
        }
        catch (error) {
            console.warn(`[GitTemplate] Failed to cleanup ${templatePath}: ${error}`);
        }
    }
    /**
     * Validate that template repository is from an allowed source
     */
    isValidTemplateSource(repoUrl) {
        if (!repoUrl) {
            return false;
        }
        const isValid = this.allowedSources.some(source => repoUrl.startsWith(source));
        if (!isValid) {
            console.warn(`[GitTemplate] ⚠️ Invalid template source: ${repoUrl}`);
            console.warn(`[GitTemplate] Allowed sources: ${this.allowedSources.join(', ')}`);
        }
        return isValid;
    }
    /**
     * Update template repository URL in Supabase (for migration)
     */
    async updateTemplateRepository(templateKey, newRepoUrl) {
        console.log(`[GitTemplate] Updating template ${templateKey} -> ${newRepoUrl}`);
        // Validate the new repository URL
        if (!this.isValidTemplateSource(newRepoUrl)) {
            throw new Error(`Invalid repository source: ${newRepoUrl}`);
        }
        try {
            const { error } = await this.supabaseService
                .from('templates')
                .update({
                storage_path: newRepoUrl,
                updated_at: new Date().toISOString()
            })
                .eq('template_key', templateKey);
            if (error) {
                throw new Error(`Failed to update template: ${error.message}`);
            }
            console.log(`[GitTemplate] ✅ Updated template ${templateKey} repository`);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`[GitTemplate] ❌ Failed to update template: ${errorMessage}`);
            throw new Error(`Failed to update template repository: ${errorMessage}`);
        }
    }
    // Helper methods
    generateTemplateId(repoUrl) {
        return repoUrl.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    }
    getGitHubZipUrl(repoUrl, commitSha) {
        // Convert git@github.com:owner/repo.git to https://github.com/owner/repo/archive/refs/heads/main.zip
        const match = repoUrl.match(/github\.com[:/](.+?)\/(.+?)(?:\.git)?$/);
        if (!match) {
            throw new Error(`Invalid GitHub repo URL: ${repoUrl}`);
        }
        const [, owner, repo] = match;
        const ref = commitSha || 'main';
        return `https://github.com/${owner}/${repo}/archive/refs/heads/${ref}.zip`;
    }
    shouldSkipFile(filePath, basePath) {
        const relativePath = path.relative(basePath, filePath);
        const skipPatterns = [
            '.git',
            'node_modules',
            '.next',
            'dist',
            'build',
            '.DS_Store',
            'celiador.json',
            'upload-template.js',
            '*.log',
            '.env.local',
            'package-lock.json',
            'yarn.lock'
        ];
        return skipPatterns.some(pattern => {
            if (pattern.includes('*')) {
                return relativePath.includes(pattern.replace('*', ''));
            }
            return relativePath.includes(pattern);
        });
    }
    getContentType(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        const contentTypes = {
            '.js': 'text/javascript',
            '.jsx': 'text/javascript',
            '.ts': 'text/typescript',
            '.tsx': 'text/typescript',
            '.json': 'application/json',
            '.css': 'text/css',
            '.html': 'text/html',
            '.md': 'text/markdown',
            '.txt': 'text/plain',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.svg': 'image/svg+xml',
            '.ico': 'image/x-icon'
        };
        return contentTypes[ext] || 'text/plain';
    }
}
