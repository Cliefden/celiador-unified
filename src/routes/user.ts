import express from 'express';
import { authenticateUser } from '../middleware/auth.js';

// Helper function to parse User-Agent string
function parseUserAgent(userAgent: string) {
  const ua = userAgent.toLowerCase();
  
  // Parse Browser
  let browser = 'Unknown';
  if (ua.includes('firefox') && !ua.includes('seamonkey')) {
    browser = 'Firefox';
  } else if (ua.includes('chrome') && !ua.includes('edg') && !ua.includes('opr')) {
    browser = 'Chrome';
  } else if (ua.includes('safari') && !ua.includes('chrome') && !ua.includes('edg')) {
    browser = 'Safari';
  } else if (ua.includes('edg')) {
    browser = 'Edge';
  } else if (ua.includes('opr') || ua.includes('opera')) {
    browser = 'Opera';
  } else if (ua.includes('trident') || ua.includes('msie')) {
    browser = 'Internet Explorer';
  }
  
  // Parse Operating System
  let os = 'Unknown';
  if (ua.includes('windows')) {
    if (ua.includes('windows nt 10')) os = 'Windows 10/11';
    else if (ua.includes('windows nt 6.3')) os = 'Windows 8.1';
    else if (ua.includes('windows nt 6.2')) os = 'Windows 8';
    else if (ua.includes('windows nt 6.1')) os = 'Windows 7';
    else os = 'Windows';
  } else if (ua.includes('mac os x') || ua.includes('macos')) {
    if (ua.includes('mac os x 10_15') || ua.includes('macos 10_15')) os = 'macOS Catalina';
    else if (ua.includes('mac os x 11') || ua.includes('macos 11')) os = 'macOS Big Sur';
    else if (ua.includes('mac os x 12') || ua.includes('macos 12')) os = 'macOS Monterey';
    else if (ua.includes('mac os x 13') || ua.includes('macos 13')) os = 'macOS Ventura';
    else if (ua.includes('mac os x 14') || ua.includes('macos 14')) os = 'macOS Sonoma';
    else if (ua.includes('mac os x 15') || ua.includes('macos 15')) os = 'macOS Sequoia';
    else os = 'macOS';
  } else if (ua.includes('linux')) {
    if (ua.includes('ubuntu')) os = 'Ubuntu';
    else if (ua.includes('debian')) os = 'Debian';
    else if (ua.includes('fedora')) os = 'Fedora';
    else if (ua.includes('centos')) os = 'CentOS';
    else os = 'Linux';
  } else if (ua.includes('android')) {
    os = 'Android';
  } else if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) {
    os = 'iOS';
  }
  
  // Parse Device Type
  let device = 'Desktop';
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    device = 'Mobile';
  } else if (ua.includes('tablet') || ua.includes('ipad')) {
    device = 'Tablet';
  }
  
  return { browser, os, device };
}

// Helper function to count files in a file tree structure
function countFilesInTree(items: any[]): number {
  let count = 0;
  for (const item of items) {
    if (item.type === 'file') {
      count++;
    } else if (item.type === 'directory' && item.children) {
      count += countFilesInTree(item.children);
    }
  }
  return count;
}

const router = express.Router();

// Access services from app.locals (set by main index.ts)
const getServices = (req: any) => ({
  supabase: req.app.locals.supabase,
  supabaseService: req.app.locals.supabaseService,
  db: req.app.locals.db
});

// GET /api/user/profile - Get comprehensive user profile data
router.get('/api/user/profile', authenticateUser, async (req: any, res: any) => {
  try {
    console.log('[USER_PROFILE] Getting profile data for user:', req.user?.id);
    
    const { supabaseService, db } = getServices(req);
    if (!supabaseService) {
      return res.status(500).json({ error: 'Database not available' });
    }

    const userId = req.user.id;
    const userEmail = req.user.email;

    // Get basic user info from auth user
    const basicInfo = {
      email: userEmail || 'Not available',
      id: userId,
      created_at: req.user.created_at || new Date().toISOString(),
      last_sign_in_at: req.user.last_sign_in_at || new Date().toISOString(),
      email_confirmed_at: req.user.email_confirmed_at || req.user.created_at || new Date().toISOString()
    };

    // Get user profile from profiles table for additional info
    let profileData = null;
    try {
      const { data: profile } = await supabaseService
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      profileData = profile;
    } catch (error) {
      console.log('[USER_PROFILE] No profile data found, using defaults');
    }

    // Get real statistics
    const [projects, conversations, jobs, integrations] = await Promise.all([
      // Total projects
      db.getProjectsByUserId(userId),
      
      // All conversations for this user
      supabaseService
        .from('conversations')
        .select('id, createdat')
        .eq('userid', userId)
        .then((result: any) => result.data || []),
      
      // All jobs for this user's projects
      supabaseService
        .from('jobs')
        .select('id, type, status, createdat, metadata')
        .in('projectid', 
          await db.getProjectsByUserId(userId).then((projects: any) => 
            projects.map((p: any) => p.id)
          )
        )
        .then((result: any) => result.data || []),
      
      // User's integrations
      db.getServiceIntegrations(userId)
    ]);

    // Calculate file and storage statistics from Supabase Storage
    let totalFiles = 0;
    let storageUsed = 0;
    
    try {
      console.log(`[USER_FILES] Counting files from Supabase Storage for user ${userId} across ${projects.length} projects`);
      
      // Count files from Supabase Storage for each project
      for (const project of projects) {
        try {
          console.log(`[USER_FILES] Checking Supabase Storage for project ${project.id}: ${project.name}`);
          
          // List all files in the project's storage bucket
          const { data: files, error } = await supabaseService.storage
            .from('projects')
            .list(project.id, {
              limit: 1000, // Get up to 1000 files
              sortBy: { column: 'name', order: 'asc' }
            });
          
          if (error) {
            console.log(`[USER_FILES] Error accessing storage for project ${project.id}:`, error);
            // Use fallback estimate
            const estimatedFiles = 20;
            totalFiles += estimatedFiles;
            storageUsed += estimatedFiles * 0.05;
            console.log(`[USER_FILES] Using estimated file count for project ${project.id}: ${estimatedFiles} files`);
            continue;
          }
          
          if (files && files.length > 0) {
            // Count actual files (not directories)
            const fileCount = files.filter((file: any) => file.metadata?.size !== undefined).length;
            totalFiles += fileCount;
            
            // Calculate actual storage used in MB
            const projectStorageMB = files.reduce((total: any, file: any) => {
              return total + (file.metadata?.size || 0);
            }, 0) / (1024 * 1024); // Convert bytes to MB
            
            storageUsed += projectStorageMB;
            
            console.log(`[USER_FILES] Project ${project.id} (${project.name}): ${fileCount} files, ${Math.round(projectStorageMB * 100) / 100}MB actual storage`);
          } else {
            console.log(`[USER_FILES] Project ${project.id} has no files in storage`);
          }
          
        } catch (storageError) {
          console.log(`[USER_FILES] Error accessing storage for project ${project.id}:`, storageError);
          // Fallback estimate
          const estimatedFiles = 20;
          totalFiles += estimatedFiles;
          storageUsed += estimatedFiles * 0.05;
          console.log(`[USER_FILES] Using estimated file count for project ${project.id}: ${estimatedFiles} files`);
        }
      }
      
      // Round storage to 2 decimal places
      storageUsed = Math.round(storageUsed * 100) / 100;
      
      console.log(`[USER_FILES] Total for user ${userId}: ${totalFiles} files in Supabase Storage, ${storageUsed}MB actual storage used`);
    } catch (error) {
      console.error('[USER_FILES] Error calculating Supabase Storage statistics:', error);
      // Keep defaults if storage access fails
    }

    // Calculate real statistics
    const statistics = {
      totalProjects: projects.length,
      totalConversations: conversations.length,
      totalFiles: totalFiles,
      totalDeployments: jobs.filter((job: any) => job.type === 'DEPLOY' && job.status === 'COMPLETED').length,
      storageUsed: storageUsed,
      apiCallsThisMonth: jobs.filter((job: any) => {
        const jobDate = new Date(job.createdat);
        const now = new Date();
        return jobDate.getMonth() === now.getMonth() && 
               jobDate.getFullYear() === now.getFullYear() &&
               (job.type === 'AI_ACTION' || job.type === 'CODEGEN');
      }).length
    };

    // Calculate activity data
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Get recent activity
    const recentJobs = jobs.filter((job: any) => new Date(job.createdat) >= weekAgo);
    const recentConversations = conversations.filter((conv: any) => new Date(conv.createdat) >= weekAgo);
    
    // Calculate streak (simplified - days with activity in last 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const allActivity = [...jobs, ...conversations].filter((item: any) => 
      new Date(item.createdat) >= thirtyDaysAgo
    );
    
    // Group by day and count unique days
    const activityDays = new Set();
    allActivity.forEach((item: any) => {
      const date = new Date(item.createdat);
      const dayKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      activityDays.add(dayKey);
    });

    // Get real session data
    let currentSessionData = null;
    let sessionAnalytics = {
      totalSessions: 0,
      totalHoursThisWeek: 0,
      averageSessionMinutes: 0
    };

    try {
      // Get user's active sessions
      const { data: activeSessions } = await supabaseService
        .from('user_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('started_at', { ascending: false })
        .limit(1);

      // Get session analytics for this week
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const { data: weekSessions } = await supabaseService
        .from('user_sessions')
        .select('total_duration_seconds, platform, device_info, started_at')
        .eq('user_id', userId)
        .gte('started_at', weekAgo.toISOString());

      if (activeSessions && activeSessions.length > 0) {
        const currentSession = activeSessions[0];
        const sessionStartTime = new Date(currentSession.started_at);
        const currentDuration = Math.floor((now.getTime() - sessionStartTime.getTime()) / 1000 / 60); // minutes

        currentSessionData = {
          duration: currentDuration,
          location: currentSession.location_info?.country || 'Unknown',
          device: currentSession.device_info?.platform || currentSession.platform || 'Unknown',
          ip: currentSession.ip_address || 'xxx.xxx.xxx.xxx',
          platform: currentSession.platform,
          startedAt: currentSession.started_at
        };
      }

      if (weekSessions) {
        sessionAnalytics.totalSessions = weekSessions.length;
        const totalSeconds = weekSessions.reduce((sum: number, session: any) => sum + (session.total_duration_seconds || 0), 0);
        sessionAnalytics.totalHoursThisWeek = Math.round(totalSeconds / 3600 * 100) / 100; // Hours with 2 decimal places
        sessionAnalytics.averageSessionMinutes = weekSessions.length > 0 ? Math.round(totalSeconds / weekSessions.length / 60) : 0;
      }
    } catch (sessionError) {
      console.log('[USER_PROFILE] Could not fetch session data, using fallback');
    }

    const activity = {
      lastActiveAt: allActivity.length > 0 ? 
        Math.max(...allActivity.map((item: any) => new Date(item.createdat).getTime())) :
        new Date().toISOString(),
      currentSession: currentSessionData || {
        duration: 0,
        location: 'Unknown',
        device: parseUserAgent(req.headers['user-agent'] || '').device,
        browser: parseUserAgent(req.headers['user-agent'] || '').browser,
        os: parseUserAgent(req.headers['user-agent'] || '').os,
        ip: req.ip ? req.ip.replace(/\d+$/, 'xxx') : 'xxx.xxx.xxx.xxx'
      },
      streakDays: activityDays.size,
      totalHoursThisWeek: sessionAnalytics.totalHoursThisWeek || Math.floor((recentJobs.length + recentConversations.length) * 0.5),
      sessionAnalytics: sessionAnalytics
    };

    // Calculate achievements based on real data
    const accountAge = Math.floor((now.getTime() - new Date(basicInfo.created_at).getTime()) / (1000 * 60 * 60 * 24));
    
    // Calculate total experience points
    const totalXP = statistics.totalProjects * 100 + 
                   statistics.totalConversations * 10 + 
                   statistics.totalDeployments * 50;
    
    // Calculate level based on XP (each level requires progressively more XP)
    // Level 1: 0-499 XP, Level 2: 500-999 XP, Level 3: 1000-1599 XP, etc.
    // Formula: XP needed for level N = (N-1) * 500 + ((N-1) * (N-2) * 50)
    let currentLevel = 1;
    let xpForCurrentLevel = 0;
    let xpForNextLevel = 500;
    
    while (totalXP >= xpForNextLevel) {
      currentLevel++;
      xpForCurrentLevel = xpForNextLevel;
      // Each level requires 500 base + 50 * (level - 1) additional XP
      xpForNextLevel = xpForCurrentLevel + (500 + (currentLevel - 1) * 50);
    }
    
    const achievements = {
      badge: accountAge < 7 ? 'Newcomer' : 
             accountAge < 30 ? 'Explorer' : 
             accountAge < 90 ? 'Builder' : 'Veteran',
      level: currentLevel,
      experiencePoints: totalXP,
      currentLevelXP: totalXP - xpForCurrentLevel, // XP within current level
      nextLevelXP: xpForNextLevel - xpForCurrentLevel, // XP needed for current level
      unlockedFeatures: [
        'Project Creation',
        'GitHub Integration',
        'Vercel Deployment',
        'AI Assistant',
        ...(statistics.totalProjects > 3 ? ['Advanced Templates'] : []),
        ...(statistics.totalDeployments > 5 ? ['Custom Domains'] : []),
        ...(accountAge > 30 ? ['Team Collaboration'] : []),
        ...(currentLevel >= 5 ? ['Priority Support'] : []),
        ...(currentLevel >= 10 ? ['Beta Features'] : [])
      ]
    };

    // User preferences (from profile or defaults)
    const preferences = {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: 'en', // TODO: Get from user preferences
      newsletter: profileData?.newsletter_subscribed || true,
      productUpdates: profileData?.product_updates || true
    };

    // Enhanced basic info with profile data
    const enhancedBasicInfo = {
      ...basicInfo,
      // Add profile fields if available
      full_name: profileData?.full_name || null,
      username: profileData?.username || null,
      display_name: profileData?.username || profileData?.full_name || userEmail?.split('@')[0] || null,
      avatar_url: profileData?.avatar_url || null,
      website: profileData?.website || null
    };

    const userProfile = {
      basicInfo: enhancedBasicInfo,
      statistics,
      activity,
      achievements,
      preferences
    };

    console.log(`[USER_PROFILE] Successfully compiled profile for user ${userId}`);
    res.json(userProfile);

  } catch (error) {
    console.error('[USER_PROFILE] Error getting user profile:', error);
    res.status(500).json({ error: 'Failed to load user profile' });
  }
});

// GET /api/user/activity - Get detailed activity feed for the user
router.get('/api/user/activity', authenticateUser, async (req: any, res: any) => {
  try {
    console.log('[USER_ACTIVITY] Getting activity for user:', req.user?.id);
    
    const { supabaseService, db } = getServices(req);
    if (!supabaseService) {
      return res.status(500).json({ error: 'Database not available' });
    }

    const userId = req.user.id;
    const limit = parseInt(req.query.limit as string) || 20;

    // Get user's projects for filtering jobs
    const projects = await db.getProjectsByUserId(userId);
    const projectIds = projects.map((p: any) => p.id);

    if (projectIds.length === 0) {
      return res.json([]);
    }

    // Get recent activity from multiple sources
    const [jobs, conversations] = await Promise.all([
      // Jobs
      supabaseService
        .from('jobs')
        .select('*')
        .in('projectid', projectIds)
        .order('createdat', { ascending: false })
        .limit(limit)
        .then((result: any) => result.data || []),
      
      // Conversations
      supabaseService
        .from('conversations')
        .select('*')
        .eq('userid', userId)
        .order('createdat', { ascending: false })
        .limit(limit)
        .then((result: any) => result.data || [])
    ]);

    // Combine and format activity items
    const activityItems: any[] = [];

    // Add job activities
    jobs.forEach((job: any) => {
      activityItems.push({
        id: `job-${job.id}`,
        type: 'job',
        title: getJobTitle(job.type, job.status),
        description: getJobDescription(job.type, job.status, job.metadata),
        status: job.status,
        timestamp: job.createdat,
        metadata: {
          jobId: job.id,
          jobType: job.type,
          output: job.output,
          error: job.error,
          jobMetadata: job.metadata
        }
      });
    });

    // Add conversation activities
    conversations.forEach((conversation: any) => {
      activityItems.push({
        id: `conversation-${conversation.id}`,
        type: 'conversation',
        title: conversation.title || 'AI Conversation',
        description: conversation.description || 'Started a new conversation with AI assistant',
        timestamp: conversation.createdat,
        metadata: {
          conversationId: conversation.id
        }
      });
    });

    // Sort by timestamp and limit
    activityItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const limitedActivity = activityItems.slice(0, limit);

    console.log(`[USER_ACTIVITY] Found ${limitedActivity.length} activity items for user ${userId}`);
    res.json(limitedActivity);

  } catch (error) {
    console.error('[USER_ACTIVITY] Error getting user activity:', error);
    res.status(500).json({ error: 'Failed to load user activity' });
  }
});

// Helper functions
function getJobTitle(type: string, status: string): string {
  const typeNames: { [key: string]: string } = {
    'SCAFFOLD': 'Project Setup',
    'AI_ACTION': 'AI Code Generation',
    'EDIT': 'File Editing',
    'TEST': 'Testing',
    'BUILD': 'Build Process',
    'DEPLOY': 'Deployment'
  };
  
  const statusNames: { [key: string]: string } = {
    'PENDING': 'Queued',
    'RUNNING': 'In Progress',
    'COMPLETED': 'Completed',
    'FAILED': 'Failed',
    'CANCELLED': 'Cancelled'
  };
  
  return `${typeNames[type] || type} ${statusNames[status] || status}`;
}

function getJobDescription(type: string, status: string, metadata: any): string {
  const baseDescriptions: { [key: string]: string } = {
    'SCAFFOLD': 'Setting up project structure and dependencies',
    'AI_ACTION': 'AI-powered code generation and modification',
    'EDIT': 'Manual code editing and file modifications',
    'TEST': 'Running tests and validation checks',
    'BUILD': 'Compiling and building the project',
    'DEPLOY': 'Deploying to production environment'
  };
  
  let description = baseDescriptions[type] || `${type} operation`;
  
  if (status === 'FAILED' && metadata?.error) {
    description += ' - Failed with error';
  } else if (status === 'COMPLETED' && metadata?.output) {
    description += ' - Completed successfully';
  }
  
  return description;
}

// POST /api/auth/create-profile - Create user profile (fallback for signup)
router.post('/api/auth/create-profile', async (req: any, res: any) => {
  try {
    console.log('[CREATE_PROFILE] Creating profile:', JSON.stringify(req.body, null, 2));
    
    const { supabaseService } = getServices(req);
    if (!supabaseService) {
      console.error('[CREATE_PROFILE] Database service not available');
      return res.status(500).json({ error: 'Database not available' });
    }

    const { userId, profileData } = req.body;
    
    if (!userId || !profileData) {
      console.error('[CREATE_PROFILE] Missing required data:', { userId: !!userId, profileData: !!profileData });
      return res.status(400).json({ error: 'Missing userId or profileData' });
    }

    console.log('[CREATE_PROFILE] Attempting to insert profile for user:', userId);
    
    // First check if profile already exists
    const { data: existingProfile, error: checkError } = await supabaseService
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();
    
    if (existingProfile) {
      console.log('[CREATE_PROFILE] Profile already exists:', userId);
      return res.json({ success: true, message: 'Profile already exists', profile: existingProfile });
    }

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('[CREATE_PROFILE] Error checking existing profile:', checkError);
    }

    // Create profile in the profiles table
    const insertData = {
      id: userId,
      email: profileData.email,
      full_name: profileData.full_name || '',
      username: profileData.username || profileData.email?.split('@')[0] || '',
      website: profileData.website || '',
      avatar_url: profileData.avatar_url || '',
      role: 'user'
    };
    
    console.log('[CREATE_PROFILE] Insert data:', JSON.stringify(insertData, null, 2));
    
    const { data, error } = await supabaseService
      .from('profiles')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('[CREATE_PROFILE] Database error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      
      // If profile already exists, that's actually OK - just return success
      if (error.code === '23505') { // Unique constraint violation
        console.log('[CREATE_PROFILE] Profile already exists (constraint violation), which is fine');
        return res.json({ success: true, message: 'Profile already exists' });
      }
      
      return res.status(500).json({ 
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
    }

    console.log('[CREATE_PROFILE] Profile created successfully:', data?.id);
    res.json({ success: true, profile: data });

  } catch (error: any) {
    console.error('[CREATE_PROFILE] Unexpected error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

export default router;