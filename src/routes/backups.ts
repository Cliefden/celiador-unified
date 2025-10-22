import express from 'express';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

// Access services from app.locals (set by main index.ts)
const getServices = (req: any) => ({
  supabase: req.app.locals.supabase,
  supabaseService: req.app.locals.supabaseService,
  db: req.app.locals.db
});

// POST /backups/:id/restore - Restore from backup
router.post('/:id/restore', authenticateUser, async (req: any, res: any) => {
  try {
    const { id: backupId } = req.params;
    
    // TODO: Implement backup service
    console.log(`[Backups] Restore request for backup ${backupId} (not implemented)`);
    
    res.status(501).json({ error: 'Backup restore functionality not implemented yet' });
  } catch (error: any) {
    console.error('Failed to restore backup:', error);
    res.status(500).json({ error: 'Failed to restore backup' });
  }
});

export default router;