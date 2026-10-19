const express = require('express');
const router = express.Router();
const store = require('../database/store');
const { evaluateActionRequest } = require('../services/securityEngine');
const { requireAuth } = require('../middleware/auth');

// POST /api/requests/evaluate (Core Security Gateway Endpoint)
// Can be called by AI agents via API Key or dashboard test bench
router.post('/evaluate', async (req, res) => {
  try {
    const result = await evaluateActionRequest(req.body);
    return res.status(200).json(result);
  } catch (err) {
    console.error('[SecurityEngine] Unhandled evaluation error:', err);
    return res.status(500).json({
      success: false,
      decision: "BLOCK",
      risk: { score: 100, level: "CRITICAL", factors: [] },
      rationale: "Internal security engine exception. Deny-by-default applied: " + err.message,
      execution: { status: "BLOCKED", result: null }
    });
  }
});

// GET /api/requests (Historical evaluation log)
router.get('/', requireAuth, (req, res) => {
  const { decision, agent_id, limit = 50 } = req.query;

  let filtered = [...store.requests];

  if (decision && decision !== 'ALL') {
    filtered = filtered.filter(r => r.decision === decision);
  }

  if (agent_id) {
    filtered = filtered.filter(r => r.agent_id === agent_id);
  }

  const results = filtered.slice(0, parseInt(limit, 10));

  res.json({
    success: true,
    count: results.length,
    total: filtered.length,
    requests: results
  });
});

// GET /api/requests/:id
router.get('/:id', requireAuth, (req, res) => {
  const request = store.requests.find(r => r.request_id === req.params.id);
  if (!request) {
    return res.status(404).json({ success: false, error: "Request not found." });
  }

  res.json({ success: true, request });
});

module.exports = router;
