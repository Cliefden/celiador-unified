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
    additionalPath.match(/\.(css|js|png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|eot)(\?|$)/) ||
    additionalPath.startsWith('static/') ||
    additionalPath.startsWith('assets/')
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
    
    // Track last accessed path for non-asset, non-root requests
    if (!isAssetRequest) {
      // Extract pathname without query parameters
      const cleanPath = targetPath.split('?')[0];
      if (cleanPath !== '/') {
        console.log(`📝 [Preview Proxy] Tracking last accessed path: ${cleanPath} for preview ${previewId}`);
        lastAccessedPaths.set(previewId, cleanPath);
      }
    }

    // Check if we're requesting a file with .html extension
    const requestedFile = targetPath.split('/').pop();
    console.log(`📁 [Preview Proxy] Requested file: ${requestedFile}`);

    // Check for AI-modified files in Supabase Storage first
    if (requestedFile && requestedFile.includes('.')) {
      console.log(`🔍 [Preview Proxy] Checking Supabase storage for file: ${requestedFile}`);
      
      try {
        const { data, error } = await supabaseService.storage
          .from('project-files')
          .download(`${projectId}/${requestedFile}`);
          
        if (!error && data) {
          console.log(`✅ [Preview Proxy] Found AI-modified file in storage: ${requestedFile}`);
          const content = await data.text();
          const contentType = getFileContentType(requestedFile);
          
          res.set('Content-Type', contentType);
          res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.set('Pragma', 'no-cache');
          res.set('Expires', '0');
          
          return res.send(content);
        }
      } catch (storageError) {
        console.log(`⚠️ [Preview Proxy] Storage check failed for ${requestedFile}:`, storageError);
      }
    }

    // If not found in storage or not a file request, proxy to the running preview
    const targetUrl = `${preview.internalUrl}${targetPath}`;
    console.log(`🚀 [Preview Proxy] Proxying to: ${targetUrl}`);

    // Forward the request to the preview server
    const fetch = (await import('node-fetch')).default;
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

      // Rewrite navigation links to stay within preview context
      // Match relative paths like "/about", "/contact", etc. but NOT absolute URLs or already-proxied URLs
      responseBody = responseBody.replace(/href="(\/[^"/_][^"]*(?<!\?))"(?![^<]*\/>)/g, (match, url, offset, string) => {
        // Skip if it's already a proxied URL or an external URL
        if (url.includes('/projects/') || url.startsWith('http') || url.startsWith('#') || url.includes('mailto:') || url.includes('tel:')) {
          return match;
        }
        console.log(`🔧 [Preview Proxy] Rewriting navigation link: ${url} -> ${proxyBasePath}${url}`);
        return `href="${proxyBasePath}${url}"`;
      });
      
      // Also handle single quotes
      responseBody = responseBody.replace(/href='(\/[^'/_][^']*(?<!\?))'(?![^<]*\/>)/g, (match, url) => {
        if (url.includes('/projects/') || url.startsWith('http') || url.startsWith('#') || url.includes('mailto:') || url.includes('tel:')) {
          return match;
        }
        console.log(`🔧 [Preview Proxy] Rewriting navigation link (single quotes): ${url} -> ${proxyBasePath}${url}`);
        return `href='${proxyBasePath}${url}'`;
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
                  
                  const proxyUrl = '${proxyBasePath}' + url.pathname + url.search + url.hash;
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

      // Add inspection script for same-origin iframe access
      const inspectionScript = `
        <script>
          console.log('🎯 [Celiador Inspection] Setting up inspection system');
          
          // Inspection system for same-origin iframe
          class CeliadorInspector {
            constructor() {
              this.isEnabled = false;
              this.elements = [];
              this.setupMessageListener();
            }
            
            setupMessageListener() {
              window.addEventListener('message', (event) => {
                if (event.origin !== window.location.origin) return;
                
                if (event.data.type === 'ENABLE_INSPECTION') {
                  console.log('🎯 [Celiador Inspection] Enabling inspection mode');
                  this.enableInspection();
                } else if (event.data.type === 'DISABLE_INSPECTION') {
                  console.log('🎯 [Celiador Inspection] Disabling inspection mode');
                  this.disableInspection();
                }
              });
            }
            
            enableInspection() {
              this.isEnabled = true;
              this.mapDOMElements();
              this.sendElementsToParent();
            }
            
            disableInspection() {
              this.isEnabled = false;
              this.elements = [];
            }
            
            mapDOMElements() {
              console.log('🔍 [Celiador Inspection] Mapping DOM elements');
              
              const selectors = [
                'button',
                'input:not([type="hidden"])',
                'select',
                'textarea',
                'a[href]:not([href="#"]):not([href^="javascript:"])',
                '[onclick]',
                '[role="button"]',
                'nav',
                'header',
                'main',
                'section',
                'div[class*="button"]:not(.celiador-inspection-overlay)',
                'div[class*="link"]:not(.celiador-inspection-overlay)',
                'span[class*="button"]:not(.celiador-inspection-overlay)',
                'span[class*="link"]:not(.celiador-inspection-overlay)'
              ];
              
              this.elements = [];
              
              selectors.forEach((selector, selectorIndex) => {
                try {
                  const foundElements = document.querySelectorAll(selector);
                  foundElements.forEach((el, elementIndex) => {
                    // Skip hidden elements
                    const computedStyle = window.getComputedStyle(el);
                    if (computedStyle.display === 'none' || 
                        computedStyle.visibility === 'hidden' ||
                        el.offsetWidth === 0 || 
                        el.offsetHeight === 0) {
                      return;
                    }
                    
                    // Skip our own inspection elements
                    if (el.classList.contains('celiador-inspection-overlay') || 
                        el.id?.includes('celiador')) {
                      return;
                    }
                    
                    const rect = el.getBoundingClientRect();
                    if (rect.width < 10 || rect.height < 10) return; // Skip tiny elements
                    
                    const tagName = el.tagName.toLowerCase();
                    const className = el.className || '';
                    const textContent = el.textContent?.trim() || '';
                    const id = el.id || '';
                    
                    // Determine element type
                    let elementType = 'unknown';
                    if (tagName === 'button' || el.getAttribute('role') === 'button') {
                      elementType = 'button';
                    } else if (tagName === 'a') {
                      elementType = 'link';
                    } else if (['input', 'select', 'textarea'].includes(tagName)) {
                      elementType = 'form-field';
                    } else if (['nav', 'header', 'main', 'section'].includes(tagName)) {
                      elementType = 'layout';
                    } else if (className.includes('button') || className.includes('btn')) {
                      elementType = 'interactive';
                    } else {
                      elementType = 'content';
                    }
                    
                    const elementData = {
                      id: \`\${tagName}_\${selectorIndex}_\${elementIndex}\`,
                      type: elementType,
                      tagName: tagName,
                      selector: this.generateSelector(el),
                      componentName: this.guessComponentName(el),
                      boundingBox: {
                        x: rect.left,
                        y: rect.top,
                        width: rect.width,
                        height: rect.height
                      },
                      metadata: {
                        id: id,
                        className: className,
                        textContent: textContent.substring(0, 100),
                        props: this.extractProps(el),
                        fromRealInspection: true
                      }
                    };
                    
                    this.elements.push(elementData);
                  });
                } catch (error) {
                  console.warn('Error processing selector:', selector, error);
                }
              });
              
              console.log(\`🎯 [Celiador Inspection] Found \${this.elements.length} elements\`);
            }
            
            generateSelector(element) {
              if (element.id) return \`#\${element.id}\`;
              
              if (element.className) {
                const classes = element.className.split(' ')
                  .filter(cls => cls && !cls.startsWith('_'))
                  .slice(0, 2)
                  .join('.');
                if (classes) return \`\${element.tagName.toLowerCase()}.\${classes}\`;
              }
              
              return element.tagName.toLowerCase();
            }
            
            guessComponentName(element) {
              const testId = element.getAttribute('data-testid');
              if (testId) return testId;
              
              const component = element.getAttribute('data-component');
              if (component) return component;
              
              if (element.tagName === 'BUTTON') {
                const text = element.textContent?.trim();
                if (text && text.length < 20) {
                  return text.replace(/\\s+/g, '') + 'Button';
                }
              }
              
              return element.tagName;
            }
            
            extractProps(element) {
              const props = {};
              ['id', 'className', 'type', 'placeholder', 'value', 'href'].forEach(attr => {
                const value = element.getAttribute(attr);
                if (value) props[attr] = value;
              });
              
              const text = element.textContent?.trim();
              if (text && text.length < 50) {
                props.textContent = text;
              }
              
              return props;
            }
            
            sendElementsToParent() {
              if (window.parent !== window) {
                console.log(\`🎯 [Celiador Inspection] Sending \${this.elements.length} elements to parent\`);
                window.parent.postMessage({
                  type: 'ELEMENTS_MAPPED',
                  elements: this.elements,
                  timestamp: Date.now()
                }, window.location.origin);
              }
            }
          }
          
          // Initialize inspector
          const inspector = new CeliadorInspector();
          window.celiadorInspector = inspector;
          
          console.log('✅ [Celiador Inspection] Inspector initialized and ready');
        </script>
      `;

      // Inject all scripts before the closing head tag or body tag  
      const combinedScript = webpackOverrideScript + navigationTrackingScript + inspectionScript;
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

// Register both routes - root and wildcard paths (unified handler for content and assets)
router.get('/projects/:id/preview/:previewId/proxy', handleProxyRequest);
router.get('/projects/:id/preview/:previewId/proxy/*', handleProxyRequest);

console.log('✅ [Inspection Preview] Route registered at /projects/:id/preview/:previewId/inspection');

// Track last accessed path for each preview instance
const lastAccessedPaths = new Map<string, string>();

// Inspection preview endpoint - generates server-side inspection overlay using JSDOM
router.get('/projects/:id/preview/:previewId/inspection', async (req: any, res: any) => {
  console.log(`🔍 [Inspection Preview] Request for project ${req.params.id}, preview ${req.params.previewId}`);
  
  // Handle authentication via query parameter for iframe requests
  const token = req.query.token;
  if (!token) {
    console.log(`❌ [Inspection Preview] No token provided`);
    return res.status(401).json({ error: 'Authentication token required' });
  }
  
  // Verify token if Supabase is available
  const { supabaseService } = getServices(req);
  if (supabaseService) {
    try {
      const { data: { user }, error } = await supabaseService.auth.getUser(token);
      if (error || !user) {
        console.log(`❌ [Inspection Preview] Invalid token:`, error?.message || 'No user returned');
        return res.status(401).json({ error: 'Invalid authentication token' });
      }
      req.user = user;
      console.log(`✅ [Inspection Preview] User authenticated:`, user.id);
    } catch (error) {
      console.log(`❌ [Inspection Preview] Authentication exception:`, error);
      return res.status(401).json({ error: 'Authentication failed' });
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
      return res.status(404).json({ error: 'Preview not found or not running' });
    }
    
    // Get the specific path to inspect from query parameter (frontend extraction)
    let pathToInspect = req.query.path || '/';
    console.log(`🔍 [Inspection Preview] Frontend provided path: ${pathToInspect}`);
    
    // If frontend didn't provide a useful path, try to use the tracked path
    if (pathToInspect === '/' || !pathToInspect) {
      const trackedPath = lastAccessedPaths.get(req.params.previewId);
      if (trackedPath) {
        pathToInspect = trackedPath;
        console.log(`🔍 [Inspection Preview] Using backend-tracked path: ${pathToInspect}`);
      } else {
        console.log(`🔍 [Inspection Preview] No tracked path available, using root: ${pathToInspect}`);
      }
    } else {
      console.log(`🔍 [Inspection Preview] Using frontend-extracted path: ${pathToInspect}`);
    }
    
    // Fetch original HTML from preview for the specific path
    const fetch = (await import('node-fetch')).default;
    
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
    const inspectionHtml = await generateInspectionOverlay(originalHtml, id, previewId, preview.internalUrl);
    
    console.log('✅ [Inspection Preview] Generated inspection overlay HTML');
    
    res.setHeader('Content-Type', 'text/html');
    res.send(inspectionHtml);
    
  } catch (error) {
    console.error('Inspection preview error:', error);
    res.status(500).json({ error: 'Failed to generate inspection preview' });
  }
});

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
        
        const elementData = {
          id: `${tagName}_${selectorIndex}_${elementIndex}`,
          type: elementType,
          tagName: tagName,
          className: className,
          textContent: textContent.substring(0, 100),
          selector: selector,
          attributes: {
            id: id,
            href: el.getAttribute('href'),
            type: el.getAttribute('type'),
            role: el.getAttribute('role'),
            'aria-label': el.getAttribute('aria-label')
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

    const inspectionScript = `
<script id="celiador-inspection-script">
  console.log('🎯 Celiador Server-Side Inspection Ready');
  
  // Add inspection class to body
  document.body.classList.add('celiador-inspection-active');
  
  // Handle element clicks
  document.addEventListener('click', function(event) {
    const element = event.target.closest('[data-celiador-element]');
    if (element) {
      event.preventDefault();
      event.stopPropagation();
      
      const elementData = JSON.parse(element.getAttribute('data-celiador-element') || '{}');
      console.log('🎯 Celiador Element Clicked:', elementData);
      
      // Send inspection data to parent window
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

    const fetch = (await import('node-fetch')).default;
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
  
  // Skip if this is already a handled route pattern
  if (path.startsWith('/projects/') || 
      path.startsWith('/api/') || 
      path.startsWith('/templates') ||
      path.startsWith('/backups') ||
      path.startsWith('/health') ||
      path.startsWith('/_next/')) {
    return res.status(404).json({ error: 'Not found' });
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
  
  // Track this navigation path for inspection mode
  if (path !== '/' && !path.startsWith('/_next/') && !path.includes('?')) {
    lastAccessedPaths.set(preview.id, path);
    console.log(`📝 [Preview Navigation] Tracking navigation path: ${path} for preview ${preview.id}`);
  }
  
  try {
    const targetUrl = `${preview.internalUrl}${path}`;
    console.log(`🚀 [Preview Navigation] Proxying to: ${targetUrl}`);

    const fetch = (await import('node-fetch')).default;
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
                  const proxyUrl = '${proxyBasePath}' + url.pathname + url.search + url.hash;
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