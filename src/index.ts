// Unified Celiador service - API + Job Processing
import 'dotenv/config';
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import http from 'http';

// Import services
import { DatabaseService } from './services/database.js';
import { JobService } from './services/jobs.js';
import { PreviewService } from './services/preview.js';
import { VercelService } from './services/vercel.js';
import { WebSocketService } from './services/websocket.js';
import { AIService } from './ai-service.js';

// Import middleware
import { corsMiddleware, requestLogger } from './middleware/cors.js';
import { authenticateUser } from './middleware/auth.js';

// Import routes
import healthRoutes from './routes/health.js';
import settingsRoutes from './routes/settings.js';
import projectRoutes from './routes/projects.js';
import conversationRoutes from './routes/conversations.js';
import fileRoutes from './routes/files.js';
import integrationRoutes from './routes/integrations.js';
import jobRoutes from './routes/jobs.js';
import previewRoutes from './routes/previews.js';
import backupRoutes from './routes/backups.js';
import userRoutes from './routes/user.js';
import sessionRoutes from './routes/sessions.js';
import deploymentRoutes from './routes/deployments.js';
import realtimeRoutes from './routes/realtime.js';
import templateRoutes from './routes/templates.js';
import { createEcosystemRoutes } from './routes/ecosystem.js';

const app = express();
const port = parseInt(process.env.PORT || '8080', 10);

console.log('=== STARTING UNIFIED CELIADOR SERVICE ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', port);

// Initialize Supabase with error handling
let supabase: any = null;
let supabaseService: any = null;
let db: any = null;
let jobService: any = null;
let previewService: any = null;
let vercelService: any = null;
let wsService: any = null;
let aiService: any = null;
let ecosystemIntegration: any = null;

try {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    // Use service role client for server-side authentication
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    supabaseService = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Initialize database service
    db = new DatabaseService(supabaseService);
    
    // Initialize WebSocket service first (needed by JobService)
    const verifyToken = async (token: string) => {
      try {
        console.log('[WebSocket Auth] Verifying token, length:', token.length, 'starts with:', token.substring(0, 10));
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error) {
          console.log('[WebSocket Auth] Supabase auth error:', error.message);
          return null;
        }
        if (!user) {
          console.log('[WebSocket Auth] No user found for token');
          return null;
        }
        console.log('[WebSocket Auth] Token verified for user:', user.id);
        return { id: user.id };
      } catch (error) {
        console.error('[WebSocket Auth] Token verification error:', error);
        return null;
      }
    };
    
    // Initialize WebSocket service - will attach to HTTP server later
    wsService = new WebSocketService(
      null, // No port - will attach to existing server
      verifyToken,
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      db // Pass database service for entity operations
    );
    
    // Initialize job service with WebSocket support
    jobService = new JobService(db, supabaseService, wsService);
    
    // Initialize AI service
    aiService = new AIService();
    
    // Initialize preview service
    previewService = new PreviewService(db, supabaseService);
    
    // Initialize Vercel service if token is available
    if (process.env.VERCEL_API_TOKEN && process.env.VERCEL_API_TOKEN !== 'your-vercel-token') {
      vercelService = new VercelService(process.env.VERCEL_API_TOKEN, process.env.VERCEL_TEAM_ID);
      console.log('✅ Vercel service initialized');
    } else {
      console.log('⚠️ Vercel service not initialized - API token not configured');
    }
    
    console.log('✅ Supabase clients initialized');
    console.log('✅ Job service initialized');
    console.log('✅ Preview service initialized');
    console.log('✅ WebSocket service initialized (will attach to server)');
    
    // Initialize Living Ecosystem (optional, feature-flagged)
    try {
      const { createLivingEcosystemIntegration } = await import('./services/living-ecosystem-integration.js');
      ecosystemIntegration = createLivingEcosystemIntegration(
        aiService,
        wsService,
        previewService,
        db,
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      console.log('✅ Living Ecosystem integration initialized');
    } catch (error) {
      console.log('⚠️ Living Ecosystem integration not available:', error instanceof Error ? error.message : 'Unknown error');
    }
  } else {
    console.log('⚠️ Supabase credentials not found, running in limited mode');
  }
} catch (error) {
  console.error('❌ Failed to initialize Supabase:', error);
}

// Basic middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Add CORS and request logging
app.use(requestLogger);
app.use(corsMiddleware);

// Store services in app.locals for routes to access
app.locals.supabase = supabase;
app.locals.supabaseService = supabaseService;
app.locals.db = db;
app.locals.jobService = jobService;
app.locals.previewService = previewService;
app.locals.vercelService = vercelService;
app.locals.wsService = wsService;
app.locals.aiService = aiService;
app.locals.ecosystemIntegration = ecosystemIntegration;

// Mount routes - order matters! More specific routes first
app.use('/', healthRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/', userRoutes);
app.use('/', sessionRoutes); // Mount sessions before previews (previews has catch-all route)
app.use('/', deploymentRoutes); // Mount deployment routes
app.use('/', realtimeRoutes); // Mount real-time WebSocket routes
app.use('/api/ecosystem', createEcosystemRoutes(ecosystemIntegration)); // Mount Living Ecosystem routes
app.use('/projects', projectRoutes);
app.use('/', conversationRoutes);
app.use('/', fileRoutes);
app.use('/', integrationRoutes);
app.use('/', jobRoutes);
app.use('/backups', backupRoutes);
app.use('/', templateRoutes);

// Mount templates route BEFORE previews to avoid catch-all route conflicts
app.get('/templates', async (req: any, res: any) => {
  try {
    console.log('🎨 [Templates] GET /templates request received');
    
    const supabaseService = req.app.locals.supabaseService;
    if (!supabaseService) {
      console.error('🎨 [Templates] Database not available');
      return res.status(500).json({ error: 'Database not available' });
    }

    console.log('🎨 [Templates] Fetching available templates from database...');
    
    // Try to fetch all templates first to see what's available
    const { data: allTemplates, error: allError } = await supabaseService
      .from('templates')
      .select('*');

    console.log('🎨 [Templates] All templates query result:', { 
      count: allTemplates?.length || 0, 
      error: allError?.message || 'none' 
    });

    if (allError) {
      console.error('🎨 [Templates] Database error:', allError);
      // Return fallback templates if database fails
      const fallbackTemplates = [
        {
          id: 'fallback-1',
          template_key: 'next-prisma-supabase',
          name: 'Next.js + Prisma + Supabase',
          description: 'Full-stack Next.js application with Prisma ORM and Supabase backend',
          long_description: 'A complete full-stack application template featuring Next.js for the frontend, Prisma for database ORM, and Supabase for authentication and real-time features.',
          icon: '⚡',
          emoji: '⚡',
          color_primary: '#0070f3',
          color_secondary: '#7c3aed',
          difficulty: 'intermediate',
          rating: 4.8,
          version: '1.0.0',
          is_active: true,
          sort_order: 1
        },
        {
          id: 'fallback-2',
          template_key: 'blank-nextjs',
          name: 'Blank Next.js',
          description: 'Simple Next.js application template',
          long_description: 'A minimal Next.js application template to get started quickly.',
          icon: '📄',
          emoji: '📄',
          color_primary: '#000000',
          color_secondary: '#666666',
          difficulty: 'beginner',
          rating: 4.5,
          version: '1.0.0',
          is_active: true,
          sort_order: 2
        }
      ];
      
      console.log('🎨 [Templates] Using fallback templates due to database error');
      return res.json({ templates: fallbackTemplates });
    }

    // Filter active templates
    const activeTemplates = allTemplates?.filter((t: any) => t.is_active === true) || [];
    console.log('🎨 [Templates] Active templates count:', activeTemplates.length);

    if (activeTemplates.length === 0) {
      console.log('🎨 [Templates] No active templates found, returning fallback');
      // Return fallback templates if no active templates
      const fallbackTemplates = [
        {
          id: 'fallback-1',
          template_key: 'next-prisma-supabase',
          name: 'Next.js + Prisma + Supabase',
          description: 'Full-stack Next.js application with Prisma ORM and Supabase backend',
          long_description: 'A complete full-stack application template featuring Next.js for the frontend, Prisma for database ORM, and Supabase for authentication and real-time features.',
          icon: '⚡',
          emoji: '⚡',
          color_primary: '#0070f3',
          color_secondary: '#7c3aed',
          difficulty: 'intermediate',
          rating: 4.8,
          version: '1.0.0',
          is_active: true,
          sort_order: 1
        },
        {
          id: 'fallback-2',
          template_key: 'blank-nextjs',
          name: 'Blank Next.js',
          description: 'Simple Next.js application template',
          long_description: 'A minimal Next.js application template to get started quickly.',
          icon: '📄',
          emoji: '📄',
          color_primary: '#000000',
          color_secondary: '#666666',
          difficulty: 'beginner',
          rating: 4.5,
          version: '1.0.0',
          is_active: true,
          sort_order: 2
        }
      ];
      
      return res.json({ templates: fallbackTemplates });
    }

    // Sort by rating (highest first)
    const sortedTemplates = activeTemplates.sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0));
    
    console.log(`🎨 [Templates] Returning ${sortedTemplates.length} active templates`);
    res.json({ templates: sortedTemplates });
    
  } catch (error) {
    console.error('🎨 [Templates] Unexpected error:', error);
    
    // Return fallback templates on any error
    const fallbackTemplates = [
      {
        id: 'fallback-1',
        template_key: 'next-prisma-supabase',
        name: 'Next.js + Prisma + Supabase',
        description: 'Full-stack Next.js application with Prisma ORM and Supabase backend',
        long_description: 'A complete full-stack application template featuring Next.js for the frontend, Prisma for database ORM, and Supabase for authentication and real-time features.',
        icon: '⚡',
        emoji: '⚡',
        color_primary: '#0070f3',
        color_secondary: '#7c3aed',
        difficulty: 'intermediate',
        rating: 4.8,
        version: '1.0.0',
        is_active: true,
        sort_order: 1
      },
      {
        id: 'fallback-2',
        template_key: 'blank-nextjs',
        name: 'Blank Next.js',
        description: 'Simple Next.js application template',
        long_description: 'A minimal Next.js application template to get started quickly.',
        icon: '📄',
        emoji: '📄',
        color_primary: '#000000',
        color_secondary: '#666666',
        difficulty: 'beginner',
        rating: 4.5,
        version: '1.0.0',
        is_active: true,
        sort_order: 2
      }
    ];
    
    res.json({ templates: fallbackTemplates });
  }
});

// Mount preview routes LAST because it has a catch-all route
app.use('/', previewRoutes); // This has a catch-all route, so it must be last

// All routes have been extracted to modular files - no more legacy routes needed!

// Start server
const server = app.listen(port, () => {
  console.log(`🚀 Unified Celiador service running on port ${port}`);
  console.log(`📍 Health check: http://localhost:${port}/health`);
  
  // Attach WebSocket service to HTTP server for both production and development
  if (wsService) {
    wsService.attachToServer(server);
    console.log(`🔌 WebSocket service attached to HTTP server on port ${port}`);
  }
});

export default app;