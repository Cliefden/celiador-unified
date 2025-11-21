import express from 'express';
import { authenticateUser } from '../middleware/auth.js';
const router = express.Router();

// Get user settings
router.get('/', authenticateUser, async (req: any, res: any) => {
  try {
    console.log('GET /api/settings - User:', req.user?.id);
    
    const supabaseService = req.app.locals.supabaseService;
    if (!supabaseService) {
      console.log('No Supabase service available');
      return res.status(500).json({ error: 'Database not available' });
    }

    const { data: settings, error } = await supabaseService
      .from('user_settings')
      .select('*')
      .eq('user_id', req.user.id)
      .is('deleted_at', null)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Settings fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch settings' });
    }

    // If no settings found, create default settings
    if (!settings) {
      const { data: newSettings, error: createError } = await supabaseService
        .from('user_settings')
        .insert({
          user_id: req.user.id,
          creator: req.user.id
        })
        .select()
        .single();

      if (createError) {
        console.error('Settings creation error:', createError);
        return res.status(500).json({ error: 'Failed to create settings' });
      }

      return res.json({ settings: newSettings });
    }

    res.json({ settings });
  } catch (error) {
    console.error('Settings API error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update user settings
router.put('/', authenticateUser, async (req: any, res: any) => {
  try {
    console.log('PUT /api/settings - User:', req.user?.id);
    
    const supabaseService = req.app.locals.supabaseService;
    if (!supabaseService) {
      return res.status(500).json({ error: 'Database not available' });
    }

    const updates = req.body;
    
    // Remove system fields that shouldn't be updated directly
    delete updates.id;
    delete updates.user_id;
    delete updates.creator;
    delete updates.created_at;
    delete updates.updated_at;

    const { data: settings, error } = await supabaseService
      .from('user_settings')
      .update({
        ...updates,
        updater: req.user.id
      })
      .eq('user_id', req.user.id)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) {
      console.error('Settings update error:', error);
      return res.status(500).json({ error: 'Failed to update settings' });
    }

    res.json({ settings });
  } catch (error) {
    console.error('Settings update API error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Reset user settings to defaults
router.delete('/', authenticateUser, async (req: any, res: any) => {
  try {
    console.log('DELETE /api/settings - User:', req.user?.id);
    
    const supabaseService = req.app.locals.supabaseService;
    if (!supabaseService) {
      return res.status(500).json({ error: 'Database not available' });
    }

    // Reset to defaults by creating new settings row
    const { data: settings, error } = await supabaseService
      .from('user_settings')
      .update({
        deleter: req.user.id,
        deleted_at: new Date().toISOString()
      })
      .eq('user_id', req.user.id)
      .is('deleted_at', null);

    if (error) {
      console.error('Settings delete error:', error);
      return res.status(500).json({ error: 'Failed to reset settings' });
    }

    // Create new default settings
    const { data: newSettings, error: createError } = await supabaseService
      .from('user_settings')
      .insert({
        user_id: req.user.id,
        creator: req.user.id
      })
      .select()
      .single();

    if (createError) {
      console.error('Settings creation error:', createError);
      return res.status(500).json({ error: 'Failed to create default settings' });
    }

    res.json({ settings: newSettings });
  } catch (error) {
    console.error('Settings reset API error:', error);
    res.status(500).json({ error: 'Failed to reset settings' });
  }
});

export default router;