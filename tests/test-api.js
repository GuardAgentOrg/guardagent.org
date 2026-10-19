// Automated Test Suite for GuardAgent Security Engine & REST Endpoints
const http = require('http');

const BASE_URL = 'http://localhost:3000';

function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqHeaders = {
      'Content-Type': 'application/json',
      'X-Demo-User': 'true',
      ...headers
    };

    const req = http.request(url, { method, headers: reqHeaders }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, text: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('--- Starting GuardAgent Verification Suite ---');
  let passed = 0;
  let total = 0;

  async function assert(desc, fn) {
    total++;
    try {
      await fn();
      console.log(`[PASS] ${desc}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ${desc}:`, err.message);
    }
  }

  // 1. Health Endpoint
  await assert('Health Check returns ok', async () => {
    const res = await makeRequest('GET', '/api/health');
    if (res.status !== 200 || res.data.status !== 'ok') {
      throw new Error(`Expected 200 ok, got ${res.status}`);
    }
  });

  // 2. Analytics Overview
  await assert('Analytics Overview returns metrics & timeline', async () => {
    const res = await makeRequest('GET', '/api/analytics/overview');
    if (res.status !== 200 || !res.data.metrics) {
      throw new Error(`Expected metrics object, got ${JSON.stringify(res.data)}`);
    }
  });

  // 3. Security Engine: ALLOW Case (Safe read under limits)
  await assert('Security Engine ALLOW on safe DB read', async () => {
    const res = await makeRequest('POST', '/api/requests/evaluate', {
      agent_id: 'agt-customer-support-01',
      tool_name: 'db_read_query',
      action_name: 'fetch_order_history',
      parameters: { customer_id: 'cust_101', limit: 10 }
    });
    if (res.status !== 200 || res.data.decision !== 'ALLOW') {
      throw new Error(`Expected ALLOW, got ${res.data.decision}`);
    }
  });

  // 4. Security Engine: BLOCK Case (Cloud metadata SSRF)
  await assert('Security Engine BLOCK on SSRF attempt', async () => {
    const res = await makeRequest('POST', '/api/requests/evaluate', {
      agent_id: 'agt-lead-enrichment-02',
      tool_name: 'external_api_call',
      action_name: 'query_metadata',
      parameters: { url: 'http://169.254.169.254/latest/meta-data/' }
    });
    if (res.status !== 200 || res.data.decision !== 'BLOCK') {
      throw new Error(`Expected BLOCK, got ${res.data.decision}`);
    }
  });

  // 5. Security Engine: BLOCK Case (SQL Injection DROP TABLE)
  await assert('Security Engine BLOCK on SQL Injection', async () => {
    const res = await makeRequest('POST', '/api/requests/evaluate', {
      agent_id: 'agt-customer-support-01',
      tool_name: 'db_read_query',
      action_name: 'execute_sql',
      parameters: { query: 'SELECT * FROM users; DROP TABLE accounts;--' }
    });
    if (res.status !== 200 || res.data.decision !== 'BLOCK') {
      throw new Error(`Expected BLOCK, got ${res.data.decision}`);
    }
  });

  // 6. Security Engine: REQUIRE APPROVAL Case (Refund over $500 cap)
  let escalatedApprovalId = null;
  await assert('Security Engine REQUIRE_APPROVAL on $1250 refund', async () => {
    const res = await makeRequest('POST', '/api/requests/evaluate', {
      agent_id: 'agt-customer-support-01',
      tool_name: 'db_write_record',
      action_name: 'dispute_refund',
      parameters: { account_id: 'act_9912', amount_usd: 1250.00 }
    });
    if (res.status !== 200 || res.data.decision !== 'REQUIRE_APPROVAL') {
      throw new Error(`Expected REQUIRE_APPROVAL, got ${res.data.decision}`);
    }
  });

  // 7. Human-in-the-Loop Approval Decision
  await assert('Human Approvals list and decide flow', async () => {
    const listRes = await makeRequest('GET', '/api/approvals?status=PENDING');
    if (listRes.status !== 200 || listRes.data.approvals.length === 0) {
      throw new Error('Expected at least 1 pending approval');
    }
    const target = listRes.data.approvals[0];
    const decideRes = await makeRequest('POST', `/api/approvals/${target.approval_id}/decide`, {
      decision: 'APPROVED',
      note: 'Authorized in automated test run'
    });
    if (decideRes.status !== 200 || decideRes.data.approval.status !== 'APPROVED') {
      throw new Error(`Expected APPROVED, got ${decideRes.data.approval?.status}`);
    }
  });

  // 8. Agent Lifecycle (Create, Query, Suspend)
  await assert('Agent registration with single secret key and status update', async () => {
    const createRes = await makeRequest('POST', '/api/agents', {
      name: 'Automated Test Agent',
      description: 'Agent created by test suite',
      environment: 'development'
    });
    if (createRes.status !== 201 || !createRes.data.generated_api_key) {
      throw new Error('Expected 201 and generated_api_key');
    }
    const agentId = createRes.data.agent.id;

    const patchRes = await makeRequest('PATCH', `/api/agents/${agentId}/status`, { status: 'suspended' });
    if (patchRes.status !== 200 || patchRes.data.agent.status !== 'suspended') {
      throw new Error('Expected suspended status');
    }
  });

  // 9. Audit Log Immutability (DELETE Forbidden)
  await assert('Audit records strictly reject DELETE requests', async () => {
    const res = await makeRequest('DELETE', '/api/audit-logs/aud-0091');
    if (res.status !== 403) {
      throw new Error(`Expected 403 Forbidden, got ${res.status}`);
    }
  });

  console.log(`\n--- Verification Complete: ${passed}/${total} passed ---`);
  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
