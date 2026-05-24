# Risk Report — AI Agent Studio Launchpad (AASL)

**Product:** AASL (`x_aasl`)  
**Release:** ServiceNow Australia (2026)  
**Date:** 2026-05-24  
**Status:** Phase 1  
**Risk Level:** MEDIUM (score: 4.5/10)

---

## Risk Matrix Summary

| ID | Risk | Probability | Impact | Score | Status |
|----|------|------------|--------|-------|--------|
| R01 | TABLE_MISSING on vanilla PDI | High (70%) | Low (2) | 1.4 | MITIGATED |
| R02 | Cross-scope access grants missing | Medium (40%) | High (8) | 3.2 | MONITORING |
| R03 | Plugin activation requires manual admin | High (90%) | Low (3) | 2.7 | ACCEPTED |
| R04 | BYOK credential exposure | Low (10%) | Critical (10) | 1.0 | MITIGATED |
| R05 | Role elevation attack via API | Low (5%) | Critical (9) | 0.45 | MITIGATED |
| R06 | Score calculation bugs on edge cases | Medium (30%) | Medium (5) | 1.5 | MONITORING |
| R07 | PDI hibernation blocking CI/CD | High (80%) | Medium (4) | 3.2 | MONITORING |
| R08 | Australia release plugin deprecation | Low (15%) | High (8) | 1.2 | MONITORING |
| R09 | Instance version mismatch | Low (20%) | High (7) | 1.4 | MITIGATED |
| R10 | API rate limiting on external services | Low (25%) | Low (2) | 0.5 | ACCEPTED |

**Overall risk score: 4.5/10 (MEDIUM)** — Acceptable for deployment with monitoring.

---

## Detailed Risk Analysis

### R01 — TABLE_MISSING on Vanilla PDI
- **Description:** `sn_generative_ai_cfg_provider` table is absent on PDIs without Australia plugins installed. AASL code that blindly queries this table will throw `TABLE_MISSING`.
- **Impact:** Scan fails entirely if unhandled; user sees unhelpful error.
- **Mitigation:** Catch `TABLE_MISSING` gracefully → return `NOT_CONFIGURED` with `severity: INFO`. Document that this is expected on vanilla PDIs.
- **Verification:** Unit test with mocked GlideRecord that throws a known error for missing table.
- **Status:** MITIGATED — handled in AASLBYOKValidator.js with try/catch.

### R02 — Cross-Scope Access Grants Missing
- **Description:** AASL writes to `sys_user_has_role` (global table). Without cross-scope access grants, writes silently fail — no error, just no effect.
- **Impact:** Role provisioning silently no-ops. Users believe roles were assigned but they weren't. Audit trail reports incorrect data.
- **Mitigation:** After each write, verify the row now exists. Log warnings if write-count ≠ expected-count. Document manual grant steps in troubleshooting.
- **Verification:** Integration test that provisions a role and immediately reads it back.
- **Status:** MONITORING — requires explicit post-write verification in role provisioner code.

### R03 — Plugin Activation Requires Manual Admin
- **Description:** ServiceNow does not expose a programmatic API for activating plugins. All 6 required plugins must be manually activated by an admin.
- **Impact:** Cannot fully automate the readiness pipeline. Human intervention required.
- **Mitigation:** AASL detects inactive plugins and generates detailed manual instructions with navigation paths. This is acceptable — platform limitation, not an AASL bug.
- **Status:** ACCEPTED — documented in recommendations and execution plan.

### R04 — BYOK Credential Exposure
- **Description:** AASL reads BYOK provider configuration from `sn_generative_ai_cfg_provider`, which may contain API keys and credentials.
- **Impact:** If credentials leak to logs, reports, or API responses, security breach.
- **Mitigation:** AASL validates credentials exist but never reads their values. Report exports automatically mask sensitive fields. No BYOK data is persisted in AASL tables.
- **Verification:** Audit code — grep for `setValue` on credential fields.
- **Status:** MITIGATED.

### R05 — Role Elevation via API
- **Description:** REST API `POST /launchpad/scan` includes role provisioning. A malicious actor could exploit this to assign administrator roles.
- **Impact:** Unauthorized privilege escalation.
- **Mitigation:** REST endpoint requires `x_aasl.admin` role. Role provisioner only assigns predefined AASL roles — never arbitrary role assignment. Role list is hardcoded, not user-supplied.
- **Verification:** Security test: attempt to assign `admin` role via manipulated API call.
- **Status:** MITIGATED.

### R06 — Score Calculation Bugs on Edge Cases
- **Description:** Scoring engine may produce incorrect results when some checks fail, BYOK gate is active, or components return unexpected status codes.
- **Impact:** Users make decisions based on wrong scores — overconfidence (false READY) or unnecessary delay (false NOT_READY).
- **Mitigation:** Comprehensive unit tests for all score tiers (0, 39, 40, 59, 60, 79, 80, 100). BYOK cap verified independently. Regression test suite for edge cases.
- **Status:** MONITORING — 9 unit tests exist; needs expansion for edge cases.

### R07 — PDI Hibernation Blocking CI/CD
- **Description:** ServiceNow PDIs hibernate after 10 days of inactivity. If the PDI is hibernated, REST API calls fail and tests cannot run.
- **Impact:** CI/CD pipeline stalls. Manual wake required.
- **Mitigation:** `tests/PDI_STATUS.md` tracks last-wake timestamp and hibernation status. Python mock CI falls back when PDI is unavailable. Deferred testing with `status: HIBERNATING`.
- **Status:** MONITORING — requires regular wake reminders. Add cron-triggered PDI ping to detect hibernation early.

### R08 — Australia Release Plugin Deprecation
- **Description:** ServiceNow may deprecate or rename plugins between Australia patch releases. Hardcoded plugin IDs could become stale.
- **Impact:** AASL reports PASS for deprecated plugins or FAIL for renamed ones.
- **Mitigation:** Plugin IDs are maintained in a configuration list (not hardcoded per-check). Release notes are monitored quarterly. Plugin ID overrides available.
- **Status:** MONITORING — add version check to recommend AASL update when instance release changes.

### R09 — Instance Version Mismatch
- **Description:** AASL is designed for Australia. Running on Zurich or older returns inaccurate results.
- **Impact:** Users on older releases see misleading scores.
- **Mitigation:** AASL checks instance version on startup. If < Australia, returns explicit `UNSUPPORTED_RELEASE` with a message to upgrade first.
- **Verification:** Version check unit test with mocked GlideSystem.
- **Status:** MITIGATED.

### R10 — API Rate Limiting
- **Description:** GitHub API has rate limits (5000/hr). If AASL exports reports to GitHub via API, rate limits could block pushes.
- **Impact:** Delayed CI/CD artifact upload.
- **Mitigation:** Reports are always stored locally first. GitHub push is best-effort with exponential backoff. Rate limit errors are logged, not fatal.
- **Status:** ACCEPTED — low impact since local storage is primary.

---

## Residual Risk Acceptance

| Risk | Residual Level | Rationale |
|------|---------------|-----------|
| R03 (Manual plugin activation) | Low | Platform limitation; well-documented workaround |
| R07 (PDI hibernation) | Medium | Inherent to free PDI tier; fallback CI pipeline exists |
| R02 (Cross-scope grants) | Low-Medium | Mitigated by post-write verification |
| R06 (Score bugs) | Low | Mitigated by comprehensive test suite |

---

## Risk Review Cadence

| Review Type | Frequency | Trigger |
|-------------|-----------|---------|
| Sprint review | Bi-weekly | Regular sprint cadence |
| Release review | Per-release (Australia patches) | New ServiceNow patch |
| Incident review | On-demand | Production incident or score anomaly |
| Security review | Quarterly | Scheduled audit |

---

*Phase 1 risk report — AASL v1.0.0*
