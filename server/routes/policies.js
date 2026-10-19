const express = require('express');
const router = express.Router();
const store = require('../database/store');
const { requireAuth } = require('../middleware/auth');

// GET all policies
router.get('/', requireAuth, (req, res) => {
  res.json({ success: true, count: store.policies.length, policies: store.policies });
});

// POST create new policy
router.post('/', requireAuth, (req, res) => {
  const { name, description, severity = 'HIGH', target_tool = 'all', allowed_actions = [], prohibited_actions = [], risk_threshold = 70, enforcement_action = 'REQUIRE_APPROVAL' } = req.body;

  if (!name || name.trim().length === 0) {
    return res.status(400).json({ success: false, error: "Policy name is required." });
  }

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const policyId = `pol-${slug.substring(0, 20)}-${Math.floor(10 + Math.random() * 90)}`;

  const newPolicy = {
    id: policyId,
    policy_id: policyId,
    name: name.trim(),
    description: description ? description.trim() : "Custom security guardrail policy.",
    severity,
    status: "active",
    target_tool,
    allowed_actions: Array.isArray(allowed_actions) ? allowed_actions : [allowed_actions],
    prohibited_actions: Array.isArray(prohibited_actions) ? prohibited_actions : [prohibited_actions],
    risk_threshold: parseInt(risk_threshold, 10) || 70,
    enforcement_action,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  store.policies.unshift(newPolicy);

  // Audit log
  store.audit_logs.unshift({
    log_id: `aud-${Math.floor(1000 + Math.random() * 9000)}`,
    correlation_id: `corr-${Math.random().toString(36).substring(2, 8)}`,
    timestamp: new Date().toISOString(),
    actor_type: "USER",
    actor_id: req.user.email || req.user.id || "admin",
    event_type: "POLICY_CREATED",
    action: "create_policy",
    resource: policyId,
    decision: "ALLOW",
    risk_score: 15,
    metadata: { policy_id: policyId, name: newPolicy.name, severity }
  });

  res.status(201).json({ success: true, message: "Security policy created.", policy: newPolicy });
});

// PATCH toggle policy status or update
router.patch('/:id', requireAuth, (req, res) => {
  const policy = store.policies.find(p => p.id === req.params.id || p.policy_id === req.params.id);
  if (!policy) {
    return res.status(404).json({ success: false, error: "Policy not found." });
  }

  if (req.body.status !== undefined) {
    if (!['active', 'disabled'].includes(req.body.status)) {
      return res.status(400).json({ success: false, error: "Status must be 'active' or 'disabled'." });
    }
    policy.status = req.body.status;
  }

  if (req.body.risk_threshold !== undefined) {
    policy.risk_threshold = parseInt(req.body.risk_threshold, 10);
  }

  if (req.body.enforcement_action !== undefined) {
    policy.enforcement_action = req.body.enforcement_action;
  }

  policy.updated_at = new Date().toISOString();

  // Audit log
  store.audit_logs.unshift({
    log_id: `aud-${Math.floor(1000 + Math.random() * 9000)}`,
    correlation_id: `corr-${Math.random().toString(36).substring(2, 8)}`,
    timestamp: new Date().toISOString(),
    actor_type: "USER",
    actor_id: req.user.email || req.user.id || "admin",
    event_type: "POLICY_UPDATED",
    action: "update_policy",
    resource: policy.policy_id,
    decision: "ALLOW",
    risk_score: 15,
    metadata: { policy_id: policy.policy_id, status: policy.status }
  });

  res.json({ success: true, message: "Policy updated successfully.", policy });
});

// DELETE policy
router.delete('/:id', requireAuth, (req, res) => {
  const index = store.policies.findIndex(p => p.id === req.params.id || p.policy_id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ success: false, error: "Policy not found." });
  }

  const removed = store.policies.splice(index, 1)[0];

  store.audit_logs.unshift({
    log_id: `aud-${Math.floor(1000 + Math.random() * 9000)}`,
    correlation_id: `corr-${Math.random().toString(36).substring(2, 8)}`,
    timestamp: new Date().toISOString(),
    actor_type: "USER",
    actor_id: req.user.email || req.user.id || "admin",
    event_type: "POLICY_DELETED",
    action: "delete_policy",
    resource: removed.policy_id,
    decision: "ALLOW",
    risk_score: 25,
    metadata: { policy_id: removed.policy_id, name: removed.name }
  });

  res.json({ success: true, message: `Policy '${removed.name}' removed.` });
});

module.exports = router;
