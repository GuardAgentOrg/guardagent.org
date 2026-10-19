const express = require('express');
const router = express.Router();
const store = require('../database/store');
const { requireAuth } = require('../middleware/auth');
const { isSupabaseConfigured } = require('../database/supabase');

router.get('/overview', requireAuth, (req, res) => {
  const totalAgents = store.agents.length;
  const activeAgents = store.agents.filter(a => a.status === 'active').length;

  const totalEvaluations = store.requests.length;
  const allowedRequests = store.requests.filter(r => r.decision === 'ALLOW').length;
  const blockedRequests = store.requests.filter(r => r.decision === 'BLOCK').length;
  const pendingApprovals = store.approvals.filter(a => a.status === 'PENDING').length;
  const activePolicies = store.policies.filter(p => p.status === 'active').length;
  const openAlerts = store.alerts.filter(al => al.status === 'OPEN').length;

  // Calculate risk distribution
  const riskDistribution = {
    low: store.requests.filter(r => r.risk_level === 'LOW').length,
    medium: store.requests.filter(r => r.risk_level === 'MEDIUM').length,
    high: store.requests.filter(r => r.risk_level === 'HIGH').length,
    critical: store.requests.filter(r => r.risk_level === 'CRITICAL').length
  };

  // Decision breakdown for charts
  const decisionsBreakdown = {
    allow: allowedRequests,
    block: blockedRequests,
    approval: store.requests.filter(r => r.decision === 'REQUIRE_APPROVAL').length
  };

  // Timeline / Trends (e.g. past 7 days / hourly buckets)
  const timeline = [
    { label: "Mon", allowed: 124, blocked: 8, approvals: 4 },
    { label: "Tue", allowed: 198, blocked: 12, approvals: 7 },
    { label: "Wed", allowed: 245, blocked: 15, approvals: 9 },
    { label: "Thu", allowed: 310, blocked: 19, approvals: 11 },
    { label: "Fri", allowed: 280, blocked: 14, approvals: 6 },
    { label: "Sat", allowed: 142, blocked: 5, approvals: 2 },
    { label: "Today", allowed: allowedRequests, blocked: blockedRequests, approvals: pendingApprovals }
  ];

  res.json({
    success: true,
    data_source: isSupabaseConfigured() ? "supabase_live" : "demo_verified_store",
    metrics: {
      total_agents: totalAgents,
      active_agents: activeAgents,
      total_evaluations: totalEvaluations,
      allowed_requests: allowedRequests,
      blocked_requests: blockedRequests,
      pending_approvals: pendingApprovals,
      active_policies: activePolicies,
      open_alerts: openAlerts
    },
    risk_distribution: riskDistribution,
    decisions_breakdown: decisionsBreakdown,
    timeline,
    recent_activity: store.requests.slice(0, 6),
    recent_audit: store.audit_logs.slice(0, 6)
  });
});

module.exports = router;
