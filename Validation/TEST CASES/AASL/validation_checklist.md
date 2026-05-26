# AASL Validation Checklist

## Pre-Commit Validation

- [ ] All 6 `src/*.js` files have AGPL-3.0 copyright header
- [ ] `src/sys_app.xml` validates as well-formed XML
- [ ] `src/tables.xml` contains all 4 custom table definitions
- [ ] No hardcoded credentials in any source file (search: `DEFAULT_PASS`, `password=`, `GITHUB_TOKEN`)
- [ ] `.gitignore` exists and excludes `__pycache__/`, `*.pyc`, `reports/`, `.env`
- [ ] `LICENSE` is full AGPL-3.0 text (675 lines minimum)
- [ ] LICENSE contains `Copyright (C) 2026 Vladimir Kapustin` at least twice (preamble + insertion)

## Documentation Validation

- [ ] `README.md` >= 2000 words
- [ ] README has exactly one `## Overview` section (no duplicates)
- [ ] README has exactly one `## License` section (no duplicates)
- [ ] README includes Mermaid architecture diagram
- [ ] README includes ROI analysis
- [ ] README license header matches LICENSE file (AGPL-3.0)
- [ ] `memory/checkpoints/architecture_summary.md` >= 40 lines
- [ ] `memory/checkpoints/dependency_report.md` >= 30 lines
- [ ] `memory/checkpoints/risk_report.md` has >= 5 severity-tagged risks (P0/P1/P2/P3)
- [ ] `memory/checkpoints/execution_plan.md` >= 30 lines

## Test Suite Validation

- [ ] `Validation/TEST CASES/AASL/test_suite_SOP.md` has >= 10 scenarios including negative cases
- [ ] `Validation/TEST CASES/AASL/regression_cases.md` has >= 8 numbered cases
- [ ] `Validation/TEST CASES/AASL/edge_cases.md` >= 8 cases
- [ ] `Validation/TEST CASES/AASL/validation_checklist.md` exists (this file)
- [ ] Node.js tests pass: `node tests/test_prerequisite_checker.js` and `node tests/test_launchpad_e2e.js`

## Git Validation

- [ ] `git status` shows no uncommitted changes after commit
- [ ] Commit message follows conventional format: `feat:`, `fix:`, `docs:`, etc.
- [ ] `git push origin main` succeeds
- [ ] Remote verification: README words >= 2000 from `raw.githubusercontent.com`
- [ ] Remote verification: LICENSE has `Vladimir Kapustin` >= 2 occurrences

## Marketing Validation

- [ ] `marketing/WHITEPAPER.md` exists
- [ ] `marketing/LINKEDIN_POST.md` exists

## Post-Push Verification

- [ ] `curl -s https://raw.githubusercontent.com/vladarchitectservicenow-oss/AASL/main/README.md | wc -w` >= 2000
- [ ] `curl -s https://raw.githubusercontent.com/vladarchitectservicenow-oss/AASL/main/LICENSE | grep -c "Vladimir Kapustin"` >= 2
- [ ] DONE.marker committed in SEPARATE commit after main work commit
