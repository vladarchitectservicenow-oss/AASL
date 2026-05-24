# Regression Cases — AI Agent Studio Launchpad (AASL)

**Product:** AASL (`x_aasl`)  
**Version:** v1.0.0  
**Date:** 2026-05-24

---

## Purpose

Regression cases ensure that fixes and feature additions do not break existing functionality. These tests must pass on every commit.

---

## Regression Matrix

| ID | Component | Description | Risk | Last Verified |
|----|-----------|-------------|------|---------------|
| RG-001 | Score Engine | BYOK gate caps score at 60 when no provider configured | R06 (Score bugs) | 2026-05-24 |
| RG-002 | Score Engine | Score = 0 when all checks FAIL | R06 | 2026-05-24 |
| RG-003 | Score Engine | Score = 100 when all checks PASS with BYOK | R06 | 2026-05-24 |
| RG-004 | BYOK Validator | TABLE_MISSING returns NOT_CONFIGURED not error | R01 | 2026-05-24 |
| RG-005 | BYOK Validator | 4 providers all configured → BYOK score = 15 | R01 | 2026-05-24 |
| RG-006 | Role Provisioner | Duplicate role assignment is idempotent | R05 | 2026-05-24 |
| RG-007 | REST API | Unauthenticated request returns 401 | R05 | 2026-05-24 |
| RG-008 | Report Generator | JSON export has correct schema | R04 | 2026-05-24 |
| RG-009 | Report Generator | CSV export has header row + data rows | R04 | 2026-05-24 |
| RG-010 | Prerequisite Checker | 6 plugins all PASS → plugin score = 30 | R06 | 2026-05-24 |
| RG-011 | Prerequisite Checker | Missing role → score deduction = 5 per role | R06 | 2026-05-24 |
| RG-012 | Prerequisite Checker | Missing property → score deduction = 5 per property | R06 | 2026-05-24 |
| RG-013 | Launchpad Engine | Full scan completes in < 30 queries | — | 2026-05-24 |
| RG-014 | Launchpad Engine | Recommendations generated for every FAIL | R06 | 2026-05-24 |
| RG-015 | Launchpad Engine | estimated_hours is non-negative integer | R06 | 2026-05-24 |

---

## Regression Test Execution

### Run Command
```bash
node tests/regression_all.js
```

### Expected Output
```
RG-001: PASS — BYOK gate caps score at 60
RG-002: PASS — Score = 0 on full failure
...
RG-015: PASS — estimated_hours is non-negative
Results: 15/15 PASS, 0 FAIL
```

---

## Regression Trigger Events

| Event | Regression Scope |
|-------|-----------------|
| Score engine code change | RG-001, RG-002, RG-003, RG-010, RG-011, RG-012, RG-015 |
| BYOK validator change | RG-004, RG-005 |
| Role provisioner change | RG-006 |
| REST API change | RG-007 |
| Report generator change | RG-008, RG-009 |
| Engine orchestrator change | RG-013, RG-014 |
| Release to GitHub | All (RG-001 through RG-015) |

---

## Bug-to-Regression Mapping

When a bug is fixed, add a regression case:

| Bug ID | Fixed | Regression Added |
|--------|-------|------------------|
| (none yet) | — | — |

---

*Regression Cases — AASL v1.0.0*
