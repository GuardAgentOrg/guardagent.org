const express = require('express');
const router = express.Router();
const store = require('../database/store');
const { requireAuth } = require('../middleware/auth');

// GET all alerts
router.get('/', requireAuth, (req, res) => {
  const { status, severity } = req.query;
  let items = [...store.alerts];

  if (status && status !== 'ALL') {
    items = items.filter(a => a.status === status);
  }

  if (severity && severity !== 'ALL') {
    items = items.filter(a => a.severity === severity);
  }

  res.json({
    success: true,
    count: items.length,
    alerts: items
  });
});

// POST acknowledge / resolve alert
router.post('/:id/acknowledge', requireAuth, (req, res) => {
  const alert = store.alerts.find(a => a.alert_id === req.params.id);
  if (!alert) {
    return res.status(404).json({ success: false, error: "Alert not found." });
  }

  const { status = 'ACKNOWLEDGED' } = req.body;
  alert.status = status;
  if (status === 'RESOLVED') {
    alert.resolved_at = new Date().toISOString();
  }

  // Record audit log
  store.audit_logs.unshift({
    log_id: `aud-${Math.floor(1000 + Math.random() * 9000)}`,
    correlation_id: `corr-${Math.random().toString(36).substring(2, 8)}`,
    timestamp: new Date().toISOString(),
    actor_type: "USER",
    actor_id: req.user.email || req.user.id || "admin",
    event_type: "ALERT_ACKNOWLEDGED",
    action: `acknowledge_alert_${status.toLowerCase()}`,
    resource: alert.alert_id,
    decision: "ALLOW",
    risk_score: 10,
    metadata: { alert_id: alert.alert_id, status }
  });

  res.json({ success: true, message: `Alert updated to ${status}.`, alert });
});

module.exports = router;
