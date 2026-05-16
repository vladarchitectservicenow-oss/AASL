# AI Agent Studio Launchpad (AASL)

**One-click AI readiness scanner and activation wizard for ServiceNow Australia (2026).**

Author: ServiceNow Solution Architect Vladimir Kapustin  
License: AGPL-3.0-only  
Scope: `x_aasl`  

---

## Problem

Australia release introduces AI Agent Studio, Generative AI Controller (BYOK), Workflow Studio, and MCP Server Console. Platform teams struggle with:

- **Plugin maze** — 6+ plugins must be active in the correct order.
- **Role confusion** — `ai_agent_admin` vs `ai_agent_developer` vs `ai_control_tower_admin`.
- **BYOK configuration hell** — Azure OpenAI, Bedrock, Vertex AI, and watsonx require manual credential exchange.
- **No OOB wizard** — Instance Scan does not check AI readiness.
- **Fragmented docs** — activation steps are spread across Now Assist, AI Platform, and ITOM docs.

**Average delay: 3-6 months to adopt Australia AI features.**

## Solution

AASL is a scoped ServiceNow app (`x_aasl`) that:

1. Scans the instance for AI Agent Studio prerequisites (plugins, roles, AI Control Tower).
2. Detects BYOK provider configuration status (Azure OpenAI, Bedrock, Vertex AI, watsonx).
3. Generates a numbered "Launchpad Checklist" with **PASS / WARN / FAIL** per item.
4. One-click idempotent role provisioning.
5. Produces HTML/JSON readiness reports with an estimated activation timeline.
6. Exposes a REST API for CI/CD pipeline integration.

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     AASL — x_aasl Scope                       │
├──────────────────────────────────────────────────────────────┤
│ AASLPrerequisiteChecker  →  plugins, roles, properties      │
│ AASLBYOKValidator        →  sn_generative_ai_cfg_provider   │
│ AASLRoleProvisioner      →  sys_user_has_role (idempotent)  │
├──────────────────────────────────────────────────────────────┤
│ AASLLaunchpadEngine      →  orchestrate, score, estimate    │
│ AASLReportGenerator      →  HTML / JSON / CSV exports        │
├──────────────────────────────────────────────────────────────┤
│ Tables: x_aasl_launchpad_run, x_aasl_prerequisite            │
│         x_aasl_recommendation, x_aasl_byok_provider          │
├──────────────────────────────────────────────────────────────┤
│ REST API: POST /api/x_aasl/launchpad/scan                    │
│           GET  /api/x_aasl/launchpad/latest                  │
└──────────────────────────────────────────────────────────────┘
```

## Quick Start

### Option A: Import XML (Studio)

1. Open **System Applications > Studio**.
2. Click **Import From XML**.
3. Upload `src/sys_app.xml` then `src/tables.xml`.
4. Navigate to **AI Agent Studio Launchpad > Launchpad Run**.
5. Click **New**, then **Execute Scan**.

### Option B: Background Script

```js
var engine = new AASLLaunchpadEngine();
var result = engine.runFullScan();
gs.info("Score: " + result.overall_score + "/100, Est. hours: " + result.estimated_hours);
```

### Option C: REST API

```bash
# Trigger scan
curl -X POST https://your-instance.service-now.com/api/x_aasl/launchpad/scan \
  -u admin:password \
  -H "Content-Type: application/json"

# Get latest result
curl -X GET https://your-instance.service-now.com/api/x_aasl/launchpad/latest \
  -u admin:password
```

## Scoring

| Component | Weight | Impact |
|-----------|--------|--------|
| Plugins (6) | 30% | All must be active |
| Roles (5) | 25% | Key roles need assignees |
| Properties (3) | 15% | Mandatory props must be `true` |
| AI Control Tower | 15% | Must be enabled |
| BYOK Providers (4) | 15% | At least one configured + tested |

**Score cap:** If no BYOK provider is configured, max score = 60.

## Tables

| Table | Purpose |
|-------|---------|
| `x_aasl_launchpad_run` | Audit log per scan execution |
| `x_aasl_prerequisite` | Individual check result |
| `x_aasl_recommendation` | Auto-generated remediation advice |
| `x_aasl_byok_provider` | BYOK provider snapshot |

## Security

- Role provisioner never creates users — only assigns existing roles.
- BYOK credentials are read but never logged or exported.
- REST API requires `x_aasl.admin` role.
- All exports mask endpoint URLs and strip API keys.

## ROI

| Metric | Manual | With AASL |
|--------|--------|-----------|
| Time to activate AI Agent Studio | 3-6 months | 1-2 days |
| Admins involved | 5-8 | 2-3 |
| BYOK misconfigurations caught | Reactive | Proactive |
| Upgrade readiness meetings | Weekly | Bi-weekly |

**Estimated savings: $35,000–$55,000 per Australia upgrade** (based on 200-hr admin time reduction at $175/hr).

## Files

```
AASL/
├── src/
│   ├── sys_app.xml                  # App manifest
│   ├── tables.xml                   # Table definitions
│   ├── AASLPrerequisiteChecker.js  # Plugin / role / property scan
│   ├── AASLBYOKValidator.js        # BYOK provider validation
│   ├── AASLRoleProvisioner.js      # Idempotent role assignment
│   ├── AASLLaunchpadEngine.js      # Orchestrator + scoring
│   ├── AASLReportGenerator.js      # HTML / JSON / CSV export
│   └── AASLRESTAPI.js              # Scripted REST resource
├── tests/
│   ├── test_prerequisite_checker.js # 9 unit tests
│   └── test_launchpad_e2e.js       # 4 integration tests
└── marketing/
    ├── WHITEPAPER.md                # Executive analysis
    └── LINKEDIN_POST.md             # C-level sales thread
```

## License

SPDX-License-Identifier: AGPL-3.0-only  
Copyright (c) 2026 Vladimir Kapustin  
Commercial licensing available upon request.

---

*Built for ServiceNow Australia (2026). Zurich → Australia — nothing else.*
