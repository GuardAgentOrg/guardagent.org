# Security Policy & Vulnerability Disclosure

GuardAgent takes the security of our deterministic agent firewall, AST parser, reverse proxy runtime, and SDKs seriously. As an inline safety gateway deployed in front of critical infrastructure, databases, and financial systems, we enforce a strict responsible vulnerability disclosure procedure.

## Supported Versions

Security updates, CVSS assessments, and CVE errata are actively maintained for the following versions:

| Version | Release Status | Security Maintenance | Patch SLA (Critical) |
| :--- | :--- | :--- | :--- |
| **v1.x (Current)** | Active | Full Security & Bugfix Maintenance | < 48 hours |
| **v0.9.x** | Maintenance | Critical Vulnerabilities Only | < 7 days |
| **< v0.9.0** | End of Life | Unsupported (Upgrade Recommended) | N/A |

## Reporting a Vulnerability

If you discover a security vulnerability, privilege escalation vector, sandbox escape, or policy bypass within GuardAgent, please notify the core security team directly:

- **Security Team Email:** [security@guardagent.org](mailto:security@guardagent.org)
- **Alternate Contact:** [security@guardagent.ai](mailto:security@guardagent.ai)
- **PGP Key Fingerprint:** `4A9F 821E C03B 9801 D712 5590 1A3E 76C4 FB82 0019`
- **Official Security Documentation:** [guardagent.org/security](https://guardagent.org/security)

### What to Include in Your Report:
1. Detailed steps to reproduce the vulnerability or a minimal reproducible curl / SDK test script.
2. The affected GuardAgent version, deployment environment (Docker, Kubernetes, Bare Metal), and configuration snippet.
3. An assessment of potential attack impact (e.g., unauthorized data exfiltration, rule bypass, privilege elevation).
4. Any proposed remediation or patch diff (optional but appreciated).

> [!WARNING]
> Please **do not** open public GitHub issues or discussions for unpatched security exploits or zero-day vulnerabilities.

## Response SLA & Disclosure Timeline

- **0 – 24 Hours:** Initial report triage, receipt acknowledgment, and assignment of a dedicated security engineer.
- **24 – 48 Hours:** Reproduction verification and CVSS v3.1 severity rating classification.
- **3 – 14 Days:** Patch development, regression validation against AST test suites, and pre-release verification with the reporter.
- **30-Day Embargo:** Coordinated public disclosure, advisory release, and CVE publication allowing enterprise users an upgrade window.

## Safe Harbor Policy

GuardAgent considers security research conducted under this policy to be authorized under applicable computer misuse laws (including CFAA and DMCA anti-circumvention provisions). We will not pursue civil litigation or initiate law enforcement complaints against security researchers who:

- Engage in good-faith vulnerability research on their own local installations or designated test sandboxes.
- Promptly report findings via our official security contacts.
- Refrain from privacy violations, data destruction, denial-of-service attacks, or access to third-party customer environments.
- Allow reasonable time for remediation prior to public disclosure.

For complete architectural details, threat models, and AST deterministic safety bounds, visit our official documentation at [https://guardagent.org/security](https://guardagent.org/security).
