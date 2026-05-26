# AASL Architecture Summary — AI Agent Studio Launchpad

## Product Identity
- **Name:** AI Agent Studio Launchpad (AASL)
- **Scope:** `x_aasl`
- **Release Target:** ServiceNow Australia (2026)
- **License:** AGPL-3.0-only
- **Author:** Vladimir Kapustin

## Problem Domain

ServiceNow's Australia release introduces AI Agent Studio, Generative AI Controller (BYOK), Workflow Studio, MCP Server Console, and AI Control Tower. Enterprise teams face 3-6 month adoption delays due to:
- 6 plugins requiring correct dependency-ordered activation
- 5 AI-specific roles with confusing naming conventions
- BYOK configuration across 4 providers (Azure OpenAI, Bedrock, Vertex AI, watsonx)
- No OOB readiness wizard — Instance Scan does not check AI readiness
- Fragmented documentation across Now Assist, AI Platform, and ITOM docs

## Component Architecture

| Component | Script Include | Responsibility |
|-----------|---------------|----------------|
| Prerequisite Scanner | AASLPrerequisiteChecker | Validates 6 plugins, 5 roles, 3 system properties, AI Control Tower config |
| BYOK Validator | AASLBYOKValidator | Scans `sn_generative_ai_cfg_provider` for Azure/Bedrock/Vertex/watsonx |
| Role Provisioner | AASLRoleProvisioner | Idempotent grant/revoke of AI roles via `sys_user_has_role` |
| Orchestrator | AASLLaunchpadEngine | Coordinates scan → score → recommendations → report |
| Report Generator | AASLReportGenerator | Produces HTML dashboard, JSON, CSV exports |
| REST API | AASLRESTAPI | CI/CD-friendly endpoints: POST /scan, GET /latest |

## Data Flow

1. `AASLLaunchpadEngine.runFullScan()` is invoked (manual or REST API trigger)
2. Engine calls `AASLPrerequisiteChecker.runFullScan()` → queries `v_plugin`, `sys_user_role`, `sys_user_has_role`, `sys_properties`, `sn_ai_control_tower_config`
3. Engine calls `AASLBYOKValidator.scanProviders()` → queries `sn_generative_ai_cfg_provider`
4. Engine persists findings to `x_aasl_prerequisite` records
5. Engine calculates weighted score (0-100) with caps: max 60 without BYOK, max 70 with critical failures
6. Engine generates recommendations → `x_aasl_recommendation` records
7. Engine calls `AASLReportGenerator` for HTML/JSON output
8. Results stored in `x_aasl_launchpad_run` with full report payloads

## Data Model

### x_aasl_launchpad_run
- Primary audit record for each scan execution
- Fields: instance_name, release_target, overall_score (0-100), total_checks, pass_count, warn_count, fail_count, byok_provider_found, estimated_hours_to_ready, report_html, report_json

### x_aasl_prerequisite
- Individual check result per prerequisite item
- Fields: run_id (reference), category (PLUGIN/ROLE/PROPERTY/BYOK/AI_CONTROL_TOWER), name, expected_state, actual_state, status (PASS/WARN/FAIL/NOT_CHECKED), remediation_hint, auto_fixable

### x_aasl_recommendation
- Auto-generated remediation guidance
- Fields: run_id, severity (Critical/High/Medium/Low), title, description, documentation_link, estimated_effort_hours

### x_aasl_byok_provider
- BYOK provider configuration snapshot
- Fields: provider_name (azure_openai/bedrock/vertex_ai/watsonx), endpoint_url, model_family, is_configured, last_tested, test_result, error_log

## Scoring Algorithm

```
total = pass + warn + fail
raw_score = (pass * 1.0 + warn * 0.5 + fail * 0.0) / total * 100
If BYOK not configured → cap at 60
If Critical recommendation exists → cap at 70
```

Weight distribution: Plugins (30%), Roles (25%), Properties (15%), AI Control Tower (15%), BYOK (15%)

## Security Model

- All Script Includes execute as system (maintenance scope)
- Role Provisioner: only assigns roles to existing users; never creates users
- BYOK credentials NEVER logged or exported to reports
- REST API requires `x_aasl.admin` custom role
- Report exports scrub endpoint URLs (mask API keys in HTML/JSON)

## Performance Benchmarks

| Operation | Target | Constraint |
|-----------|--------|------------|
| Full scan (all 6 plugins + 5 roles + 3 props + ACT + 4 BYOK) | < 5 seconds | Max 5000 prerequisite records per run |
| Role grant (single) | < 200ms | Idempotent — safe to repeat |
| Report generation (HTML + JSON) | < 1 second | In-memory assembly |
| REST API response (GET /latest) | < 500ms | Single GlideRecord query |

## Integration Points

| System | Direction | Trigger |
|--------|-----------|---------|
| Instance Scan | Outbound | AASL findings reportable as scan findings |
| ADIS (Product #1) | Inbound | If ADIS detects deprecated APIs, AASL skips Agent Studio activation |
| CI/CD Pipeline | Inbound via REST | POST /scan on sandbox refresh |
| Service Portal | Outbound | Embed Launchpad Checklist widget |

## Scheduled Jobs

| Job | Frequency | Action |
|-----|-----------|--------|
| AASL Daily Delta Scan | Daily at 02:00 | `new AASLLaunchpadEngine().runDeltaScan()` |
| AASL Weekly Full Scan | Weekly Monday 03:00 | `new AASLLaunchpadEngine().runFullScan()` |
