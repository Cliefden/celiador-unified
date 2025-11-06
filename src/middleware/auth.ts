// Authentication middleware
const authenticateUser = async (req: any, res: any, next: any) => {
  try {
    console.log(`${req.method} ${req.path} - Auth check`);
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Missing or invalid authorization header');
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    // Get supabaseService from req.app.locals (will be set in main app)
    // Use service role client for server-side authentication
    const supabase = req.app.locals.supabaseService;
    
    if (!supabase) {
      // If Supabase not available, create a mock user for development
      console.log('No Supabase available, using mock user');
      req.user = { id: 'dev-user', email: 'dev@example.com' };
      return next();
    }

    const token = authHeader.substring(7);
    
    // Debug: Log token info
    if (req.path.includes('/activity')) {
      console.log(`[DEBUG] Activity endpoint token length: ${token.length}, starts with: ${token.substring(0, 20)}...`);
    }
    
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      console.log('Invalid token:', error?.message);
      return res.status(401).json({ error: 'Invalid token' });
    }

    console.log('User authenticated:', user.id);
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

export { authenticateUser };