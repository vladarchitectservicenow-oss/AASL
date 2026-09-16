# AASL Risk Report

**Product:** AI Agent Studio Launchpad (AASL)
**Author:** Vladimir Kapustin
**License:** AGPL-3.0-only

---

## P0 — Critical

### R-01: Cross-scope query returns zero rows (silent)
`AASLBYOKValidator` queries `sn_generative_ai_cfg_provider` from scope `x_aasl`.
Without an explicit cross-scope privilege grant, `GlideRecord` returns an empty
result set rather than throwing — producing a false "all providers NOT_CONFIGURED"
report that looks legitimate.
- **Likelihood:** High on fresh installs
- **Impact:** Readiness score silently capped at 60; user trusts a wrong report
- **Mitigation:** Ship a cross-scope access grant in `sys_app.xml`; document it;
  add a table-existence + row-count assertion in tests.

### R-02: BYOK gate masks real readiness
The 60-point cap fires whenever *any* provider is failing, even when the instance
uses a provider not in the four recognized (Azure, Bedrock, Vertex, watsonx).
- **Likelihood:** Medium
- **Impact:** Score under-reports readiness for custom/self-hosted LLM backends
- **Mitigation:** Allow an "other provider" escape hatch; surface the cap reason
  in the report rather than only the numeric score.

## P1 — High

### R-03: No CI/CD pipeline
The repo has no GitHub Actions workflow, so the mock-runtime test suites are not
executed automatically on push. Regressions can reach `main` undetected.
- **Mitigation:** Add a Node.js + pytest matrix workflow.

### R-04: Incomplete test coverage of scoring math
The weighted-score and BYOK-cap formulas (`runFullScan`) are central to the
product's value but only lightly covered. An off-by-one in weighting would ship
silently.
- **Mitigation:** Add dedicated unit tests for score computation across
  PASS/WARN/FAIL permutations and the cap boundary.

### R-05: Effort estimation is heuristic and unvalidated
`_estimateHours` uses fixed multipliers (`4`/`1.5`/`16`) with no empirical
calibration. Estimates may mislead capacity planning.
- **Mitigation:** Treat as advisory; expose constants as configurable properties.

## P2 — Medium

### R-06: Hardcoded release target and plugin versions
`release_target = "Australia"` and `minVersion = "1.0"` are string literals.
Future releases (post-Australia) require source edits.
- **Mitigation:** Move to system properties / config records.

### R-07: Record bloat at scale
`maxRecs = 5000` bounds child records per run, but repeated scans accumulate
`x_aasl_prerequisite` rows with no retention/cleanup policy.
- **Mitigation:** Add a scheduled cleanup job or TTL on run history.

### R-08: Report blobs stored inline
`report_html` and `report_json` are persisted on the run record, which can grow
large for instances with many findings.
- **Mitigation:** Store large blobs as attachments; keep summaries inline.

## P3 — Low

### R-09: No performance baseline
No load/benchmark exists for scanning instances with large plugin/role inventories.
- **Mitigation:** Add a benchmark harness before enterprise rollout.

### R-10: Limited BYOK provider coverage
Only four providers are recognized; new Australia-era providers would be invisible.
- **Mitigation:** Make `PROVIDER_MAP` data-driven (config table).

---

## Mitigation Priority

1. Ship cross-scope grant (R-01) — do this before any install.
2. Add scoring-math unit tests (R-04).
3. Add CI/CD workflow (R-03).
4. Make constants configurable (R-06, R-10).
5. Add retention/cleanup (R-07).
