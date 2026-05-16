/**
 * Copyright (c) 2026 Vladimir Kapustin
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * AASL Architecture Plan — AI Agent Studio Launchpad
 * Scope: x_aasl
 * Focus: Zurich (2025) → Australia (2026) AI readiness
 */

# AASL (AI Agent Studio Launchpad) — Architecture Plan

## 1. Problem Statement

Australia release introduces AI Agent Studio, Generative AI Controller (BYOK),
Workflow Studio, and MCP Server Console. Platform teams struggle with:

1. **Plugin maze** — 6+ plugins must be active in correct order
2. **Role confusion** — `ai_agent_admin` vs `ai_agent_developer` vs `ai_control_tower_admin`
3. **BYOK configuration hell** — Azure OpenAI, Bedrock, Vertex AI, watsonx require
   manual credential exchange and endpoint setup
4. **No OOB wizard** — Instance Scan does not check AI readiness
5. **Fragmented docs** — activation steps spread across Now Assist, AI Platform,
   and ITOM docs

**Impact:** Teams adopt Australia AI features 3-6 months late, missing ROI window.

## 2. Product Definition

AASL is a scoped ServiceNow app that:
- Scans the instance for AI Agent Studio prerequisites (plugins, roles, AI Control Tower)
- Detects BYOK provider configuration status (Azure OpenAI, Bedrock, Vertex AI, watsonx)
- Generates a numbered "Launchpad Checklist" with PASS / WARN / FAIL per item
- One-click idempotent role provisioning
- Produces HTML/JSON readiness report with estimated activation timeline
- Exposes REST API for CI/CD pipeline integration

## 3. Data Model

### Tables

| Table | Extends | Purpose |
|-------|---------|---------|
| x_aasl_prerequisite | Task | Each prerequisite check result (plugin, role, property) |
| x_aasl_launchpad_run | sys_metadata | Audit log of each launchpad execution |
| x_aasl_recommendation | sys_metadata | Auto-generated recommendations with severity |
| x_aasl_byok_provider | sys_metadata | BYOK provider configuration snapshot |

### x_aasl_prerequisite fields
- run_id (Reference → x_aasl_launchpad_run)
- category (Choice: PLUGIN / ROLE / PROPERTY / BYOK / AI_CONTROL_TOWER)
- name (String)
- expected_state (String)
- actual_state (String)
- status (Choice: PASS / WARN / FAIL / NOT_CHECKED)
- remediation_hint (String, 4000)
- auto_fixable (Boolean)

### x_aasl_launchpad_run fields
- instance_name (String)
- release_target (Choice: Australia / Future)
- overall_score (Integer, 0-100)
- total_checks (Integer)
- pass_count / warn_count / fail_count (Integer)
- byok_provider_found (String)
- estimated_hours_to_ready (Integer)
- report_html (HTML)
- report_json (String, 4000)

### x_aasl_recommendation fields
- run_id (Reference)
- severity (Choice: Critical / High / Medium / Low)
- title (String)
- description (String, 4000)
- documentation_link (URL)
- estimated_effort_hours (Integer)

### x_aasl_byok_provider fields
- provider_name (Choice: azure_openai / bedrock / vertex_ai / watsonx)
- endpoint_url (URL)
- model_family (String)
- is_configured (Boolean)
- last_tested (DateTime)
- test_result (Choice: SUCCESS / FAIL / TIMEOUT / NOT_TESTED)
- error_log (String, 4000)

## 4. Runtime Architecture

### Script Includes

| Script Include | Responsibility |
|----------------|---------------|
| AASLPrerequisiteChecker | Query plugins, roles, sys_properties; produce prerequisite records |
| AASLBYOKValidator | Check `sn_generative_ai_cfg_provider`, `sn_ai_control_tower_config` tables |
| AASLRoleProvisioner | Idempotent grant/revoke of AI roles; uses `sys_user_grmember` |
| AASLLaunchpadEngine | Orchestrates scan → score → recommendations → report |
| AASLReportGenerator | HTML dashboard, JSON REST, CSV export |
| AASLRESTAPI | Scripted REST API for external CI/CD triggers |

### Scheduled Jobs

| Job | Frequency | Script |
|-----|-----------|--------|
| AASL Daily Delta Scan | Daily | `new AASLLaunchpadEngine().runDeltaScan()` |
| AASL Weekly Full Scan | Weekly | `new AASLLaunchpadEngine().runFullScan()` |

### Business Rules

| Table | When | Action |
|-------|------|--------|
| x_aasl_prerequisite | Insert / Update | Recalculate parent run score |
| x_aasl_launchpad_run | Insert | Auto-populate instance_name from `gs.getProperty('instance_name')` |

## 5. Scan Engine Logic

### Plugin Checks (AASLPrerequisiteChecker)

```
PLUGINS_REQUIRED = [
  "com.snc.ai.agent.studio",
  "com.snc.ai.control.tower",
  "com.snc.generative.ai.controller",
  "com.snc.now.assist",
  "com.snc.workflow.studio",
  "com.snc.mcp.server.console"
]
```
For each plugin:
1. Query `v_plugin` or `sys_plugins` for active state
2. If not active → FAIL
3. If active but version < Australia minimum → WARN
4. Record in `x_aasl_prerequisite`

### Role Checks

```
ROLES_REQUIRED = [
  "ai_agent_admin",
  "ai_agent_developer",
  "ai_control_tower_admin",
  "now_assist_admin",
  "workflow_studio_admin"
]
```
For each role:
1. Query `sys_user_role` for existence
2. Query `sys_user_has_role` for at least one assignee (warn if none)
3. Record PASS / WARN / FAIL

### BYOK Provider Checks (AASLBYOKValidator)

Query `sn_generative_ai_cfg_provider`:
- If zero rows → FAIL (no BYOK configured)
- If rows exist but `endpoint_url` empty → WARN
- If `last_tested` > 30 days → WARN
- If `test_result` != SUCCESS → FAIL

Supported providers:
- `azure_openai`
- `bedrock`
- `vertex_ai`
- `watsonx`

### AI Control Tower Checks

Query `sn_ai_control_tower_config`:
- If table not exist → FAIL (plugin not active)
- If no configured governance rules → WARN
- If `enabled` != true → FAIL

## 6. Scoring Algorithm

```
total = pass + warn + fail + not_checked
score = (pass * 1.0 + warn * 0.5 + fail * 0.0) / total * 100
```

If any Critical recommendation exists → max score capped at 70 until resolved.
If BYOK not configured → max score capped at 60 (AI features unavailable).

Estimated hours to ready:
```
base = fail_count * 4 + warn_count * 1.5 + critical_recommendations * 8
if byok_missing: base += 16
if roles_missing: base += 2
return ceil(base)
```

## 7. Security Model

- All Script Includes execute as `system` (maintenance scope)
- RoleProvisioner only assigns roles to existing users; never creates users
- BYOK credentials are NEVER logged or exported
- REST API requires `x_aasl.admin` role (custom role)
- Report exports scrub endpoint URLs (mask API keys)

## 8. Integration Points

| System | Direction | Purpose |
|--------|-----------|---------|
| Instance Scan | Outbound | AASL findings reported as Instance Scan findings |
| ADIS (Product #1) | Inbound | If ADIS detected deprecated APIs, AASL skips Agent Studio activation |
| Service Portal | Outbound | Embed Launchpad Checklist widget for admins |
| REST API | Inbound | CI/CD pipeline triggers scan on sandbox refresh |

## 9. Build Order

1. Table definitions + sys_app.xml
2. AASLPrerequisiteChecker (plugins + roles)
3. AASLBYOKValidator
4. AASLRoleProvisioner
5. AASLLaunchpadEngine (orchestrator)
6. AASLReportGenerator
7. AASLRESTAPI
8. Business Rules + Scheduled Jobs
9. Unit tests (Python mocks)
10. E2E tests (Python mocks)
11. PDI smoke test
12. Marketing package
13. Git push

## 10. File Map

```
/home/crixus/agentic-loop/output/AASL/
├── src/
│   ├── sys_app.xml
│   ├── tables.xml
│   ├── AASLPrerequisiteChecker.js
│   ├── AASLBYOKValidator.js
│   ├── AASLRoleProvisioner.js
│   ├── AASLLaunchpadEngine.js
│   ├── AASLReportGenerator.js
│   └── AASLRESTAPI.js
├── tests/
│   ├── test_prerequisite_checker.py
│   ├── test_byok_validator.py
│   ├── test_role_provisioner.py
│   ├── test_launchpad_engine.py
│   └── test_rest_api.py
├── marketing/
│   ├── README.md
│   ├── WHITEPAPER.md
│   └── LINKEDIN_POST.md
└── docs/
    └── architecture_plan.md
```

---

*Lock: Zurich → Australia. No Washington DC, Xanadu, Yokohama.*
