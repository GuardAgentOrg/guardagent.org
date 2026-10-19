const express = require('express');
const router = express.Router();
const { supabase, isSupabaseConfigured } = require('../database/supabase');
const store = require('../database/store');

// GET current session / profile
router.get('/session', (req, res) => {
  // If demo mode or Supabase not configured
  if (!isSupabaseConfigured() || req.headers['x-demo-user'] === 'true' || process.env.DEMO_MODE === 'true') {
    return res.json({
      authenticated: true,
      demo_mode: true,
      user: store.profile
    });
  }

  // If Supabase token provided
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.json({ authenticated: false });
  }

  const token = authHeader.replace('Bearer ', '');
  supabase.auth.getUser(token).then(({ data: { user }, error }) => {
    if (error || !user) {
      return res.json({ authenticated: false });
    }
    return res.json({
      authenticated: true,
      demo_mode: false,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.email.split('@')[0],
        role: "security_architect",
        organization: "GuardAgent Org"
      }
    });
  }).catch(() => res.json({ authenticated: false }));
});

// POST login
router.post('/login', async (req, res) => {
  const { email, password, demo = false } = req.body;

  if (demo || !isSupabaseConfigured()) {
    return res.json({
      success: true,
      demo_mode: true,
      message: "Signed in successfully via GuardAgent Demo Mode.",
      token: "demo_token_guardagent_2026",
      user: store.profile
    });
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    return res.json({
      success: true,
      demo_mode: false,
      token: data.session.access_token,
      user: data.user
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST signup
router.post('/signup', async (req, res) => {
  const { email, password, full_name, organization } = req.body;

  if (!isSupabaseConfigured()) {
    return res.json({
      success: true,
      demo_mode: true,
      message: "Account created in Demo Mode. Connect Supabase credentials in .env for production PostgreSQL persistence.",
      token: "demo_token_guardagent_2026",
      user: {
        ...store.profile,
        email: email || store.profile.email,
        full_name: full_name || store.profile.full_name,
        organization: organization || store.profile.organization
      }
    });
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name, organization }
      }
    });

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    return res.json({
      success: true,
      demo_mode: false,
      message: "Account created successfully.",
      user: data.user
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
