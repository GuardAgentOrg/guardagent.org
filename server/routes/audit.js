const express = require('express');
const router = express.Router();
const store = require('../database/store');
const { requireAuth } = require('../middleware/auth');

// GET /api/audit-logs
// Filterable and searchable audit ledger
router.get('/', requireAuth, (req, res) => {
  const { search, decision, event_type, limit = 50, page = 1 } = req.query;

  let logs = [...store.audit_logs];

  // Search filter (correlation_id, actor, action, resource)
  if (search && search.trim().length > 0) {
    const q = search.trim().toLowerCase();
    logs = logs.filter(l =>
      (l.correlation_id && l.correlation_id.toLowerCase().includes(q)) ||
      (l.log_id && l.log_id.toLowerCase().includes(q)) ||
      (l.actor_id && l.actor_id.toLowerCase().includes(q)) ||
      (l.action && l.action.toLowerCase().includes(q)) ||
      (l.resource && l.resource.toLowerCase().includes(q))
    );
  }

  // Decision filter (ALLOW, BLOCK, REQUIRE_APPROVAL)
  if (decision && decision !== 'ALL') {
    logs = logs.filter(l => l.decision === decision);
  }

  // Event type filter
  if (event_type && event_type !== 'ALL') {
    logs = logs.filter(l => l.event_type === event_type);
  }

  const pageNum = parseInt(page, 10) || 1;
  const pageSize = parseInt(limit, 10) || 20;
  const total = logs.length;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const paginatedLogs = logs.slice((pageNum - 1) * pageSize, pageNum * pageSize);

  res.json({
    success: true,
    total,
    page: pageNum,
    page_size: pageSize,
    total_pages: totalPages,
    audit_logs: paginatedLogs
  });
});

// GET /api/audit-logs/:id
router.get('/:id', requireAuth, (req, res) => {
  const log = store.audit_logs.find(l => l.log_id === req.params.id);
  if (!log) {
    return res.status(404).json({ success: false, error: "Audit record not found." });
  }

  res.json({ success: true, log });
});

// Explicitly prohibit manual modification of audit records
router.delete('/:id', (req, res) => {
  res.status(403).json({
    error: "Forbidden",
    message: "Security Audit Records are immutable and cannot be deleted."
  });
});

module.exports = router;
