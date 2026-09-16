# Validation Checklist: AASL

Author: Vladimir Kapustin | License: AGPL-3.0-only

---

## Pre-Release Checklist

- [ ] All P0 tests pass (scenarios 1–6)
- [ ] All P1 tests pass (scenarios 7–10)
- [ ] P2 edge cases documented (11–12 + edge_cases.md)
- [ ] Score-weighting math unit-tested (PASS/WARN/FAIL permutations)
- [ ] BYOK score cap verified (60-point gate)
- [ ] Cross-scope grant present in `sys_app.xml` (or documented as manual step)
- [ ] No credential leakage in `src/` (grep for hardcoded passwords)

## Documentation Checklist

- [ ] README ≥ 2000 words
- [ ] README has Mermaid architecture diagram
- [ ] README has ROI analysis
- [ ] README has Troubleshooting table
- [ ] LICENSE contains `Copyright (C) 2026 Vladimir Kapustin`
- [ ] README license header matches LICENSE file (both AGPL-3.0)
- [ ] `architecture_summary.md` ≥ 200 words
- [ ] `risk_report.md` lists ≥ 5 risks across P0–P3
- [ ] `test_suite_SOP.md` has 10+ scenarios

## Git / Delivery Checklist

- [ ] Phase 1+2 artifacts staged (`git diff --cached --stat` non-empty)
- [ ] `__pycache__/` and `*.pyc` excluded via `.gitignore`
- [ ] Commit pushed to `origin/main`
- [ ] `DONE.marker` reflects real artifact counts (no fabrication)

## Post-Release Checklist

- [ ] No new warnings in run logs
- [ ] PDI live test recorded in `tests/PDI_LIVE_TEST.md` (or deferred with reason)
- [ ] Pipeline progress state updated
