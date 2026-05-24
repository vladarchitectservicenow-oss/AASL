# Architecture Summary — AI Agent Studio Launchpad (AASL)

**Product:** AI Agent Studio Launchpad (AASL)  
**Scope:** `x_aasl`  
**Release Target:** ServiceNow Australia (2026)  
**Author:** ServiceNow Solution Architect Vladimir Kapustin  
**Date:** 2026-05-24  
**Status:** Phase 1 — Architecture Baseline

---

## 1. System Overview

AASL is a scoped ServiceNow application that provides a one-click readiness assessment and activation wizard for AI Agent Studio features introduced in the Australia release. The system scans an instance for prerequisites (plugins, roles, properties, AI Control Tower, BYOK providers) and generates an actionable checklist with scoring, remediation recommendations, and exportable reports.

### Design Goals
- **Zero-config scan**: No manual setup required — run the scan and get results.
- **Idempotent operations**: Role provisioning and BYOK validation can run repeatedly without side effects.
- **CI/CD integration**: REST API endpoints for pipeline automation.
- **Platform-native**: Built entirely within ServiceNow — no external dependencies.

---

## 2. Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      AASL — x_aasl Scope                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────┐  ┌──────────────────────────┐          │
│  │ AASLPrerequisite    │  │ AASLBYOKValidator         │          │
│  │ Checker             │  │                           │          │
│  │ ─ plugins           │  │ ─ sn_generative_ai_cfg_   │          │
│  │ ─ roles             │  │   provider scan           │          │
│  │ ─ sys_properties    │  │ ─ connection test         │          │
│  │ ─ AI Control Tower  │  │ ─ credential check        │          │
│  └────────┬────────────┘  └──────────┬───────────────┘          │
│           │                          │                            │
│           └──────────┬───────────────┘                            │
│                      ▼                                            │
│  ┌─────────────────────────────────────────┐                     │
│  │ AASLLaunchpadEngine (Orchestrator)       │                     │
│  │ ─ Run full/partial scans                │                     │
│  │ ─ Calculate weighted score (0-100)      │                     │
│  │ ─ Estimate activation timeline (hours)  │                     │
│  │ ─ Generate recommendations              │                     │
│  └─────────────┬───────────────────────────┘                     │
│                ▼                                                  │
│  ┌─────────────────────────┐  ┌──────────────────────┐          │
│  │ AASLRoleProvisioner     │  │ AASLReportGenerator   │          │
│  │ ─ Assign roles          │  │ ─ HTML export         │          │
│  │ ─ Idempotent (no dups)  │  │ ─ JSON export         │          │
│  │ ─ Audit trail           │  │ ─ CSV export          │          │
│  └─────────────────────────┘  └──────────────────────┘          │
│                                                                   │
│  ┌─────────────────────────┐                                     │
│  │ AASLRESTAPI              │                                     │
│  │ POST /launchpad/scan    │                                     │
│  │ GET  /launchpad/latest  │                                     │
│  │ GET  /launchpad/{id}    │                                     │
│  └─────────────────────────┘                                     │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Data Model

### Core Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `x_aasl_launchpad_run` | Audit log per scan | `sys_id`, `run_time`, `overall_score`, `estimated_hours`, `status`, `triggered_by` |
| `x_aasl_prerequisite` | Individual check result | `run`, `check_name`, `component`, `status` (PASS/WARN/FAIL), `detail`, `recommendation` |
| `x_aasl_recommendation` | Remediation advice | `prerequisite`, `action`, `automated` (boolean), `manual_steps` |
| `x_aasl_byok_provider` | BYOK provider snapshot | `run`, `provider_name`, `configured`, `tested`, `last_error` |

### Relationships
- `x_aasl_launchpad_run` (1) → (*) `x_aasl_prerequisite`
- `x_aasl_prerequisite` (1) → (0..*) `x_aasl_recommendation`
- `x_aasl_launchpad_run` (1) → (0..4) `x_aasl_byok_provider`

---

## 4. Scoring Engine

### Scoring Weights

| Component | Items | Weight | Max Deduction |
|-----------|-------|--------|---------------|
| Plugins | 6 required | 30% | 30 points |
| Roles | 5 key roles | 25% | 25 points |
| System Properties | 3 mandatory | 15% | 15 points |
| AI Control Tower | 1 check | 15% | 15 points |
| BYOK Providers | 4 configurable | 15% | 15 points |

**Total possible: 100 points**

### Score Calculation
Each component check returns `PASS` (full weight), `WARN` (half weight), or `FAIL` (zero weight). The engine sums weighted values and normalizes to 0-100.

**BYOK Gate:** If no BYOK provider is configured, max score is capped at 60 — AI Agent Studio cannot function without at least one provider.

### Scoring Tiers
| Score Range | Tier | Description |
|-------------|------|-------------|
| 80-100 | READY | All critical prerequisites met; proceed to activation |
| 60-79 | ALMOST | Minor gaps; 1-3 days to fix |
| 40-59 | PARTIAL | Significant gaps; 1-2 weeks |
| 0-39 | NOT READY | Foundation missing; 3+ weeks |

---

## 5. REST API Design

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/x_aasl/launchpad/scan` | Basic + `x_aasl.admin` | Trigger a full scan |
| GET | `/api/x_aasl/launchpad/latest` | Basic + `x_aasl.admin` | Get most recent run |
| GET | `/api/x_aasl/launchpad/{id}` | Basic + `x_aasl.admin` | Get specific run by sys_id |
| GET | `/api/x_aasl/launchpad/export` | Basic + `x_aasl.admin` | Export as JSON/CSV (query param `format`) |

### Response Format (scan)
```json
{
  "run_id": "abc123",
  "score": 45,
  "tier": "PARTIAL",
  "estimated_hours": 12,
  "checks": [
    {"component": "plugins", "name": "AI Agent Studio", "status": "PASS"},
    {"component": "byok", "name": "Azure OpenAI", "status": "FAIL"}
  ],
  "recommendations": [
    {"id": 1, "action": "Activate plugin: AI Agent Studio", "automated": false}
  ]
}
```

---

## 6. Security Model

| Concern | Mitigation |
|---------|-----------|
| BYOK credential exposure | Credentials are read for validation only — never logged, stored, or exported |
| Role elevation | Role provisioner only assigns roles to existing users; never creates users |
| API access control | REST endpoints require `x_aasl.admin` role |
| Audit trail | Every scan run is logged with timestamps and triggers |
| Sensitive field masking | API responses automatically mask endpoint URLs and strip API keys |

---

## 7. Deployment Architecture

```
┌──────────────────────────────────────────────────┐
│                 ServiceNow PDI                    │
│  ┌────────────┐  ┌───────────┐  ┌─────────────┐ │
│  │ AASL App   │  │ AI Agent  │  │ AI Control  │ │
│  │ (x_aasl)   │  │ Studio    │  │ Tower       │ │
│  └─────┬──────┘  └─────┬─────┘  └──────┬──────┘ │
│        │               │                │        │
│  ┌─────┴───────────────┴────────────────┴──────┐ │
│  │          sys_generative_ai_cfg_provider      │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐    │ │
│  │  │ Azure    │ │ Bedrock  │ │ Vertex   │    │ │
│  │  │ OpenAI   │ │          │ │ AI       │    │ │
│  │  └──────────┘ └──────────┘ └──────────┘    │ │
│  └──────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
          │                    │
          ▼                    ▼
   ┌──────────┐         ┌──────────┐
   │ GitHub   │         │ CI/CD    │
   │ vladarch │         │ Pipeline │
   │ itect     │         │ (REST)   │
   │ servicen │         └──────────┘
   │ ow-oss   │
   └──────────┘
```

---

## 8. Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | ServiceNow GlideRecord (ES5+ compatible) | Zurich+ |
| Frontend | ServiceNow UI16 / Next Experience | Australia |
| API | Scripted REST Resources | v2 |
| Tables | scoped tables (x_aasl_*) | Australia |
| Testing | Node.js mock runtime + Jest assertions | — |
| CI/CD | GitHub Actions + REST API trigger | — |

---

## 9. Integration Points

| System | Protocol | Direction | Purpose |
|--------|----------|-----------|---------|
| AI Agent Studio | Internal API (GlideRecord) | Read | Plugin status check |
| Generative AI Controller | sys_generative_ai_cfg_provider table | Read/Write | BYOK provider validation |
| AI Control Tower | GlideRecord + sys_properties | Read | Enablement check |
| External CI/CD | REST (JSON) | Outbound | Pipeline integration trigger |
| GitHub | REST (HTTPS) | Outbound | Report export / artifact storage |

---

## 10. Non-Functional Requirements

| NFR | Target | Measurement |
|-----|--------|-------------|
| Scan time | < 30 seconds per full scan | GlideRecord queries (bounded) |
| Data freshness | Real-time (no caching) | Direct table reads |
| Concurrency | 5 simultaneous scans | GlideRecord read-only (safe) |
| Memory | < 50 MB per scan | No bulk data loads |
| Availability | 99.9% (inherits from instance) | Standard HA |
| Compatibility | Australia release (2026) | Instance version check on startup |

---

*Generated as part of Phase 1 architecture baseline — AASL v1.0.0*
