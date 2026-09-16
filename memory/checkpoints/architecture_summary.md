# AASL Architecture Summary

**Product:** AI Agent Studio Launchpad (AASL)
**Scope:** `x_aasl`
**Author:** Vladimir Kapustin
**License:** AGPL-3.0-only
**Release Target:** ServiceNow Australia (2026)

---

## 1. Purpose

AASL collapses the ServiceNow Australia AI-readiness activation timeline from
3–6 months of manual plugin/role/property configuration down to 1–2 days. It is a
scoped application that (1) scans an instance for every AI Agent Studio prerequisite,
(2) validates Bring-Your-Own-Key (BYOK) provider wiring, (3) computes a weighted
0–100 readiness score, (4) emits actionable remediation recommendations, and
(5) exposes a Scripted REST API for CI/CD integration.

## 2. Component Inventory

| Component | File | Responsibility |
|-----------|------|----------------|
| `AASLLaunchpadEngine` | `src/AASLLaunchpadEngine.js` | Orchestration — runs full scan, persists results, computes score |
| `AASLPrerequisiteChecker` | `src/AASLPrerequisiteChecker.js` | Validates plugins, roles, sys_properties, Control Tower config |
| `AASLBYOKValidator` | `src/AASLBYOKValidator.js` | Detects BYOK provider setup on `sn_generative_ai_cfg_provider` |
| `AASLRoleProvisioner` | `src/AASLRoleProvisioner.js` | Idempotent AI role assignment |
| `AASLReportGenerator` | `src/AASLReportGenerator.js` | HTML / JSON / CSV report generation |
| `AASLRESTAPI` | `src/AASLRESTAPI.js` | Scripted REST API (`/api/x_aasl/launchpad/scan`) |

## 3. Data Model

| Table | Purpose |
|-------|---------|
| `x_aasl_launchpad_run` | Head record per scan run — score, counts, report blobs |
| `x_aasl_prerequisite` | Child records — one per check with PASS/WARN/FAIL status |
| `x_aasl_recommendation` | Remediation records derived from non-PASS prerequisites |

## 4. Control Flow

1. `runFullScan()` inserts a new `x_aasl_launchpad_run` head record.
2. `AASLPrerequisiteChecker.runFullScan()` returns plugin/role/property findings.
3. `AASLBYOKValidator.scanProviders()` returns provider status snapshots.
4. Findings and BYOK records are persisted as `x_aasl_prerequisite` children.
5. Weighted score is computed: `(PASS*1 + WARN*0.5 + FAIL*0) / total * 100`.
6. Score is capped at 60 when any BYOK provider is failing (gate semantics).
7. `AASLReportGenerator` renders HTML/JSON; recommendations are persisted.
8. The run head record is updated with score, counts, and report blobs.

## 5. Scoring Semantics

- **PASS** contributes full weight (1.0).
- **WARN** contributes half weight (0.5).
- **FAIL** contributes zero weight (0.0).
- **BYOK gate:** a failing provider caps the overall score at 60/100, reflecting
  that AI Agent Studio cannot operate meaningfully without a configured LLM backend.

## 6. BYOK Provider Support

The validator recognizes four providers by normalizing `provider_name`:
`Azure OpenAI`, `AWS Bedrock`, `Google Vertex AI`, and `IBM watsonx`. When the
`sn_generative_ai_cfg_provider` table is absent (vanilla PDI without the plugin),
the validator returns `NOT_CONFIGURED` for every provider — a neutral status,
not a failure — so the scan never crashes on an unprovisioned instance.

## 7. REST API Surface

- `POST /api/x_aasl/launchpad/scan` → triggers a full scan, returns 201 with run summary.
- `GET /api/x_aasl/launchpad/latest` → returns the most recent run head as JSON.

## 8. Key Design Decisions

- **Idempotency:** role provisioning and scan execution are safe to re-run.
- **Graceful degradation:** missing plugin-dependent tables map to INFO/NOT_CONFIGURED,
  never to a thrown error.
- **Record cap:** `maxRecs = 5000` bounds prerequisite persistence to avoid runaway writes.
- **Effort estimation:** `failCount*4 + warnCount*1.5 + (byokFail ? 16 : 0)` hours.
