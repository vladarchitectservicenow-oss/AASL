# AASL Risk Report

## Risk Assessment Framework

Each risk is categorized by severity (P0-P3), likelihood (1-5), impact (1-5), and a composite score (L×I).

| ID | Risk | Severity | Likelihood | Impact | Score | Mitigation |
|----|------|----------|-----------|--------|-------|------------|
| R01 | P0 | 5 | 5 | 25 | Generative AI Controller plugin not active — entire BYOK validation path fails | Pre-flight check: engine aborts with clear message if plugin missing |
| R02 | P0 | 3 | 5 | 15 | sn_generative_ai_cfg_provider table schema changes between releases break BYOK queries | Use table existence guard + dynamic field access; test against each release |
| R03 | P1 | 4 | 4 | 16 | Role names change between releases (e.g., `sn_now_assist.admin` → `now_assist_admin`) | Configurable role list in system properties; run delta scan to detect discrepancies |
| R04 | P1 | 3 | 5 | 15 | AI Agent Studio plugin dependency order violated during activation | Document dependency graph; provide guided activation sequence |
| R05 | P1 | 4 | 3 | 12 | Concurrent scan runs create duplicate x_aasl_launchpad_run records | Implement `glide.lock` semaphore on `x_aasl_launchpad_run` table during insert |
| R06 | P2 | 3 | 4 | 12 | BYOK credentials inadvertently logged in report exports | Credential fields excluded from report payloads; endpoint URLs scrubbed before export |
| R07 | P2 | 4 | 2 | 8 | REST API endpoint exposed without authentication | Require `x_aasl.admin` role for all API endpoints; document in Security section |
| R08 | P2 | 2 | 4 | 8 | Role Provisioner grants admin roles to unauthorized users | Only grant to existing users; never create new users; audit trail in sys_user_has_role |
| R09 | P2 | 3 | 3 | 9 | Report generation times out on instances with 1000+ prerequisite records | Cap at 5000 records per run; paginate HTML report at 100 items per page |
| R10 | P3 | 2 | 3 | 6 | Scheduled job conflicts with instance maintenance window | Configurable schedule via sysauto_script; default to 02:00 UTC |
| R11 | P3 | 4 | 2 | 8 | Browser compatibility issues with HTML report rendering | Generate standards-compliant HTML5; test against Chrome, Firefox, Edge |
| R12 | P3 | 1 | 5 | 5 | Instance upgraded mid-scan causes data inconsistency | Run within a single GlideTransaction; if transaction fails, retry with backoff |
| R13 | P1 | 3 | 4 | 12 | BYOK connectivity test hangs on network timeout | Implement 10-second timeout per provider; mark as TIMEOUT not FAIL |
| R14 | P2 | 5 | 2 | 10 | Cross-scope access restrictions block reading sn_generative_ai_cfg_provider | Declare all cross-scope table accesses in sys_app.xml; request REST access if needed |
| R15 | P3 | 2 | 2 | 4 | CSV export encoding issues with international characters | Use UTF-8 BOM; validate against CJK character sets |

## Risk Summary

| Severity | Count |
|----------|-------|
| P0 (Critical) | 2 |
| P1 (High) | 4 |
| P2 (Medium) | 6 |
| P3 (Low) | 3 |
| **Total** | **15** |

## Critical Path Risks

The top 3 risks that could block Australia AI adoption:

1. **R01 — Plugin not active (P0, score 25):** Must be catchable at scan startup. Engine validates plugin presence before any other checks.
2. **R02 — Table schema drift (P0, score 15):** Each release may change BYOK table columns. Defense: always use field-level access with fallbacks, never assume column names.
3. **R03 — Role name drift (P1, score 16):** Between releases, role names change (documented pattern). Defense: maintain a mapping table in system properties for role name aliases.

## Residual Risk (Accepted)

- 5000-record cap means very large instances (>5000 failing checks) will get truncated reports. Accepted: such instances have systemic problems beyond AASL's scope.
- REST API rate limiting is not implemented. Accepted: CI/CD pipelines typically run 1 scan per deploy, well below rate-limit thresholds.
