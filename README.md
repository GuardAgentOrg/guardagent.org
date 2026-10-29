# GuardAgent — AI Agent Security Platform (Beta)

> **Secure Every Agent Action.**  
> An authoritative security gateway between autonomous AI agents and enterprise tools.

GuardAgent intercepts proposed agent actions, validates identity credentials, applies declarative security policies, computes explainable risk scores, and enforces one of three deterministic outcomes:
- **`ALLOW`**: Verified safe action under policy constraints.
- **`REQUIRE APPROVAL`**: High-risk or escalated action held for human review.
- **`BLOCK`**: Malicious (SSRF, SQLi, command injection) or unauthorized attempt rejected immediately.

---

## Technology Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript, Chart.js
- **Backend**: Node.js, Express.js REST API
- **Database**: Supabase PostgreSQL (with automatic zero-config Local Verified Store fallback)
- **Authentication**: Supabase Auth (with 1-click Demo SOC profile fallback)

---

## Directory Structure

```text
GuardAgent/
├── public/                     # Public marketing site and beta application
│   ├── index.html              # Marketing Homepage with Live Interactive Simulator
│   ├── features.html           # Platform Capabilities & Roadmap
│   ├── how-it-works.html       # Request Lifecycle Architecture
│   ├── security.html           # Security Boundaries & Defense-in-Depth
│   ├── docs.html               # Developer Quickstart & REST API Reference
│   ├── login.html              # Sign In (Supabase + 1-Click Demo)
│   ├── signup.html             # Account Registration
│   ├── app/                    # Authenticated Beta Application
│   │   ├── index.html          # Overview Dashboard & Chart.js Metrics
│   │   ├── agents.html         # AI Agent Identity & Enrollment
│   │   ├── policies.html       # Security Guardrail Rules
│   │   ├── risk-analysis.html  # Explainable Risk Testbench & Sandbox
│   │   ├── approvals.html      # Human-in-the-Loop Review Queue
│   │   ├── audit-logs.html     # Immutable Event Ledger
│   │   ├── alerts.html         # Security Alerts & Incident Stream
│   │   └── settings.html       # Profile, Workspaces & Secret Masking
│   └── assets/
│       ├── css/                # Enterprise Design System (main.css, app.css)
│       ├── js/                 # API client, Chart.js wrappers, app controllers
│       └── images/             # Official GuardAgent Brand Assets (logo.png)
├── server/                     # Backend Security Engine & Express REST Server
│   ├── index.js                # Server entrypoint and route rewrites
│   ├── routes/                 # Express REST endpoint modules
│   ├── middleware/             # Supabase & Demo auth verification
│   ├── services/               # 12-step Security Engine & Controlled Tool Registry
│   └── database/               # Supabase client & in-memory deterministic fallback store
├── tests/                      # Automated Verification Test Suite
├── .env.example                # Environment configuration template
├── package.json
└── README.md
```

---

## Quickstart & Local Execution

### 1. Prerequisites
- **Node.js** v18+ (tested on v24.21.0)
- **npm** v9+

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/GuardAgentOrg/guardagent.org.git
cd guardagent.org

# Install dependencies
npm install
```

### 3. Environment Configuration
Copy the template configuration file:
```bash
cp .env.example .env
```
*Note: If no Supabase credentials are provided, GuardAgent automatically boots in **Demo Mode**, utilizing a persistent, verified in-memory store preloaded with realistic enterprise security data.*

### 4. Start the Application
```bash
npm start
```
The server will start on `http://localhost:3000`:
- **Public Website:** `http://localhost:3000/`
- **Beta Application Dashboard:** `http://localhost:3000/app/`
- **Health Endpoint:** `http://localhost:3000/api/health`

### 5. Run the Automated Test Suite
```bash
npm test
```

---

## Connecting Supabase PostgreSQL (Optional)

1. Create a project in [Supabase](https://supabase.com).
2. Open the **SQL Editor** in Supabase and paste the contents of `server/database/schema.sql`.
3. Retrieve your project URL and keys from **Settings -> API**.
4. Update your `.env` file:
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   DEMO_MODE=false
   ```
5. Restart `npm start`.

---

## Security Architecture & Technical Honesty

- **Server-Side Enforcement**: All policy decisions, threshold triggers, and validations occur strictly on the backend. Frontend controls are purely navigational.
- **Controlled Mock Tools**: In Beta v1.0, allowed actions dispatch to safe simulated mock handlers (`db_read_query`, `db_write_record`, `external_api_call`, `exec_code_sandbox`).
- **Deny-by-Default**: Unknown agents, suspended identifiers, or malformed parameters fail closed with zero tool invocation.
- **Immutable Ledger**: Audit records cannot be modified or deleted via API endpoints.
- **Beta Disclaimer**: This software is provided for evaluation purposes and has not yet undergone a third-party SOC 2 audit.

---

&copy; 2026 GuardAgent. All rights reserved.
