// GuardAgent 12-Step Security Evaluation Engine
// Core security gateway between AI agents and tools/resources.

const store = require('../database/store');
const { getTool } = require('./toolRegistry');

/**
 * 12-step Security Evaluation Pipeline
 * @param {Object} requestPayload - { agent_id, tool_name, action_name, parameters, user_id }
 * @returns {Object} Evaluation Result - { decision, risk_score, risk_level, rationale, triggered_policies, execution_result, request_id, correlation_id }
 */
async function evaluateActionRequest(requestPayload) {
  const correlationId = "corr-" + Math.random().toString(36).substring(2, 10);
  const requestId = "req-" + Math.floor(10000 + Math.random() * 90000) + "-" + Math.random().toString(36).substring(2, 6);
  const timestamp = new Date().toISOString();

  const auditMetadata = {
    correlation_id: correlationId,
    request_id: requestId,
    timestamp
  };

  // Step 1: Validate incoming request schema
  const { agent_id, tool_name, action_name, parameters = {} } = requestPayload;

  if (!agent_id || typeof agent_id !== 'string') {
    return createDenialResult({
      requestId,
      correlationId,
      agentId: agent_id || 'unknown',
      toolName: tool_name || 'unknown',
      actionName: action_name || 'unknown',
      decision: 'BLOCK',
      riskScore: 90,
      riskLevel: 'CRITICAL',
      rationale: 'Validation failed: Missing or malformed agent_id in request payload.',
      triggeredPolicies: []
    });
  }

  if (!tool_name || typeof tool_name !== 'string') {
    return createDenialResult({
      requestId,
      correlationId,
      agentId: agent_id,
      toolName: 'unknown',
      actionName: action_name || 'unknown',
      decision: 'BLOCK',
      riskScore: 85,
      riskLevel: 'HIGH',
      rationale: 'Validation failed: Missing target tool_name in request payload.',
      triggeredPolicies: []
    });
  }

  // Step 2 & 3: Authenticate and verify agent identity & status
  const agent = store.agents.find(a => a.agent_id === agent_id);
  if (!agent) {
    return createDenialResult({
      requestId,
      correlationId,
      agentId: agent_id,
      toolName: tool_name,
      actionName: action_name,
      decision: 'BLOCK',
      riskScore: 95,
      riskLevel: 'CRITICAL',
      rationale: `Unregistered agent identifier: '${agent_id}' is not enrolled in GuardAgent registry. Deny-by-default applied.`,
      triggeredPolicies: []
    });
  }

  if (agent.status !== 'active') {
    return createDenialResult({
      requestId,
      correlationId,
      agentId: agent.agent_id,
      agentName: agent.name,
      toolName: tool_name,
      actionName: action_name,
      decision: 'BLOCK',
      riskScore: 100,
      riskLevel: 'CRITICAL',
      rationale: `Agent '${agent.name}' is in '${agent.status.toUpperCase()}' state. All tool execution is strictly halted.`,
      triggeredPolicies: []
    });
  }

  // Step 4: Resolve requested tool against controlled tool registry
  const toolDefinition = getTool(tool_name);
  if (!toolDefinition) {
    return createDenialResult({
      requestId,
      correlationId,
      agentId: agent.agent_id,
      agentName: agent.name,
      toolName: tool_name,
      actionName: action_name,
      decision: 'BLOCK',
      riskScore: 90,
      riskLevel: 'CRITICAL',
      rationale: `Tool '${tool_name}' is not in the authorized tool registry. Arbitrary tool invocation is blocked.`,
      triggeredPolicies: []
    });
  }

  // Step 5 & 6: Load applicable security policies
  // Filter policies relevant to this agent or target tool or global 'all'
  const applicablePolicies = store.policies.filter(pol => {
    if (pol.status !== 'active') return false;
    const matchesTool = pol.target_tool === 'all' || pol.target_tool === tool_name;
    const isAssigned = !agent.assigned_policies || agent.assigned_policies.length === 0 || agent.assigned_policies.includes(pol.policy_id);
    return matchesTool && isAssigned;
  });

  // Step 7 & 8: Evaluate policy conditions & calculate explainable risk score
  let baseRiskScore = toolDefinition.risk_baseline || 20;
  const riskFactors = [];
  const triggeredPolicies = [];
  let immediateBlock = false;
  let blockRationale = '';
  let requireApproval = false;
  let approvalRationale = '';

  // Inspect parameters for malicious attack patterns (SSRF, SQLi, command injection)
  const paramString = JSON.stringify(parameters).toLowerCase();

  // Pattern A: Cloud Metadata / SSRF
  if (paramString.includes('169.254.169.254') || paramString.includes('metadata.google.internal') || paramString.includes('127.0.0.1')) {
    immediateBlock = true;
    blockRationale = 'Server-Side Request Forgery (SSRF) attempt detected targeting cloud metadata/internal address.';
    baseRiskScore = 98;
    triggeredPolicies.push('pol-p02-external-api-allowlist');
    riskFactors.push({ factor: 'SSRF Attack Pattern', points: 70, description: 'Attempt to reach link-local cloud metadata.' });
  }

  // Pattern B: Destructive SQL Injection
  const sqlThreats = ['drop table', 'truncate table', 'alter table', '--', '; drop', 'union select', "or '1'='1'"];
  for (const threat of sqlThreats) {
    if (paramString.includes(threat)) {
      immediateBlock = true;
      blockRationale = `Destructive SQL Injection signature detected: '${threat.toUpperCase()}'.`;
      baseRiskScore = 99;
      triggeredPolicies.push('pol-p04-destructive-command-block');
      riskFactors.push({ factor: 'SQL Injection Signature', points: 80, description: `Contains forbidden SQL keyword: ${threat}` });
      break;
    }
  }

  // Pattern C: Shell Command Injection
  const shellThreats = ['rm -rf', 'bash -i', '/bin/sh', 'curl | bash', '; rm', '&& rm', 'powershell -enc'];
  for (const threat of shellThreats) {
    if (paramString.includes(threat)) {
      immediateBlock = true;
      blockRationale = `Raw shell command injection pattern detected: '${threat}'.`;
      baseRiskScore = 100;
      triggeredPolicies.push('pol-p04-destructive-command-block');
      riskFactors.push({ factor: 'Shell Command Pattern', points: 80, description: 'Attempted arbitrary shell execution.' });
      break;
    }
  }

  // Evaluate Specific Active Policies
  for (const pol of applicablePolicies) {
    // Policy: Financial transaction limit
    if (pol.policy_id === 'pol-p03-refund-cap') {
      const amount = parseFloat(parameters.amount_usd || parameters.amount || 0);
      if (amount > 2500) {
        immediateBlock = true;
        blockRationale = `Transaction amount ($${amount.toFixed(2)}) exceeds absolute ceiling of $2,500.00.`;
        baseRiskScore = Math.max(baseRiskScore, 92);
        triggeredPolicies.push(pol.policy_id);
        riskFactors.push({ factor: 'Financial Hard Limit Exceeded', points: 50, description: `Amount $${amount} > $2500 limit.` });
      } else if (amount > 500) {
        requireApproval = true;
        approvalRationale = `Transaction amount ($${amount.toFixed(2)}) exceeds auto-allow cap of $500.00. Requires supervisor authorization.`;
        baseRiskScore = Math.max(baseRiskScore, 65);
        triggeredPolicies.push(pol.policy_id);
        riskFactors.push({ factor: 'Financial Auto-Allow Cap', points: 30, description: `Amount $${amount} requires human review.` });
      }
    }

    // Policy: Database Read Row Ceiling
    if (pol.policy_id === 'pol-p05-db-read-limit') {
      const limit = parseInt(parameters.limit || 10, 10);
      if (limit > 250) {
        requireApproval = true;
        approvalRationale = `Query limit (${limit} rows) exceeds policy ceiling of 250 rows. High data export risk.`;
        baseRiskScore = Math.max(baseRiskScore, 60);
        triggeredPolicies.push(pol.policy_id);
        riskFactors.push({ factor: 'Unbounded Query Size', points: 25, description: `Requested limit ${limit} > 250 rows.` });
      }
    }

    // Policy: Production cloud execution approval
    if (pol.policy_id === 'pol-p06-cloud-exec-approval') {
      if (tool_name === 'exec_code_sandbox' || parameters.cluster === 'production' || parameters.cluster === 'prod-us-east-1') {
        requireApproval = true;
        approvalRationale = 'Target environment is designated production infrastructure. Mandatory two-person approval required.';
        baseRiskScore = Math.max(baseRiskScore, 60);
        triggeredPolicies.push(pol.policy_id);
        riskFactors.push({ factor: 'Production Infrastructure Scope', points: 30, description: 'Action mutates production cloud nodes.' });
      }
    }
  }

  // Calculate final score
  const finalRiskScore = Math.min(Math.max(baseRiskScore, 5), 100);
  let riskLevel = 'LOW';
  if (finalRiskScore >= 80) riskLevel = 'CRITICAL';
  else if (finalRiskScore >= 60) riskLevel = 'HIGH';
  else if (finalRiskScore >= 35) riskLevel = 'MEDIUM';

  // Step 9: Determine Decision
  let decision = 'ALLOW';
  let finalRationale = `Request passed all security policies and validation checks. Evaluated risk score (${finalRiskScore}/100) is within safe operational thresholds.`;

  if (immediateBlock || finalRiskScore >= 80) {
    decision = 'BLOCK';
    finalRationale = blockRationale || `Evaluation risk score (${finalRiskScore}/100) exceeds safety limit. Prohibited security violation detected.`;
  } else if (requireApproval || finalRiskScore >= 50) {
    decision = 'REQUIRE_APPROVAL';
    finalRationale = approvalRationale || `Action risk score (${finalRiskScore}/100) exceeds automatic execution threshold. Human-in-the-loop signoff required.`;
  }

  // Step 10 & 11: Enforce decision before execution and record audit log
  let executionResult = null;
  let executionStatus = 'PENDING';

  if (decision === 'ALLOW') {
    executionStatus = 'EXECUTED';
    executionResult = await toolDefinition.handler(parameters);
  } else if (decision === 'BLOCK') {
    executionStatus = 'BLOCKED';
  } else if (decision === 'REQUIRE_APPROVAL') {
    executionStatus = 'AWAITING_APPROVAL';

    // Create an approval request queue record
    const approvalId = "apr-2026-" + Math.floor(100 + Math.random() * 900);
    store.approvals.unshift({
      approval_id: approvalId,
      request_id: requestId,
      agent_id: agent.agent_id,
      agent_name: agent.name,
      action_summary: `${action_name} via ${tool_name}`,
      tool_name,
      risk_score: finalRiskScore,
      risk_level: riskLevel,
      status: 'PENDING',
      parameters,
      policy_name: triggeredPolicies.length > 0 ? triggeredPolicies[0] : 'General Security Guardrail',
      reviewed_by: null,
      reviewer_notes: null,
      reviewed_at: null,
      expires_at: new Date(Date.now() + 24 * 3600000).toISOString(),
      created_at: timestamp
    });
  }

  // Update Agent statistics
  agent.total_requests = (agent.total_requests || 0) + 1;
  if (decision === 'BLOCK') {
    agent.blocked_requests = (agent.blocked_requests || 0) + 1;
  }
  agent.last_active_at = timestamp;

  // Record action request in historical store
  const actionRecord = {
    request_id: requestId,
    agent_id: agent.agent_id,
    agent_name: agent.name,
    tool_name,
    action_name,
    parameters,
    decision,
    risk_score: finalRiskScore,
    risk_level: riskLevel,
    rationale: finalRationale,
    triggered_policies: triggeredPolicies,
    execution_status: executionStatus,
    correlation_id: correlationId,
    created_at: timestamp
  };
  store.requests.unshift(actionRecord);

  // Record immutable Audit Log
  const auditEvent = {
    log_id: "aud-" + Math.floor(1000 + Math.random() * 9000),
    correlation_id: correlationId,
    timestamp,
    actor_type: "SECURITY_ENGINE",
    actor_id: "guardagent-gateway",
    event_type: decision === 'ALLOW' ? 'POLICY_EVALUATION' : (decision === 'BLOCK' ? 'ACTION_BLOCKED' : 'APPROVAL_REQUIRED'),
    action: action_name,
    resource: `${tool_name}:${parameters.url || parameters.table || parameters.account_id || 'default'}`,
    decision,
    risk_score: finalRiskScore,
    metadata: {
      agent_id: agent.agent_id,
      agent_name: agent.name,
      triggered_policies: triggeredPolicies,
      risk_factors: riskFactors
    }
  };
  store.audit_logs.unshift(auditEvent);

  // If CRITICAL BLOCK, generate security alert
  if (decision === 'BLOCK' && riskLevel === 'CRITICAL') {
    store.alerts.unshift({
      alert_id: "alt-" + Math.floor(1000 + Math.random() * 9000),
      severity: 'CRITICAL',
      title: `Critical Threat Blocked: ${action_name}`,
      description: `Agent '${agent.name}' attempted action flagged as CRITICAL risk: ${finalRationale}`,
      agent_id: agent.agent_id,
      agent_name: agent.name,
      status: 'OPEN',
      created_at: timestamp
    });
  }

  // Step 12: Return structured API response
  return {
    success: true,
    request_id: requestId,
    correlation_id: correlationId,
    decision,
    risk: {
      score: finalRiskScore,
      level: riskLevel,
      factors: riskFactors
    },
    rationale: finalRationale,
    triggered_policies: triggeredPolicies,
    execution: {
      status: executionStatus,
      result: executionResult,
      notice: decision === 'ALLOW'
        ? "Controlled safe mock tool was dispatched under verified policy limits."
        : (decision === 'REQUIRE_APPROVAL'
          ? "Execution is suspended awaiting human reviewer sign-off in Approval Center."
          : "Execution was rejected. External tool was NOT called.")
    },
    timestamp
  };
}

function createDenialResult({ requestId, correlationId, agentId, agentName, toolName, actionName, decision, riskScore, riskLevel, rationale, triggeredPolicies }) {
  const timestamp = new Date().toISOString();
  
  // Record denial in audit logs
  store.audit_logs.unshift({
    log_id: "aud-" + Math.floor(1000 + Math.random() * 9000),
    correlation_id: correlationId,
    timestamp,
    actor_type: "SECURITY_ENGINE",
    actor_id: "guardagent-gateway",
    event_type: "ACTION_BLOCKED",
    action: actionName || 'unknown',
    resource: `${toolName || 'unknown'}`,
    decision: 'BLOCK',
    risk_score: riskScore,
    metadata: { agent_id: agentId, reason: rationale }
  });

  return {
    success: false,
    request_id: requestId,
    correlation_id: correlationId,
    decision: 'BLOCK',
    risk: {
      score: riskScore,
      level: riskLevel,
      factors: [{ factor: 'Deny-by-default', points: riskScore, description: rationale }]
    },
    rationale,
    triggered_policies: triggeredPolicies || [],
    execution: {
      status: 'BLOCKED',
      result: null,
      notice: 'Execution was strictly blocked by GuardAgent security boundary.'
    },
    timestamp
  };
}

module.exports = {
  evaluateActionRequest
};
