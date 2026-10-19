const express = require('express');
const router = express.Router();
const store = require('../database/store');
const { getTool } = require('../services/toolRegistry');
const { requireAuth } = require('../middleware/auth');

// GET all approval requests (filter by status)
router.get('/', requireAuth, (req, res) => {
  const { status } = req.query;
  let items = [...store.approvals];

  if (status && status !== 'ALL') {
    items = items.filter(a => a.status === status);
  }

  res.json({
    success: true,
    count: items.length,
    approvals: items
  });
});

// POST decide on an approval (APPROVE or REJECT)
router.post('/:id/decide', requireAuth, (req, res) => {
  const approval = store.approvals.find(a => a.approval_id === req.params.id);
  if (!approval) {
    return res.status(404).json({ success: false, error: "Approval request not found." });
  }

  // Enforce server-side security rule: Do not permit already resolved or expired requests
  if (approval.status !== 'PENDING') {
    return res.status(400).json({
      success: false,
      error: `Request has already been finalized with status: '${approval.status}'. Cannot be re-decided.`
    });
  }

  if (approval.expires_at && new Date(approval.expires_at) < new Date()) {
    approval.status = 'EXPIRED';
    return res.status(400).json({
      success: false,
      error: "Approval request has expired and cannot be approved."
    });
  }

  const { decision, note = '' } = req.body;
  if (!['APPROVED', 'REJECTED'].includes(decision)) {
    return res.status(400).json({ success: false, error: "Decision must be 'APPROVED' or 'REJECTED'." });
  }

  const reviewerName = req.user.full_name || req.user.email || "Security Officer";
  const timestamp = new Date().toISOString();

  approval.status = decision;
  approval.reviewed_by = reviewerName;
  approval.reviewer_notes = note.trim();
  approval.reviewed_at = timestamp;

  // Update corresponding action request status if exists
  const reqRecord = store.requests.find(r => r.request_id === approval.request_id);
  if (reqRecord) {
    reqRecord.execution_status = decision === 'APPROVED' ? 'EXECUTED' : 'REJECTED_BY_REVIEWER';
    if (decision === 'APPROVED') {
      reqRecord.decision = 'ALLOW';
    }
  }

  // If approved, trigger controlled mock tool execution
  let mockExecResult = null;
  if (decision === 'APPROVED' && approval.tool_name) {
    const tool = getTool(approval.tool_name);
    if (tool) {
      mockExecResult = {
        executed: true,
        dispatched_at: timestamp,
        message: "Action released for execution following human authorization."
      };
    }
  }

  // Record immutable Audit Log for the human-in-the-loop authorization
  store.audit_logs.unshift({
    log_id: `aud-${Math.floor(1000 + Math.random() * 9000)}`,
    correlation_id: reqRecord?.correlation_id || `corr-${Math.random().toString(36).substring(2, 8)}`,
    timestamp,
    actor_type: "USER",
    actor_id: reviewerName,
    event_type: decision === 'APPROVED' ? "APPROVAL_GRANTED" : "APPROVAL_REJECTED",
    action: `human_authorization_${decision.toLowerCase()}`,
    resource: approval.approval_id,
    decision: decision === 'APPROVED' ? "ALLOW" : "BLOCK",
    risk_score: approval.risk_score,
    metadata: {
      approval_id: approval.approval_id,
      request_id: approval.request_id,
      agent_id: approval.agent_id,
      reviewer_notes: approval.reviewer_notes
    }
  });

  res.json({
    success: true,
    message: `Request ${decision === 'APPROVED' ? 'authorized' : 'rejected'} successfully.`,
    approval,
    execution: mockExecResult
  });
});

module.exports = router;
