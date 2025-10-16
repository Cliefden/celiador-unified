// Unified Celiador service - API + Job Processing
import 'dotenv/config';
import express from 'express';
import { createClient } from '@supabase/supabase-js';

// Import services
import { DatabaseService } from './services/database';
import { JobService } from './services/jobs';
import { PreviewService } from './services/preview';

// Import middleware
import { corsMiddleware, requestLogger } from './middleware/cors';
import { authenticateUser } from './middleware/auth';

// Import routes
import healthRoutes from './routes/health';
import settingsRoutes from './routes/settings';
import projectRoutes from './routes/projects';
import conversationRoutes from './routes/conversations';
import fileRoutes from './routes/files';
import integrationRoutes from './routes/integrations';
import jobRoutes from './routes/jobs';
import previewRoutes from './routes/previews';
import backupRoutes from './routes/backups';

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

try {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
    );
    supabaseService = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Initialize database service
    db = new DatabaseService(supabaseService);
    
    // Initialize job service
    jobService = new JobService(db, supabaseService);
    
    // Initialize preview service
    previewService = new PreviewService(db, supabaseService);
    
    console.log('✅ Supabase clients initialized');
    console.log('✅ Job service initialized');
    console.log('✅ Preview service initialized');
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

// Mount routes - order matters! More specific routes first
app.use('/', healthRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/projects', projectRoutes);
app.use('/', conversationRoutes);
app.use('/', fileRoutes);
app.use('/', integrationRoutes);
app.use('/', jobRoutes);
app.use('/', previewRoutes);
app.use('/backups', backupRoutes);

// Mount templates route specifically to avoid conflicts with other routes
app.get('/templates', async (req: any, res: any) => {
  try {
    const supabaseService = req.app.locals.supabaseService;
    if (!supabaseService) {
      return res.status(500).json({ error: 'Database not available' });
    }

    console.log('[Templates] Fetching available templates...');
    
    // Direct database query for templates
    const { data: templates, error: dbError } = await supabaseService
      .from('templates')
      .select('*')
      .eq('is_active', true)
      .order('rating', { ascending: false });

    if (dbError) {
      throw dbError;
    }

    console.log(`[Templates] Found ${templates?.length || 0} templates`);
    res.json(templates || []);
    
  } catch (error) {
    console.error('[Templates] Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// All routes have been extracted to modular files - no more legacy routes needed!

// Start server
app.listen(port, () => {
  console.log(`🚀 Unified Celiador service running on port ${port}`);
  console.log(`📍 Health check: http://localhost:${port}/health`);
});

export default app;