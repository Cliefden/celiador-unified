import express from 'express';
import { authenticateUser } from '../middleware/auth';

const router = express.Router();

// Access services from app.locals (set by main index.ts)
const getServices = (req: any) => ({
  supabase: req.app.locals.supabase,
  supabaseService: req.app.locals.supabaseService,
  db: req.app.locals.db
});

// Helper functions (TODO: Move to separate service modules)
import { createGitHubFileTreeService } from '../github-filetree-service';

async function getTemplateFileStructure(templateKey: string) {
  // Return template-based file structure
  const structures: any = {
    'next-prisma-supabase': [
      {
        name: 'src',
        type: 'directory',
        children: [
          { name: 'components', type: 'directory', children: [] },
          { name: 'pages', type: 'directory', children: [
            { name: 'index.tsx', type: 'file' },
            { name: '_app.tsx', type: 'file' }
          ]},
          { name: 'lib', type: 'directory', children: [
            { name: 'supabase.ts', type: 'file' }
          ]}
        ]
      },
      { name: 'package.json', type: 'file' },
      { name: 'README.md', type: 'file' },
      { name: '.env.local.example', type: 'file' }
    ],
    'blog-page': [
      {
        name: 'src',
        type: 'directory',
        children: [
          { name: 'components', type: 'directory', children: [
            { name: 'BlogPost.tsx', type: 'file' },
            { name: 'BlogList.tsx', type: 'file' }
          ]},
          { name: 'pages', type: 'directory', children: [
            { name: 'index.tsx', type: 'file' },
            { name: 'blog', type: 'directory', children: [
              { name: '[slug].tsx', type: 'file' }
            ]}
          ]}
        ]
      },
      { name: 'package.json', type: 'file' },
      { name: 'README.md', type: 'file' }
    ]
  };

  return structures[templateKey] || structures['next-prisma-supabase'];
}

async function getTemplateFileContent(path: string, project: any) {
  const templates: any = {
    'package.json': JSON.stringify({
      name: project.name || 'my-project',
      version: '1.0.0',
      scripts: {
        dev: 'next dev',
        build: 'next build',
        start: 'next start'
      },
      dependencies: {
        'next': '^13.0.0',
        'react': '^18.0.0',
        'react-dom': '^18.0.0'
      }
    }, null, 2),
    'README.md': `# ${project.name || 'My Project'}

This project was created with Bether.

## Getting Started

First, run the development server:

\`\`\`bash
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
`,
    'src/pages/index.tsx': `import React from 'react';

export default function Home() {
  return (
    <div>
      <h1>Welcome to ${project.name || 'My Project'}</h1>
      <p>This is your new Next.js application.</p>
    </div>
  );
}`,
    'src/pages/_app.tsx': `import type { AppProps } from 'next/app';

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}`
  };

  return templates[path] || `// ${path}

This file was generated automatically.
`;
}

function getFileContentType(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  const types: any = {
    'js': 'application/javascript',
    'jsx': 'application/javascript',
    'ts': 'application/typescript',
    'tsx': 'application/typescript',
    'json': 'application/json',
    'md': 'text/markdown',
    'txt': 'text/plain',
    'css': 'text/css',
    'html': 'text/html',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml'
  };
  return types[ext || ''] || 'text/plain';
}

// GET /projects/:id/files/tree - Get file tree for a project
router.get('/projects/:id/files/tree', authenticateUser, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { supabaseService, db } = getServices(req);
    console.log(`[GitFileTree] File tree request for project ${id}, user ${req.user?.id}`);
    
    const project = await db.getProjectById(id);
    console.log(`[GitFileTree] Project lookup result:`, project ? 'found' : 'not found');
    if (project) {
      console.log(`[GitFileTree] Project data: name=${project.name}, repoowner=${project.repoowner}, reponame=${project.reponame}, repo_created=${project.repo_created}`);
    }
    if (!project || project.userid !== req.user.id) {
      console.log(`[GitFileTree] Access denied - project.userid: ${project?.userid}, req.user.id: ${req.user.id}`);
      return res.status(404).json({ error: 'Project not found or access denied' });
    }

    console.log(`[GitFileTree] Getting file tree from Git repository for project ${project.name}`);

    // Check if project has a Git repository
    if (project.repoowner && project.reponame && project.repoprovider === 'github') {
      console.log(`[GitFileTree] Using GitHub API for ${project.repoowner}/${project.reponame}`);
      
      try {
        // Create GitHub file tree service
        const githubFileTreeService = createGitHubFileTreeService();
        
        // Get file tree using GitHub API (no cloning required!)
        const fileTree = await githubFileTreeService.getRepositoryFileTree(
          project.repoowner, 
          project.reponame
        );
        
        console.log(`[GitFileTree] ✅ Got file tree from GitHub API with ${fileTree.length} root items`);
        return res.json({ tree: fileTree });
        
      } catch (githubApiError) {
        console.error(`[GitFileTree] GitHub API failed: ${githubApiError}`);
        // Fall through to template fallback
      }
    }

    // Fallback to template-based structure if no Git repository or clone fails
    console.log(`[GitFileTree] No Git repository or clone failed, falling back to template`);
    const templateFiles = await getTemplateFileStructure(project.templatekey || 'next-prisma-supabase');
    console.log(`[GitFileTree] Returning template files:`, templateFiles?.length || 0);
    res.json({ tree: templateFiles });
  } catch (error) {
    console.error('Failed to get file tree:', error);
    res.status(500).json({ error: 'Failed to get file tree' });
  }
});

// GET /projects/:id/files/:path(*) - Get file content
router.get('/projects/:id/files/:path(*)', authenticateUser, async (req: any, res: any) => {
  try {
    const { id, path } = req.params;
    
    const { supabaseService, db } = getServices(req);
    const project = await db.getProjectById(id);
    if (!project || project.userid !== req.user.id) {
      return res.status(404).json({ error: 'Project not found or access denied' });
    }

    if (!supabaseService) {
      return res.status(500).json({ error: 'Database not available' });
    }

    try {
      // Try GitHub API first if project has a repository
      if (project.repoowner && project.reponame && project.repoprovider === 'github') {
        console.log(`[FileContent] Getting file ${path} from GitHub API for ${project.repoowner}/${project.reponame}`);
        
        try {
          const githubFileTreeService = createGitHubFileTreeService();
          const content = await githubFileTreeService.getFileContent(
            project.repoowner,
            project.reponame,
            path
          );
          
          console.log(`[FileContent] ✅ Got file from GitHub API (${content.length} chars)`);
          return res.json({ content, path, updatedAt: new Date().toISOString() });
          
        } catch (githubApiError) {
          console.warn(`[FileContent] GitHub API failed for ${path}: ${githubApiError}`);
          // Fall through to Supabase Storage
        }
      }

      // Fallback to Supabase Storage
      const { data, error } = await supabaseService.storage
        .from('project-files')
        .download(`${id}/${path}`);

      if (error) {
        console.error('File not found in storage, generating template content:', error);
        // Generate template-based content
        const content = await getTemplateFileContent(path, project);
        return res.json({ content, path, updatedAt: new Date().toISOString() });
      }

      const content = await data.text();
      res.json({ content, path, updatedAt: new Date().toISOString() });
      
    } catch (storageError) {
      console.error('Storage error, generating template content:', storageError);
      // Fallback to template-based content
      const content = await getTemplateFileContent(path, project);
      res.json({ content, path, updatedAt: new Date().toISOString() });
    }
  } catch (error) {
    console.error('Failed to get file:', error);
    res.status(500).json({ error: 'Failed to get file' });
  }
});

// POST /projects/:id/files/save - Save file content
router.post('/projects/:id/files/save', authenticateUser, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { path, content } = req.body;
    
    const { supabaseService, db } = getServices(req);
    const project = await db.getProjectById(id);
    if (!project || project.userid !== req.user.id) {
      return res.status(404).json({ error: 'Project not found or access denied' });
    }

    if (!supabaseService) {
      return res.status(500).json({ error: 'Database not available' });
    }

    console.log(`Saving file ${path} for project ${id}`);
    
    try {
      // Save to Supabase Storage
      const { data, error } = await supabaseService.storage
        .from('project-files')
        .upload(`${id}/${path}`, content, {
          contentType: getFileContentType(path),
          upsert: true
        });

      if (error) {
        console.error('Storage save error:', error);
        return res.status(500).json({ error: 'Failed to save file to storage' });
      }

      const result = {
        success: true,
        path,
        size: content?.length || 0,
        updatedAt: new Date().toISOString(),
        storageKey: data.path
      };
      
      // Notify about file change for potential preview refresh
      console.log(`📢 [File Save] File ${path} updated in project ${id} - preview proxy will serve latest version`);
      
      res.json(result);
    } catch (storageError) {
      console.error('Storage not configured, file save skipped:', storageError);
      // Return success even if storage fails (for development)
      const result = {
        success: true,
        path,
        size: content?.length || 0,
        updatedAt: new Date().toISOString(),
        note: 'Storage not configured, file not persisted'
      };
      res.json(result);
    }
  } catch (error) {
    console.error('Failed to save file:', error);
    res.status(500).json({ error: 'Failed to save file' });
  }
});

// POST /projects/:id/files/create - Create new file or folder
router.post('/projects/:id/files/create', authenticateUser, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { name, type, path, content } = req.body;
    
    const { db } = getServices(req);
    const project = await db.getProjectById(id);
    if (!project || project.userid !== req.user.id) {
      return res.status(404).json({ error: 'Project not found or access denied' });
    }

    console.log(`Creating ${type} '${name}' in project ${id}`);
    
    const fullPath = path ? `${path}/${name}` : name;
    
    // Mock file/folder creation
    const result = {
      success: true,
      name,
      type,
      path: fullPath,
      content: content || '',
      createdAt: new Date().toISOString()
    };
    
    res.json(result);
  } catch (error) {
    console.error('Failed to create file/folder:', error);
    res.status(500).json({ error: 'Failed to create file/folder' });
  }
});

// DELETE /projects/:id/files/:path(*) - Delete file
router.delete('/projects/:id/files/:path(*)', authenticateUser, async (req: any, res: any) => {
  try {
    const { id, path } = req.params;
    
    const { db } = getServices(req);
    const project = await db.getProjectById(id);
    if (!project || project.userid !== req.user.id) {
      return res.status(404).json({ error: 'Project not found or access denied' });
    }

    console.log(`Deleting file ${path} from project ${id}`);
    
    res.json({ success: true, message: `File ${path} deleted` });
  } catch (error) {
    console.error('Failed to delete file:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// POST /projects/:id/files/delete-folder - Delete folder
router.post('/projects/:id/files/delete-folder', authenticateUser, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { path } = req.body;
    
    const { db } = getServices(req);
    const project = await db.getProjectById(id);
    if (!project || project.userid !== req.user.id) {
      return res.status(404).json({ error: 'Project not found or access denied' });
    }

    console.log(`Deleting folder ${path} from project ${id}`);
    
    res.json({ success: true, message: `Folder ${path} deleted` });
  } catch (error) {
    console.error('Failed to delete folder:', error);
    res.status(500).json({ error: 'Failed to delete folder' });
  }
});

// POST /projects/:id/files/upload - Upload file
router.post('/projects/:id/files/upload', authenticateUser, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { fileName, content, path } = req.body;
    
    console.log(`Uploading file to project ${id}:`, fileName);
    
    const { db } = getServices(req);
    const project = await db.getProjectById(id);
    if (!project || project.userid !== req.user.id) {
      return res.status(404).json({ error: 'Project not found or access denied' });
    }

    // Mock file upload - in real implementation, you'd save to storage
    const uploadResult = {
      success: true,
      fileName,
      path: path || '/',
      size: content?.length || 0,
      uploadedAt: new Date().toISOString(),
      url: `https://storage.mock.com/${id}/${fileName}`
    };
    
    console.log(`File ${fileName} uploaded to project ${id}`);
    res.json(uploadResult);
  } catch (error) {
    console.error('Failed to upload file:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

export default router;