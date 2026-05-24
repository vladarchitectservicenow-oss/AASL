# Execution Plan — AI Agent Studio Launchpad (AASL)

**Product:** AASL (`x_aasl`)  
**Release:** ServiceNow Australia (2026)  
**Date:** 2026-05-24  
**Execution Owner:** ServiceNow Solution Architect Vladimir Kapustin  
**Estimated Duration:** 2 sprints (4 weeks)  
**Status:** Phase 1 — Plan (v1.0.0 already built)

---

## Executive Summary

AASL v1.0.0 is built and deployed. This execution plan covers the residual validation, testing, and hardening required to move from beta to production-ready. The primary work items are: Phase 2 validation suite creation, README expansion, LICENSE compliance, PDI smoke testing, and regression hardening.

---

## Sprint 1: Validation & Documentation (Week 1-2)

### Task 1.1 — Create Phase 2 Validation Suite
- **Owner:** Vladimir Kapustin
- **Effort:** 3 days
- **Deliverables:**
  - `Validation/TEST CASES/AASL/test_suite_SOP.md` (10+ scenarios)
  - `Validation/TEST CASES/AASL/regression_cases.md`
  - `Validation/TEST CASES/AASL/edge_cases.md`
  - `Validation/TEST CASES/AASL/validation_checklist.md`
- **Acceptance:** All 4 documents complete and reviewable

### Task 1.2 — Expand README to 2000+ Words
- **Owner:** Vladimir Kapustin
- **Effort:** 1 day
- **Deliverable:** README.md with 2000+ words, Mermaid diagrams, ROI analysis, Troubleshooting section
- **Acceptance:** `wc -w README.md` ≥ 2000; Mermaid diagram renders correctly

### Task 1.3 — LICENSE Compliance
- **Owner:** Vladimir Kapustin
- **Effort:** 0.5 days
- **Deliverable:** LICENSE file with AGPL-3.0 + "Copyright (C) 2026 Vladimir Kapustin"
- **Acceptance:** License verified on GitHub API

### Task 1.4 — PDI Status Documentation
- **Owner:** Vladimir Kapustin
- **Effort:** 0.5 days
- **Deliverable:** `tests/PDI_STATUS.md`
- **Acceptance:** Contains instance URL, auth method, last wake timestamp, status

---

## Sprint 2: Testing & Hardening (Week 3-4)

### Task 2.1 — Unit Test Coverage Review
- **Owner:** Vladimir Kapustin
- **Effort:** 2 days
- **Deliverable:** Expanded Jest test suite with edge case coverage
- **Acceptance:** 90%+ pass rate; edge cases from risk report R06 addressed

### Task 2.2 — Cross-Scope Access Verification
- **Owner:** Vladimir Kapustin
- **Effort:** 1 day
- **Deliverable:** Integration test proving `sys_user_has_role` writes succeed
- **Acceptance:** Post-write verification test passes

### Task 2.3 — REST API Testing
- **Owner:** Vladimir Kapustin
- **Effort:** 1 day
- **Deliverable:** API test suite for all 4 endpoints
- **Acceptance:** All endpoints return 200 with correct schemas

### Task 2.4 — Score Engine Regression
- **Owner:** Vladimir Kapustin
- **Effort:** 1 day
- **Deliverable:** 15 regression test cases across all score tiers
- **Acceptance:** All tiers produce correct scores; BYOK gate works

### Task 2.5 — PDI Smoke Test
- **Owner:** Vladimir Kapustin
- **Effort:** 1 day (if PDI active)
- **Deliverable:** Live smoke test results recorded
- **Fallback:** Python mock CI if PDI hibernated

### Task 2.6 — CI/CD Pipeline Integration
- **Owner:** Vladimir Kapustin
- **Effort:** 1 day
- **Deliverable:** `.github/workflows/test.yml` and `push.sh`
- **Acceptance:** Tests run on push; reports generated

---

## Task Dependency Graph

```
Task 1.1 (Validation Suite)
    │
    ├──► Task 2.1 (Unit Test Coverage)
    ├──► Task 2.3 (REST API Testing)
    └──► Task 2.4 (Score Engine Regression)
    
Task 1.2 (README Expansion) — independent
    
Task 1.3 (LICENSE) — independent
    
Task 1.4 (PDI Status)
    │
    └──► Task 2.5 (PDI Smoke Test)
    
Task 2.1, 2.2, 2.3, 2.4
    │
    └──► Task 2.6 (CI/CD Pipeline)
```

---

## Resource Allocation

| Role | Allocation | Period |
|------|-----------|--------|
| Solution Architect (Vladimir Kapustin) | 100% | Sprint 1-2 |
| QA Reviewer | 25% | Sprint 2 (code review) |
| PDI Instance | On-demand | Sprint 2 (if active) |

---

## Milestone Schedule

| Milestone | Date | Criteria |
|-----------|------|----------|
| M1: Phase 1 Complete | Week 1, Day 3 | All 4 architecture docs + README + LICENSE |
| M2: Phase 2 Complete | Week 1, Day 4 | Validation suite published |
| M3: Test Coverage Target | Week 3, Day 2 | 90% pass rate |
| M4: CI/CD Active | Week 3, Day 5 | GitHub Actions running |
| M5: Production Ready | Week 4, Day 5 | All acceptance criteria met |

---

## Risk Mitigation Timeline

| Risk | Sprint 1 Action | Sprint 2 Action |
|------|----------------|-----------------|
| R02: Cross-scope grants | Document manual steps in README | Integration test for write verification |
| R06: Score bugs | Expand edge case list | 15 regression tests |
| R07: PDI hibernation | Create PDI_STATUS.md | Fall back to mock CI if needed |
| R08: Plugin deprecation | Review Australia release notes | Add version compatibility check |

---

## Delivery Checklist

- [x] Architecture summary written
- [x] Dependency report written
- [x] Risk report written
- [x] Execution plan written (this document)
- [ ] Phase 2 validation suite created
- [ ] README expanded to 2000+ words
- [ ] LICENSE file added
- [ ] Git commit + push
- [ ] PDI smoke test (or fallback)

---

## Exit Criteria

AASL is considered production-ready when:
1. ✅ All Phase 1 and Phase 2 documentation committed to git
2. ✅ README ≥ 2000 words with Mermaid, ROI, Troubleshooting
3. ✅ LICENSE with correct copyright attribution
4. ✅ Unit tests pass at 90%+ coverage
5. ✅ REST API endpoints verified
6. ✅ Cross-scope access grant documentation complete
7. ✅ CI/CD pipeline operational (or fallback documented)

---

*Phase 1 execution plan — AASL v1.0.0*
