import express from 'express';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

// Access services from app.locals (set by main index.ts)
const getServices = (req: any) => ({
  supabase: req.app.locals.supabase,
  supabaseService: req.app.locals.supabaseService,
  db: req.app.locals.db
});

// POST /api/sessions/start - Start a new user session
router.post('/api/sessions/start', authenticateUser, async (req: any, res: any) => {
  try {
    console.log('[SESSIONS] Starting new session for user:', req.user?.id);
    
    const { supabaseService } = getServices(req);
    if (!supabaseService) {
      return res.status(500).json({ error: 'Database not available' });
    }

    const userId = req.user.id;
    const {
      sessionId,
      platform,
      deviceInfo = {},
      locationInfo = {},
      userAgent
    } = req.body;

    // Validate required fields
    if (!sessionId || !platform) {
      return res.status(400).json({ error: 'sessionId and platform are required' });
    }

    // Validate platform
    const validPlatforms = ['web', 'ios-external', 'ios-internal', 'ios-widget', 'macos-internal'];
    if (!validPlatforms.includes(platform)) {
      return res.status(400).json({ error: 'Invalid platform' });
    }

    // Get client IP address (masked for privacy)
    const getClientIP = (ip: string | undefined) => {
      if (!ip) return null;
      
      // Handle IPv4-mapped IPv6 addresses (e.g., ::ffff:127.0.0.1)
      if (ip.startsWith('::ffff:')) {
        return null; // Skip IPv4-mapped IPv6 for privacy
      }
      
      // Handle local addresses
      if (ip === '::1' || ip === '127.0.0.1' || ip === 'localhost') {
        return null;
      }
      
      // Handle IPv4 addresses (e.g., 192.168.1.123 -> 192.168.1.xxx)
      if (ip.includes('.') && !ip.includes(':')) {
        return ip.replace(/\d+$/, 'xxx');
      }
      
      // Handle pure IPv6 addresses (e.g., 2001:db8::1 -> 2001:db8::xxx)
      if (ip.includes(':') && !ip.includes('.')) {
        // For other IPv6, mask the last segment
        return ip.replace(/[^:]+$/, 'xxx');
      }
      
      return null;
    };
    
    const clientIP = getClientIP(req.ip);

    // Create new session record (let database set timestamps with defaults)
    const { data: session, error } = await supabaseService
      .from('user_sessions')
      .insert({
        user_id: userId,
        session_id: sessionId,
        platform: platform,
        device_info: deviceInfo,
        location_info: locationInfo,
        user_agent: userAgent,
        ip_address: clientIP
        // status, started_at, last_activity_at, last_heartbeat_at, created_at, updated_at use defaults
      })
      .select()
      .single();

    if (error) {
      console.error('[SESSIONS] Error creating session:', error);
      return res.status(500).json({ error: 'Failed to create session' });
    }

    console.log(`[SESSIONS] Session started: ${sessionId} for user ${userId} on ${platform}`);
    res.status(201).json({
      success: true,
      session: {
        id: session.id,
        sessionId: session.session_id,
        platform: session.platform,
        startedAt: session.started_at,
        status: session.status
      }
    });

  } catch (error) {
    console.error('[SESSIONS] Error starting session:', error);
    res.status(500).json({ error: 'Failed to start session' });
  }
});

// POST /api/sessions/heartbeat - Update session heartbeat
router.post('/api/sessions/heartbeat', authenticateUser, async (req: any, res: any) => {
  try {
    const { supabaseService } = getServices(req);
    if (!supabaseService) {
      return res.status(500).json({ error: 'Database not available' });
    }

    const userId = req.user.id;
    const { sessionId, activityCount = 0 } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    // Update session heartbeat and activity
    const { data: session, error } = await supabaseService
      .from('user_sessions')
      .update({
        last_heartbeat_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString(),
        activity_count: activityCount,
        status: 'active'
      })
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .select()
      .single();

    if (error || !session) {
      console.error('[SESSIONS] Error updating heartbeat:', error);
      return res.status(404).json({ error: 'Session not found or inactive' });
    }

    res.json({
      success: true,
      lastHeartbeat: session.last_heartbeat_at,
      status: session.status
    });

  } catch (error) {
    console.error('[SESSIONS] Error updating heartbeat:', error);
    res.status(500).json({ error: 'Failed to update heartbeat' });
  }
});

// POST /api/sessions/end - End a user session
router.post('/api/sessions/end', authenticateUser, async (req: any, res: any) => {
  try {
    console.log('[SESSIONS] Ending session for user:', req.user?.id);
    
    const { supabaseService } = getServices(req);
    if (!supabaseService) {
      return res.status(500).json({ error: 'Database not available' });
    }

    const userId = req.user.id;
    const { sessionId, endReason = 'manual' } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    // Get current session to calculate duration
    const { data: currentSession, error: fetchError } = await supabaseService
      .from('user_sessions')
      .select('started_at')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !currentSession) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Calculate session duration
    const startTime = new Date(currentSession.started_at);
    const endTime = new Date();
    const durationSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

    // Update session to ended
    const { data: session, error } = await supabaseService
      .from('user_sessions')
      .update({
        status: 'ended',
        ended_at: endTime.toISOString(),
        end_reason: endReason,
        total_duration_seconds: durationSeconds
      })
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('[SESSIONS] Error ending session:', error);
      return res.status(500).json({ error: 'Failed to end session' });
    }

    console.log(`[SESSIONS] Session ended: ${sessionId} for user ${userId}, duration: ${durationSeconds}s`);
    res.json({
      success: true,
      session: {
        id: session.id,
        sessionId: session.session_id,
        platform: session.platform,
        startedAt: session.started_at,
        endedAt: session.ended_at,
        durationSeconds: session.total_duration_seconds,
        endReason: session.end_reason,
        status: session.status
      }
    });

  } catch (error) {
    console.error('[SESSIONS] Error ending session:', error);
    res.status(500).json({ error: 'Failed to end session' });
  }
});

// GET /api/sessions/active - Get user's active sessions
router.get('/api/sessions/active', authenticateUser, async (req: any, res: any) => {
  try {
    const { supabaseService } = getServices(req);
    if (!supabaseService) {
      return res.status(500).json({ error: 'Database not available' });
    }

    const userId = req.user.id;

    // Get user's active sessions
    const { data: sessions, error } = await supabaseService
      .from('user_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('started_at', { ascending: false });

    if (error) {
      console.error('[SESSIONS] Error fetching active sessions:', error);
      return res.status(500).json({ error: 'Failed to fetch active sessions' });
    }

    // Calculate current session durations
    const activeSessions = sessions.map((session: any) => {
      const startTime = new Date(session.started_at);
      const currentDuration = Math.floor((new Date().getTime() - startTime.getTime()) / 1000);
      
      return {
        id: session.id,
        sessionId: session.session_id,
        platform: session.platform,
        startedAt: session.started_at,
        lastActivity: session.last_activity_at,
        lastHeartbeat: session.last_heartbeat_at,
        currentDurationSeconds: currentDuration,
        activityCount: session.activity_count,
        deviceInfo: session.device_info,
        status: session.status
      };
    });

    res.json({
      success: true,
      activeSessions: activeSessions
    });

  } catch (error) {
    console.error('[SESSIONS] Error fetching active sessions:', error);
    res.status(500).json({ error: 'Failed to fetch active sessions' });
  }
});

// GET /api/sessions/history - Get user's session history
router.get('/api/sessions/history', authenticateUser, async (req: any, res: any) => {
  try {
    const { supabaseService } = getServices(req);
    if (!supabaseService) {
      return res.status(500).json({ error: 'Database not available' });
    }

    const userId = req.user.id;
    const limit = parseInt(req.query.limit as string) || 20;
    const platform = req.query.platform as string;

    // Build query
    let query = supabaseService
      .from('user_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .limit(limit);

    // Filter by platform if specified
    if (platform) {
      query = query.eq('platform', platform);
    }

    const { data: sessions, error } = await query;

    if (error) {
      console.error('[SESSIONS] Error fetching session history:', error);
      return res.status(500).json({ error: 'Failed to fetch session history' });
    }

    // Format session data
    const sessionHistory = sessions.map((session: any) => ({
      id: session.id,
      sessionId: session.session_id,
      platform: session.platform,
      startedAt: session.started_at,
      endedAt: session.ended_at,
      durationSeconds: session.total_duration_seconds,
      activityCount: session.activity_count,
      endReason: session.end_reason,
      status: session.status,
      deviceInfo: session.device_info
    }));

    res.json({
      success: true,
      sessions: sessionHistory
    });

  } catch (error) {
    console.error('[SESSIONS] Error fetching session history:', error);
    res.status(500).json({ error: 'Failed to fetch session history' });
  }
});

// GET /api/sessions/analytics - Get user session analytics
router.get('/api/sessions/analytics', authenticateUser, async (req: any, res: any) => {
  try {
    const { supabaseService } = getServices(req);
    if (!supabaseService) {
      return res.status(500).json({ error: 'Database not available' });
    }

    const userId = req.user.id;
    const days = parseInt(req.query.days as string) || 30;

    // Get sessions from last N days
    const { data: sessions, error } = await supabaseService
      .from('user_sessions')
      .select('*')
      .eq('user_id', userId)
      .gte('started_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order('started_at', { ascending: false });

    if (error) {
      console.error('[SESSIONS] Error fetching session analytics:', error);
      return res.status(500).json({ error: 'Failed to fetch session analytics' });
    }

    // Calculate analytics
    const totalSessions = sessions.length;
    const activeSessions = sessions.filter((s: any) => s.status === 'active').length;
    const endedSessions = sessions.filter((s: any) => s.status === 'ended');
    
    const totalDuration = endedSessions.reduce((sum: number, s: any) => sum + (s.total_duration_seconds || 0), 0);
    const averageDuration = endedSessions.length > 0 ? totalDuration / endedSessions.length : 0;
    
    // Platform breakdown
    const platformStats = sessions.reduce((acc: any, session: any) => {
      if (!acc[session.platform]) {
        acc[session.platform] = { count: 0, totalDuration: 0 };
      }
      acc[session.platform].count++;
      acc[session.platform].totalDuration += session.total_duration_seconds || 0;
      return acc;
    }, {});

    // Daily activity
    const dailyActivity = sessions.reduce((acc: any, session: any) => {
      const date = new Date(session.started_at).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { sessions: 0, totalDuration: 0 };
      }
      acc[date].sessions++;
      acc[date].totalDuration += session.total_duration_seconds || 0;
      return acc;
    }, {});

    res.json({
      success: true,
      analytics: {
        totalSessions,
        activeSessions,
        endedSessions: endedSessions.length,
        totalDurationSeconds: totalDuration,
        averageDurationSeconds: Math.round(averageDuration),
        platformStats,
        dailyActivity,
        periodDays: days
      }
    });

  } catch (error) {
    console.error('[SESSIONS] Error fetching session analytics:', error);
    res.status(500).json({ error: 'Failed to fetch session analytics' });
  }
});

// POST /api/sessions/cleanup - Clean up inactive sessions (admin/maintenance)
router.post('/api/sessions/cleanup', authenticateUser, async (req: any, res: any) => {
  try {
    const { supabaseService } = getServices(req);
    if (!supabaseService) {
      return res.status(500).json({ error: 'Database not available' });
    }

    const timeoutMinutes = req.body.timeoutMinutes || 60;

    // Call the database function to end inactive sessions
    const { data, error } = await supabaseService.rpc('end_inactive_sessions', {
      timeout_minutes: timeoutMinutes
    });

    if (error) {
      console.error('[SESSIONS] Error cleaning up sessions:', error);
      return res.status(500).json({ error: 'Failed to cleanup sessions' });
    }

    console.log(`[SESSIONS] Cleaned up ${data} inactive sessions`);
    res.json({
      success: true,
      cleanedUpSessions: data,
      timeoutMinutes
    });

  } catch (error) {
    console.error('[SESSIONS] Error cleaning up sessions:', error);
    res.status(500).json({ error: 'Failed to cleanup sessions' });
  }
});

export default router;