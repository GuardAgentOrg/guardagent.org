// GuardAgent In-Memory & Local Fallback Data Store
// Provides deterministic, rich initial enterprise state and live mutation support

const INITIAL_AGENTS = [
  {
    id: "agt_support_01",
    agent_id: "agt-customer-support-01",
    name: "Customer Support Agent",
    description: "Processes customer tier-1 refund inquiries and account detail updates.",
    environment: "production",
    status: "active",
    api_key_prefix: "ga_live_9f81...",
    assigned_policies: ["pol-p01-pii-masking", "pol-p03-refund-cap", "pol-p05-db-read-limit"],
    total_requests: 1420,
    blocked_requests: 18,
    last_active_at: new Date(Date.now() - 4 * 60000).toISOString(),
    created_at: "2026-09-12T10:00:00Z"
  },
  {
    id: "agt_sales_02",
    agent_id: "agt-lead-enrichment-02",
    name: "Lead Enrichment Agent",
    description: "Queries external APIs and public registries to enrich CRM contacts.",
    environment: "production",
    status: "active",
    api_key_prefix: "ga_live_3c2a...",
    assigned_policies: ["pol-p02-external-api-allowlist", "pol-p05-db-read-limit"],
    total_requests: 2854,
    blocked_requests: 41,
    last_active_at: new Date(Date.now() - 12 * 60000).toISOString(),
    created_at: "2026-09-20T14:30:00Z"
  },
  {
    id: "agt_devops_03",
    agent_id: "agt-incident-responder-03",
    name: "Incident Responder Agent",
    description: "Monitors cloud telemetry and restarts failing microservices upon alert trigger.",
    environment: "staging",
    status: "active",
    api_key_prefix: "ga_stg_77b1...",
    assigned_policies: ["pol-p04-destructive-command-block", "pol-p06-cloud-exec-approval"],
    total_requests: 638,
    blocked_requests: 6,
    last_active_at: new Date(Date.now() - 25 * 60000).toISOString(),
    created_at: "2026-10-01T08:15:00Z"
  },
  {
    id: "agt_finance_04",
    agent_id: "agt-invoice-reconciler-04",
    name: "Invoice Reconciler Agent",
    description: "Matches vendor invoices with bank ledger entries and creates ERP draft entries.",
    environment: "production",
    status: "active",
    api_key_prefix: "ga_live_11aa...",
    assigned_policies: ["pol-p03-refund-cap", "pol-p05-db-read-limit"],
    total_requests: 942,
    blocked_requests: 2,
    last_active_at: new Date(Date.now() - 55 * 60000).toISOString(),
    created_at: "2026-10-05T11:00:00Z"
  },
  {
    id: "agt_untrusted_05",
    agent_id: "agt-sandbox-experimental-05",
    name: "Experimental Code Agent",
    description: "Generates code snippets in research sandbox.",
    environment: "development",
    status: "suspended",
    api_key_prefix: "ga_dev_0000...",
    assigned_policies: ["pol-p04-destructive-command-block"],
    total_requests: 112,
    blocked_requests: 29,
    last_active_at: new Date(Date.now() - 86400000).toISOString(),
    created_at: "2026-10-10T16:00:00Z"
  }
];

const INITIAL_POLICIES = [
  {
    id: "pol-p01-pii-masking",
    policy_id: "pol-p01-pii-masking",
    name: "PII Leakage Prevention & Redaction",
    description: "Enforces data loss prevention on tool queries involving SSN, credit cards, and customer passwords.",
    severity: "CRITICAL",
    status: "active",
    target_tool: "all",
    allowed_actions: ["*"],
    prohibited_actions: ["exfiltrate_pii", "read_unmasked_auth_tokens"],
    risk_threshold: 80,
    enforcement_action: "BLOCK",
    created_at: "2026-09-12T10:00:00Z",
    updated_at: "2026-10-14T09:00:00Z"
  },
  {
    id: "pol-p02-external-api-allowlist",
    policy_id: "pol-p02-external-api-allowlist",
    name: "External API Domain Allowlist",
    description: "Restricts external HTTP requests to authorized CRM, Clearbit, and Stripe endpoints only.",
    severity: "HIGH",
    status: "active",
    target_tool: "external_api_call",
    allowed_actions: ["call_allowlisted_domain"],
    prohibited_actions: ["call_arbitrary_ip", "call_internal_metadata_service"],
    risk_threshold: 70,
    enforcement_action: "BLOCK",
    created_at: "2026-09-15T12:00:00Z",
    updated_at: "2026-10-10T14:20:00Z"
  },
  {
    id: "pol-p03-refund-cap",
    policy_id: "pol-p03-refund-cap",
    name: "Financial Transaction Limit & Escalation",
    description: "Auto-allows refunds under $500. Escalates actions between $500-$2,500 for human approval. Blocks >$2,500.",
    severity: "HIGH",
    status: "active",
    target_tool: "db_write_record",
    allowed_actions: ["refund_under_500"],
    prohibited_actions: ["refund_over_2500", "modify_bank_details"],
    risk_threshold: 50,
    enforcement_action: "REQUIRE_APPROVAL",
    created_at: "2026-09-18T15:30:00Z",
    updated_at: "2026-10-12T11:45:00Z"
  },
  {
    id: "pol-p04-destructive-command-block",
    policy_id: "pol-p04-destructive-command-block",
    name: "Deny Destructive Shell & SQL Injections",
    description: "Zero-tolerance block on DROP TABLE, rm -rf, bash subshells, and raw root command strings.",
    severity: "CRITICAL",
    status: "active",
    target_tool: "all",
    allowed_actions: ["safe_parameterized_query"],
    prohibited_actions: ["drop_table", "truncate_table", "shell_execution", "sql_injection"],
    risk_threshold: 90,
    enforcement_action: "BLOCK",
    created_at: "2026-09-10T08:00:00Z",
    updated_at: "2026-10-15T01:00:00Z"
  },
  {
    id: "pol-p05-db-read-limit",
    policy_id: "pol-p05-db-read-limit",
    name: "Database Query Row-Count Ceiling",
    description: "Restricts unpaginated bulk database dumps. Limits queries to a maximum of 250 records per call.",
    severity: "MEDIUM",
    status: "active",
    target_tool: "db_read_query",
    allowed_actions: ["bounded_select"],
    prohibited_actions: ["unbounded_bulk_dump"],
    risk_threshold: 60,
    enforcement_action: "REQUIRE_APPROVAL",
    created_at: "2026-09-22T09:30:00Z",
    updated_at: "2026-10-08T16:10:00Z"
  },
  {
    id: "pol-p06-cloud-exec-approval",
    policy_id: "pol-p06-cloud-exec-approval",
    name: "Production Cloud Infrastructure Modification",
    description: "Requires mandatory security officer approval before restarting nodes or altering IAM credentials.",
    severity: "HIGH",
    status: "active",
    target_tool: "exec_code_sandbox",
    allowed_actions: ["read_telemetry"],
    prohibited_actions: ["mutate_iam", "terminate_cluster"],
    risk_threshold: 65,
    enforcement_action: "REQUIRE_APPROVAL",
    created_at: "2026-10-02T13:00:00Z",
    updated_at: "2026-10-14T17:25:00Z"
  }
];

const INITIAL_REQUESTS = [
  {
    request_id: "req-98421-allow",
    agent_id: "agt-customer-support-01",
    agent_name: "Customer Support Agent",
    tool_name: "db_read_query",
    action_name: "fetch_customer_order_history",
    parameters: { customer_id: "cust_9921", limit: 10, include_items: true },
    decision: "ALLOW",
    risk_score: 15,
    risk_level: "LOW",
    rationale: "Safe read query targeting customer order history within approved row limit (10 <= 250). No PII exfiltration patterns detected.",
    triggered_policies: ["pol-p05-db-read-limit"],
    execution_status: "EXECUTED",
    correlation_id: "corr-8172901-a1",
    created_at: new Date(Date.now() - 4 * 60000).toISOString()
  },
  {
    request_id: "req-98422-block",
    agent_id: "agt-lead-enrichment-02",
    agent_name: "Lead Enrichment Agent",
    tool_name: "external_api_call",
    action_name: "call_external_webhook",
    parameters: { url: "http://169.254.169.254/latest/meta-data/", method: "GET" },
    decision: "BLOCK",
    risk_score: 95,
    risk_level: "CRITICAL",
    rationale: "Prohibited AWS metadata IP detected (SSRF attack pattern). Destination is not in verified external domain allowlist.",
    triggered_policies: ["pol-p02-external-api-allowlist", "pol-p04-destructive-command-block"],
    execution_status: "BLOCKED",
    correlation_id: "corr-8172902-b2",
    created_at: new Date(Date.now() - 12 * 60000).toISOString()
  },
  {
    request_id: "req-98423-approval",
    agent_id: "agt-customer-support-01",
    agent_name: "Customer Support Agent",
    tool_name: "db_write_record",
    action_name: "process_disputed_refund",
    parameters: { account_id: "act_4412", amount_usd: 1250.00, reason: "Chargeback resolution dispute" },
    decision: "REQUIRE_APPROVAL",
    risk_score: 65,
    risk_level: "HIGH",
    rationale: "Refund amount ($1,250.00) exceeds automatic limit ($500.00) defined in Financial Transaction Limit policy. Escalated for human authorization.",
    triggered_policies: ["pol-p03-refund-cap"],
    execution_status: "AWAITING_APPROVAL",
    correlation_id: "corr-8172903-c3",
    created_at: new Date(Date.now() - 25 * 60000).toISOString()
  },
  {
    request_id: "req-98424-block",
    agent_id: "agt-sandbox-experimental-05",
    agent_name: "Experimental Code Agent",
    tool_name: "db_read_query",
    action_name: "execute_raw_sql",
    parameters: { query: "SELECT * FROM users WHERE '1'='1'; DROP TABLE audits;--" },
    decision: "BLOCK",
    risk_score: 98,
    risk_level: "CRITICAL",
    rationale: "Destructive SQL injection command identified ('DROP TABLE'). Agent status is currently suspended.",
    triggered_policies: ["pol-p04-destructive-command-block"],
    execution_status: "BLOCKED",
    correlation_id: "corr-8172904-d4",
    created_at: new Date(Date.now() - 40 * 60000).toISOString()
  },
  {
    request_id: "req-98425-approval",
    agent_id: "agt-incident-responder-03",
    agent_name: "Incident Responder Agent",
    tool_name: "exec_code_sandbox",
    action_name: "restart_production_pod",
    parameters: { cluster: "prod-us-east-1", service: "auth-gateway", restart_grace_period: 30 },
    decision: "REQUIRE_APPROVAL",
    risk_score: 55,
    risk_level: "HIGH",
    rationale: "Target cluster is designated production. Cloud policy requires two-person verification before service disruption.",
    triggered_policies: ["pol-p06-cloud-exec-approval"],
    execution_status: "AWAITING_APPROVAL",
    correlation_id: "corr-8172905-e5",
    created_at: new Date(Date.now() - 75 * 60000).toISOString()
  }
];

const INITIAL_APPROVALS = [
  {
    approval_id: "apr-2026-001",
    request_id: "req-98423-approval",
    agent_id: "agt-customer-support-01",
    agent_name: "Customer Support Agent",
    action_summary: "Process Customer Refund ($1,250.00)",
    tool_name: "db_write_record",
    risk_score: 65,
    risk_level: "HIGH",
    status: "PENDING",
    parameters: { account_id: "act_4412", amount_usd: 1250.00, reason: "Chargeback resolution dispute" },
    policy_name: "Financial Transaction Limit & Escalation",
    reviewed_by: null,
    reviewer_notes: null,
    reviewed_at: null,
    expires_at: new Date(Date.now() + 22 * 3600000).toISOString(),
    created_at: new Date(Date.now() - 25 * 60000).toISOString()
  },
  {
    approval_id: "apr-2026-002",
    request_id: "req-98425-approval",
    agent_id: "agt-incident-responder-03",
    agent_name: "Incident Responder Agent",
    action_summary: "Restart Production Pod: auth-gateway",
    tool_name: "exec_code_sandbox",
    risk_score: 55,
    risk_level: "HIGH",
    status: "PENDING",
    parameters: { cluster: "prod-us-east-1", service: "auth-gateway", restart_grace_period: 30 },
    policy_name: "Production Cloud Infrastructure Modification",
    reviewed_by: null,
    reviewer_notes: null,
    reviewed_at: null,
    expires_at: new Date(Date.now() + 18 * 3600000).toISOString(),
    created_at: new Date(Date.now() - 75 * 60000).toISOString()
  },
  {
    approval_id: "apr-2026-000",
    request_id: "req-97910-approved",
    agent_id: "agt-invoice-reconciler-04",
    agent_name: "Invoice Reconciler Agent",
    action_summary: "Reconcile vendor batch invoice INV-2026-91 ($2,100.00)",
    tool_name: "db_write_record",
    risk_score: 48,
    risk_level: "MEDIUM",
    status: "APPROVED",
    parameters: { invoice_id: "INV-2026-91", amount_usd: 2100.00, vendor: "Datadog Telemetry" },
    policy_name: "Financial Transaction Limit & Escalation",
    reviewed_by: "Alex Mercer (Security Officer)",
    reviewer_notes: "Verified against authorized quarterly Datadog contract.",
    reviewed_at: new Date(Date.now() - 140 * 60000).toISOString(),
    expires_at: new Date(Date.now() + 10 * 3600000).toISOString(),
    created_at: new Date(Date.now() - 150 * 60000).toISOString()
  }
];

const INITIAL_AUDIT_LOGS = [
  {
    log_id: "aud-0091",
    correlation_id: "corr-8172901-a1",
    timestamp: new Date(Date.now() - 4 * 60000).toISOString(),
    actor_type: "AGENT",
    actor_id: "agt-customer-support-01",
    event_type: "POLICY_EVALUATION",
    action: "fetch_customer_order_history",
    resource: "db:customers.orders",
    decision: "ALLOW",
    risk_score: 15,
    metadata: { rows_returned: 10, latency_ms: 24, policy: "pol-p05-db-read-limit" }
  },
  {
    log_id: "aud-0090",
    correlation_id: "corr-8172902-b2",
    timestamp: new Date(Date.now() - 12 * 60000).toISOString(),
    actor_type: "SECURITY_ENGINE",
    actor_id: "guardagent-gateway",
    event_type: "ACTION_BLOCKED",
    action: "call_external_webhook",
    resource: "http://169.254.169.254/latest/meta-data/",
    decision: "BLOCK",
    risk_score: 95,
    metadata: { reason: "Prohibited AWS metadata address (SSRF attempt)", violation: "CRITICAL" }
  },
  {
    log_id: "aud-0089",
    correlation_id: "corr-8172903-c3",
    timestamp: new Date(Date.now() - 25 * 60000).toISOString(),
    actor_type: "SECURITY_ENGINE",
    actor_id: "guardagent-gateway",
    event_type: "APPROVAL_REQUIRED",
    action: "process_disputed_refund",
    resource: "stripe:charges/refund",
    decision: "REQUIRE_APPROVAL",
    risk_score: 65,
    metadata: { amount: 1250, threshold: 500, queue_id: "apr-2026-001" }
  },
  {
    log_id: "aud-0088",
    correlation_id: "corr-8172904-d4",
    timestamp: new Date(Date.now() - 40 * 60000).toISOString(),
    actor_type: "SECURITY_ENGINE",
    actor_id: "guardagent-gateway",
    event_type: "ACTION_BLOCKED",
    action: "execute_raw_sql",
    resource: "db:production.users",
    decision: "BLOCK",
    risk_score: 98,
    metadata: { threat_type: "SQL_INJECTION", target_table: "users" }
  },
  {
    log_id: "aud-0087",
    correlation_id: "corr-8172899-x0",
    timestamp: new Date(Date.now() - 140 * 60000).toISOString(),
    actor_type: "USER",
    actor_id: "usr_alex_mercer",
    event_type: "APPROVAL_GRANTED",
    action: "approve_request",
    resource: "apr-2026-000",
    decision: "ALLOW",
    risk_score: 48,
    metadata: { reviewer: "Alex Mercer", note: "Verified against contract" }
  }
];

const INITIAL_ALERTS = [
  {
    alert_id: "alt-0104",
    severity: "CRITICAL",
    title: "SSRF Attempt Blocked on Cloud Metadata",
    description: "Agent 'agt-lead-enrichment-02' attempted to query link-local IP 169.254.169.254. Action was rejected immediately.",
    agent_id: "agt-lead-enrichment-02",
    agent_name: "Lead Enrichment Agent",
    status: "OPEN",
    created_at: new Date(Date.now() - 12 * 60000).toISOString()
  },
  {
    alert_id: "alt-0103",
    severity: "CRITICAL",
    title: "SQL Injection Vector Identified",
    description: "Agent 'agt-sandbox-experimental-05' dispatched a raw query containing DROP TABLE. Agent is in suspended state.",
    agent_id: "agt-sandbox-experimental-05",
    agent_name: "Experimental Code Agent",
    status: "OPEN",
    created_at: new Date(Date.now() - 40 * 60000).toISOString()
  },
  {
    alert_id: "alt-0102",
    severity: "HIGH",
    title: "High Value Escalation Pending Human Review",
    description: "Approval request 'apr-2026-001' for $1,250 refund has been pending for over 20 minutes.",
    agent_id: "agt-customer-support-01",
    agent_name: "Customer Support Agent",
    status: "OPEN",
    created_at: new Date(Date.now() - 25 * 60000).toISOString()
  },
  {
    alert_id: "alt-0101",
    severity: "MEDIUM",
    title: "Frequent Database Read Limit Thresholds Reached",
    description: "Agent 'agt-lead-enrichment-02' reached query limit on 3 separate queries in the past 60 minutes.",
    agent_id: "agt-lead-enrichment-02",
    agent_name: "Lead Enrichment Agent",
    status: "ACKNOWLEDGED",
    created_at: new Date(Date.now() - 180 * 60000).toISOString(),
    resolved_at: new Date(Date.now() - 60 * 60000).toISOString()
  }
];

// Active memory store
const store = {
  agents: [...INITIAL_AGENTS],
  policies: [...INITIAL_POLICIES],
  requests: [...INITIAL_REQUESTS],
  approvals: [...INITIAL_APPROVALS],
  audit_logs: [...INITIAL_AUDIT_LOGS],
  alerts: [...INITIAL_ALERTS],
  profile: {
    id: "usr_guardagent_demo",
    email: "security.lead@enterprise.guardagent.ai",
    full_name: "Sarah Chen",
    role: "Lead Security Architect",
    organization: "GuardAgent Global SOC",
    workspace: "Production Core",
    plan: "Enterprise Beta",
    created_at: "2026-09-01T00:00:00Z"
  }
};

module.exports = store;
