import express from 'express';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

// Access services from app.locals (set by main index.ts)
const getServices = (req: any) => ({
  supabase: req.app.locals.supabase,
  supabaseService: req.app.locals.supabaseService,
  db: req.app.locals.db
});

// GET /api/templates - Get all templates
router.get('/', authenticateUser, async (req: any, res: any) => {
  try {
    console.log(`[TEMPLATES] Getting all templates for user ${req.user?.id}`);
    const { supabaseService } = getServices(req);
    
    if (!supabaseService) {
      console.log('[TEMPLATES] No Supabase service available');
      return res.status(503).json({ error: 'Database service unavailable' });
    }

    // Get templates (simplified query to avoid relationship issues)
    const { data: templates, error } = await supabaseService
      .from('templates')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('[TEMPLATES] Database error:', error);
      // Return fallback templates if database has errors
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
        }
      ];
      console.log('[TEMPLATES] Using fallback templates due to database error');
      return res.json(fallbackTemplates);
    }

    console.log(`[TEMPLATES] Found ${templates?.length || 0} templates`);
    res.json(templates || []);
  } catch (error) {
    console.error('[TEMPLATES] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/templates/categories - Get all template categories
router.get('/categories', authenticateUser, async (req: any, res: any) => {
  try {
    console.log(`[TEMPLATES] Getting template categories for user ${req.user?.id}`);
    const { supabaseService } = getServices(req);
    
    if (!supabaseService) {
      return res.status(503).json({ error: 'Database service unavailable' });
    }

    const { data: categories, error } = await supabaseService
      .from('template_categories')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('[TEMPLATES] Categories error:', error);
      // Return fallback categories if table doesn't exist or has errors
      const fallbackCategories = [
        { id: '1', name: 'Web Applications', description: 'Full-stack web applications', sort_order: 1 },
        { id: '2', name: 'Mobile Apps', description: 'Mobile application templates', sort_order: 2 },
        { id: '3', name: 'APIs', description: 'Backend API templates', sort_order: 3 }
      ];
      console.log('[TEMPLATES] Using fallback categories due to database error');
      return res.json(fallbackCategories);
    }

    console.log(`[TEMPLATES] Found ${categories?.length || 0} categories`);
    res.json(categories || []);
  } catch (error) {
    console.error('[TEMPLATES] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/templates/features - Get all template features
router.get('/features', authenticateUser, async (req: any, res: any) => {
  try {
    console.log(`[TEMPLATES] Getting template features for user ${req.user?.id}`);
    const { supabaseService } = getServices(req);
    
    if (!supabaseService) {
      return res.status(503).json({ error: 'Database service unavailable' });
    }

    const { data: features, error } = await supabaseService
      .from('template_features')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('[TEMPLATES] Features error:', error);
      // Return fallback features if table doesn't exist or has errors
      const fallbackFeatures = [
        { id: '1', name: 'Authentication', description: 'User login and registration', icon: '🔐' },
        { id: '2', name: 'Database', description: 'Database integration', icon: '💾' },
        { id: '3', name: 'API', description: 'REST API endpoints', icon: '🔌' },
        { id: '4', name: 'UI Components', description: 'Reusable UI components', icon: '🎨' }
      ];
      console.log('[TEMPLATES] Using fallback features due to database error');
      return res.json(fallbackFeatures);
    }

    console.log(`[TEMPLATES] Found ${features?.length || 0} features`);
    res.json(features || []);
  } catch (error) {
    console.error('[TEMPLATES] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/templates/tech-stack - Get all tech stack options
router.get('/tech-stack', authenticateUser, async (req: any, res: any) => {
  try {
    console.log(`[TEMPLATES] Getting tech stack options for user ${req.user?.id}`);
    const { supabaseService } = getServices(req);
    
    if (!supabaseService) {
      return res.status(503).json({ error: 'Database service unavailable' });
    }

    const { data: techStack, error } = await supabaseService
      .from('template_tech_stack')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('[TEMPLATES] Tech stack error:', error);
      return res.status(500).json({ error: 'Failed to fetch tech stack' });
    }

    console.log(`[TEMPLATES] Found ${techStack?.length || 0} tech stack items`);
    res.json(techStack || []);
  } catch (error) {
    console.error('[TEMPLATES] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/templates/:id - Get template by ID (must be last to avoid catching specific routes)
router.get('/:id', authenticateUser, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    console.log(`[TEMPLATES] Getting template ${id} for user ${req.user?.id}`);
    const { supabaseService } = getServices(req);
    
    if (!supabaseService) {
      return res.status(503).json({ error: 'Database service unavailable' });
    }

    const { data: template, error } = await supabaseService
      .from('templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !template) {
      console.log(`[TEMPLATES] Template not found: ${id}`);
      return res.status(404).json({ error: 'Template not found' });
    }

    console.log(`[TEMPLATES] Found template: ${template.name}`);
    res.json(template);
  } catch (error) {
    console.error('[TEMPLATES] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;