# Test Suite SOP: AASL

Author: Vladimir Kapustin | License: AGPL-3.0-only

---

## 1. Purpose

This SOP defines the test scenarios, execution order, and pass criteria for the
AI Agent Studio Launchpad (AASL). Tests are executed in two runtimes:

- **Python** (`pytest`) — prerequisite logic, scoring math, config parsing.
- **Node.js mock runtime** — Script Include behavior against a mocked GlideRecord.

## 2. Scenarios (12)

| # | ID | Scenario | Priority | Runtime |
|---|----|----------|----------|---------|
| 1 | `test_plugin_active` | All 6 required plugins present → PASS | P0 | Node |
| 2 | `test_plugin_missing` | One plugin absent → FAIL + remediation hint | P0 | Node |
| 3 | `test_role_assigned` | Role provisioning idempotent (no duplicate) | P0 | Node |
| 4 | `test_config_load` | System properties read correctly | P0 | Node |
| 5 | `test_byok_detected` | Configured provider → CONFIGURED status | P0 | Node |
| 6 | `test_byok_table_missing` | Missing table → NOT_CONFIGURED (neutral) | P0 | Node |
| 7 | `test_score_weighted` | PASS/WARN/FAIL weighting computes correctly | P1 | Node |
| 8 | `test_score_cap` | Failing BYOK caps score at 60 | P1 | Node |
| 9 | `test_rest_scan` | POST scan returns 201 + run summary | P1 | Node |
| 10 | `test_rest_latest` | GET latest returns most recent run | P1 | Node |
| 11 | `test_empty_data` | Empty instance → graceful zero-score, no crash | P2 | Node |
| 12 | `test_maxrecords` | 5000-record cap enforced | P2 | Node |

## 3. Execution Order

1. Run P0 (scenarios 1–6) — core correctness.
2. Run P1 (7–10) — scoring and API robustness.
3. Run P2 (11–12) — edge/boundary behavior.

## 4. Commands

```bash
# Python tests
pytest tests/ -v

# Node.js Script Include tests
node tests/test_prerequisite_checker.js
node tests/test_launchpad_e2e.js
```

## 5. Pass Criteria

- **Minimum:** 10/12 PASS (P0 all pass, P1 all pass).
- A failing P0 blocks release.
- A failing P1 must be fixed before push.
- A failing P2 is documented and may be deferred with a written rationale.

## 6. Reporting

Record results in `tests/PDI_LIVE_TEST.md` for live-instance runs, and in
`tests/execution_history/logs/` for automated runs. Every FAIL must carry:
scenario ID, expected vs actual, and a remediation hint.
