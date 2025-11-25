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

    // Get templates with category and feature relationships
    const { data: templates, error } = await supabaseService
      .from('templates')
      .select(`
        *,
        templates_categories_junction!inner (
          template_categories (*)
        ),
        templates_features_junction!inner (
          template_features (*)
        ),
        templates_tech_stack_junction!inner (
          template_tech_stack (*)
        )
      `)
      .eq('isActive', true)
      .order('sortOrder', { ascending: true });

    if (error) {
      console.error('[TEMPLATES] Database error:', error);
      return res.status(500).json({ error: 'Failed to fetch templates' });
    }

    console.log(`[TEMPLATES] Found ${templates?.length || 0} templates`);
    res.json(templates || []);
  } catch (error) {
    console.error('[TEMPLATES] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/templates/:id - Get template by ID
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
      .select(`
        *,
        templates_categories_junction!inner (
          template_categories (*)
        ),
        templates_features_junction!inner (
          template_features (*)
        ),
        templates_tech_stack_junction!inner (
          template_tech_stack (*)
        )
      `)
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
      .order('sortOrder', { ascending: true });

    if (error) {
      console.error('[TEMPLATES] Categories error:', error);
      return res.status(500).json({ error: 'Failed to fetch categories' });
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
      return res.status(500).json({ error: 'Failed to fetch features' });
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

export default router;