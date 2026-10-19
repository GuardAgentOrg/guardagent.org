// GuardAgent Frontend API Client
// Handles authentication tokens, requests, and API calls with honest demo fallback.

const API_BASE = '/api';

class GuardAgentAPI {
  constructor() {
    this.token = localStorage.getItem('guardagent_token') || 'demo_token_guardagent_2026';
    this.isDemo = !localStorage.getItem('guardagent_token');
  }

  getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token}`,
      'X-Demo-User': 'true'
    };
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = { ...this.getHeaders(), ...(options.headers || {}) };

    try {
      const res = await fetch(url, { ...options, headers });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || `HTTP ${res.status}`);
      }
      return data;
    } catch (err) {
      console.warn(`[API] Error calling ${endpoint}:`, err.message);
      throw err;
    }
  }

  // Auth & Profile
  async getSession() {
    return this.request('/auth/session');
  }

  async login(email, password, demo = false) {
    const res = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, demo })
    });
    if (res.token) {
      this.token = res.token;
      localStorage.setItem('guardagent_token', res.token);
    }
    return res;
  }

  async signup(payload) {
    return this.request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  logout() {
    localStorage.removeItem('guardagent_token');
    window.location.href = '/login';
  }

  // Dashboard Analytics
  async getOverview() {
    return this.request('/analytics/overview');
  }

  // AI Agents
  async getAgents() {
    return this.request('/agents');
  }

  async createAgent(payload) {
    return this.request('/agents', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async getAgentDetails(id) {
    return this.request(`/agents/${id}`);
  }

  async updateAgentStatus(id, status) {
    return this.request(`/agents/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  }

  async deleteAgent(id) {
    return this.request(`/agents/${id}`, { method: 'DELETE' });
  }

  // Security Policies
  async getPolicies() {
    return this.request('/policies');
  }

  async createPolicy(payload) {
    return this.request('/policies', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async updatePolicy(id, updates) {
    return this.request(`/policies/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  }

  async deletePolicy(id) {
    return this.request(`/policies/${id}`, { method: 'DELETE' });
  }

  // Security Gateway Evaluation
  async evaluateRequest(payload) {
    return this.request('/requests/evaluate', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async getRequests(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/requests${query ? '?' + query : ''}`);
  }

  // Approval Requests
  async getApprovals(status = 'ALL') {
    return this.request(`/approvals?status=${status}`);
  }

  async decideApproval(id, decision, note) {
    return this.request(`/approvals/${id}/decide`, {
      method: 'POST',
      body: JSON.stringify({ decision, note })
    });
  }

  // Audit Logs
  async getAuditLogs(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/audit-logs${query ? '?' + query : ''}`);
  }

  // Alerts
  async getAlerts(status = 'ALL') {
    return this.request(`/alerts?status=${status}`);
  }

  async acknowledgeAlert(id, status = 'ACKNOWLEDGED') {
    return this.request(`/alerts/${id}/acknowledge`, {
      method: 'POST',
      body: JSON.stringify({ status })
    });
  }
}

// Global API singleton
window.api = new GuardAgentAPI();
