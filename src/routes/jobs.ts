import express from 'express';
import { authenticateUser } from '../middleware/auth.js';
import { formatJobAsActivity, formatConversationAsActivity, formatEntityAsActivity } from '../utils/activityFormatter.js';

const router = express.Router();

// Access services from app.locals (set by main index.ts)
const getServices = (req: any) => ({
  supabase: req.app.locals.supabase,
  supabaseService: req.app.locals.supabaseService,
  db: req.app.locals.db,
  jobService: req.app.locals.jobService
});

// GET /projects/:id/jobs - Get jobs for a project
router.get('/projects/:id/jobs', authenticateUser, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { type, status } = req.query;
    console.log(`[JOBS] Getting jobs for project ${id}, user ${req.user?.id}`);
    const { supabaseService, db } = getServices(req);
    
    const project = await db.getProjectById(id);
    if (!project || project.userid !== req.user.id) {
      console.log(`[JOBS] Project not found or access denied for project ${id}`);
      return res.status(404).json({ error: 'Project not found or access denied' });
    }

    if (!supabaseService) {
      console.log(`[JOBS] No Supabase service available, returning empty array`);
      return res.json([]);
    }

    console.log(`[JOBS] Querying jobs table for project ${id}`);
    let query = supabaseService
      .from('jobs')
      .select('*')
      .eq('projectid', id)
      .order('createdat', { ascending: false });
    
    if (type) {
      query = query.eq('type', type);
    }
    
    if (status) {
      const statusArray = status.toString().split(',');
      query = query.in('status', statusArray);
    }

    const { data: jobs, error } = await query;
    
    if (error) {
      console.error(`[JOBS] Database error:`, error);
      throw error;
    }
    
    console.log(`[JOBS] Found ${jobs?.length || 0} jobs for project ${id}`);
    res.json(jobs || []);
  } catch (error) {
    console.error('Failed to get jobs:', error);
    res.status(500).json({ error: 'Failed to get jobs' });
  }
});

// POST /projects/:id/jobs - Create a new job
router.post('/projects/:id/jobs', authenticateUser, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { type, prompt } = req.body;

    if (!type) {
      return res.status(400).json({ error: 'Job type is required' });
    }

    const { db, jobService } = getServices(req);
    const project = await db.getProjectById(id);
    if (!project || project.userid !== req.user.id) {
      return res.status(404).json({ error: 'Project not found or access denied' });
    }

    // Create job in database (userid will be derived from project)
    const job = await db.createJob({
      type,
      prompt,
      projectId: id,
      metadata: req.body.metadata
    });

    console.log(`[JOB CREATION] Created job ${job.id} for project ${id}, derived userid: ${job.userid}`);

    // Add job to processing queue (userid will be derived from project)
    const jobData = {
      id: job.id,
      projectId: id,
      // No explicit userId - will be derived from project
      type,
      prompt,
      templateKey: project.templatekey,
      metadata: req.body.metadata,
      repo: {
        provider: project.repoprovider,
        owner: project.repoowner,
        name: project.reponame
      }
    };

    await jobService.addJob(jobData);

    res.status(201).json(job);
  } catch (error) {
    console.error('Failed to create job:', error);
    res.status(500).json({ error: 'Failed to create job' });
  }
});

// GET /jobs/:id - Get individual job status
router.get('/jobs/:id', authenticateUser, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    
    const { supabaseService } = getServices(req);
    if (!supabaseService) {
      return res.status(500).json({ error: 'Database not available' });
    }
    
    // Get job with project relationship to verify ownership
    const { data: job, error } = await supabaseService
      .from('jobs')
      .select(`
        *,
        projects!inner (
          id,
          userid,
          name
        )
      `)
      .eq('id', id)
      .eq('projects.userid', req.user.id) // Ensure user can only access jobs for their projects
      .single();

    if (error) {
      console.error('Database error fetching job:', error);
      return res.status(500).json({ error: 'Failed to fetch job' });
    }

    if (!job) {
      return res.status(404).json({ error: 'Job not found or access denied' });
    }

    // Transform database record to match frontend interface (derive userId from project)
    const transformedJob = {
      id: job.id,
      userId: job.projects.userid, // Derived from project relationship
      projectId: job.projectid,
      type: job.type,
      status: job.status,
      metadata: job.metadata,
      result: job.result,
      error: job.error,
      createdAt: job.createdat,
      updatedAt: job.updatedat
    };

    res.json(transformedJob);
  } catch (error) {
    console.error('Failed to fetch job:', error);
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

// POST /jobs/:id/cancel - Cancel a job
router.post('/jobs/:id/cancel', authenticateUser, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    
    const { db, jobService } = getServices(req);
    
    // Remove from queue if pending
    jobService.removeJobFromQueue(id);
    
    // Update status in database
    await db.updateJobStatus(id, 'CANCELLED');
    
    res.json({ success: true, message: 'Job cancelled' });
  } catch (error) {
    console.error('Failed to cancel job:', error);
    res.status(500).json({ error: 'Failed to cancel job' });
  }
});

// POST /jobs/:id/retry - Retry a failed job
router.post('/jobs/:id/retry', authenticateUser, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    
    const { supabaseService, db, jobService } = getServices(req);
    if (!supabaseService) {
      return res.status(500).json({ error: 'Database not available' });
    }
    
    // Get job details
    const { data: job, error } = await supabaseService
      .from('jobs')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    // Reset status and add back to queue
    await db.updateJobStatus(id, 'PENDING');
    
    const jobData = {
      id: job.id,
      projectId: job.projectid,
      // No explicit userId - will be derived from project
      type: job.type,
      prompt: job.prompt
    };
    
    await jobService.addJob(jobData);
    console.log(`Job ${id} retried and added to queue`);
    
    res.json({ success: true, message: 'Job retried' });
  } catch (error) {
    console.error('Failed to retry job:', error);
    res.status(500).json({ error: 'Failed to retry job' });
  }
});

// GET /projects/:id/activity - Get activity feed for a project
router.get('/projects/:id/activity', authenticateUser, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { showAll } = req.query;
    const { supabaseService, db } = getServices(req);
    
    console.log(`[ACTIVITY] Getting activity for project ${id}, user ${req.user?.id}`);
    
    const project = await db.getProjectById(id);
    if (!project || project.userid !== req.user.id) {
      console.log(`[ACTIVITY] Project not found or access denied for project ${id}`);
      return res.status(404).json({ error: 'Project not found or access denied' });
    }

    if (!supabaseService) {
      console.log(`[ACTIVITY] No Supabase service available, returning empty array`);
      return res.json({ activities: [] });
    }

    // Get comprehensive activity from multiple sources
    const limit = showAll === 'true' ? 50 : 10;
    
    console.log(`[ACTIVITY] Querying jobs table for project ${id} activity`);
    // Get jobs activity - order by updatedat first, then createdat
    // Note: userid removed from jobs table in database normalization - derive from project relationship
    const { data: jobs, error: jobsError } = await supabaseService
      .from('jobs')
      .select('id, type, status, createdat, updatedat, prompt, output, error, metadata')
      .eq('projectid', id)
      .order('updatedat', { ascending: false, nullsLast: true })
      .order('createdat', { ascending: false })
      .limit(limit);

    if (jobsError) {
      console.error(`[ACTIVITY] Database error:`, jobsError);
      return res.status(500).json({ error: 'Failed to get activity' });
    }

    console.log(`[ACTIVITY] Found ${jobs?.length || 0} jobs for project ${id}`);

    // Get conversation activity if conversations exist
    let conversationActivities = [];
    try {
      const { data: conversations } = await supabaseService
        .from('conversations')
        .select('id, title, createdat, updatedat')
        .eq('projectId', id)
        .is('deletedAt', null)
        .order('createdat', { ascending: false })
        .limit(5);
      
      conversationActivities = conversations?.map((conv: any) => 
        formatEntityAsActivity('conversations', conv, 'created')
      ) || [];
    } catch (convError) {
      console.log(`[ACTIVITY] Conversations table not available, skipping conversation activity`);
    }

    // Convert jobs to activity format with rich data using shared formatter
    const jobActivities = jobs?.map((job: any) => 
      formatEntityAsActivity('jobs', job, 'updated', req.user.id)
    ) || [];

    // Combine all activities including project creation
    const allActivities = [
      ...jobActivities, 
      ...conversationActivities,
      formatEntityAsActivity('projects', project, 'created')
    ];
    
    // Sort all activities by timestamp (newest first)
    allActivities.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeB - timeA; // newest first (larger timestamp first)
    });
    
    const finalActivities = allActivities.slice(0, limit);
    console.log(`[ACTIVITY] Returning ${finalActivities.length} activities for project ${id}`);
    
    res.json({ activities: finalActivities });
  } catch (error) {
    console.error('[ACTIVITY] Failed to get activity:', error);
    res.status(500).json({ error: 'Failed to get activity' });
  }
});

export default router;