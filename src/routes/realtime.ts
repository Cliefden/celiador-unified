import express from 'express';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

// Get WebSocket connection information
router.get('/api/realtime/connection-info', authenticateUser, (req: any, res: any) => {
  try {
    const { wsService } = req.app.locals;
    
    if (!wsService) {
      return res.status(503).json({ 
        error: 'WebSocket service not available',
        available: false 
      });
    }

    // Get WebSocket URL based on environment
    let wsUrl;
    if (process.env.NODE_ENV === 'production') {
      // For Railway deployment, WebSocket runs on same port as HTTP (no custom port)
      const railwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN;
      if (railwayDomain) {
        wsUrl = `wss://${railwayDomain}`;
      } else {
        wsUrl = 'wss://celiador-unified-production.up.railway.app';
      }
    } else {
      // Local development - WebSocket on same port as HTTP server
      const port = process.env.PORT || '8080';
      wsUrl = `ws://localhost:${port}`;
    }

    const stats = wsService.getStats();
    
    res.json({
      available: true,
      wsUrl,
      port: process.env.PORT || '8080',
      stats,
      channels: [
        'jobs',
        'projects',
        'conversations', 
        'deployments',
        'system_notifications'
      ],
      connectionInstructions: {
        step1: 'Connect to the WebSocket URL',
        step2: 'Send authentication message: {"type": "authenticate", "token": "your_jwt_token"}',
        step3: 'Subscribe to channels: {"type": "subscribe", "channel": "jobs"}',
        step4: 'Listen for real-time events'
      }
    });
  } catch (error) {
    console.error('Error getting WebSocket connection info:', error);
    res.status(500).json({ error: 'Failed to get connection info' });
  }
});

// Get current WebSocket statistics
router.get('/api/realtime/stats', authenticateUser, (req: any, res: any) => {
  try {
    const { wsService } = req.app.locals;
    
    if (!wsService) {
      return res.status(503).json({ error: 'WebSocket service not available' });
    }

    const stats = wsService.getStats();
    
    res.json({
      ...stats,
      timestamp: new Date().toISOString(),
      healthy: true
    });
  } catch (error) {
    console.error('Error getting WebSocket stats:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

// Test endpoint to trigger a WebSocket event (for development/testing)
router.post('/api/realtime/test-event', authenticateUser, (req: any, res: any) => {
  try {
    const { wsService } = req.app.locals;
    const userId = req.user?.id;
    
    if (!wsService) {
      return res.status(503).json({ error: 'WebSocket service not available' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { eventType = 'job_status_change', jobId = 'test-job', projectId = 'test-project' } = req.body;

    // Send a test WebSocket event
    wsService.notifyJobStatusChange(userId, jobId, projectId, 'COMPLETED', {
      test: true,
      timestamp: new Date().toISOString(),
      message: 'This is a test WebSocket event'
    });

    res.json({
      success: true,
      message: 'Test WebSocket event sent',
      eventType,
      userId,
      jobId,
      projectId
    });
  } catch (error) {
    console.error('Error sending test event:', error);
    res.status(500).json({ error: 'Failed to send test event' });
  }
});

// Health check for real-time services
router.get('/api/realtime/health', (req: any, res: any) => {
  try {
    const { wsService, supabaseService } = req.app.locals;
    
    const health = {
      websocket: {
        available: !!wsService,
        stats: wsService ? wsService.getStats() : null
      },
      supabase: {
        available: !!supabaseService,
        url: process.env.SUPABASE_URL ? 'configured' : 'not configured'
      },
      timestamp: new Date().toISOString(),
      healthy: !!wsService && !!supabaseService
    };

    res.json(health);
  } catch (error) {
    console.error('Error checking real-time health:', error);
    res.status(500).json({ 
      healthy: false,
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;