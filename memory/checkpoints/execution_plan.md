# AASL Execution Plan

**Product:** AI Agent Studio Launchpad (AASL)
**Author:** Vladimir Kapustin
**License:** AGPL-3.0-only

---

## Phase 1 — Analysis
- Inspect repository structure and identify the six Script Includes.
- Confirm scope (`x_aasl`), data model (`x_aasl_launchpad_run`,
  `x_aasl_prerequisite`, `x_aasl_recommendation`).
- Detect framework: ServiceNow scoped app (Glide APIs, Class.create()).

## Phase 2 — Validation Suite
- Author test suite SOP (10+ scenarios) covering plugin/role/property checks,
  BYOK validation, scoring, and REST API.
- Author regression cases and edge cases.
- Build the Node.js mock-runtime for Script Include testing.

## Phase 3 — Testing
- Run `pytest tests/ -v` for Python-side tests.
- Run `node tests/*.js` for Script Include mock-runtime tests.
- PDI live test where the instance is active (defer if hibernating).

## Phase 4 — Refactoring
- Move hardcoded constants (release target, plugin versions, effort multipliers)
  to configurable properties.
- Consider report-blob → attachment migration.

## Phase 5 — README
- Confirm README ≥ 2000 words with Mermaid, ROI, and Troubleshooting sections.

## Phase 6 — Quality
- Run the ServiceNow QA scanner against the build directory.
- Verify LICENSE copyright and AGPL-3.0 header consistency.
- Verify no credential leakage in `src/`.

## Phase 7 — Git
- Stage all Phase 1+2 artifacts, commit, and push to `origin/main`.

## Phase 8 — Completion
- Write `DONE.marker` with accurate counts (no fabricated claims).
- Update pipeline progress state.

---

## Definition of Done

- [ ] All P0 tests pass
- [ ] README ≥ 2000 words
- [ ] LICENSE contains `Copyright (C) 2026 Vladimir Kapustin`
- [ ] Phase 1 docs are non-skeletal (architecture ≥ 200 words, risk ≥ 5 risks)
- [ ] Phase 2 suite has 10+ scenarios
- [ ] Git push succeeded
- [ ] DONE.marker reflects real artifact counts
