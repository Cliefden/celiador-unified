import express from 'express';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

// Access services from app.locals (set by main index.ts)
const getServices = (req: any) => ({
  supabase: req.app.locals.supabase,
  supabaseService: req.app.locals.supabaseService,
  db: req.app.locals.db,
  previewService: req.app.locals.previewService
});

// POST /projects/:id/preview/start - Start a new preview
router.post('/projects/:id/preview/start', authenticateUser, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { name, type } = req.body;
    const { supabaseService, db, previewService } = getServices(req);
    
    console.log(`🚀 [PREVIEW START] Starting preview for project ${id}:`, { name, type });
    console.log(`🔧 [PREVIEW START] Environment: NODE_ENV=${process.env.NODE_ENV}, PORT=${process.env.PORT}`);
    console.log(`💾 [PREVIEW START] Memory usage:`, process.memoryUsage());
    console.log(`🌍 [PREVIEW START] Platform:`, process.platform, process.arch);
    
    const project = await db.getProjectById(id);
    if (!project || project.userid !== req.user.id) {
      return res.status(404).json({ error: 'Project not found or access denied' });
    }

    // Start real preview using PreviewService
    console.log(`📋 [PREVIEW START] Project found:`, { name: project.name, userid: project.userid });
    console.log(`⚡ [PREVIEW START] Calling previewService.startPreview...`);
    
    const preview = await previewService.startPreview(
      id,
      req.user.id,
      name || project.name || 'Project Preview',
      type || 'nextjs',
      req
    );
    
    console.log(`✅ [PREVIEW START] Preview created successfully:`, { id: preview.id, status: preview.status, url: preview.url });
    
    res.status(201).json({
      success: true,
      preview: {
        id: preview.id,
        projectId: preview.projectId,
        userId: preview.userId,
        name: name || project.name || 'Project Preview',
        type: type || 'nextjs',
        status: preview.status,
        url: preview.url,
        port: preview.port,
        localPath: preview.localPath,
        syncResult: preview.syncResult,
        startTime: preview.startTime.toISOString(),
        lastAccessed: preview.lastAccessed.toISOString(),
        errorMessage: preview.errorMessage
      }
    });
  } catch (error) {
    console.error(`❌ [PREVIEW START] Failed to start preview for project ${req.params.id}:`, error);
    console.error(`❌ [PREVIEW START] Error type:`, error instanceof Error ? error.constructor.name : typeof error);
    console.error(`❌ [PREVIEW START] Error message:`, error instanceof Error ? error.message : String(error));
    console.error(`❌ [PREVIEW START] Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
    console.log(`💾 [PREVIEW START] Memory usage after error:`, process.memoryUsage());
    
    res.status(500).json({ 
      error: 'Failed to start preview', 
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined 
    });
  }
});

// DELETE /projects/:id/preview/:previewId - Stop a preview
router.delete('/projects/:id/preview/:previewId', authenticateUser, async (req: any, res: any) => {
  try {
    const { id, previewId } = req.params;
    
    console.log(`Stopping preview ${previewId} for project ${id}`);
    
    const { previewService } = getServices(req);
    
    // Stop real preview using PreviewService
    await previewService.stopPreview(previewId);
    console.log(`Preview ${previewId} stopped for project ${id}`);
    
    res.json({ success: true, message: 'Preview stopped' });
  } catch (error) {
    console.error('Failed to stop preview:', error);
    res.status(500).json({ error: 'Failed to stop preview' });
  }
});

// GET /projects/:id/preview/:previewId/status - Get preview status
router.get('/projects/:id/preview/:previewId/status', authenticateUser, async (req: any, res: any) => {
  try {
    const { id, previewId } = req.params;
    const { supabaseService, db, previewService } = getServices(req);
    
    console.log(`Getting status for preview ${previewId} of project ${id}`);
    
    const project = await db.getProjectById(id);
    if (!project || project.userid !== req.user.id) {
      return res.status(404).json({ error: 'Project not found or access denied' });
    }

    // Get real preview status
    const preview = previewService.getPreview(previewId);
    
    if (!preview) {
      console.log(`[PREVIEW STATUS] Preview ${previewId} not found`);
      return res.status(404).json({ error: 'Preview not found' });
    }

    const responseData = {
      success: true,
      preview: {
        id: preview.id,
        projectId: preview.projectId,
        userId: preview.userId,
        status: preview.status,
        url: preview.url,
        port: preview.port,
        localPath: preview.localPath,
        syncResult: preview.syncResult,
        startTime: preview.startTime.toISOString(),
        lastAccessed: preview.lastAccessed.toISOString(),
        errorMessage: preview.errorMessage
      }
    };
    
    console.log(`[PREVIEW STATUS] Returning status for ${previewId}:`, responseData.preview.status);
    console.log(`[PREVIEW STATUS] Full response data:`, JSON.stringify(responseData, null, 2));
    res.json(responseData);
  } catch (error) {
    console.error(`[PREVIEW STATUS] Error getting status for ${req.params.previewId}:`, error);
    console.error(`[PREVIEW STATUS] Returning 500 error response`);
    res.status(500).json({ error: 'Failed to get preview status' });
  }
});

// GET /projects/:id/preview/list - List all previews for a project
router.get('/projects/:id/preview/list', authenticateUser, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { supabaseService, db, previewService } = getServices(req);
    
    console.log(`Listing previews for project ${id}`);
    
    const project = await db.getProjectById(id);
    if (!project || project.userid !== req.user.id) {
      return res.status(404).json({ error: 'Project not found or access denied' });
    }

    // Get real preview list for project
    const previews = previewService.getPreviewsForProject(id);
    
    const previewList = previews.map((preview: any) => ({
      id: preview.id,
      projectId: preview.projectId,
      userId: preview.userId,
      name: `Preview ${preview.id.split('-')[1]}`,
      type: 'nextjs',
      status: preview.status,
      url: preview.url,
      port: preview.port,
      localPath: preview.localPath,
      syncResult: preview.syncResult,
      startTime: preview.startTime.toISOString(),
      lastAccessed: preview.lastAccessed.toISOString(),
      errorMessage: preview.errorMessage
    }));

    res.json({
      success: true,
      previews: previewList
    });
  } catch (error) {
    console.error('Failed to list previews:', error);
    res.status(500).json({ error: 'Failed to list previews' });
  }
});

// Proxy handler function (unified - handles both content and static assets)
const handleProxyRequest = async (req: any, res: any) => {
  console.log(`🔄 [Preview Proxy] Request received for project ${req.params.id}, preview ${req.params.previewId}`);
  console.log(`🔄 [Preview Proxy] Full request URL: ${req.url}`);
  console.log(`🔄 [Preview Proxy] Method: ${req.method}`);
  console.log(`🔄 [Preview Proxy] Headers:`, Object.keys(req.headers));
  console.log(`🔄 [Preview Proxy] User-Agent:`, req.headers['user-agent']);
  
  // Get services from req
  const { supabaseService, db, previewService } = getServices(req);
  
  // Check if this is an asset request (CSS, JS, images, fonts, etc.)
  const additionalPath = req.params[0] || '';
  const isAssetRequest = additionalPath && (
    additionalPath.includes('/_next/') ||
    additionalPath.match(/\.(css|js|json|png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|eot|map)(\?|$)/) ||
    additionalPath.startsWith('static/') ||
    additionalPath.startsWith('assets/') ||
    additionalPath.includes('_devMiddlewareManifest') ||
    additionalPath.includes('_devPagesManifest') ||
    additionalPath.includes('webpack-hmr') ||
    additionalPath.includes('__nextjs_original-stack-frame')
  );

  console.log(`🔍 [Preview Proxy] Asset detection: ${isAssetRequest ? 'ASSET' : 'CONTENT'} request for path: ${additionalPath}`);

  // Handle authentication via query parameter for iframe requests
  const token = req.query.token;
  if (!token && !isAssetRequest) {
    console.log(`❌ [Preview Proxy] No token provided for non-asset request`);
    return res.status(401).json({ error: 'Authentication token required' });
  }
  
  if (isAssetRequest && !token) {
    console.log(`📦 [Preview Proxy] Asset request without token - allowing: ${additionalPath}`);
    // For asset requests, skip authentication and proceed
    req.user = { id: 'asset-request' };
  }
  
  try {
    const { id: projectId, previewId } = req.params;
    
    // Skip token verification for asset requests or when user is already authenticated
    if (!isAssetRequest && token && !req.user) {
      console.log(`🔑 [Preview Proxy] Token found, verifying authentication...`);
      
      if (!supabaseService) {
        console.log(`❌ [Preview Proxy] Supabase service not available - allowing request for development`);
        req.user = { id: 'dev-user' };
      } else {
        try {
          const { data: { user }, error } = await supabaseService.auth.getUser(token);
          if (error || !user) {
            console.log(`❌ [Preview Proxy] Invalid token:`, error?.message || 'No user returned');
            return res.status(401).json({ error: 'Invalid authentication token' });
          }
          req.user = user;
          console.log(`✅ [Preview Proxy] User authenticated:`, user.id);
        } catch (error) {
          console.log(`❌ [Preview Proxy] Authentication exception:`, error);
          return res.status(401).json({ error: 'Authentication failed' });
        }
      }
    }

    // Check project access for non-asset requests
    if (!isAssetRequest && req.user && req.user.id !== 'asset-request' && req.user.id !== 'dev-user') {
      const project = await db.getProjectById(projectId);
      if (!project || project.userid !== req.user.id) {
        console.log(`🔒 [Preview Proxy] User ${req.user.id} denied access to project ${projectId}`);
        return res.status(404).json({ error: 'Project not found or access denied' });
      }
    }

    // Get the preview instance
    console.log(`🔍 [Preview Proxy] Looking for preview: ${previewId}`);
    const preview = previewService.getPreview(previewId);
    console.log(`🔍 [Preview Proxy] Found preview:`, preview ? { id: preview.id, status: preview.status, url: preview.url } : 'null');
    
    if (!preview) {
      console.log(`❌ [Preview Proxy] Preview ${previewId} not found`);
      return res.status(404).json({ error: 'Preview not found' });
    }

    if (preview.status !== 'running') {
      console.log(`⚠️ [Preview Proxy] Preview ${previewId} status is ${preview.status}, not running`);
      return res.status(503).json({ error: `Preview is ${preview.status}` });
    }

    // Extract the path from the request URL
    const basePath = `/projects/${projectId}/preview/${previewId}/proxy`;
    let targetPath = req.url.replace(basePath, '') || '/';
    
    // Remove leading slash if it exists
    if (targetPath.startsWith('/')) {
      targetPath = targetPath.substring(1);
    }
    
    // If no path, default to root
    if (!targetPath) {
      targetPath = '/';
    } else if (!targetPath.startsWith('/')) {
      targetPath = '/' + targetPath;
    }

    console.log(`🎯 [Preview Proxy] Target path: ${targetPath}`);
    console.log(`🎯 [Preview Proxy] Internal URL: ${preview.internalUrl}`);
    
    // Track last accessed path for all non-asset requests (including root)
    if (!isAssetRequest) {
      // Extract pathname without query parameters
      const cleanPath = targetPath.split('?')[0];
      console.log(`📝 [Preview Proxy] Tracking last accessed path: ${cleanPath} for preview ${previewId}`);
      lastAccessedPaths.set(previewId, cleanPath);
    }

    // Check if we're requesting a file with .html extension
    const requestedFile = targetPath.split('/').pop();
    console.log(`📁 [Preview Proxy] Requested file: ${requestedFile}`);

    // Check Supabase Storage for project files first (unified storage)
    let filePathToCheck = targetPath.replace(/^\//, ''); // Remove leading slash
    if (!filePathToCheck || filePathToCheck === '/') {
      filePathToCheck = 'app/page.tsx'; // Default Next.js 13+ app directory entry point
    }
    
    console.log(`🔍 [Preview Proxy] Checking Supabase storage for file: ${filePathToCheck}`);
    
    try {
      const { data, error } = await supabaseService.storage
        .from('project-files')
        .download(`${projectId}/${filePathToCheck}`);
        
      if (!error && data) {
        console.log(`✅ [Preview Proxy] Found project file in storage: ${filePathToCheck}`);
        const content = await data.text();
        
        // For React/TSX files, create an HTML wrapper for preview
        if (filePathToCheck.endsWith('.tsx') || filePathToCheck.endsWith('.jsx')) {
          const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>Preview - ${filePathToCheck}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 2rem; max-width: 800px; margin: 0 auto; }
    pre { background: #f5f5f5; padding: 1rem; border-radius: 4px; overflow-x: auto; }
    .preview-note { background: #e3f2fd; padding: 1rem; border-radius: 4px; margin-bottom: 1rem; }
  </style>
</head>
<body>
  <div class="preview-note">
    <strong>Supabase Storage Preview:</strong> This file is served from your project's working directory.
  </div>
  <h1>File: ${filePathToCheck}</h1>
  <pre><code>${content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>
</body>
</html>`;
          
          res.set('Content-Type', 'text/html');
          res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.set('Pragma', 'no-cache');
          res.set('Expires', '0');
          
          return res.send(htmlContent);
        } else {
          // Serve other files directly
          const contentType = getFileContentType(filePathToCheck);
          res.set('Content-Type', contentType);
          res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.set('Pragma', 'no-cache');
          res.set('Expires', '0');
          
          return res.send(content);
        }
      }
    } catch (storageError) {
      console.log(`⚠️ [Preview Proxy] Storage check failed for ${filePathToCheck}:`, storageError);
    }

    // Check if we should serve static files (only if dev server failed)
    if (preview.errorMessage && preview.errorMessage.includes('Dev server failed') && preview.localPath) {
      console.log(`📁 [Preview Proxy] Production mode - serving static files from: ${preview.localPath}`);
      
      // Clean the target path - remove query parameters
      const cleanPath = targetPath.split('?')[0] || '/';
      console.log(`📁 [Preview Proxy] Cleaned path: ${cleanPath}`);
      
      // Serve files directly from the file system in production
      try {
        const fs = await import('fs');
        const path = await import('path');
        
        // Determine the file path to serve based on project structure
        let filePath: string;
        
        // Check if this is a Next.js app directory structure or pages directory
        const appDirExists = fs.existsSync(path.join(preview.localPath, 'app'));
        const pagesDirExists = fs.existsSync(path.join(preview.localPath, 'pages'));
        
        console.log(`📁 [Preview Proxy] Project structure: app=${appDirExists}, pages=${pagesDirExists}`);
        
        if (appDirExists) {
          // Next.js 13+ app directory structure
          if (cleanPath === '/' || cleanPath === '') {
            filePath = path.join(preview.localPath, 'app', 'page.tsx');
          } else {
            // Remove leading slash and build path
            const pathSegment = cleanPath.replace(/^\//, '');
            filePath = path.join(preview.localPath, 'app', pathSegment, 'page.tsx');
          }
        } else if (pagesDirExists) {
          // Traditional Next.js pages directory
          if (cleanPath === '/' || cleanPath === '') {
            filePath = path.join(preview.localPath, 'pages', 'index.tsx');
          } else if (cleanPath.endsWith('.tsx') || cleanPath.endsWith('.js')) {
            filePath = path.join(preview.localPath, 'pages', cleanPath);
          } else {
            filePath = path.join(preview.localPath, 'pages', `${cleanPath}.tsx`);
          }
        } else {
          // No standard Next.js structure, try to serve from root
          if (cleanPath === '/' || cleanPath === '') {
            // Look for common entry files
            const possibleFiles = ['index.tsx', 'index.js', 'app.tsx', 'App.tsx', 'README.md'];
            filePath = '';
            for (const file of possibleFiles) {
              const testPath = path.join(preview.localPath, file);
              if (fs.existsSync(testPath)) {
                filePath = testPath;
                break;
              }
            }
            if (!filePath) {
              filePath = path.join(preview.localPath, 'package.json'); // Fallback to package.json
            }
          } else {
            filePath = path.join(preview.localPath, cleanPath);
          }
        }
        
        console.log(`📁 [Preview Proxy] Attempting to serve file: ${filePath}`);
        
        if (fs.existsSync(filePath)) {
          const content = await fs.promises.readFile(filePath, 'utf-8');
          
          // For React/TSX files, return a simple HTML wrapper
          if (filePath.endsWith('.tsx') || filePath.endsWith('.js')) {
            const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>Preview - ${targetPath}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 2rem; max-width: 800px; margin: 0 auto; }
    pre { background: #f5f5f5; padding: 1rem; border-radius: 4px; overflow-x: auto; }
    .preview-note { background: #e3f2fd; padding: 1rem; border-radius: 4px; margin-bottom: 1rem; }
  </style>
</head>
<body>
  <div class="preview-note">
    <strong>Preview Mode:</strong> This is a static preview of your project file.
  </div>
  <h1>File: ${targetPath || 'index'}</h1>
  <pre><code>${content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>
</body>
</html>`;
            
            res.setHeader('Content-Type', 'text/html');
            return res.send(htmlContent);
          } else {
            // Serve other files as-is
            res.setHeader('Content-Type', getFileContentType(filePath));
            return res.send(content);
          }
        }
      } catch (error) {
        console.error(`📁 [Preview Proxy] File serving error:`, error);
      }
      
      // Fallback to showing project structure if file not found
      try {
        const fs = await import('fs');
        const projectFiles = await fs.promises.readdir(preview.localPath!);
        const fallbackHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Preview - ${targetPath || 'unknown'}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 2rem; max-width: 800px; margin: 0 auto; }
    .preview-note { background: #e3f2fd; padding: 1rem; border-radius: 4px; margin-bottom: 1rem; }
    .file-list { background: #f5f5f5; padding: 1rem; border-radius: 4px; }
    .file-item { margin: 0.25rem 0; }
    a { color: #1976d2; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="preview-note">
    <strong>Production Preview:</strong> Your project is being served in static mode.
  </div>
  <h1>Project Files</h1>
  <p>Path requested: <code>${targetPath || 'unknown'}</code></p>
  <p>File not found. Available files in your project:</p>
  <div class="file-list">
    ${projectFiles.map((file: string) => `<div class="file-item">📄 ${file}</div>`).join('')}
  </div>
  <p><strong>Note:</strong> This is a static preview. In a full deployment, your Next.js app would be built and served properly.</p>
</body>
</html>`;
        
        res.setHeader('Content-Type', 'text/html');
        return res.send(fallbackHtml);
      } catch (listError) {
        console.error(`📁 [Preview Proxy] Error listing files:`, listError);
        
        const basicFallbackHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Preview - ${targetPath || 'unknown'}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 2rem; max-width: 800px; margin: 0 auto; }
    .preview-note { background: #e3f2fd; padding: 1rem; border-radius: 4px; margin-bottom: 1rem; }
  </style>
</head>
<body>
  <div class="preview-note">
    <strong>Production Preview:</strong> Your project is being served in static mode.
  </div>
  <h1>Project Preview</h1>
  <p>Path: ${targetPath || 'unknown'}</p>
  <p>This is a preview of your project files.</p>
</body>
</html>`;
        
        res.setHeader('Content-Type', 'text/html');
        return res.send(basicFallbackHtml);
      }
    }

    // If not found in storage or not a file request, proxy to the running preview
    const targetUrl = `${preview.internalUrl}${targetPath}`;
    console.log(`🚀 [Preview Proxy] Proxying to: ${targetUrl}`);

    // Forward the request to the preview server
    // Use native fetch (Node.js 18+) or fallback to node-fetch
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        ...req.headers,
        host: `localhost:${preview.port}` // Override host header
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined
    });

    console.log(`📡 [Preview Proxy] Response status: ${response.status}`);
    console.log(`📡 [Preview Proxy] Response headers:`, Object.fromEntries(response.headers));

    // Copy response headers (but skip some that might cause issues)
    response.headers.forEach((value, key) => {
      // Skip headers that Express should handle or that might cause encoding issues
      const skipHeaders = ['content-length', 'transfer-encoding', 'content-encoding'];
      if (!skipHeaders.includes(key.toLowerCase())) {
        res.set(key, value);
      }
    });

    // Set status code
    res.status(response.status);

    // Get response body (automatically decompresses if gzipped)
    let responseBody = await response.text();
    console.log(`📦 [Preview Proxy] Response body size: ${responseBody.length} characters`);
    
    // Transform HTML content for proxy mode - rewrite asset URLs
    const contentType = response.headers.get('content-type') || '';
    const isHtmlResponse = contentType.includes('text/html');
    
    if (isHtmlResponse) {
      console.log(`🔧 [Preview Proxy] Transforming HTML to rewrite asset URLs`);
      const proxyBasePath = `/projects/${projectId}/preview/${previewId}/proxy`;
      
      // Rewrite _next URLs (Next.js built assets) to go through proxy
      responseBody = responseBody.replace(/href="(\/_next\/[^"]+)"/g, (match, url) => {
        return url.includes('/projects/') ? match : `href="${proxyBasePath}${url}"`;
      });
      responseBody = responseBody.replace(/src="(\/_next\/[^"]+)"/g, (match, url) => {
        return url.includes('/projects/') ? match : `src="${proxyBasePath}${url}"`;
      });
      responseBody = responseBody.replace(/href='(\/_next\/[^']+)'/g, (match, url) => {
        return url.includes('/projects/') ? match : `href='${proxyBasePath}${url}'`;
      });
      responseBody = responseBody.replace(/src='(\/_next\/[^']+)'/g, (match, url) => {
        return url.includes('/projects/') ? match : `src='${proxyBasePath}${url}'`;
      });

      // Get the current token for preserving authentication in navigation links
      const currentToken = req.query.token || '';
      const tokenParam = currentToken ? `?token=${encodeURIComponent(currentToken)}` : '';
      
      console.log(`🔑 [Preview Proxy] Token debugging - req.query.token: ${req.query.token ? 'PRESENT' : 'MISSING'}`);
      console.log(`🔑 [Preview Proxy] tokenParam: ${tokenParam}`);
      
      // Rewrite navigation links to stay within preview context and preserve authentication
      // Match relative paths like "/about", "/contact", etc. but NOT absolute URLs or already-proxied URLs
      responseBody = responseBody.replace(/href="(\/[^"/_][^"]*(?<!\?))"(?![^<]*\/>)/g, (match, url, offset, string) => {
        // Skip if it's already a proxied URL or an external URL
        if (url.includes('/projects/') || url.startsWith('http') || url.startsWith('#') || url.includes('mailto:') || url.includes('tel:')) {
          return match;
        }
        const rewrittenUrl = `${proxyBasePath}${url}${tokenParam}`;
        console.log(`🔧 [Preview Proxy] Rewriting navigation link: ${url} -> ${rewrittenUrl}`);
        return `href="${rewrittenUrl}"`;
      });
      
      // Also handle single quotes
      responseBody = responseBody.replace(/href='(\/[^'/_][^']*(?<!\?))'(?![^<]*\/>)/g, (match, url) => {
        if (url.includes('/projects/') || url.startsWith('http') || url.startsWith('#') || url.includes('mailto:') || url.includes('tel:')) {
          return match;
        }
        const rewrittenUrl = `${proxyBasePath}${url}${tokenParam}`;
        console.log(`🔧 [Preview Proxy] Rewriting navigation link (single quotes): ${url} -> ${rewrittenUrl}`);
        return `href='${rewrittenUrl}'`;
      });

      // Inject script to override webpack chunk loading for dynamic imports
      const webpackOverrideScript = `
        <script>
          (function() {
            console.log('🔧 [Celiador Preview] Injecting webpack chunk override');
            
            // Override webpack's chunk loading to use our proxy
            if (typeof window !== 'undefined' && window.__webpack_require__) {
              const originalPublicPath = __webpack_require__.p;
              console.log('🔧 [Celiador Preview] Original publicPath:', originalPublicPath);
              
              // Set webpack public path to use our proxy
              __webpack_require__.p = '${proxyBasePath}/_next/';
              console.log('🔧 [Celiador Preview] Updated publicPath:', __webpack_require__.p);
            }
            
            // Also intercept dynamic imports that might not use webpack
            const originalFetch = window.fetch;
            window.fetch = function(url, options) {
              if (typeof url === 'string' && url.startsWith('/_next/')) {
                console.log('🔧 [Celiador Preview] Intercepting fetch for:', url);
                url = '${proxyBasePath}' + url;
                console.log('🔧 [Celiador Preview] Redirected fetch to:', url);
              }
              return originalFetch.call(this, url, options);
            };

            // Intercept link clicks to ensure they stay within the preview context
            document.addEventListener('click', function(e) {
              const link = e.target.closest('a');
              if (link && link.href) {
                const url = new URL(link.href);
                // Only handle relative paths that aren't already proxied
                if (url.origin === window.location.origin && 
                    url.pathname.startsWith('/') && 
                    !url.pathname.includes('/projects/') &&
                    !url.pathname.startsWith('/_next/')) {
                  
                  console.log('🔧 [Celiador Preview] Intercepting navigation to:', url.pathname);
                  e.preventDefault();
                  
                  // Preserve authentication token in navigation
                  const currentParams = new URLSearchParams(window.location.search);
                  const token = currentParams.get('token');
                  const tokenParam = token ? 'token=' + encodeURIComponent(token) : '';
                  
                  // Combine existing search params with token
                  const existingSearch = url.search.startsWith('?') ? url.search.substring(1) : url.search;
                  const searchParams = [];
                  if (existingSearch) searchParams.push(existingSearch);
                  if (tokenParam && !existingSearch.includes('token=')) searchParams.push(tokenParam);
                  const finalSearch = searchParams.length > 0 ? '?' + searchParams.join('&') : '';
                  
                  const proxyUrl = '${proxyBasePath}' + url.pathname + finalSearch + url.hash;
                  console.log('🔧 [Celiador Preview] Redirecting to:', proxyUrl);
                  window.location.href = proxyUrl;
                }
              }
            }, true);
            
            console.log('✅ [Celiador Preview] Webpack override injection complete');
          })();
        </script>
      `;
      
      // Add navigation tracking script for regular preview
      const navigationTrackingScript = `
        <script>
          // Track navigation changes and send to parent window
          (function() {
            let currentPath = window.location.pathname;
            
            // Function to get the current actual path
            function getCurrentActualPath() {
              let actualPath = window.location.pathname;
              
              // Extract the actual page path from the proxy URL
              // Pattern: /projects/{projectId}/preview/{previewId}/proxy{actualPath}
              const proxyMatch = actualPath.match(/\/projects\/[^\/]+\/preview\/[^\/]+\/proxy(.*)$/);
              if (proxyMatch) {
                actualPath = proxyMatch[1] || '/';
              }
              
              return actualPath;
            }
            
            // Function to notify parent of navigation
            function notifyNavigation() {
              if (window.parent !== window) {
                const actualPath = getCurrentActualPath();
                
                console.log('🧭 Notifying navigation:', actualPath, '(from:', window.location.pathname, ')');
                window.parent.postMessage({
                  type: 'PREVIEW_NAVIGATION',
                  path: actualPath,
                  timestamp: Date.now()
                }, '*');
              }
            }
            
            // Listen for path requests from parent
            window.addEventListener('message', function(event) {
              if (event.data?.type === 'GET_CURRENT_PATH') {
                const actualPath = getCurrentActualPath();
                console.log('📍 Parent requested current path, responding with:', actualPath);
                if (window.parent !== window) {
                  window.parent.postMessage({
                    type: 'CURRENT_PATH_RESPONSE',
                    path: actualPath,
                    timestamp: Date.now()
                  }, '*');
                }
              }
            });
            
            // Initial path notification
            setTimeout(notifyNavigation, 100);
            
            // Watch for navigation changes
            const originalPushState = history.pushState;
            const originalReplaceState = history.replaceState;
            
            history.pushState = function(...args) {
              originalPushState.apply(this, args);
              setTimeout(notifyNavigation, 10);
            };
            
            history.replaceState = function(...args) {
              originalReplaceState.apply(this, args);
              setTimeout(notifyNavigation, 10);
            };
            
            window.addEventListener('popstate', () => {
              setTimeout(notifyNavigation, 10);
            });
            
            // Watch for hash changes
            window.addEventListener('hashchange', notifyNavigation);
            
            console.log('🧭 Navigation tracking initialized for path:', currentPath);
            console.log('🧭 Navigation tracking can respond to GET_CURRENT_PATH messages');
          })();
        </script>
      `;

      // Inject webpack and navigation scripts only (no inspection script)
      const combinedScript = webpackOverrideScript + navigationTrackingScript;
      if (responseBody.includes('</head>')) {
        responseBody = responseBody.replace('</head>', combinedScript + '</head>');
      } else if (responseBody.includes('</body>')) {
        responseBody = responseBody.replace('</body>', combinedScript + '</body>');
      } else {
        responseBody += combinedScript;
      }
      
      console.log(`✅ [Preview Proxy] HTML transformation complete - asset URLs rewritten and webpack override injected`);
    }
    
    res.send(responseBody);

  } catch (error) {
    console.error(`❌ [Preview Proxy] Error:`, error);
    res.status(500).json({ 
      error: 'Proxy error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

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

// INSPECTION ROUTE MOVED HERE TO PREVENT PROXY WILDCARD FROM INTERCEPTING

// OPTIONS handler for inspection endpoint (CORS preflight)
router.options('/projects/:id/preview/:previewId/inspection', (req: any, res: any) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('X-Frame-Options', 'ALLOWALL');
  res.setHeader('Content-Security-Policy', "frame-ancestors 'self' https://*.vercel.app https://localhost:* http://localhost:*");
  res.status(200).end();
});


// Register both routes - root and wildcard paths (unified handler for content and assets)
router.get('/projects/:id/preview/:previewId/proxy', handleProxyRequest);
router.get('/projects/:id/preview/:previewId/proxy/*', handleProxyRequest);

console.log('✅ [Inspection Preview] Route registered at /projects/:id/preview/:previewId/inspection');

// Track last accessed path for each preview instance
const lastAccessedPaths = new Map<string, string>();

// Clear cache route for debugging
router.post('/projects/:id/preview/:previewId/clear-cache', async (req: any, res: any) => {
  const { previewId } = req.params;
  console.log(`🗑️ [Clear Cache] Clearing lastAccessedPaths for preview ${previewId}`);
  console.log(`🗑️ [Clear Cache] Before clear:`, Array.from(lastAccessedPaths.entries()));
  lastAccessedPaths.delete(previewId);
  console.log(`🗑️ [Clear Cache] After clear:`, Array.from(lastAccessedPaths.entries()));
  res.json({ success: true, message: 'Cache cleared' });
});

// Get last accessed path for a preview
router.get('/projects/:id/preview/:previewId/last-path', async (req: any, res: any) => {
  const { previewId } = req.params;
  const trackedPath = lastAccessedPaths.get(previewId) || '/';
  console.log(`📍 [Last Path] Preview ${previewId} last accessed path: ${trackedPath}`);
  console.log(`📍 [Last Path] All tracked paths:`, Array.from(lastAccessedPaths.entries()));
  res.json({ path: trackedPath });
});

// Reset/set the tracked path for a preview (for debugging)
router.post('/projects/:id/preview/:previewId/set-path', async (req: any, res: any) => {
  const { previewId } = req.params;
  const { path } = req.body;
  const newPath = path || '/';
  lastAccessedPaths.set(previewId, newPath);
  console.log(`📍 [Set Path] Preview ${previewId} path manually set to: ${newPath}`);
  res.json({ success: true, path: newPath });
});

// Inspection preview endpoint - generates server-side inspection overlay using JSDOM
router.get('/projects/:id/preview/:previewId/inspection', async (req: any, res: any) => {
  console.log(`🔍 [INSPECTION ENDPOINT HIT] Request for project ${req.params.id}, preview ${req.params.previewId}`);
  console.log(`🔍 [INSPECTION ENDPOINT HIT] Full URL: ${req.url}`);
  console.log(`🔍 [Inspection Preview] Query params:`, req.query);
  console.log(`🔍 [Inspection Preview] Cache-busting timestamp:`, req.query._t);
  
  // Handle authentication via query parameter for iframe requests
  const token = req.query.token;
  console.log(`🔍 [Inspection Preview] Raw token from query:`, typeof token, token ? `${String(token).substring(0, 50)}...` : 'null');
  
  if (!token) {
    console.log(`❌ [Inspection Preview] No token provided`);
    return res.status(401).send(`
      <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 20px; text-align: center;">
          <h2>Authentication Required</h2>
          <p>Please log in to view the inspection mode.</p>
        </body>
      </html>
    `);
  }
  
  // Decode the token if it's URL encoded
  let decodedToken = decodeURIComponent(String(token));
  console.log(`🔍 [Inspection Preview] Decoded token:`, `${decodedToken.substring(0, 50)}...`);
  console.log(`🔍 [Inspection Preview] Token segments:`, decodedToken.split('.').length);
  
  // Verify token if Supabase is available
  const { supabaseService } = getServices(req);
  if (supabaseService) {
    try {
      const { data: { user }, error } = await supabaseService.auth.getUser(decodedToken);
      if (error || !user) {
        console.log(`❌ [Inspection Preview] Invalid token:`, error?.message || 'No user returned');
        return res.status(401).send(`
          <html>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 20px; text-align: center;">
              <h2>Authentication Failed</h2>
              <p>Your session has expired. Please refresh the page and log in again.</p>
            </body>
          </html>
        `);
      }
      req.user = user;
      console.log(`✅ [Inspection Preview] User authenticated:`, user.id);
    } catch (error) {
      console.log(`❌ [Inspection Preview] Authentication exception:`, error);
      return res.status(401).send(`
        <html>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 20px; text-align: center;">
            <h2>Authentication Error</h2>
            <p>Unable to verify your session. Please try logging in again.</p>
          </body>
        </html>
      `);
    }
  }
  
  try {
    const { id, previewId } = req.params;
    
    console.log(`[Inspection Preview] Generating inspection layer for preview ${previewId}`);
    
    // Get the preview instance
    const { previewService } = getServices(req);
    console.log(`🔍 [Inspection Preview] Looking for preview: ${previewId}`);
    const preview = previewService.getPreview(previewId);
    console.log(`🔍 [Inspection Preview] Found preview:`, preview ? { id: preview.id, status: preview.status, url: preview.url } : 'null');
    
    if (!preview || preview.status !== 'running') {
      console.log(`❌ [Inspection Preview] Preview not found or not running. Status: ${preview?.status || 'null'}`);
      return res.status(404).send(`
        <html>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 20px; text-align: center;">
            <h2>Preview Not Available</h2>
            <p>The preview is not currently running. Please start a preview first to use inspection mode.</p>
          </body>
        </html>
      `);
    }
    
    // Prefer frontend-provided path over backend tracking (frontend knows the current state better)
    const frontendPathRaw = req.query.path;
    const trackedPath = lastAccessedPaths.get(req.params.previewId);
    
    // Decode the frontend path if it exists (handles URL encoding like %2F -> /)
    let frontendPath = null;
    if (frontendPathRaw !== undefined && frontendPathRaw !== null && frontendPathRaw !== '') {
      frontendPath = decodeURIComponent(String(frontendPathRaw));
    }
    
    console.log(`🔍 [Inspection Preview] Frontend raw path: ${frontendPathRaw}`);
    console.log(`🔍 [Inspection Preview] Frontend decoded path: ${frontendPath}`);
    console.log(`🔍 [Inspection Preview] Backend tracked path: ${trackedPath}`);
    console.log(`🔍 [Inspection Preview] lastAccessedPaths size: ${lastAccessedPaths.size}, keys: ${Array.from(lastAccessedPaths.keys()).join(', ')}`);
    
    let pathToInspect;
    if (frontendPath) {
      pathToInspect = frontendPath;
      console.log(`🔍 [Inspection Preview] ✅ Using frontend-provided path: ${pathToInspect}`);
    } else if (trackedPath) {
      pathToInspect = trackedPath;
      console.log(`🔍 [Inspection Preview] ⚠️ Using backend-tracked path: ${pathToInspect}`);
    } else {
      pathToInspect = '/';
      console.log(`🔍 [Inspection Preview] 🔄 Defaulting to root path: ${pathToInspect}`);
    }
    
    console.log(`🔍 [Inspection Preview] Final path to inspect: ${pathToInspect}`);
    
    // Update path tracking so exit inspection returns to correct page
    lastAccessedPaths.set(previewId, pathToInspect);
    console.log(`📝 [Inspection Preview] Updated last accessed path to: ${pathToInspect}`);
    
    // Fetch original HTML from preview for the specific path
    // Use native fetch (Node.js 18+)
    
    // Ensure pathToInspect starts with / and construct proper URL
    const normalizedPath = pathToInspect.startsWith('/') ? pathToInspect : `/${pathToInspect}`;
    const targetUrl = `${preview.internalUrl}${normalizedPath}`;
    console.log(`🚀 [Inspection Preview] Fetching content from: ${targetUrl} (path: ${pathToInspect})`);
    const originalResponse = await fetch(targetUrl);
    
    if (!originalResponse.ok) {
      console.log(`❌ [Inspection Preview] Failed to fetch preview content: ${originalResponse.status}`);
      return res.status(originalResponse.status).json({ error: 'Failed to fetch preview content' });
    }
    
    let originalHtml = await originalResponse.text();
    
    // Remove any existing base tags to prevent JSDOM URL resolution conflicts
    originalHtml = originalHtml.replace(/<base[^>]*>/gi, '');
    
    // Generate inspection overlay HTML with URL rewriting for assets
    // Use the public preview proxy URL instead of internal URL for asset loading
    const publicProxyUrl = preview.url; // This should be the publicly accessible proxy URL
    console.log(`🔍 [Inspection Preview] Using public proxy URL for assets: ${publicProxyUrl}`);
    const inspectionHtml = await generateInspectionOverlay(originalHtml, id, previewId, publicProxyUrl);
    
    console.log('✅ [Inspection Preview] Generated inspection overlay HTML');
    
    // Set headers to allow iframe embedding from the frontend domain
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('X-Frame-Options', 'ALLOWALL'); // Allow iframe embedding
    res.setHeader('Content-Security-Policy', "frame-ancestors 'self' https://*.vercel.app https://celiador.ai https://www.celiador.ai https://localhost:* http://localhost:*"); // Allow embedding from Vercel, celiador.ai, and localhost
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allow CORS for inspection endpoint
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Force cache refresh for inspection endpoint
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    res.send(inspectionHtml);
    
  } catch (error) {
    console.error('Inspection preview error:', error);
    res.status(500).send(`
      <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 20px; text-align: center;">
          <h2>Inspection Error</h2>
          <p>Unable to generate inspection overlay. Please try again or contact support.</p>
        </body>
      </html>
    `);
  }
});

// Helper function to guess component name from element context
function guessComponentName(el: any, textContent: string, className: string): string {
  // Try data attributes first
  const testId = el.getAttribute('data-testid');
  if (testId) return testId;
  
  const component = el.getAttribute('data-component');
  if (component) return component;
  
  // Try to extract from class names (common React patterns)
  if (className) {
    // Look for component-like class names
    const componentMatch = className.match(/([A-Z][a-zA-Z]*(?:Component|Button|Input|Form|Card|Modal|Dialog))/);
    if (componentMatch) return componentMatch[1];
    
    // Look for BEM or styled-component patterns
    const bemMatch = className.match(/^([a-z]+(?:-[a-z]+)*)/);
    if (bemMatch) return `${bemMatch[1]}Component`;
  }
  
  // Fallback based on element type and content
  if (el.tagName === 'BUTTON') {
    const text = textContent.trim().replace(/\s+/g, '');
    if (text && text.length < 20) {
      return `${text.charAt(0).toUpperCase() + text.slice(1)}Button`;
    }
    return 'Button';
  } else if (el.tagName === 'A') {
    return 'Link';
  } else if (el.tagName === 'INPUT') {
    const type = el.getAttribute('type') || 'text';
    return `${type.charAt(0).toUpperCase() + type.slice(1)}Input`;
  } else if (el.tagName === 'NAV') {
    return 'Navigation';
  } else if (el.tagName === 'HEADER') {
    return 'Header';
  } else if (el.tagName === 'MAIN') {
    return 'MainContent';
  }
  
  return el.tagName.toLowerCase();
}

// Generate enhanced CSS selector with better specificity
function generateEnhancedSelector(el: any): string {
  const path = [];
  let current = el;
  
  while (current && current.tagName && current.tagName !== 'BODY') {
    let selector = current.tagName.toLowerCase();
    
    // Add ID if available
    if (current.id) {
      selector += `#${current.id}`;
      path.unshift(selector);
      break; // ID is unique, we can stop here
    }
    
    // Add meaningful classes
    if (current.className) {
      const classes = current.className.split(/\s+/)
        .filter((cls: string) => cls && !cls.includes('celiador'))
        .slice(0, 2); // Limit to 2 most relevant classes
      if (classes.length > 0) {
        selector += '.' + classes.join('.');
      }
    }
    
    // Add nth-child for specificity if no unique identifiers
    if (!current.id && !current.className) {
      const siblings = Array.from(current.parentNode?.children || []);
      const index = siblings.indexOf(current) + 1;
      if (index > 1) {
        selector += `:nth-child(${index})`;
      }
    }
    
    path.unshift(selector);
    current = current.parentElement;
  }
  
  return path.join(' > ');
}

// Extract React/Next.js specific information
function extractReactInformation(className: string, textContent: string): any {
  const info: any = {
    isNextjsComponent: false,
    isTailwindStyled: false,
    possibleFramework: 'unknown'
  };
  
  if (className) {
    // Check for Tailwind CSS classes
    if (className.match(/(^|\s)(bg-|text-|p-|m-|flex|grid|w-|h-)/)) {
      info.isTailwindStyled = true;
      info.possibleFramework = 'tailwind';
    }
    
    // Check for CSS modules patterns
    if (className.match(/_[a-zA-Z0-9]+/)) {
      info.isCSSModules = true;
      info.possibleFramework = 'css-modules';
    }
    
    // Check for styled-components patterns
    if (className.match(/^[a-z]+-[A-Za-z0-9]+/)) {
      info.isStyledComponents = true;
      info.possibleFramework = 'styled-components';
    }
  }
  
  return info;
}

// Get semantic context about the element's purpose
function getSemanticContext(el: any, textContent: string, className: string): any {
  const context: any = {
    purpose: 'unknown',
    interactive: false,
    formRelated: false
  };
  
  // Determine semantic purpose
  if (el.tagName === 'BUTTON' || el.getAttribute('role') === 'button') {
    context.purpose = 'action';
    context.interactive = true;
    
    // Classify button type by text content
    const text = textContent.toLowerCase();
    if (text.includes('submit') || text.includes('save') || text.includes('send')) {
      context.actionType = 'submit';
    } else if (text.includes('cancel') || text.includes('close') || text.includes('dismiss')) {
      context.actionType = 'cancel';
    } else if (text.includes('delete') || text.includes('remove')) {
      context.actionType = 'destructive';
    } else if (text.includes('edit') || text.includes('modify')) {
      context.actionType = 'edit';
    } else if (text.includes('add') || text.includes('create') || text.includes('new')) {
      context.actionType = 'create';
    }
  } else if (el.tagName === 'A') {
    context.purpose = 'navigation';
    context.interactive = true;
  } else if (['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)) {
    context.purpose = 'input';
    context.interactive = true;
    context.formRelated = true;
  } else if (['NAV', 'HEADER', 'MAIN', 'ASIDE', 'FOOTER'].includes(el.tagName)) {
    context.purpose = 'layout';
  } else if (textContent.length > 50) {
    context.purpose = 'content';
  }
  
  return context;
}

// Generate inspection overlay HTML with clickable elements using JSDOM
async function generateInspectionOverlay(originalHtml: string, projectId: string, previewId: string, originalPreviewUrl: string): Promise<string> {
  console.log('🔍 [Inspection Overlay] Parsing HTML and generating inspection layer');
  
  try {
    // Import JSDOM
    const { JSDOM } = await import('jsdom');
    
    // Parse the HTML with JSDOM
    const dom = new JSDOM(originalHtml);
    const document = dom.window.document;
    
    // Find all interactive elements
    const selectors = [
      'button',
      'input',
      'select',
      'textarea',
      'a[href]',
      '[onclick]',
      '[role="button"]',
      'nav',
      'header',
      'main',
      'section',
      'div[class*="button"]',
      'div[class*="link"]',
      'span[class*="button"]',
      'span[class*="link"]'
    ];
    
    const elements: any[] = [];
    
    selectors.forEach((selector, selectorIndex) => {
      const foundElements = document.querySelectorAll(selector);
      foundElements.forEach((el, elementIndex) => {
        // Skip elements that are too small or hidden
        const style = el.getAttribute('style') || '';
        if (style.includes('display: none') || style.includes('visibility: hidden')) {
          return;
        }
        
        // Skip our own inspection elements
        if (el.classList.contains('inspection-overlay') || 
            el.id?.includes('celiador') || 
            el.className?.includes('celiador')) {
          return;
        }
        
        const tagName = el.tagName.toLowerCase();
        const className = el.className || '';
        const textContent = el.textContent?.trim() || '';
        const id = el.id || '';
        
        // Determine element type based on tag and attributes
        let elementType = 'unknown';
        if (tagName === 'button' || el.getAttribute('role') === 'button') {
          elementType = 'button';
        } else if (tagName === 'a') {
          elementType = 'link';
        } else if (['input', 'select', 'textarea'].includes(tagName)) {
          elementType = 'form-field';
        } else if (['nav', 'header', 'main', 'section'].includes(tagName)) {
          elementType = 'layout';
        } else if (className.includes('button') || textContent.match(/^(click|submit|save|delete|edit|add|create|update|cancel|ok|yes|no)$/i)) {
          elementType = 'interactive';
        } else if (textContent.length > 0 && textContent.length < 100) {
          elementType = 'text';
        }
        
        // Enhanced component name detection
        const componentName = guessComponentName(el, textContent, className);
        
        // Generate more comprehensive CSS selector
        const enhancedSelector = generateEnhancedSelector(el);
        
        // Capture all attributes for better context
        const allAttributes: Record<string, string> = {};
        Array.from(el.attributes).forEach(attr => {
          allAttributes[attr.name] = attr.value;
        });
        
        // Capture parent context for better AI understanding
        const parentElement = el.parentElement;
        const parentContext = parentElement ? {
          tagName: parentElement.tagName.toLowerCase(),
          className: parentElement.className || '',
          id: parentElement.id || '',
          role: parentElement.getAttribute('role')
        } : null;
        
        // Extract React/Next.js specific information from classes
        const reactInfo = extractReactInformation(className, textContent);
        
        const elementData = {
          id: `${tagName}_${selectorIndex}_${elementIndex}`,
          type: elementType,
          tagName: tagName,
          className: className,
          textContent: textContent.substring(0, 200), // More text context
          selector: enhancedSelector,
          componentName: componentName,
          boundingBox: {
            // Note: These will be calculated on the client side as JSDOM doesn't have layout info
            x: 0,
            y: 0,
            width: 0,
            height: 0
          },
          attributes: allAttributes,
          styles: {}, // Will be populated on client side
          context: {
            parent: parentContext,
            reactInfo: reactInfo,
            semantic: getSemanticContext(el, textContent, className)
          }
        };
        
        elements.push(elementData);
        
        // Add inspection data attributes to the element
        el.setAttribute('data-celiador-element', JSON.stringify(elementData));
        el.setAttribute('data-celiador-index', elementData.id);
      });
    });
    
    console.log(`🔍 [Inspection Overlay] Found ${elements.length} interactive elements`);
    
    // Rewrite relative URLs to point to original preview server using string replacement
    let htmlString = dom.serialize();
    
    // Single comprehensive URL rewriting to avoid conflicts
    // Use a more robust approach that handles all cases in one pass
    console.log(`🔍 [Debug] Sample URLs before rewriting:`, htmlString.match(/(href|src)=["'][^"']+["']/g)?.slice(0, 3));
    
    htmlString = htmlString.replace(
      /(href|src|action)=["'](\/[^"']*?)["']/g, 
      (match, attr, url) => {
        console.log(`🔍 [Debug] Processing URL: ${attr}="${url}"`);
        // Skip URLs that are already absolute
        if (url.startsWith('//') || url.includes('http')) {
          console.log(`🔍 [Debug] Skipping absolute URL: ${url}`);
          return match;
        }
        // Rewrite relative URLs to absolute URLs pointing to preview server
        const newUrl = `${attr}="${originalPreviewUrl}${url}"`;
        console.log(`🔍 [Debug] Rewritten URL: ${newUrl}`);
        return newUrl;
      }
    );
    
    console.log(`🔍 [Debug] Sample URLs after rewriting:`, htmlString.match(/(href|src)=["'][^"']+["']/g)?.slice(0, 3));
    
    // Fix WebSocket connections for Next.js HMR
    htmlString = htmlString.replace(/ws:\/\/localhost:\d+/g, originalPreviewUrl.replace('http', 'ws'));
    htmlString = htmlString.replace(/wss:\/\/localhost:\d+/g, originalPreviewUrl.replace('http', 'wss'));
    
    // Fix dynamic imports and chunk loading
    htmlString = htmlString.replace(/__webpack_require__\.p\s*=\s*["'][^"']*["']/g, `__webpack_require__.p = "${originalPreviewUrl}/"`);
    
    console.log(`✅ [Inspection Overlay] Rewritten asset URLs and WebSocket connections for: ${originalPreviewUrl}`);
    
    // Add inspection overlay styles and script directly to the HTML string
    const inspectionStyles = `
<style id="celiador-inspection-styles">
  [data-celiador-element] {
    position: relative;
    cursor: pointer !important;
  }
  
  [data-celiador-element]:hover {
    outline: 2px solid #3b82f6 !important;
    outline-offset: -2px !important;
    background-color: rgba(59, 130, 246, 0.1) !important;
  }
  
  .celiador-inspection-tooltip {
    position: absolute;
    background: #1f2937;
    color: #f9fafb;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 12px;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    white-space: nowrap;
    z-index: 999999;
    pointer-events: none;
    transform: translateY(-100%);
    margin-top: -8px;
    border: 1px solid #374151;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    max-width: 300px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .celiador-inspection-active [data-celiador-element] {
    pointer-events: auto !important;
  }
</style>`;

    const timestamp = Date.now();
    console.log(`🔍 [Inspection Overlay] Adding enhanced inspection script with timestamp: ${timestamp}`);
    
    const inspectionScript = `
<script id="celiador-inspection-script-${timestamp}">
  console.log('🎯 Celiador Server-Side Inspection Ready - ENHANCED VERSION v3.1 - Timestamp: ${timestamp}');
  console.log('🎯 DEBUG: Script timestamp:', '${timestamp}');
  console.log('🎯 DEBUG: document.body available:', !!document.body);
  console.log('🎯 DEBUG: window object available:', !!window);
  console.log('🎯 DEBUG: Current URL:', window.location.href);
  console.log('🎯 DEBUG: Elements with data-celiador-element:', document.querySelectorAll('[data-celiador-element]').length);
  
  // Add inspection class to body
  document.body.classList.add('celiador-inspection-active');
  console.log('🎯 DEBUG: Added inspection class to body');
  
  // Handle element clicks
  document.addEventListener('click', function(event) {
    console.log('🎯 DEBUG v3.0: Click event triggered on:', event.target);
    console.log('🎯 DEBUG v3.0: Target tag:', event.target.tagName);
    console.log('🎯 DEBUG v3.0: Target classes:', event.target.className);
    
    const element = event.target.closest('[data-celiador-element]');
    console.log('🎯 DEBUG v3.0: Found element with data-celiador-element:', !!element);
    
    if (element) {
      console.log('🎯 DEBUG v3.0: Processing click on element:', element);
      console.log('🎯 DEBUG v3.0: Element data attribute:', element.getAttribute('data-celiador-element'));
      event.preventDefault();
      event.stopPropagation();
      
      const elementData = JSON.parse(element.getAttribute('data-celiador-element') || '{}');
      
      // Enhance element data with real-time information
      const rect = element.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(element);
      
      // Update bounding box with real coordinates
      elementData.boundingBox = {
        x: rect.left + window.scrollX,
        y: rect.top + window.scrollY,
        width: rect.width,
        height: rect.height
      };
      
      // Capture important computed styles
      elementData.styles = {
        display: computedStyle.display,
        position: computedStyle.position,
        backgroundColor: computedStyle.backgroundColor,
        color: computedStyle.color,
        fontSize: computedStyle.fontSize,
        fontFamily: computedStyle.fontFamily,
        fontWeight: computedStyle.fontWeight,
        padding: computedStyle.padding,
        margin: computedStyle.margin,
        border: computedStyle.border,
        borderRadius: computedStyle.borderRadius,
        zIndex: computedStyle.zIndex,
        opacity: computedStyle.opacity,
        transform: computedStyle.transform,
        boxShadow: computedStyle.boxShadow,
        textAlign: computedStyle.textAlign,
        lineHeight: computedStyle.lineHeight
      };
      
      // Update current text content
      elementData.textContent = element.textContent?.trim().substring(0, 200) || '';
      
      // Add accessibility information
      elementData.accessibility = {
        hasAriaLabel: !!element.getAttribute('aria-label'),
        role: element.getAttribute('role'),
        tabIndex: element.tabIndex,
        isVisible: rect.width > 0 && rect.height > 0 && computedStyle.visibility !== 'hidden',
        isFocusable: element.tabIndex >= 0 || ['INPUT', 'BUTTON', 'SELECT', 'TEXTAREA', 'A'].includes(element.tagName)
      };
      
      // Enhance parent context with computed styles
      if (elementData.context && elementData.context.parent && element.parentElement) {
        const parentRect = element.parentElement.getBoundingClientRect();
        const parentStyle = window.getComputedStyle(element.parentElement);
        
        elementData.context.parent.boundingBox = {
          x: parentRect.left + window.scrollX,
          y: parentRect.top + window.scrollY,
          width: parentRect.width,
          height: parentRect.height
        };
        elementData.context.parent.styles = {
          display: parentStyle.display,
          position: parentStyle.position,
          backgroundColor: parentStyle.backgroundColor,
          padding: parentStyle.padding
        };
      }
      
      console.log('🎯 Enhanced Celiador Element Data:', elementData);
      
      // Send enhanced inspection data to parent window
      if (window.parent !== window) {
        window.parent.postMessage({
          type: 'INSPECTION_ELEMENT_CLICKED',
          element: elementData,
          timestamp: Date.now()
        }, '*');
      }
    }
  }, true);
  
  console.log('✅ Celiador Inspection Event Handlers Registered');
</script>`;
    
    // Add Next.js compatibility script and styles without base tag
    const nextjsCompatScript = `
<script>
  // Fix Next.js runtime configuration for inspection mode
  if (typeof window !== 'undefined') {
    // Override fetch to use absolute URLs when needed
    const originalFetch = window.fetch;
    window.fetch = function(url, options) {
      if (typeof url === 'string' && url.startsWith('/_next/')) {
        url = '${originalPreviewUrl}' + url;
      }
      return originalFetch.call(this, url, options);
    };
    
    // Fix webpack public path
    if (typeof __webpack_require__ !== 'undefined') {
      __webpack_require__.p = '${originalPreviewUrl}/';
    }
  }
</script>`;
    
    if (htmlString.includes('</head>')) {
      htmlString = htmlString.replace('</head>', nextjsCompatScript + inspectionStyles + '\n</head>');
    }
    
    // Insert script before </body> in HTML string  
    if (htmlString.includes('</body>')) {
      htmlString = htmlString.replace('</body>', inspectionScript + '\n</body>');
    } else {
      // If no </body> tag, append at end
      htmlString += inspectionScript;
    }
    
    console.log('✅ [Inspection Overlay] Generated inspection overlay with server-side element detection and URL rewriting');
    
    return htmlString;
    
  } catch (error) {
    console.error('❌ [Inspection Overlay] Error generating overlay:', error);
    // Fallback: return original HTML with basic inspection layer
    return originalHtml + `
<script>
  console.log('⚠️ Celiador Inspection - Fallback mode');
  window.parent.postMessage({ type: 'INSPECTION_ERROR', error: 'Failed to generate overlay' }, '*');
</script>`;
  }
}

// Fallback route for direct _next requests that bypass the iframe proxy
// This helps handle dynamic chunk loading requests
router.get('/_next/*', async (req: any, res: any) => {
  console.log(`🔄 [Preview Fallback] Direct _next request: ${req.url}`);
  
  // Try to find any running preview to proxy the request to
  // This is a fallback - ideally all requests should go through the proper proxy
  const { previewService } = getServices(req);
  
  if (!previewService) {
    console.log(`❌ [Preview Fallback] No preview service available`);
    return res.status(503).json({ error: 'Preview service not available' });
  }
  
  // Get all running preview instances
  const allInstances = Array.from((previewService as any).instances.values());
  const runningPreviews = allInstances.filter((instance: any) => instance.status === 'running');
  
  if (runningPreviews.length === 0) {
    console.log(`❌ [Preview Fallback] No running previews found`);
    return res.status(404).json({ error: 'No running previews available' });
  }
  
  // Use the first running preview (could be improved with better logic)
  const preview = runningPreviews[0] as any;
  console.log(`🔄 [Preview Fallback] Using preview ${preview.id} for request`);
  
  try {
    const targetPath = req.url;
    const targetUrl = `${preview.internalUrl}${targetPath}`;
    console.log(`🚀 [Preview Fallback] Proxying to: ${targetUrl}`);

    // Use native fetch (Node.js 18+)
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        ...req.headers,
        host: `localhost:${preview.port}`
      }
    });

    console.log(`📡 [Preview Fallback] Response status: ${response.status}`);

    // Copy response headers
    response.headers.forEach((value, key) => {
      const skipHeaders = ['content-length', 'transfer-encoding', 'content-encoding'];
      if (!skipHeaders.includes(key.toLowerCase())) {
        res.set(key, value);
      }
    });

    res.status(response.status);
    const responseBody = await response.text();
    res.send(responseBody);

  } catch (error) {
    console.error(`❌ [Preview Fallback] Error:`, error);
    res.status(500).json({ 
      error: 'Fallback proxy error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Catch-all route for preview navigation - handles any path that might be a preview route
// This should be one of the last routes to avoid conflicts
router.get('/*', async (req: any, res: any) => {
  const path = req.path;
  
  // Skip if this is already a handled route pattern - let these pass through to other routes
  if (path.startsWith('/projects/') || 
      path.startsWith('/api/') || 
      path.startsWith('/templates') ||
      path.startsWith('/backups') ||
      path.startsWith('/health') ||
      path.startsWith('/_next/')) {
    return; // Don't handle this request, let it pass to other routes
  }
  
  console.log(`🔄 [Preview Navigation] Potential preview navigation request: ${path}`);
  
  // Try to find any running preview to proxy the request to
  const { previewService } = getServices(req);
  
  if (!previewService) {
    console.log(`❌ [Preview Navigation] No preview service available`);
    return res.status(404).json({ error: 'Not found' });
  }
  
  // Get all running preview instances
  const allInstances = Array.from((previewService as any).instances.values());
  const runningPreviews = allInstances.filter((instance: any) => instance.status === 'running');
  
  if (runningPreviews.length === 0) {
    console.log(`❌ [Preview Navigation] No running previews found`);
    return res.status(404).json({ error: 'Not found' });
  }
  
  // Use the first running preview (could be improved with better logic)
  const preview = runningPreviews[0] as any;
  console.log(`🔄 [Preview Navigation] Using preview ${preview.id} for navigation to ${path}`);
  
  // Track this navigation path for inspection mode (including root)
  if (!path.startsWith('/_next/') && !path.includes('?')) {
    lastAccessedPaths.set(preview.id, path);
    console.log(`📝 [Preview Navigation] Tracking navigation path: ${path} for preview ${preview.id}`);
  }
  
  try {
    const targetUrl = `${preview.internalUrl}${path}`;
    console.log(`🚀 [Preview Navigation] Proxying to: ${targetUrl}`);

    // Use native fetch (Node.js 18+)
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        ...req.headers,
        host: `localhost:${preview.port}`
      }
    });

    console.log(`📡 [Preview Navigation] Response status: ${response.status}`);

    // Copy response headers
    response.headers.forEach((value, key) => {
      const skipHeaders = ['content-length', 'transfer-encoding', 'content-encoding'];
      if (!skipHeaders.includes(key.toLowerCase())) {
        res.set(key, value);
      }
    });

    res.status(response.status);
    let responseBody = await response.text();
    
    // Apply the same HTML transformations for navigation responses
    const contentType = response.headers.get('content-type') || '';
    const isHtmlResponse = contentType.includes('text/html');
    
    if (isHtmlResponse) {
      console.log(`🔧 [Preview Navigation] Applying HTML transformations for navigation response`);
      const proxyBasePath = `/projects/${(preview as any).projectId}/preview/${(preview as any).id}/proxy`;
      
      // Apply all the same transformations as the main proxy
      responseBody = responseBody.replace(/href="(\/_next\/[^"]+)"/g, (match, url) => {
        return url.includes('/projects/') ? match : `href="${proxyBasePath}${url}"`;
      });
      responseBody = responseBody.replace(/src="(\/_next\/[^"]+)"/g, (match, url) => {
        return url.includes('/projects/') ? match : `src="${proxyBasePath}${url}"`;
      });
      responseBody = responseBody.replace(/href='(\/_next\/[^']+)'/g, (match, url) => {
        return url.includes('/projects/') ? match : `href='${proxyBasePath}${url}'`;
      });
      responseBody = responseBody.replace(/src='(\/_next\/[^']+)'/g, (match, url) => {
        return url.includes('/projects/') ? match : `src='${proxyBasePath}${url}'`;
      });

      // Rewrite navigation links
      responseBody = responseBody.replace(/href="(\/[^"/_][^"]*(?<!\?))"(?![^<]*\/>)/g, (match, url) => {
        if (url.includes('/projects/') || url.startsWith('http') || url.startsWith('#') || url.includes('mailto:') || url.includes('tel:')) {
          return match;
        }
        return `href="${proxyBasePath}${url}"`;
      });
      responseBody = responseBody.replace(/href='(\/[^'/_][^']*(?<!\?))'(?![^<]*\/>)/g, (match, url) => {
        if (url.includes('/projects/') || url.startsWith('http') || url.startsWith('#') || url.includes('mailto:') || url.includes('tel:')) {
          return match;
        }
        return `href='${proxyBasePath}${url}'`;
      });

      // Inject the same webpack override script
      const webpackOverrideScript = `
        <script>
          (function() {
            if (typeof window !== 'undefined' && window.__webpack_require__) {
              __webpack_require__.p = '${proxyBasePath}/_next/';
            }
            
            const originalFetch = window.fetch;
            window.fetch = function(url, options) {
              if (typeof url === 'string' && url.startsWith('/_next/')) {
                url = '${proxyBasePath}' + url;
              }
              return originalFetch.call(this, url, options);
            };

            document.addEventListener('click', function(e) {
              const link = e.target.closest('a');
              if (link && link.href) {
                const url = new URL(link.href);
                if (url.origin === window.location.origin && 
                    url.pathname.startsWith('/') && 
                    !url.pathname.includes('/projects/') &&
                    !url.pathname.startsWith('/_next/')) {
                  e.preventDefault();
                  // Preserve authentication token in navigation
                  const currentParams = new URLSearchParams(window.location.search);
                  const token = currentParams.get('token');
                  const tokenParam = token ? 'token=' + encodeURIComponent(token) : '';
                  
                  // Combine existing search params with token
                  const existingSearch = url.search.startsWith('?') ? url.search.substring(1) : url.search;
                  const searchParams = [];
                  if (existingSearch) searchParams.push(existingSearch);
                  if (tokenParam && !existingSearch.includes('token=')) searchParams.push(tokenParam);
                  const finalSearch = searchParams.length > 0 ? '?' + searchParams.join('&') : '';
                  
                  const proxyUrl = '${proxyBasePath}' + url.pathname + finalSearch + url.hash;
                  window.location.href = proxyUrl;
                }
              }
            }, true);
          })();
        </script>
      `;
      
      if (responseBody.includes('</head>')) {
        responseBody = responseBody.replace('</head>', webpackOverrideScript + '</head>');
      } else if (responseBody.includes('</body>')) {
        responseBody = responseBody.replace('</body>', webpackOverrideScript + '</body>');
      } else {
        responseBody += webpackOverrideScript;
      }
    }
    
    res.send(responseBody);

  } catch (error) {
    console.error(`❌ [Preview Navigation] Error:`, error);
    res.status(404).json({ error: 'Not found' });
  }
});

export default router;