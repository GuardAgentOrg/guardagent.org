const express = require('express');
const router = express.Router();
const { isSupabaseConfigured } = require('../database/supabase');

router.get('/', (req, res) => {
  res.json({
    status: "ok",
    product: "GuardAgent — AI Agent Security Platform",
    version: "1.0.0-beta",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
    security_engine: "ACTIVE",
    database: {
      type: isSupabaseConfigured() ? "Supabase PostgreSQL" : "Local Verified Memory Store",
      configured: isSupabaseConfigured(),
      demo_mode: !isSupabaseConfigured() || process.env.DEMO_MODE === "true"
    }
  });
});

module.exports = router;
