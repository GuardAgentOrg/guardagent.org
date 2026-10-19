// GuardAgent Controlled Mock Tool Registry
// Defines safe mock tools and executable action handlers for the beta security engine.

const REGISTERED_TOOLS = {
  db_read_query: {
    name: "db_read_query",
    description: "Executes parameterized read-only queries against application replica database.",
    risk_baseline: 15,
    max_records: 250,
    allowed_tables: ["customers", "orders", "invoices", "support_tickets", "audit_events"],
    prohibited_keywords: ["DROP", "DELETE", "TRUNCATE", "UPDATE", "INSERT", "ALTER", "--", ";"],
    handler: async (params) => {
      return {
        success: true,
        mock_execution: true,
        status: "EXECUTED_SAFE_SIMULATION",
        records_returned: Math.min(params.limit || 10, 250),
        query_plan: "Index Scan on table replica",
        data_preview: [
          { id: 101, status: "completed", timestamp: new Date().toISOString() },
          { id: 102, status: "processed", timestamp: new Date().toISOString() }
        ]
      };
    }
  },

  db_write_record: {
    name: "db_write_record",
    description: "Inserts or updates application records (e.g. refund requests, billing updates).",
    risk_baseline: 45,
    max_amount_auto: 500.0,
    handler: async (params) => {
      return {
        success: true,
        mock_execution: true,
        status: "RECORD_CREATED_SIMULATION",
        target_entity: params.account_id || params.invoice_id || "entity_rec",
        amount_usd: params.amount_usd || 0,
        transaction_reference: "tx_mock_" + Math.random().toString(36).substring(2, 9)
      };
    }
  },

  external_api_call: {
    name: "external_api_call",
    description: "Dispatches HTTP requests to pre-approved external integrations and webhooks.",
    risk_baseline: 30,
    allowed_domains: ["api.stripe.com", "api.clearbit.com", "api.github.com", "slack.com", "pagerduty.com"],
    prohibited_patterns: ["169.254.169.254", "localhost", "127.0.0.1", "0.0.0.0", "internal", "metadata"],
    handler: async (params) => {
      return {
        success: true,
        mock_execution: true,
        status: "HTTP_DISPATCHED_SIMULATION",
        destination: params.url,
        http_code: 200,
        response_time_ms: 112
      };
    }
  },

  send_email_notification: {
    name: "send_email_notification",
    description: "Sends transactional emails to verified customer addresses.",
    risk_baseline: 25,
    handler: async (params) => {
      return {
        success: true,
        mock_execution: true,
        status: "EMAIL_QUEUED_SIMULATION",
        recipient: params.recipient || "user@example.com",
        template: params.template || "security_notice"
      };
    }
  },

  exec_code_sandbox: {
    name: "exec_code_sandbox",
    description: "Runs an isolated Python or JS script in an ephemeral secure gVisor container.",
    risk_baseline: 60,
    handler: async (params) => {
      return {
        success: true,
        mock_execution: true,
        status: "SANDBOX_COMPLETED_SIMULATION",
        sandbox_id: "sbx_" + Math.random().toString(36).substring(2, 8),
        runtime: "isolated-container",
        cpu_time_ms: 45
      };
    }
  }
};

function getTool(toolName) {
  return REGISTERED_TOOLS[toolName] || null;
}

function listTools() {
  return Object.keys(REGISTERED_TOOLS).map(key => ({
    name: REGISTERED_TOOLS[key].name,
    description: REGISTERED_TOOLS[key].description,
    risk_baseline: REGISTERED_TOOLS[key].risk_baseline
  }));
}

module.exports = {
  REGISTERED_TOOLS,
  getTool,
  listTools
};
