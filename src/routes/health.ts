import express from 'express';
const router = express.Router();

// Health check endpoints
router.get('/', (req: any, res: any) => {
  res.json({
    service: 'Celiador Unified Service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

router.get('/health', (req: any, res: any) => {
  res.status(200).json({ status: 'healthy' });
});

router.get('/healthz', (req: any, res: any) => {
  res.status(200).json({ status: 'ok' });
});

router.get('/api/status', (req: any, res: any) => {
  const jobService = req.app.locals.jobService;
  const previewService = req.app.locals.previewService;
  res.json({
    status: 'operational',
    services: {
      database: !!req.app.locals.supabaseService,
      ai: !!(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY),
      github: !!process.env.GITHUB_ACCESS_TOKEN,
      vercel: !!process.env.VERCEL_API_TOKEN
    },
    jobQueue: jobService ? jobService.getQueueStatus() : { length: 0, processing: false },
    previewInstances: previewService ? Array.from((previewService as any).instances.keys()) : [],
    timestamp: new Date().toISOString()
  });
});

export default router;