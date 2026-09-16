# Regression Cases: AASL

Author: Vladimir Kapustin | License: AGPL-3.0-only

---

The following regression cases must pass on every change to prevent silent
re-introduction of previously-fixed defects.

1. **Idempotent scan execution** — running `runFullScan()` twice produces two
   distinct run head records with no cross-contamination of child records.

2. **Idempotent role assignment** — granting an already-held role returns
   `alreadyHad: true` and does not insert a duplicate `sys_user_has_role` row.

3. **Score stability** — identical prerequisite/BYOK inputs yield an identical
   `overall_score` across runs (no nondeterminism).

4. **Report format consistency** — HTML report contains the same prerequisite
   and BYOK entries as the JSON report for the same run.

5. **BYOK table-absence safety** — when `sn_generative_ai_cfg_provider` is
   absent, the validator returns NOT_CONFIGURED (neutral) and never throws.

6. **Config persistence** — system-property overrides survive a re-scan and are
   reflected in the resulting run record.

7. **REST response shape** — POST `/scan` and GET `/latest` return stable JSON
   keys (`run_id`, `overall_score`, `total_checks`, `pass_count`, `warn_count`,
   `fail_count`, `estimated_hours`) across releases.

8. **Cross-scope query** — with the cross-scope grant present, BYOK provider rows
   are visible; without it, the validator degrades gracefully to NOT_CONFIGURED
   rather than throwing.

9. **Score cap boundary** — exactly one failing provider caps the score at 60;
   zero failing providers leaves the computed (uncapped) score intact.

10. **Record cap** — a scan yielding more than 5000 findings persists at most
    5000 prerequisite rows without error.
