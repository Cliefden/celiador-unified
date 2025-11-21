import express from 'express';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

// Access services from app.locals (set by main index.ts)
const getServices = (req: any) => ({
  supabase: req.app.locals.supabase,
  supabaseService: req.app.locals.supabaseService,
  db: req.app.locals.db
});

// Helper functions (TODO: Move to separate service modules)
import { createGitHubFileTreeService } from '../github-filetree-service.js';

async function getTemplateFileStructure(templateKey: string) {
  // Return template-based file structure
  const structures: any = {
    'next-prisma-supabase': [
      {
        name: 'src',
        type: 'directory',
        path: 'src',
        children: [
          { name: 'components', type: 'directory', path: 'src/components', children: [] },
          { name: 'pages', type: 'directory', path: 'src/pages', children: [
            { name: 'index.tsx', type: 'file', path: 'src/pages/index.tsx' },
            { name: '_app.tsx', type: 'file', path: 'src/pages/_app.tsx' }
          ]},
          { name: 'lib', type: 'directory', path: 'src/lib', children: [
            { name: 'supabase.ts', type: 'file', path: 'src/lib/supabase.ts' }
          ]}
        ]
      },
      { name: 'package.json', type: 'file', path: 'package.json' },
      { name: 'README.md', type: 'file', path: 'README.md' },
      { name: '.env.local.example', type: 'file', path: '.env.local.example' }
    ],
    'blog-page': [
      {
        name: 'src',
        type: 'directory',
        path: 'src',
        children: [
          { name: 'components', type: 'directory', path: 'src/components', children: [
            { name: 'BlogPost.tsx', type: 'file', path: 'src/components/BlogPost.tsx' },
            { name: 'BlogList.tsx', type: 'file', path: 'src/components/BlogList.tsx' }
          ]},
          { name: 'pages', type: 'directory', path: 'src/pages', children: [
            { name: 'index.tsx', type: 'file', path: 'src/pages/index.tsx' },
            { name: 'blog', type: 'directory', path: 'src/pages/blog', children: [
              { name: '[slug].tsx', type: 'file', path: 'src/pages/blog/[slug].tsx' }
            ]}
          ]}
        ]
      },
      { name: 'package.json', type: 'file', path: 'package.json' },
      { name: 'README.md', type: 'file', path: 'README.md' }
    ],
    'ecommerce-store': [
      {
        name: 'app',
        type: 'directory',
        path: 'app',
        children: [
          { name: 'about', type: 'directory', path: 'app/about', children: [
            { name: 'page.tsx', type: 'file', path: 'app/about/page.tsx' }
          ]},
          { name: 'account', type: 'directory', path: 'app/account', children: [
            { name: 'page.tsx', type: 'file', path: 'app/account/page.tsx' }
          ]},
          { name: 'admin', type: 'directory', path: 'app/admin', children: [
            { name: 'page.tsx', type: 'file', path: 'app/admin/page.tsx' }
          ]},
          { name: 'auth', type: 'directory', path: 'app/auth', children: [
            { name: 'login', type: 'directory', path: 'app/auth/login', children: [
              { name: 'page.tsx', type: 'file', path: 'app/auth/login/page.tsx' }
            ]},
            { name: 'register', type: 'directory', path: 'app/auth/register', children: [
              { name: 'page.tsx', type: 'file', path: 'app/auth/register/page.tsx' }
            ]}
          ]},
          { name: 'cart', type: 'directory', path: 'app/cart', children: [
            { name: 'page.tsx', type: 'file', path: 'app/cart/page.tsx' }
          ]},
          { name: 'category', type: 'directory', path: 'app/category', children: [
            { name: '[slug]', type: 'directory', path: 'app/category/[slug]', children: [
              { name: 'page.tsx', type: 'file', path: 'app/category/[slug]/page.tsx' }
            ]}
          ]},
          { name: 'checkout', type: 'directory', path: 'app/checkout', children: [
            { name: 'page.tsx', type: 'file', path: 'app/checkout/page.tsx' }
          ]},
          { name: 'contact', type: 'directory', path: 'app/contact', children: [
            { name: 'page.tsx', type: 'file', path: 'app/contact/page.tsx' }
          ]},
          { name: 'faq', type: 'directory', path: 'app/faq', children: [
            { name: 'page.tsx', type: 'file', path: 'app/faq/page.tsx' }
          ]},
          { name: 'order-confirmation', type: 'directory', path: 'app/order-confirmation', children: [
            { name: 'page.tsx', type: 'file', path: 'app/order-confirmation/page.tsx' }
          ]},
          { name: 'privacy', type: 'directory', path: 'app/privacy', children: [
            { name: 'page.tsx', type: 'file', path: 'app/privacy/page.tsx' }
          ]},
          { name: 'product', type: 'directory', path: 'app/product', children: [
            { name: '[id]', type: 'directory', path: 'app/product/[id]', children: [
              { name: 'page.tsx', type: 'file', path: 'app/product/[id]/page.tsx' }
            ]}
          ]},
          { name: 'products', type: 'directory', path: 'app/products', children: [
            { name: 'page.tsx', type: 'file', path: 'app/products/page.tsx' }
          ]},
          { name: 'returns', type: 'directory', path: 'app/returns', children: [
            { name: 'page.tsx', type: 'file', path: 'app/returns/page.tsx' }
          ]},
          { name: 'shipping', type: 'directory', path: 'app/shipping', children: [
            { name: 'page.tsx', type: 'file', path: 'app/shipping/page.tsx' }
          ]},
          { name: 'terms', type: 'directory', path: 'app/terms', children: [
            { name: 'page.tsx', type: 'file', path: 'app/terms/page.tsx' }
          ]},
          { name: 'wishlist', type: 'directory', path: 'app/wishlist', children: [
            { name: 'page.tsx', type: 'file', path: 'app/wishlist/page.tsx' }
          ]},
          { name: 'globals.css', type: 'file', path: 'app/globals.css' },
          { name: 'layout.tsx', type: 'file', path: 'app/layout.tsx' },
          { name: 'page.tsx', type: 'file', path: 'app/page.tsx' }
        ]
      },
      {
        name: 'components',
        type: 'directory',
        path: 'components',
        children: [
          { name: 'CartSidebar.tsx', type: 'file', path: 'components/CartSidebar.tsx' },
          { name: 'Footer.tsx', type: 'file', path: 'components/Footer.tsx' },
          { name: 'Navbar.tsx', type: 'file', path: 'components/Navbar.tsx' },
          { name: 'ProductCard.tsx', type: 'file', path: 'components/ProductCard.tsx' },
          { name: 'ProductFilters.tsx', type: 'file', path: 'components/ProductFilters.tsx' },
          { name: 'ProductImageGallery.tsx', type: 'file', path: 'components/ProductImageGallery.tsx' },
          { name: 'StripeCheckoutForm.tsx', type: 'file', path: 'components/StripeCheckoutForm.tsx' }
        ]
      },
      {
        name: 'lib',
        type: 'directory',
        path: 'lib',
        children: [
          { name: 'data.ts', type: 'file', path: 'lib/data.ts' },
          { name: 'stripe.ts', type: 'file', path: 'lib/stripe.ts' }
        ]
      },
      {
        name: 'store',
        type: 'directory',
        path: 'store',
        children: [
          { name: 'auth.ts', type: 'file', path: 'store/auth.ts' },
          { name: 'cart.ts', type: 'file', path: 'store/cart.ts' },
          { name: 'inventory.ts', type: 'file', path: 'store/inventory.ts' },
          { name: 'orders.ts', type: 'file', path: 'store/orders.ts' }
        ]
      },
      {
        name: 'types',
        type: 'directory',
        path: 'types',
        children: [
          { name: 'index.ts', type: 'file', path: 'types/index.ts' }
        ]
      },
      { name: '.gitignore', type: 'file', path: '.gitignore' },
      { name: 'README.md', type: 'file', path: 'README.md' },
      { name: 'celiador.json', type: 'file', path: 'celiador.json' },
      { name: 'next-env.d.ts', type: 'file', path: 'next-env.d.ts' },
      { name: 'next.config.js', type: 'file', path: 'next.config.js' },
      { name: 'package-lock.json', type: 'file', path: 'package-lock.json' },
      { name: 'package.json', type: 'file', path: 'package.json' },
      { name: 'postcss.config.js', type: 'file', path: 'postcss.config.js' },
      { name: 'tailwind.config.js', type: 'file', path: 'tailwind.config.js' },
      { name: 'tsconfig.json', type: 'file', path: 'tsconfig.json' }
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

// Shared function to build hierarchical tree structure from flat file list
function buildFileTreeFromFiles(files: any[]) {
  const tree: any[] = [];
  const pathMap = new Map();

  // Sort files to process directories before files
  files.sort((a, b) => a.name.localeCompare(b.name));

  for (const file of files) {
    // Decode URL-encoded path components (brackets for Next.js dynamic routes)
    const decodedName = file.name.replace(/%5B/g, '[').replace(/%5D/g, ']');
    const pathParts = decodedName.split('/');
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
          size: file.size || 0,
          updatedAt: file.updatedAt || file.updated_at || file.created_at
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

  // Sort children in each directory (directories first, then files)
  const sortChildren = (node: any) => {
    if (node.children) {
      node.children.sort((a: any, b: any) => {
        if (a.type === 'directory' && b.type === 'file') return -1;
        if (a.type === 'file' && b.type === 'directory') return 1;
        return a.name.localeCompare(b.name);
      });
      node.children.forEach(sortChildren);
    }
  };

  tree.forEach(sortChildren);
  return tree;
}

// GET /projects/:id/files/tree - Get file tree for a project
router.get('/projects/:id/files/tree', authenticateUser, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { supabaseService, db } = getServices(req);
    console.log(`[FileTree] File tree request for project ${id}, user ${req.user?.id}`);
    
    const project = await db.getProjectById(id);
    if (!project || project.userid !== req.user.id) {
      return res.status(404).json({ error: 'Project not found or access denied' });
    }

    if (!supabaseService) {
      return res.status(500).json({ error: 'Storage service not available' });
    }

    console.log(`[FileTree] Building file tree for project ${project.name} using UnifiedFileService (database-first)`);

    try {
      // Get file list only (no content download) for fast file tree
      const { fileService } = await import('../services/unified-file-service.js');
      let files = await fileService.getProjectFileList(id, req.user.id);

      if (!files || files.length === 0) {
        console.warn(`[FileTree] No files found in database for project ${id}, checking for migration`);
        
        // Check if files exist in storage and need migration
        const status = await fileService.checkProjectFilesStatus(id);
        console.log(`[FileTree] Migration status - DB: ${status.databaseFiles}, Storage: ${status.storageFiles}, Migration needed: ${status.migrationNeeded}`);
        
        if (status.migrationNeeded && status.storageFiles > 0) {
          console.log(`[FileTree] 🔄 Auto-migrating ${status.storageFiles} files from storage to database...`);
          
          try {
            const migrationResult = await fileService.migrateStorageFilesToDatabase(id, req.user.id);
            
            if (migrationResult.success && migrationResult.migratedFiles > 0) {
              console.log(`[FileTree] ✅ Auto-migration completed: ${migrationResult.migratedFiles} files migrated`);
              
              // Retry getting files after migration
              files = await fileService.getProjectFileList(id, req.user.id);
              
              if (migrationResult.errors.length > 0) {
                console.warn(`[FileTree] ⚠️ Migration had ${migrationResult.errors.length} errors:`, migrationResult.errors);
              }
            } else {
              console.error(`[FileTree] ❌ Auto-migration failed:`, migrationResult.errors);
            }
          } catch (migrationError) {
            console.error(`[FileTree] ❌ Auto-migration error:`, migrationError);
          }
        }
        
        if (!files || files.length === 0) {
          console.warn(`[FileTree] No files found for project ${id} after migration check`);
          return res.json({ tree: [] });
        }
      }

      // Convert file list to tree format (works for both database and storage sources)
      const fileList = files.map(file => ({
        name: file.path,
        size: file.size || 0,
        updatedAt: file.lastModified
      }));

      console.log(`[FileTree] Found ${fileList.length} total files for project ${id}`);
      console.log(`[FileTree] Sample files:`, fileList.slice(0, 5).map(f => ({ name: f.name, size: f.size })));

      // Build file tree from optimized file list
      const fileTree = buildFileTreeFromFiles(fileList);
      console.log(`[FileTree] ✅ Built file tree with ${fileTree.length} root items`);
      
      return res.json({ tree: fileTree });

    } catch (storageError) {
      console.error(`[FileTree] Storage access failed:`, storageError);
      return res.status(500).json({ error: 'Failed to access project files' });
    }
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
      // SINGLE SOURCE OF TRUTH: Database JSONB with Supabase Storage fallback
      console.log(`[FileContent] Getting file ${path} via UnifiedFileService for project ${id}`);
      
      const { fileService } = await import('../services/unified-file-service.js');
      const file = await fileService.getFile(id, path, req.user.id);

      if (!file) {
        console.warn(`[FileContent] File not found: ${path}`);
        return res.status(404).json({ error: 'File not found' });
      }

      console.log(`[FileContent] ✅ Got file via UnifiedFileService (${file.content.length} chars)`);
      return res.json({ 
        content: file.content, 
        path: file.path, 
        updatedAt: file.lastModified 
      });
      
    } catch (fileError) {
      console.error(`[FileContent] File access failed for ${path}:`, fileError);
      return res.status(500).json({ error: 'Failed to access file' });
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
      // SINGLE SOURCE OF TRUTH: Save to Supabase Storage only
      // Encode path to handle special characters like brackets
      const encodedPath = path.replace(/\[/g, '%5B').replace(/\]/g, '%5D');
      
      const { data, error } = await supabaseService.storage
        .from('project-files')
        .upload(`${id}/${encodedPath}`, content, {
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
      
      console.log(`✅ [File Save] File ${path} updated in project ${id} storage`);
      
      res.json(result);
    } catch (storageError) {
      console.error('Storage save failed:', storageError);
      return res.status(500).json({ error: 'Failed to save file' });
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