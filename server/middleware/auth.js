const { supabase, isSupabaseConfigured } = require('../database/supabase');
const store = require('../database/store');

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  // Check if running in Supabase mode and token is provided
  if (isSupabaseConfigured() && authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) {
        return res.status(401).json({
          error: "Unauthorized",
          message: "Invalid or expired Supabase authentication token."
        });
      }
      req.user = user;
      return next();
    } catch (err) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Authentication verification failed: " + err.message
      });
    }
  }

  // Demo / Local Store Fallback mode
  // If demo session header or demo cookie or demo mode is active
  if (req.headers['x-demo-user'] || process.env.DEMO_MODE === 'true' || !isSupabaseConfigured()) {
    req.user = store.profile;
    req.isDemo = true;
    return next();
  }

  return res.status(401).json({
    error: "Unauthorized",
    message: "Missing Authorization header or valid session token."
  });
}

module.exports = {
  requireAuth
};
