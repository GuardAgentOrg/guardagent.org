const express = require('express');
const router = express.Router();
const store = require('../database/store');
const { requireAuth } = require('../middleware/auth');

// GET all agents
router.get('/', requireAuth, (req, res) => {
  const agents = store.agents.map(a => ({
    id: a.id,
    agent_id: a.agent_id,
    name: a.name,
    description: a.description,
    environment: a.environment,
    status: a.status,
    api_key_prefix: a.api_key_prefix,
    assigned_policies: a.assigned_policies,
    total_requests: a.total_requests,
    blocked_requests: a.blocked_requests,
    last_active_at: a.last_active_at,
    created_at: a.created_at
  }));
  res.json({ success: true, count: agents.length, agents });
});

// POST register new agent
router.post('/', requireAuth, (req, res) => {
  const { name, description, environment = 'production', assigned_policies = [] } = req.body;

  if (!name || name.trim().length === 0) {
    return res.status(400).json({ success: false, error: "Agent name is required." });
  }

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const agentId = `agt-${slug}-${Math.floor(10 + Math.random() * 90)}`;
  const secretKey = `ga_live_${Math.random().toString(36).substring(2, 12)}_${Math.random().toString(36).substring(2, 12)}`;
  const keyPrefix = `${secretKey.substring(0, 11)}...`;

  const newAgent = {
    id: `agt_${Date.now()}`,
    agent_id: agentId,
    name: name.trim(),
    description: description ? description.trim() : "Custom registered agent.",
    environment,
    status: "active",
    api_key_prefix: keyPrefix,
    assigned_policies: Array.isArray(assigned_policies) ? assigned_policies : [],
    total_requests: 0,
    blocked_requests: 0,
    last_active_at: null,
    created_at: new Date().toISOString()
  };

  store.agents.unshift(newAgent);

  // Record audit log
  store.audit_logs.unshift({
    log_id: `aud-${Math.floor(1000 + Math.random() * 9000)}`,
    correlation_id: `corr-${Math.random().toString(36).substring(2, 8)}`,
    timestamp: new Date().toISOString(),
    actor_type: "USER",
    actor_id: req.user.email || req.user.id || "admin",
    event_type: "AGENT_REGISTERED",
    action: "register_agent",
    resource: agentId,
    decision: "ALLOW",
    risk_score: 10,
    metadata: { agent_id: agentId, name: newAgent.name, environment }
  });

  res.status(201).json({
    success: true,
    message: "Agent registered successfully.",
    agent: newAgent,
    // Return the secret key ONCE upon creation as required by security spec
    generated_api_key: secretKey,
    security_notice: "Save this API key now. GuardAgent will not display the unmasked key again."
  });
});

// GET single agent details
router.get('/:id', requireAuth, (req, res) => {
  const agent = store.agents.find(a => a.id === req.params.id || a.agent_id === req.params.id);
  if (!agent) {
    return res.status(404).json({ success: false, error: "Agent not found." });
  }

  const recentRequests = store.requests.filter(r => r.agent_id === agent.agent_id).slice(0, 10);
  const recentAlerts = store.alerts.filter(al => al.agent_id === agent.agent_id).slice(0, 5);

  res.json({
    success: true,
    agent,
    recent_requests: recentRequests,
    recent_alerts: recentAlerts
  });
});

// PATCH update status (active / suspended)
router.patch('/:id/status', requireAuth, (req, res) => {
  const agent = store.agents.find(a => a.id === req.params.id || a.agent_id === req.params.id);
  if (!agent) {
    return res.status(404).json({ success: false, error: "Agent not found." });
  }

  const { status } = req.body;
  if (!['active', 'suspended', 'revoked'].includes(status)) {
    return res.status(400).json({ success: false, error: "Invalid status value. Must be 'active', 'suspended', or 'revoked'." });
  }

  const oldStatus = agent.status;
  agent.status = status;

  // Audit log
  store.audit_logs.unshift({
    log_id: `aud-${Math.floor(1000 + Math.random() * 9000)}`,
    correlation_id: `corr-${Math.random().toString(36).substring(2, 8)}`,
    timestamp: new Date().toISOString(),
    actor_type: "USER",
    actor_id: req.user.email || req.user.id || "admin",
    event_type: "AGENT_STATUS_CHANGED",
    action: `set_status_${status}`,
    resource: agent.agent_id,
    decision: "ALLOW",
    risk_score: status === 'active' ? 10 : 30,
    metadata: { agent_id: agent.agent_id, old_status: oldStatus, new_status: status }
  });

  res.json({ success: true, message: `Agent status updated to ${status}.`, agent });
});

// DELETE remove agent
router.delete('/:id', requireAuth, (req, res) => {
  const index = store.agents.findIndex(a => a.id === req.params.id || a.agent_id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ success: false, error: "Agent not found." });
  }

  const removed = store.agents.splice(index, 1)[0];

  store.audit_logs.unshift({
    log_id: `aud-${Math.floor(1000 + Math.random() * 9000)}`,
    correlation_id: `corr-${Math.random().toString(36).substring(2, 8)}`,
    timestamp: new Date().toISOString(),
    actor_type: "USER",
    actor_id: req.user.email || req.user.id || "admin",
    event_type: "AGENT_DELETED",
    action: "delete_agent",
    resource: removed.agent_id,
    decision: "ALLOW",
    risk_score: 20,
    metadata: { agent_id: removed.agent_id, name: removed.name }
  });

  res.json({ success: true, message: `Agent '${removed.name}' removed.` });
});

module.exports = router;
